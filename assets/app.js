/* AE Global Traders China sourcing shop: listing filters, maker filters, search, interactive map. Plain JS, works from file://. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));

  /* ---------- generic card filter (category listing + makers directory) ---------- */
  function setupFilter(root) {
    if (!root) return;
    const items = $$("[data-item]", root.closest("main") || document);
    const counter = $("[data-count]", root.closest("main") || document);
    const apply = () => {
      const want = {};
      $$("[data-f]", root).forEach(el => {
        const k = el.dataset.f;
        if (el.type === "checkbox") { if (el.checked) (want[k] = want[k] || []).push(el.value); }
        else if (el.value) want[k] = [el.value];
      });
      let n = 0; const qe = $("[data-q]", root), q = qe ? qe.value.trim().toLowerCase() : "";
      items.forEach(it => {
        const ok = (!q || (it.dataset.k || "").includes(q)) && Object.entries(want).every(([k, vals]) => {
          const have = (it.dataset[k] || "").split("|");
          return vals.some(v => have.includes(v));
        });
        it.classList.toggle("hide", !ok); if (ok) n++;
      });
      if (counter) counter.textContent = counter.dataset.tpl.replace("{n}", n).replace("{t}", items.length);
    };
    root.addEventListener("change", apply); root.addEventListener("input", e => { if (e.target.matches("[data-q]")) apply(); });
    const reset = $("[data-reset]", root);
    if (reset) reset.addEventListener("click", () => { $$("[data-f]", root).forEach(el => el.type === "checkbox" ? el.checked = false : el.value = ""); const qe = $("[data-q]", root); if (qe) qe.value = ""; apply(); });
    const qs = new URLSearchParams(location.search);
    $$("[data-f]", root).forEach(el => { const v = qs.get(el.dataset.f); if (v && el.tagName === "SELECT") el.value = v; if (v && el.type === "checkbox" && el.value === v) el.checked = true; });
    apply();
  }
  setupFilter($("#filters"));

  /* ---------- search ---------- */
  const sres = $("#search-results");
  if (sres && window.SEARCH) {
    const sp = new URLSearchParams(location.search), q = (sp.get("q") || "").trim(), mkey = sp.get("m"), MK = (window.SEARCHMK || {})[mkey];
    const inp = $(".search input"); if (inp && !MK) inp.value = q;
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const hits = MK ? window.SEARCH.filter(x => (x.ks || []).includes(mkey)) : terms.length ? window.SEARCH.filter(x => terms.every(t => x.k.includes(t))) : [];
    $("#search-q").textContent = q;
    if (MK) {  // company product grid (link target from the city maps)
      const h1 = $("#search-q").closest("h1");
      h1.innerHTML = `<span class="mkhead">${MK.l ? `<img src="${esc(MK.l)}" alt="">` : ""}<span>${esc(MK.n)}</span></span>`;
      h1.insertAdjacentHTML("afterend", `<p class="mkhead-s">${esc(sres.dataset.mk.replace("{n}", hits.length).replace("{c}", MK.c))}${MK.h ? (/^https?:/.test(MK.h) ? ` · <a href="${esc(MK.h)}" target="_blank" rel="noopener">${esc(sres.dataset.mkweb)} ↗</a>` : ` · <a href="${esc(MK.h)}">${esc(sres.dataset.mkprof)}</a>`) : ""}</p>`);
      document.title = MK.n + " · " + document.title;
      if (!hits.length) sres.dataset.empty = sres.dataset.mknone;
    }
    sres.innerHTML = hits.length ? hits.map(x => `<a class="card" href="${esc(x.u)}"><div class="img">${x.i ? `<img src="${esc(x.i)}" alt="" loading="lazy">` : ""}</div><div class="t"><span class="eb">${esc(x.c)}</span><span class="nm">${esc(x.n)}</span><span class="mk">${esc(x.m || "")}</span></div></a>`).join("")
      : `<p class="muted">${esc(sres.dataset.empty)}</p>`;
    if (MK && MK.pd && MK.pd.length) sres.insertAdjacentHTML("beforeend", `<div class="mkplan"><h3>${esc(sres.dataset.mkplan)}</h3><ul>${MK.pd.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>`);
  }

  /* ---------- map ---------- */
  const svg = $("#cnmap");
  if (svg && window.MAP) {
    const M = window.MAP, full = M.view.slice();
    let vb = full.slice();
    const setVB = () => { svg.setAttribute("viewBox", vb.join(" ")); const s = vb[2] / full[2]; svg.style.setProperty("--s", s); $$(".plab", svg).forEach(t => t.style.fontSize = (12 * Math.max(.3, s)) + "px"); $$(".cm", svg).forEach(g => { const r = g.querySelector("circle"); r.setAttribute("r", g.dataset.r * Math.max(.35, s)); const t = g.querySelector("text"); if (t) { t.setAttribute("x", g.dataset.r * Math.max(.35, s) + 3 * s); t.style.fontSize = (11 * s) + "px"; t.style.strokeWidth = (3 * s) + "px"; } }); };
    const zoom = (f, cx, cy) => {
      cx = cx ?? vb[0] + vb[2] / 2; cy = cy ?? vb[1] + vb[3] / 2;
      const w = Math.min(full[2], Math.max(full[2] / 14, vb[2] * f)), h = w * full[3] / full[2];
      vb = [cx - (cx - vb[0]) * w / vb[2], cy - (cy - vb[1]) * h / vb[3], w, h]; setVB();
    };
    const pt = e => { const r = svg.getBoundingClientRect(); return [vb[0] + (e.clientX - r.left) / r.width * vb[2], vb[1] + (e.clientY - r.top) / r.height * vb[3]]; };
    svg.addEventListener("wheel", e => { e.preventDefault(); const [x, y] = pt(e); zoom(e.deltaY > 0 ? 1.25 : 0.8, x, y); }, {passive: false});
    let drag = null;
    svg.addEventListener("pointerdown", e => { if (e.target.closest(".cm")) return; drag = [e.clientX, e.clientY, vb[0], vb[1]]; svg.setPointerCapture(e.pointerId); });
    svg.addEventListener("pointermove", e => { if (!drag) return; const r = svg.getBoundingClientRect(); vb[0] = drag[2] - (e.clientX - drag[0]) / r.width * vb[2]; vb[1] = drag[3] - (e.clientY - drag[1]) / r.height * vb[3]; setVB(); });
    svg.addEventListener("pointerup", () => drag = null);
    $("#zin").onclick = () => zoom(.7); $("#zout").onclick = () => zoom(1.4); $("#zall").onclick = () => { vb = full.slice(); setVB(); };

    const fc = $("#mcat"), fp = $("#mprov"), ft = $("#mtrip"), panel = $("#mpanel");
    const tripOk = m => !ft || !ft.value || (ft.value === "trip" ? m.s >= 0 : m.s === +ft.value);
    const makerOk = m => (!fc.value || m.c.includes(fc.value)) && (!fp.value || m.p === fp.value) && tripOk(m);
    // route stop markers scale with zoom like city markers
    const scaleRoute = () => { const s = vb[2] / full[2]; $$(".rs", svg).forEach(g => { g.querySelector("circle").setAttribute("r", 9 * Math.max(.4, s)); const t = g.querySelector("text"); t.style.fontSize = (10 * Math.max(.4, s)) + "px"; t.setAttribute("y", 3.6 * Math.max(.4, s)); }); const pl = $(".route polyline", svg); if (pl) pl.style.strokeWidth = (2.2 * Math.max(.35, s)) + "px"; };
    const setVB2 = () => { setVB(); scaleRoute(); };
    const draw = () => {
      $$(".cm", svg).forEach(g => {
        const city = M.cities[+g.dataset.i]; const ok = city.m.some(i => makerOk(M.makers[i]));
        g.classList.toggle("dim", !ok); g.classList.toggle("hl", ok && (fc.value || fp.value || (ft && ft.value)));
      });
      $$(".prov", svg).forEach(p => p.classList.toggle("hl", !!fp.value && p.dataset.n === fp.value));
      $$(".rs", svg).forEach(g => g.classList.toggle("on", !!ft && (ft.value === "trip" || ft.value === g.dataset.s)));
      if (fp.value && M.provbox[fp.value]) { vb = M.provbox[fp.value].slice(); setVB2(); }
      else if (ft && ft.value && ft.value !== "trip") { const g = $(`.rs[data-s="${ft.value}"]`, svg); if (g) { const m = /translate\(([-\d.]+),([-\d.]+)\)/.exec(g.getAttribute("transform")); const w = full[2] / 6, h = w * full[3] / full[2]; vb = [+m[1] - w / 2, +m[2] - h / 2, w, h]; setVB2(); } }
      listPanel();
    };
    // panel: category dropdowns -> product · China price · DE · manufacturer (product first)
    const coA = m => m.w ? `<a class="nm" href="${esc(m.w)}" target="_blank" rel="noopener">${esc(m.n)} ↗</a>` : `<a class="nm" href="${esc(m.u)}">${esc(m.n)}</a>`;
    const listPanel = (cityIdx, stop) => {
      let sel, title;
      if (stop != null) { sel = M.makers.map((m, i) => i).filter(i => M.makers[i].s === +stop); title = `${M.stops[stop].n} · ${M.stops[stop].d}`; }
      else if (cityIdx != null) { sel = M.cities[cityIdx].m.filter(i => makerOk(M.makers[i])); title = `${M.t.in_city} ${M.cities[cityIdx].n}`; }
      else { sel = M.makers.map((m, i) => i).filter(i => makerOk(M.makers[i])); title = ""; }
      const S = new Set(sel), groups = {};
      M.prods.forEach(p => {
        if (fc.value && p.c !== fc.value) return;
        const ms = p.mk.filter(i => S.has(i)); if (!ms.length) return;
        (groups[p.c] = groups[p.c] || []).push([p, ms]);
      });
      const cats = Object.keys(groups).sort(), np = cats.reduce((s, c) => s + groups[c].length, 0);
      const open = cats.length <= 2 || cityIdx != null && np <= 12;
      const head = ft && ft.value ? (ft.value === "trip" ? M.t.trip : `${M.t.trip} · ${M.stops[ft.value] ? M.stops[ft.value].n : ""}`) : (fc.value ? fc.options[fc.selectedIndex].text : M.t.all);
      const rows = ps => ps.map(([p, ms]) => { const m = M.makers[ms[0]]; const main = p.sp && p.mk[0] === ms[0];
        return `<tr><td><a class="pn" href="${esc(p.u)}">${esc(p.n)}</a></td><td class="tab pr">${esc(p.pc)}</td><td class="mk">${coA(m)}${main ? ` <span class="tag">${esc(M.t.main)}</span>` : ""}${ms.length > 1 ? ` <span class="muted">+${ms.length - 1}</span>` : ""}<br><span class="muted">${esc(m.city)}</span> <a class="gm" href="${esc(m.g)}" target="_blank" rel="noopener" title="${esc(M.t.gmaps)}">📍</a></td></tr>`; }).join("");
      panel.innerHTML = `<span class="eb">${esc(head)}${fp.value ? " · " + esc(M.provName[fp.value] || fp.value) : ""}</span>` +
        `<h3>${title ? esc(title) : ""}</h3><p class="muted pstat">${sel.length} ${esc(M.t.makers)} · ${np} ${esc(M.t.products)}</p>` +
        cats.map(c => `<details class="pcat"${open ? " open" : ""}><summary><span>${esc(c)} · ${esc(M.catn[c] || c)}</span><b>${groups[c].length}</b></summary>` +
          `<table class="ptab"><thead><tr><th>${esc(M.t.product)}</th><th>${esc(M.t.pcn)}</th><th>${esc(M.t.company)}</th></tr></thead><tbody>${rows(groups[c])}</tbody></table></details>`).join("");
    };
    svg.addEventListener("click", e => { const r = e.target.closest(".rs"); if (r) { listPanel(null, r.dataset.s); return; } const g = e.target.closest(".cm"); if (g) listPanel(+g.dataset.i); });
    fc.addEventListener("change", draw); fp.addEventListener("change", () => { if (!fp.value) { vb = full.slice(); setVB2(); } draw(); });
    if (ft) ft.addEventListener("change", () => { if (!ft.value || ft.value === "trip") { vb = full.slice(); setVB2(); } draw(); });
    const qs = new URLSearchParams(location.search);
    if (qs.get("cat")) fc.value = qs.get("cat"); if (qs.get("prov")) fp.value = qs.get("prov"); if (qs.get("trip") && ft) ft.value = qs.get("trip");
    $("#zin").onclick = () => { zoom(.7); scaleRoute(); }; $("#zout").onclick = () => { zoom(1.4); scaleRoute(); }; $("#zall").onclick = () => { vb = full.slice(); setVB2(); };
    svg.addEventListener("wheel", () => scaleRoute(), {passive: true});
    setVB2(); draw();
  }

  /* ---------- RFQ (request for quotation): up to 6 vendors, delivery Germany/Serbia, Incoterms, freight, together (BCC) or one by one ---------- */
  const rb = $("[data-rfq]");
  if (rb && window.RFQ) {
    const R = window.RFQ, LS = k => { try { return localStorage.getItem("rfq_" + k) || ""; } catch (e) { return ""; } };
    const SV = (k, v) => { try { localStorage.setItem("rfq_" + k, v); } catch (e) {} };
    const de = document.documentElement.lang.startsWith("de"), zh = document.documentElement.lang.startsWith("zh");
    const L3 = (a, b, c) => de ? a : zh ? c : b;
    const ROLE = { supplier: L3("Anbieter", "supplier", "供应商"), alternative: L3("Alternative", "alternative", "备选"), cat: L3("Katalog · ähnliches Produkt", "catalogue · similar product", "目录 · 类似产品"), mic: L3("weitere · Made-in-China, ungeprüft", "more · Made-in-China, unverified", "更多 · 中国制造网，未核实") };
    const dlg = document.createElement("dialog"); dlg.className = "rfqdlg";
    const vname = v => `${v.c ? `<span class="rv-c">${esc(v.c)}</span> · ` : ""}${v.w ? `<a href="${esc(v.w)}" target="_blank" rel="noopener">${esc(v.n)} ↗</a>` : esc(v.n)}`;
    const plink = v => v.u ? ` <a class="rv-p" href="${esc(v.u)}" target="_blank" rel="noopener">${esc(L3("Produkt", "product", "产品"))} ↗</a>` : "";
    const vrows = R.vendors.map((v, i) => `<label class="rv"><input type="checkbox" name="rv" value="${i}" checked><span><b>${vname(v)}</b>${plink(v)}<br><span class="muted">${esc(ROLE[v.r] || "")}${v.s ? " · " + esc(L3("Reise", "trip", "行程")) + ": " + esc(v.s) + (v.sd ? " (" + esc(v.sd) + ")" : "") : ""} · ${v.e ? esc(v.e) : esc(L3("keine E-Mail – über Website/Made-in-China", "no e-mail – via website/Made-in-China", "无邮箱 – 通过网站/中国制造网"))}</span></span></label>`).join("")
      || `<p class="muted">${esc(L3("Kein Hersteller hinterlegt – Empfänger unten eintragen.", "No manufacturer on file – enter recipients below.", "未登记制造商，请在下方填写收件人。"))}</p>`;
    const INC = ["EXW", "FOB", "CIF", "DAP", "DDP"];
    dlg.innerHTML = `<form method="dialog" class="rfqf"><h3>${esc(L3("Angebot anfragen", "Request a quotation", "询价"))}</h3><p class="muted">${esc(R.name)}${R.model ? " · " + esc(R.model) : ""}</p>
      <fieldset><legend>${esc(L3("Anbieter", "Vendors", "供应商"))} (${R.vendors.length})</legend><div class="rvl">${vrows}</div>
      <input name="to" type="text" placeholder="${esc(L3("weitere E-Mail-Adressen (mit Komma trennen)", "more e-mail addresses (comma-separated)", "其他邮箱（逗号分隔）"))}"></fieldset>
      <fieldset><legend>${esc(L3("Lieferung & Konditionen", "Delivery & terms", "交货与条款"))}</legend>
      <div class="rfq-row"><b>${esc(L3("Lieferland", "Deliver to", "交货国家"))}</b><label><input type="radio" name="dest" value="RS" checked> ${esc(L3("Serbien", "Serbia", "塞尔维亚"))}</label><label><input type="radio" name="dest" value="DE"> ${esc(L3("Deutschland", "Germany", "德国"))}</label></div>
      <div class="rfq-row"><b>Incoterms</b>${INC.map(x => `<label><input type="checkbox" name="inc" value="${x}" ${x === "FOB" || x === "DAP" ? "checked" : ""}> ${x}</label>`).join("")}<label><input type="checkbox" name="incpref" checked> ${esc(L3("Lieferant nennt sein bevorzugtes Incoterm", "supplier states preferred Incoterm", "供应商说明首选贸易术语"))}</label></div>
      <div class="rfq-row"><b>${esc(L3("Transport", "Freight", "运输"))}</b><label><input type="checkbox" name="sea" checked> ${esc(L3("Seefracht", "sea", "海运"))}</label><label><input type="checkbox" name="air" checked> ${esc(L3("Luftfracht", "air", "空运"))}</label></div>
      <label>${esc(L3("Mengen (Staffel)", "Quantities (tiers)", "数量（阶梯）"))} <input name="qty" value="100 / 500 / 1,000"></label>
      <label>${esc(L3("Private Label (Eigenmarke)", "Private label (own brand)", "贴牌（自有品牌）"))} <select name="oem"><option value="yes">${esc(L3("ja, anfragen", "yes, ask", "是，询问"))}</option><option value="no">${esc(L3("nein", "no", "否"))}</option></select></label>
      <label><input type="checkbox" name="meet" checked> ${esc(L3("Treffen / Werksbesuch während der China-Reise anfragen", "ask for a meeting / factory visit during the China trip", "询问中国行程期间会面/参观工厂"))}</label>
      <label><input type="checkbox" name="zh" checked> ${esc(L3("chinesische Zusammenfassung anhängen", "add Chinese summary", "附中文摘要"))}</label></fieldset>
      <fieldset><legend>${esc(L3("Absender (wird im Browser gespeichert)", "Sender (saved in this browser)", "发件人（保存在本浏览器）"))}</legend>
      <input name="sn" placeholder="${esc(L3("Name", "Name", "姓名"))}" required><input name="sc" placeholder="${esc(L3("Firma", "Company", "公司"))}" value="AE Global Traders"><input name="se" type="email" placeholder="${esc(L3("Ihre E-Mail", "Your e-mail", "您的邮箱"))}" required><input name="sp" placeholder="${esc(L3("Telefon (optional)", "Phone (optional)", "电话（可选）"))}"></fieldset>
      <div class="rfq-mode"><label><input type="radio" name="mode" value="all" checked> <b>${esc(L3("Zusammen", "Together", "合并"))}</b> – ${esc(L3("eine E-Mail an alle (Empfänger in BCC)", "one e-mail to all (recipients in BCC)", "一封邮件发给所有人（密送）"))}</label>
      <label><input type="radio" name="mode" value="one"> <b>${esc(L3("Einzeln", "One by one", "逐个"))}</b> – ${esc(L3("je Anbieter eine persönliche E-Mail", "one personal e-mail per vendor", "每个供应商一封个性化邮件"))}</label></div>
      <textarea name="txt" rows="9" readonly></textarea>
      <div class="rfqa" data-all><button type="button" class="btn on" data-a="mail">✉ ${esc(L3("E-Mail öffnen", "Open e-mail", "打开邮件"))}</button><button type="button" class="btn" data-a="eml">📎 ${esc(L3("E-Mail mit Produktbild (.eml)", "E-mail with product image (.eml)", "含产品图片的邮件（.eml）"))}</button><button type="button" class="btn" data-a="copy">⧉ ${esc(L3("Text kopieren", "Copy text", "复制文本"))}</button></div>
      <div class="rfq-noe" data-noe></div>
      <div class="rfq-each" data-each hidden></div>
      <div class="rfqa"><button class="btn" value="close">${esc(L3("Schließen", "Close", "关闭"))}</button></div>
      <p class="muted rfqn">${esc(L3("Die .eml-Datei öffnet sich in Outlook als Entwurf mit angehängtem Bild. Anbieter ohne E-Mail: Text kopieren und über Website oder das Made-in-China-Anfrageformular (↗) senden.", "The .eml file opens in Outlook as a draft with the image attached. Vendors without e-mail: copy the text and send it via the website or the Made-in-China inquiry form (↗).", "该.eml文件在Outlook中以草稿形式打开并附带图片。无邮箱的供应商：复制文本，通过网站或中国制造网询盘表单（↗）发送。"))}</p></form>`;
    document.body.appendChild(dlg);
    const F = dlg.querySelector("form"), fv = n => F.elements[n];
    ["sn", "sc", "se", "sp"].forEach(n => { const v = LS(n); if (v) fv(n).value = v; fv(n).addEventListener("input", () => { SV(n, fv(n).value); build(); }); });
    const sel = () => [...F.querySelectorAll("input[name=rv]:checked")].map(x => R.vendors[+x.value]);
    const extra = () => fv("to").value.split(/[,;\s]+/).map(x => x.trim()).filter(x => /@/.test(x));
    const dest = () => F.querySelector("input[name=dest]:checked").value;
    const incs = () => [...F.querySelectorAll("input[name=inc]:checked")].map(x => x.value);
    const destEN = () => dest() === "RS" ? "Serbia (Belgrade)" : "Germany", destZH = () => dest() === "RS" ? "塞尔维亚（贝尔格莱德）" : "德国";
    const company = () => fv("sc").value || "AE Global Traders";
    const subj = () => `RFQ – ${R.name}${R.model ? " (" + R.model + ")" : ""} – delivery to ${dest() === "RS" ? "Serbia" : "Germany"} – ${company()}`;
    const incText = () => {
      const place = { EXW: "EXW your factory", FOB: "FOB China port (please name the port)", CIF: `CIF port of destination for ${destEN()} (please name the port)`, DAP: `DAP ${destEN()}`, DDP: `DDP ${destEN()}` };
      const l = incs().map(x => place[x]);
      return (l.length ? "price basis " + l.join(" / ") : "your price basis") + (fv("incpref").checked ? " – and please tell us which Incoterm you prefer" : "");
    };
    const freight = () => fv("sea").checked && fv("air").checked ? "sea freight and air freight" : fv("air").checked ? "air freight" : fv("sea").checked ? "sea freight" : "";
    function text(v) {
      const q = fv("qty").value.trim(), L = [];
      L.push(v ? `Dear ${v.n} team,` : "Dear Sir or Madam,", "", `we are ${company()} and would like to receive a quotation for the following product, delivery to ${destEN()}:`, "");
      L.push(`Product: ${R.name}`); if (R.model) L.push(`Model / reference: ${R.model}`); if (R.hs) L.push(`HS code (EU): ${R.hs}`);
      if (R.img_url) L.push(`Reference image: ${R.img_url}`);
      if (R.specs.length) { L.push("", "Technical requirements:"); R.specs.forEach(([k, val]) => L.push(`- ${k}: ${val}`)); }
      if (R.stds.length) { L.push("", "Required EU standards / certifications:"); R.stds.forEach(([c, t]) => L.push(`- ${c}${t ? " – " + t : ""}`)); }
      let n = 0; const P = s => L.push(`${++n}. ${s}`);
      L.push("", "Please quote:");
      P(`Unit price for ${q || "100 / 500 / 1,000"} units (tiered pricing, currency USD or EUR)`); P("Minimum order quantity (MOQ)" + (R.moq ? ` – our information: ${R.moq}` : ""));
      P("Sample availability, cost and lead time"); P("Production and delivery lead time");
      P("Compliance documents: EU Declaration of Conformity, test reports from an accredited laboratory for the standards above, REACH/RoHS where applicable");
      P(`Packaging details${fv("oem").value === "yes" ? " and private-label (OEM/ODM) options for our own brand" : ""}`);
      P(`Incoterms: ${incText()}`);
      if (freight()) P(`Freight: please quote ${freight()} to ${destEN()} incl. transit time`);
      P("Payment terms and validity of the offer");
      L.push("", "Please confirm that you are the manufacturer (factory) and send your business licence and factory address.");
      if (fv("meet").checked) L.push("", v && v.s ? `We will be in ${v.s} on ${v.sd} 2026 and would like to meet you and visit your factory – please let us know a suitable time and the factory address.`
        : "We will be in China from 15 to 27 November 2026 (Guangzhou, Foshan, Shenzhen, Yiwu, Shanghai incl. bauma CHINA) and would be glad to meet you or visit your factory – please let us know your availability.");
      L.push("", "Kind regards,", fv("sn").value || "[Name]", company(), fv("se").value || "[E-mail]"); if (fv("sp").value) L.push(fv("sp").value);
      if (fv("zh").checked) {
        const tr_ = { sea: fv("sea").checked, air: fv("air").checked };
        L.push("", "——", `您好！我们是${company()}，希望就以下产品询价（交货至${destZH()}）：${R.name_zh || R.name}${R.model ? "（型号 " + R.model + "）" : ""}。请提供 ${q || "100/500/1000"} 件的阶梯价、最小起订量、样品、交期、欧盟合规文件（CE符合性声明、认可实验室检测报告、REACH/RoHS）、包装及贴牌方案；贸易术语：${incs().join(" / ") || "请报价"}${fv("incpref").checked ? "，并请说明贵司首选的贸易术语" : ""}${tr_.sea || tr_.air ? "；运费：" + [tr_.sea ? "海运" : "", tr_.air ? "空运" : ""].filter(Boolean).join("和") + "至" + destZH() : ""}。` + (fv("meet").checked ? (v && v.s ? `我们将于2026年${v.sd}在${v.s}，希望拜访贵厂。` : "我们将于2026年11月15日至27日在中国（广州、佛山、深圳、义乌、上海宝马展），希望与贵司会面或参观工厂。") : "") + "谢谢！");
      }
      L.push("", "—", "A | E  GLOBAL TRADERS");
      return L.join("\n");
    }
    const enc = s => "=?UTF-8?B?" + btoa(unescape(encodeURIComponent(s))) + "?=";
    async function eml(to, bcc, body, name) {
      let att = "";
      if (R.img) { try { const b = await (await fetch(R.img)).blob(); const b64 = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(",")[1]); fr.readAsDataURL(b); });
        att = `--AEGTRFQ\r\nContent-Type: image/jpeg; name="${R.id}.jpg"\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename="${R.id}.jpg"\r\n\r\n${b64.replace(/.{76}/g, "$&\r\n")}\r\n`; } catch (x) {} }
      const b64 = s => btoa(unescape(encodeURIComponent(s))).replace(/.{76}/g, "$&\r\n");
      let logo = "";
      if (R.logo) { try { const lb = await (await fetch(R.logo)).blob(); logo = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(",")[1]); fr.readAsDataURL(lb); }); } catch (x) {} }
      const html = `<div style="font-family:Calibri,Arial,sans-serif;font-size:14px;line-height:1.5;color:#252524;white-space:pre-wrap">${esc(body)}</div>`
        + `<table role="presentation" style="margin-top:22px;border-top:1px solid #C8A573;padding-top:12px"><tr><td>${logo ? '<img src="cid:aegt-logo" width="200" alt="AE Global Traders" style="display:block;width:200px;height:auto">' : "<b>AE Global Traders</b>"}</td></tr></table>`;
      const alt = `--AEGTALT\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64(body + "\n\n--\nAE Global Traders")}\r\n--AEGTALT\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64(html)}\r\n--AEGTALT--\r\n`;
      const rel = `--AEGTREL\r\nContent-Type: multipart/alternative; boundary="AEGTALT"\r\n\r\n${alt}` + (logo ? `--AEGTREL\r\nContent-Type: image/png; name="aegt-logo.png"\r\nContent-Transfer-Encoding: base64\r\nContent-ID: <aegt-logo>\r\nContent-Disposition: inline; filename="aegt-logo.png"\r\n\r\n${logo.replace(/.{76}/g, "$&\r\n")}\r\n` : "") + "--AEGTREL--\r\n";
      const m = `X-Unsent: 1\r\nTo: ${to}\r\n${bcc ? "Bcc: " + bcc + "\r\n" : ""}From: ${fv("se").value}\r\nSubject: ${enc(subj())}\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary="AEGTRFQ"\r\n\r\n--AEGTRFQ\r\nContent-Type: multipart/related; boundary="AEGTREL"\r\n\r\n${rel}${att}--AEGTRFQ--\r\n`;
      const url = URL.createObjectURL(new Blob([m], { type: "message/rfc822" })); const l = document.createElement("a"); l.href = url; l.download = name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
    const mailto = (to, bcc, body) => { location.href = `mailto:${encodeURIComponent(to)}?${bcc ? "bcc=" + encodeURIComponent(bcc) + "&" : ""}subject=${encodeURIComponent(subj())}&body=${encodeURIComponent(body)}`; };
    const copy = async (btn, body) => { try { await navigator.clipboard.writeText(subj() + "\n\n" + body); btn.textContent = "✓"; setTimeout(() => btn.textContent = "⧉", 1500); } catch (x) { fv("txt").value = body; fv("txt").select(); } };
    function build() {
      const one = F.querySelector("input[name=mode]:checked").value === "one", vs = sel();
      fv("txt").value = text(one && vs.length ? vs[0] : null);
      F.querySelector("[data-all]").hidden = one; F.querySelector("[data-each]").hidden = !one;
      const noe = vs.filter(v => !v.e);
      F.querySelector("[data-noe]").innerHTML = !one && noe.length ? `<b>${esc(L3("Ohne E-Mail – Text kopieren und dort senden:", "No e-mail – copy the text and send it there:", "无邮箱 – 复制文本后在此发送："))}</b> ` + noe.map(v => (v.u || v.w) ? `<a href="${esc(v.u || v.w)}" target="_blank" rel="noopener">${esc(v.n)} ↗</a>` : esc(v.n)).join(" · ") : "";
      if (one) F.querySelector("[data-each]").innerHTML = vs.map((v, i) => `<div class="rfq-v"><span><b>${vname(v)}</b><br><span class="muted">${esc(v.e || L3("keine E-Mail", "no e-mail", "无邮箱"))}${v.s ? " · " + esc(L3("Reise", "trip", "行程")) + ": " + esc(v.s) : ""}</span></span><span class="rfqa">`
        + (v.e ? `<button type="button" class="btn on" data-o="mail" data-i="${i}">✉</button><button type="button" class="btn" data-o="eml" data-i="${i}">📎 .eml</button>` : "")
        + ((v.u || v.w) ? `<a class="btn" href="${esc(v.u || v.w)}" target="_blank" rel="noopener">${v.u ? "Made-in-China" : L3("Website", "website", "网站")} ↗</a>` : "")
        + `<button type="button" class="btn" data-o="copy" data-i="${i}">⧉</button></span></div>`).join("")
        + extra().map((x, i) => `<div class="rfq-v"><span><b>${esc(x)}</b></span><span class="rfqa"><button type="button" class="btn on" data-o="mailx" data-i="${i}">✉</button></span></div>`).join("");
    }
    F.addEventListener("change", build); F.addEventListener("input", e => { if (e.target.name !== "txt") build(); });
    const need = () => { if (!fv("sn").value || !fv("se").value) { fv(fv("sn").value ? "se" : "sn").focus(); return false; } return true; };
    F.addEventListener("click", async e => {
      const a = e.target.closest("[data-a]"), o = e.target.closest("[data-o]"); if (!a && !o) return;
      build(); const vs = sel();
      if (a) {
        const body = text(null), bcc = [...vs.filter(v => v.e).map(v => v.e), ...extra()].join(",");
        if (a.dataset.a === "copy") return copy(a, body);
        if (!need()) return;
        if (a.dataset.a === "mail") return mailto(fv("se").value, bcc, body);
        return eml(fv("se").value, bcc, body, `RFQ_${R.id}.eml`);
      }
      if (o.dataset.o === "mailx") { if (need()) mailto(extra()[+o.dataset.i], "", text(null)); return; }
      const v = vs[+o.dataset.i], body = text(v);
      if (o.dataset.o === "copy") return copy(o, body);
      if (!need()) return;
      if (o.dataset.o === "mail") return mailto(v.e, "", body);
      return eml(v.e, "", body, `RFQ_${R.id}_${v.n.replace(/[^A-Za-z0-9]+/g, "_").slice(0, 30)}.eml`);
    });
    rb.addEventListener("click", () => { build(); dlg.showModal(); });
  }
  // ---------- bauma exhibitor grid (IFA-style): filters on top, paginated cards, profile dialog with the company's product grid
  if (window.BAUMA) {
    const B = window.BAUMA, T = B.t, PER = 24, $ = id => document.getElementById(id);
    const q = $("bx-q"), cat = $("bx-cat"), ven = $("bx-venue"), ctry = $("bx-ctry"), grid = $("bx-grid"), pages = $("bx-pages"), cnt = $("bx-count"), dlg = $("bx-dlg");
    const chips = [...document.querySelectorAll("#bx-chips [data-p]")];
    let pri = "", page = 0, list = B.ex;
    const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const STOPW = /^(co|ltd|limited|group|inc|gmbh|company|corp|corporation|the|and|of|shanghai|china|international)\.?$/i;
    const ini = n => { const w = n.split(/[\s,.()（）\-]+/).filter(x => x && !STOPW.test(x)); return ((w[0] || n)[0] + ((w[1] || "")[0] || "")).toUpperCase(); };
    const hue = n => { let h = 0; for (const ch of n) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };
    const PRI = { "1": ["must", T.must], "2": ["visit", T.visit], "3": ["iftime", T.iftime] };
    const badge = p => PRI[p] ? `<span class="pri ${PRI[p][0]}">${esc(PRI[p][1])}</span>` : "";
    const logo = (x, c = "") => x.m && x.m.l ? `<span class="bx-logo im${c}"><img src="${x.m.l}" alt="" loading="lazy"></span>` : `<span class="bx-logo${c}" style="--h:${hue(x.n)}">${esc(ini(x.n))}</span>`;
    const sec = k => `<span class="bx-st">${esc(B.secs[k] || "")}</span>`;
    B.ex.forEach((x, i) => { x.i = i; x.k = (x.n + " " + x.b + " " + x.c + " " + (x.m ? x.m.n : "")).toLowerCase(); });
    function apply() {
      const s = q.value.trim().toLowerCase(), c = cat.value, v = ven.value, co = ctry.value;
      list = B.ex.filter(x => (!s || x.k.includes(s)) && (!c || x.cat.includes(c)) && (!v || x.v === v)
        && (!co || (co === "CN") === x.c.startsWith("China")) && (!pri || (pri === "own" ? x.own : x.p === pri)));
      page = 0; render();
    }
    const card = x => `<button type="button" class="bx-card${x.own ? " own" : ""}" data-i="${x.i}">${logo(x)}`
      + `<span class="bx-nm">${esc(x.n)}</span><span class="bx-booth">${esc([x.v, x.b].filter(Boolean).join(" · ") || "–")}</span>`
      + `<span class="bx-meta">${esc(x.c)}${x.pr.length ? ` · <b>${x.pr.length} ${esc(T.prods)}</b>` : ""}</span>`
      + `<span class="bx-tags">${badge(x.p)}${x.s.slice(0, 2).map(sec).join("")}</span></button>`;
    function render() {
      const n = list.length, np = Math.max(1, Math.ceil(n / PER)); page = Math.max(0, Math.min(page, np - 1));
      grid.innerHTML = list.slice(page * PER, page * PER + PER).map(card).join("") || `<p class="muted">${esc(T.none)}</p>`;
      cnt.textContent = T.shown.replace("{n}", n).replace("{t}", B.ex.length);
      if (np < 2) { pages.innerHTML = ""; return; }
      let h = `<button type="button" data-pg="${page - 1}"${page ? "" : " disabled"}>‹</button>`, last = -1;
      for (const i of [...new Set([0, page - 1, page, page + 1, np - 1])].filter(i => i >= 0 && i < np).sort((a, b) => a - b)) {
        if (i - last > 1) h += "<span>…</span>";
        h += `<button type="button" data-pg="${i}"${i === page ? ' class="on"' : ""}>${i + 1}</button>`; last = i;
      }
      pages.innerHTML = h + `<button type="button" data-pg="${page + 1}"${page < np - 1 ? "" : " disabled"}>›</button>`;
    }
    pages.addEventListener("click", ev => { const b = ev.target.closest("[data-pg]"); if (!b || b.disabled) return; page = +b.dataset.pg; render(); $("bx-bar").scrollIntoView({ block: "start" }); });
    chips.forEach(b => b.addEventListener("click", () => { pri = b.dataset.p; chips.forEach(o => o.classList.toggle("on", o === b)); apply(); }));
    q.addEventListener("input", apply); [cat, ven, ctry].forEach(el => el.addEventListener("change", apply));
    $("bx-reset").addEventListener("click", () => { q.value = cat.value = ven.value = ctry.value = ""; pri = ""; chips.forEach(o => o.classList.toggle("on", o.dataset.p === "")); apply(); });
    const prod = p => `<a class="card" href="${p.u}"><div class="img">${p.i ? `<img src="../${p.i}" alt="" loading="lazy">` : ""}<span class="badge ${p.d}">${esc(p.dl)}</span></div>`
      + `<div class="t"><span class="nm">${esc(p.n)}</span><div class="prices"><div><span class="muted">${esc(T.cn)}</span><b class="tab">${esc(p.cn)}</b></div>`
      + `<div class="de"><span class="muted">DE</span><b class="tab">${esc(p.de)}</b></div></div></div></a>`;
    function open(i) {
      const x = B.ex[i], m = x.m;
      const links = [x.x ? `<a href="https://community.b-china.cn/en/exhibition/info/${x.x}" target="_blank" rel="noopener">${esc(T.exh)} ↗</a>` : "",
        m ? `<a href="${m.h}">${esc(T.profile)}</a>` : "", m && m.w ? `<a href="${esc(m.w)}" target="_blank" rel="noopener">${esc(T.web)} ↗</a>` : ""].join("");
      const body = x.pr.length ? `<h4>${esc(T.prodsin)} (${x.pr.length})</h4><div class="grid bxp-grid">${x.pr.map(j => prod(B.P[j])).join("")}</div>`
        : `<p class="muted" style="margin-top:12px">${esc(T.noprod)}</p><div class="bxp-cats">${x.cat.map(c => `<a href="category/${B.cslug[c]}.html">${c} ${esc(B.cats[c])}</a>`).join("")}</div>`;
      dlg.innerHTML = `<div class="bxp"><div class="bxp-h">${logo(x, " lg")}<div><h3>${esc(x.n)}</h3>`
        + `<p class="muted">${esc([x.v, x.b, x.c].filter(Boolean).join(" · "))}${m ? " · " + esc(m.city) + (m.t ? " · Tier " + esc(m.t) : "") : ""}</p>`
        + `<div class="bx-tags">${badge(x.p)}${x.s.map(sec).join("")}</div></div><button type="button" class="bxp-x" aria-label="${esc(T.close)}">×</button></div>`
        + `<div class="bxp-l">${links}</div>${body}</div>`;
      dlg.querySelector(".bxp-x").addEventListener("click", () => dlg.close());
      dlg.showModal(); dlg.scrollTop = 0;
    }
    grid.addEventListener("click", ev => { const b = ev.target.closest(".bx-card"); if (b) open(+b.dataset.i); });
    dlg.addEventListener("click", ev => { if (ev.target === dlg) dlg.close(); });
    apply();
  }
  // ---------- internal city maps: tabs, optimised route (nearest neighbour + 2-opt), company table with logo + products by category
  if (window.CITYMAP) {
    const C = window.CITYMAP, T = C.t, built = {};
    const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const PRI = { "1": ["must", T.must], "2": ["visit", T.visit], "3": ["iftime", T.iftime], "": ["other", T.other] };
    const tabs = [...document.querySelectorAll(".mtabs [data-tab]")];
    const hav = (a, b) => { const r = Math.PI / 180, x = Math.sin((b[0] - a[0]) * r / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin((b[1] - a[1]) * r / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
    function route(P, start) {
      const n = P.length; if (n < 2) return [...Array(n).keys()];
      const left = new Set(P.keys()), ord = []; let cur = start || P[0];
      while (left.size) { let bi = -1, bd = Infinity; for (const i of left) { const d = hav(cur, P[i]); if (d < bd) { bd = d; bi = i; } } ord.push(bi); left.delete(bi); cur = P[bi]; }
      const pt = i => i < 0 ? (start || P[ord[0]]) : P[ord[i]];
      for (let pass = 0, better = true; better && pass < 40; pass++) {
        better = false;
        for (let i = 0; i < n - 1; i++) for (let k = i + 1; k < n; k++) {
          const a = pt(i - 1), b = pt(i), c = pt(k), d = k + 1 < n ? pt(k + 1) : null;
          if (hav(a, c) + (d ? hav(b, d) : 0) + 1e-9 < hav(a, b) + (d ? hav(c, d) : 0)) { ord.splice(i, k - i + 1, ...ord.slice(i, k + 1).reverse()); better = true; }
        }
      }
      return ord;
    }
    const nprod = c => c.cats.reduce((a, g) => a + g.it.length, 0);
    function gcj(lat, lon) {  // WGS-84 -> GCJ-02 (standard public formula; Gaode/AutoNavi tiles)
      if (lon < 72.004 || lon > 137.8347 || lat < 0.8293 || lat > 55.8271) return [lat, lon];
      const A = 6378245.0, EE = 0.00669342162296594323, PI = Math.PI, x = lon - 105, y = lat - 35;
      let dLat = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
      dLat += (20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2 / 3 + (20 * Math.sin(y * PI) + 40 * Math.sin(y / 3 * PI)) * 2 / 3 + (160 * Math.sin(y / 12 * PI) + 320 * Math.sin(y * PI / 30)) * 2 / 3;
      let dLon = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
      dLon += (20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2 / 3 + (20 * Math.sin(x * PI) + 40 * Math.sin(x / 3 * PI)) * 2 / 3 + (150 * Math.sin(x / 12 * PI) + 300 * Math.sin(x / 30 * PI)) * 2 / 3;
      const rad = lat / 180 * PI; let m = Math.sin(rad); m = 1 - EE * m * m; const sq = Math.sqrt(m);
      return [lat + dLat * 180 / ((A * (1 - EE)) / (m * sq) * PI), lon + dLon * 180 / (A / sq * Math.cos(rad) * PI)];
    }
    const row = (c, ord) => `<div class="cm-row" data-k="${esc(c.k)}"><span class="cm-ord ${PRI[c.p][0]}">${ord}</span>`
      + (c.l ? `<img class="cm-logo" src="${c.l}" alt="" loading="lazy">` : `<span class="cm-mono">${esc((c.n || "?")[0])}</span>`)
      + `<div class="cm-t"><b>${c.h ? `<a href="${c.h}">${esc(c.n)}</a>` : esc(c.n)}</b><small>${esc(c.b ? [c.v, c.b].filter(Boolean).join(" ") : c.loc)}${!c.b && c.pr && c.pr !== "street" ? " · ≈ " + esc(T["prec_" + c.pr] || "") : ""}${!c.b && c.lat == null ? " · –" : ""}</small></div>`
      + `<span class="pri ${PRI[c.p][0]}">${esc(PRI[c.p][1])}</span>`
      + (c.cats.length ? `<details class="cm-pd"><summary>${esc(T.products)} (${nprod(c)})</summary>${c.cats.map(g => `<div class="cm-cat"><b>${g.c} · ${esc(g.cn)}</b>${g.it.map(p => `<a href="${p.u}">${esc(p.n)}</a>`).join("")}</div>`).join("")}</details>`
        : `<span class="muted cm-np">${esc(T.noprod)}</span>`) + "</div>";
    const chipsHTML = list => `<div class="bx-chips">${["1", "2", "3", ""].map(p => { const n = list.filter(c => c.p === p).length; return n ? `<button type="button" data-p="${p}" class="${p ? "on" : ""}">${esc(PRI[p][1])}<b>${n}</b></button>` : ""; }).join("")}</div>`;
    function wire(sec, on, draw) {
      sec.querySelectorAll(".bx-chips [data-p]").forEach(b => b.addEventListener("click", () => { const p = b.dataset.p; on.has(p) ? on.delete(p) : on.add(p); b.classList.toggle("on", on.has(p)); draw(); }));
    }
    function buildStop(id) {
      const S = C.stops.find(s => "s" + s.id === id), sec = document.getElementById("tab-" + id), on = new Set(["1", "2", "3"]);
      sec.innerHTML = `<div class="cm-bar">${chipsHTML(S.cos)}<span class="cm-info"></span><a class="cm-gm" target="_blank" rel="noopener">${esc(T.gm)} ↗</a></div>`
        + `<div class="cm-wrap"><div class="cm-map"></div><aside class="cm-tab"></aside></div>`;
      const box = sec.querySelector(".cm-map"), tab = sec.querySelector(".cm-tab");
      let map = null, layer = null, gcjOn = true;
      const P = ll => gcjOn ? gcj(ll[0], ll[1]) : ll;  // Gaode tiles use GCJ-02: shift WGS-84 points so pins sit exactly on the map
      if (window.L) {
        map = L.map(box, { scrollWheelZoom: true });
        const gd = L.tileLayer("https://webrd0{s}.is.autonavi.com/appmaptile?lang=en&size=1&scale=1&style=8&x={x}&y={y}&z={z}", { subdomains: "1234", maxZoom: 18, attribution: "© AutoNavi / Gaode" }).addTo(map);
        const es = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", { maxZoom: 18, attribution: "Tiles © Esri" });
        const bases = { [T.amap]: gd, [T.esri]: es };
        if (/^https?:$/.test(location.protocol)) bases.OpenStreetMap = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap" });
        L.control.layers(bases).addTo(map); layer = L.layerGroup().addTo(map);
        let terr = 0; gd.on("tileerror", () => { if (++terr === 4 && map.hasLayer(gd)) { map.removeLayer(gd); es.addTo(map); gcjOn = false; draw(); } });
        map.on("baselayerchange", ev => { gcjOn = ev.layer === gd; draw(); });
        map.setView(S.c || [30.5, 116], S.c ? 10 : 5);
      } else box.innerHTML = `<p class="muted" style="padding:20px">${esc(T.nomap)}</p>`;
      const focus = k => { tab.querySelectorAll(".cm-row").forEach(r => r.classList.toggle("hl", r.dataset.k === k)); const r = tab.querySelector(`.cm-row[data-k="${CSS.escape(k)}"]`); if (r) r.scrollIntoView({ block: "nearest" }); };
      function draw() {
        const sel = S.cos.filter(c => on.has(c.p)), pts = sel.filter(c => c.lat != null), noloc = sel.filter(c => c.lat == null);
        const ordered = route(pts.map(c => [c.lat, c.lon]), S.c).map(i => pts[i]);
        let km = 0, prev = S.c; ordered.forEach(c => { if (prev) km += hav(prev, [c.lat, c.lon]); prev = [c.lat, c.lon]; });
        sec.querySelector(".cm-info").textContent = T.info.replace("{n}", ordered.length).replace("{km}", Math.round(km));
        const gm = sec.querySelector(".cm-gm"), wp = [...new Set(ordered.map(c => c.lat + "," + c.lon))].slice(0, 10);
        gm.href = wp.length ? "https://www.google.com/maps/dir/" + (S.c ? S.c.join(",") + "/" : "") + wp.join("/") : "#"; gm.classList.toggle("hide", !wp.length);
        tab.innerHTML = `<div class="cm-h">${esc(S.n)}<small>${esc(S.d)} · ${sel.length} ${esc(T.cos)}</small></div>` + ordered.map((c, i) => row(c, i + 1)).join("") + noloc.map(c => row(c, "–")).join("");
        if (map) {
          layer.clearLayers(); const ll = ordered.map(c => P([c.lat, c.lon])), sc = S.c ? P(S.c) : null;
          if (ll.length) L.polyline(sc ? [sc, ...ll] : ll, { color: "#9C7A4A", weight: 3, opacity: .85, dashArray: "6 6" }).addTo(layer);
          if (sc) L.circleMarker(sc, { radius: 6, color: "#1A1410", weight: 2, fillColor: "#fff", fillOpacity: 1 }).bindTooltip(S.sl || T.start).addTo(layer);
          const dup = {}, spot = c => { const q = P([c.lat, c.lon]), key = c.lat.toFixed(3) + "," + c.lon.toFixed(3), n = dup[key] = (dup[key] || 0) + 1; if (n === 1) return q;
            const a = n * 2.4, r = 0.0022 * Math.sqrt(n); return [q[0] + r * Math.sin(a), q[1] + r * Math.cos(a) * 1.15]; };  // display-only fan-out of identical (city-level) positions
          ordered.forEach((c, i) => L.marker(spot(c), { icon: L.divIcon({ className: "cm-pin " + PRI[c.p][0], html: `<span>${i + 1}</span>`, iconSize: [24, 24], iconAnchor: [12, 12] }) })
            .bindTooltip(`${i + 1}. ${esc(c.n)}`).on("click", () => focus(c.k)).addTo(layer));
          if (!draw.fitted) { if (ll.length) map.fitBounds(L.latLngBounds(sc ? [sc, ...ll] : ll).pad(0.12)); else if (sc) map.setView(sc, 10); draw.fitted = true; }
        }
      }
      wire(sec, on, draw); draw();
      return { map };
    }
    function buildBauma() {
      const sec = document.getElementById("tab-bauma"), on = new Set(["1", "2", "3"]);
      sec.innerHTML = `<div class="cm-bar">${chipsHTML(C.bauma)}<span class="cm-info"></span></div><aside class="cm-tab wide"></aside>`;
      function draw() {
        const sel = C.bauma.filter(c => on.has(c.p)); let h = "", last = "";
        sel.forEach((c, i) => { const g = (c.v || "–") + " · " + (c.hall || "–"); if (g !== last) { h += `<div class="cm-grp">${esc(g)}</div>`; last = g; } h += row(c, i + 1); });
        sec.querySelector(".cm-tab").innerHTML = h;
        sec.querySelector(".cm-info").textContent = T.binfo.replace("{n}", sel.length);
      }
      wire(sec, on, draw); draw();
      return { map: null };
    }
    function show(id) {
      if (!document.getElementById("tab-" + id)) id = "ov";
      tabs.forEach(b => b.classList.toggle("on", b.dataset.tab === id));
      document.querySelectorAll(".mtab").forEach(s => s.classList.toggle("hide", s.id !== "tab-" + id));
      if (id !== "ov" && !built[id]) built[id] = id === "bauma" ? buildBauma() : buildStop(id);
      const m = built[id] && built[id].map; if (m) setTimeout(() => m.invalidateSize(), 60);
      try { history.replaceState(null, "", id === "ov" ? location.pathname : "#" + id); } catch (e) {}
    }
    tabs.forEach(b => b.addEventListener("click", () => show(b.dataset.tab)));
    if (location.hash.length > 1) show(location.hash.slice(1));
    window.addEventListener("hashchange", () => show(location.hash.slice(1) || "ov"));
  }
})();
