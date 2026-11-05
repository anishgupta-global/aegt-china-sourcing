// Password protection for the whole site (runs on every request, incl. static files).
// Credentials come from Vercel env vars; if they are missing the site stays locked (fail closed).
import { next } from '@vercel/functions';

export default function middleware(request) {
  const user = process.env.BASIC_AUTH_USER, pass = process.env.BASIC_AUTH_PASS;
  if (!user || !pass) return new Response('Locked: login not configured', { status: 503 });
  const [scheme, enc] = (request.headers.get('authorization') || '').split(' ');
  if (scheme === 'Basic' && enc) {
    let decoded = '';
    try { decoded = atob(enc); } catch (e) { decoded = ''; }
    const i = decoded.indexOf(':');
    if (i > 0 && decoded.slice(0, i) === user && decoded.slice(i + 1) === pass) return next();
  }
  return new Response('Login required', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="AE Global Traders - intern", charset="UTF-8"' } });
}
