// Framer Lighthouse 100: full page browser audit.
// Paste the whole file into the browser tool's JavaScript runner on the LIVE page
// (for example Claude in Chrome javascript_tool), then read the summary it returns.
// The full result stays in window.__flh so you can page through it:
//   JSON.stringify(window.__flh.images.slice(0,20))
//
// It scrolls the whole page first, so lazy loaded images, cards further down,
// tickers and videos are all loaded and measured, not only what PageSpeed saw.
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const vw = innerWidth, dpr = Math.max(2, devicePixelRatio || 1);
  const host = location.host;

  // 1. Scroll the full page slowly so every lazy element loads and every appear animation finishes
  const H = () => document.documentElement.scrollHeight;
  for (let y = 0; y < H(); y += Math.round(innerHeight * 0.6)) { scrollTo(0, y); await sleep(450); }
  scrollTo(0, H()); await sleep(1200);
  scrollTo(0, 0); await sleep(1500);
  await Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 4000); }))));
  await document.fonts.ready;

  const res = performance.getEntriesByType("resource");
  const byUrl = (u) => res.find((e) => e.name === u) || res.find((e) => u && e.name.split("?")[0] === u.split("?")[0]);
  const kb = (e) => (e ? Math.round((e.encodedBodySize || e.transferSize || 0) / 1024) : null);
  const visible = (el) => { if (el.closest && el.closest("[id^='__framer-editorbar'], #__framer-badge-container")) return false; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && +cs.opacity > 0.01; };
  const sel = (el) => { if (el.id) return "#" + el.id; const c = [...el.classList].slice(0, 2).join("."); return el.tagName.toLowerCase() + (c ? "." + c : ""); };
  const text = (el) => (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
  const fmt = (u, type) => { const m = (type || "").match(/(webp|avif|png|jpe?g|gif|svg|mp4|webm|mov|woff2?|ttf|otf)/i) || (u || "").split("?")[0].match(/\.(webp|avif|png|jpe?g|gif|svg|mp4|webm|mov|woff2?|ttf|otf)$/i); return m ? m[1].toLowerCase() : "?"; };

  // 2. Images: every <img> and CSS background image, rendered size vs file size
  const images = [];
  for (const img of document.images) {
    if (!visible(img)) continue;
    const r = img.getBoundingClientRect();
    const src = img.currentSrc || img.src;
    const need = Math.ceil(r.width * dpr);
    const e = byUrl(src);
    images.push({
      src: src.slice(0, 160), alt: img.getAttribute("alt"), w: Math.round(r.width), natural: img.naturalWidth,
      ratio: +(img.naturalWidth / Math.max(1, need)).toFixed(1), kb: kb(e), format: fmt(src, e && e.initiatorType),
      loading: img.loading, fetchpriority: img.getAttribute("fetchpriority"), aboveFold: r.top + scrollY < innerHeight,
      inCode: !!img.closest("[data-framer-component-type='CodeComponent'], [data-framer-name*='Code']"),
      card: sel(img.closest("a, article, li, [data-framer-name]") || img),
    });
  }
  document.querySelectorAll("*").forEach((el) => {
    const bg = getComputedStyle(el).backgroundImage;
    if (bg && bg.startsWith("url(") && visible(el)) {
      const u = bg.slice(4, -1).replace(/["']/g, "");
      const r = el.getBoundingClientRect();
      images.push({ src: u.slice(0, 160), css: true, w: Math.round(r.width), kb: kb(byUrl(u)), format: fmt(u), card: sel(el) });
    }
  });
  const oversized = images.filter((i) => (i.ratio && i.ratio > 1.6 && (i.kb || 0) > 60) || (i.kb || 0) > 300);
  const notModern = images.filter((i) => ["png", "jpg", "jpeg", "gif"].includes(i.format) && (i.kb || 0) > 30);

  // 3. Videos
  const videos = [...document.querySelectorAll("video")].map((v) => {
    const src = v.currentSrc || v.src || (v.querySelector("source") || {}).src || "";
    const e = byUrl(src); const r = v.getBoundingClientRect();
    return { src: src.slice(0, 160), format: fmt(src), kb: kb(e), w: Math.round(r.width), h: Math.round(r.height), videoW: v.videoWidth, videoH: v.videoHeight,
      autoplay: v.autoplay, muted: v.muted, loop: v.loop, controls: v.controls, poster: !!v.poster, preload: v.preload,
      duration: Math.round(v.duration || 0), aboveFold: r.top + scrollY < innerHeight, oversizedRes: v.videoWidth > Math.ceil(r.width * dpr) * 1.5 };
  });
  const iframes = [...document.querySelectorAll("iframe")].map((f) => ({ src: (f.src || "").slice(0, 120), title: f.title || null, aboveFold: f.getBoundingClientRect().top + scrollY < innerHeight, loading: f.loading }));

  // 4. Tickers, marquees and anything that never stops moving
  const snap = () => new Map([...document.querySelectorAll("body *")].filter((el) => el.children.length >= 2).map((el) => [el, getComputedStyle(el).transform]));
  const t0 = snap(); await sleep(700); const t1 = snap();
  const moving = [];
  for (const [el, tr] of t0) {
    if (t1.get(el) !== tr && visible(el)) {
      const r = el.getBoundingClientRect();
      if (r.width > vw * 0.6 || el.scrollWidth > el.clientWidth * 1.3) moving.push({ el: sel(el), name: el.getAttribute("data-framer-name"), w: Math.round(r.width), kids: el.children.length, y: Math.round(r.top + scrollY) });
    }
  }
  const infiniteCss = document.getAnimations().filter((a) => a.effect && a.effect.getComputedTiming().iterations === Infinity).map((a) => sel(a.effect.target || document.body)).slice(0, 20);

  // 5. Fonts
  const fontFiles = res.filter((e) => /\.(woff2?|ttf|otf)(\?|$)/i.test(e.name) || /font/.test(e.initiatorType)).map((e) => ({ url: e.name.slice(0, 140), format: fmt(e.name), kb: kb(e), startMs: Math.round(e.startTime) }));
  const faces = [...document.fonts].filter((f) => f.status === "loaded").map((f) => `${f.family.replace(/"/g, "")} ${f.weight} ${f.style}`);
  const usedFamilies = new Map();
  document.querySelectorAll("body *").forEach((el) => { if (el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) { const cs = getComputedStyle(el); const k = cs.fontFamily.split(",")[0].replace(/"/g, "") + " " + cs.fontWeight; usedFamilies.set(k, (usedFamilies.get(k) || 0) + 1); } });

  // 6. Meta and SEO
  const m = (q) => (document.querySelector(q) || {}).content || (document.querySelector(q) || {}).href || null;
  const meta = { title: document.title, titleLen: document.title.length, description: m('meta[name="description"]'), descLen: (m('meta[name="description"]') || "").length,
    canonical: m('link[rel="canonical"]'), robots: m('meta[name="robots"]'), ogImage: m('meta[property="og:image"]'), lang: document.documentElement.lang,
    favicon: !!document.querySelector('link[rel*="icon"]'), jsonLd: document.querySelectorAll('script[type="application/ld+json"]').length,
    framerDefaults: /My Framer Site|Made with Framer/i.test(document.title + " " + (m('meta[name="description"]') || "")) };

  // 7. Headings, landmarks, names and empty states
  const heads = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter(visible).map((h) => ({ tag: h.tagName, text: text(h).slice(0, 60) }));
  const headingJumps = []; let prev = 0;
  for (const h of heads) { const l = +h.tag[1]; if (prev && l > prev + 1) headingJumps.push(`${"h" + prev} -> ${h.tag} "${h.text}"`); prev = l; }
  const name = (el) => (el.getAttribute("aria-label") || el.getAttribute("title") || text(el) || [...el.querySelectorAll("img[alt]")].map((i) => i.alt).join(" ") || (el.querySelector("svg title") || {}).textContent || "").trim();
  const empty = {
    headings: [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter((h) => !text(h)).map(sel),
    links: [...document.querySelectorAll("a")].filter((a) => visible(a) && !name(a)).map((a) => ({ el: sel(a), href: a.getAttribute("href") })),
    deadLinks: [...document.querySelectorAll("a")].filter((a) => visible(a) && ["", "#", null].includes(a.getAttribute("href"))).map((a) => ({ el: sel(a), text: text(a).slice(0, 40) })),
    buttons: [...document.querySelectorAll("button,[role=button]")].filter((b) => visible(b) && !name(b)).map(sel),
    imgNoAlt: [...document.images].filter((i) => visible(i) && !i.hasAttribute("alt")).map((i) => (i.currentSrc || i.src).slice(0, 100)),
    inputsNoLabel: [...document.querySelectorAll("input,select,textarea")].filter((f) => f.type !== "hidden" && visible(f) && !(f.labels && f.labels.length) && !f.getAttribute("aria-label") && !f.getAttribute("aria-labelledby")).map((f) => ({ el: sel(f), type: f.type || f.tagName })),
    emptySections: [...document.querySelectorAll("section,[data-framer-name]")].filter((s) => visible(s) && s.getBoundingClientRect().height > 80 && !text(s) && !s.querySelector("img,video,svg,iframe,canvas")).map((s) => s.getAttribute("data-framer-name") || sel(s)).slice(0, 20),
    placeholderText: [...document.querySelectorAll("body *")].filter((el) => el.children.length === 0 && /lorem ipsum|max mustermann|placeholder|your text here|title goes here/i.test(text(el))).map((el) => text(el).slice(0, 60)).slice(0, 20),
  };
  const nestedLinks = [...document.querySelectorAll("a a")].map(sel);
  const ids = {}; document.querySelectorAll("[id]").forEach((e) => (ids[e.id] = (ids[e.id] || 0) + 1));
  const duplicateIds = Object.keys(ids).filter((k) => ids[k] > 1);
  const landmarks = { main: document.querySelectorAll("main,[role=main]").length, nav: document.querySelectorAll("nav,[role=navigation]").length, h1: heads.filter((h) => h.tag === "H1").length };

  // 8. Contrast from the RESOLVED colors the browser actually paints (not the token you think you set)
  const rgba = (s) => { const v = (s.match(/[\d.]+/g) || []).map(Number); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
  const lum = ({ r, g, b }) => [r, g, b].map((c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }).reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
  const blend = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const bgOf = (el) => { const stack = []; let hasImg = false; for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.backgroundImage !== "none") hasImg = true; const c = rgba(cs.backgroundColor); if (c.a > 0) { stack.push(c); if (c.a >= 1) break; } } let bg = { r: 255, g: 255, b: 255, a: 1 }; for (const c of stack.reverse()) bg = blend(c, bg); return { bg, hasImg }; };
  const cands = [];
  document.querySelectorAll("body *").forEach((el) => {
    if (!visible(el)) return;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) || ["INPUT", "SELECT", "TEXTAREA", "OPTION"].includes(el.tagName);
    if (!own || el.closest("[aria-hidden=true]") || el.closest("button:disabled, [disabled]")) return;
    const cs = getComputedStyle(el); let op = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) op *= +getComputedStyle(n).opacity;
    if (op < 0.1) return; // hidden hover or animation layer: check those states separately (see SKILL.md)
    const { bg, hasImg } = bgOf(el); const inSvg = !!el.closest("svg"); if (inSvg && !/^rgb/.test(cs.fill)) return; const fg0 = rgba(inSvg ? cs.fill : cs.color); const fg = blend({ ...fg0, a: fg0.a * op }, bg);
    const L1 = lum(fg), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700; const large = size >= 24 || (bold && size >= 18.66);
    const need = large ? 3 : 4.5;
    if (ratio < need) cands.push({ node: el, need, large, op, fg0, el: sel(el), framer: (el.closest("[data-framer-name]") || {}).getAttribute?.("data-framer-name"), text: (text(el) || el.placeholder || el.value || "").slice(0, 40), color: inSvg ? cs.fill : cs.color, svg: inSvg, overImage: hasImg });
  });

  // Verify each candidate with what is really painted behind it. Framer often draws a card's
  // background on a sibling layer, so walking up the ancestors alone gives false failures.
  const contrast = [];
  for (const c of cands.slice(0, 120)) {
    c.node.scrollIntoView({ block: "center" }); await sleep(60);
    const r = c.node.getBoundingClientRect();
    const stack = document.elementsFromPoint(r.left + Math.min(r.width / 2, 12), r.top + r.height / 2);
    const layers = []; let img = false;
    for (const n of stack) {
      if (n === c.node || c.node.contains(n)) continue;
      const cs = getComputedStyle(n); let o = 1; for (let k = n; k && k.nodeType === 1; k = k.parentElement) o *= +getComputedStyle(k).opacity;
      if (cs.backgroundImage !== "none" || n.tagName === "IMG" || n.tagName === "VIDEO" || n.tagName === "CANVAS") { img = true; break; }
      const col = rgba(cs.backgroundColor); if (col.a * o > 0) { layers.push({ ...col, a: col.a * o }); if (col.a * o >= 1) break; }
    }
    let bg = { r: 255, g: 255, b: 255, a: 1 }; for (const l of layers.reverse()) bg = blend(l, bg);
    const fg = blend({ ...c.fg0, a: c.fg0.a * c.op }, bg);
    const L1 = lum(fg), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    if (img) contrast.push({ el: c.el, framer: c.framer, text: c.text, color: c.color, bg: "image or gradient", ratio: null, need: c.need, check: "manual: text over an image, video or gradient" });
    else if (ratio < c.need) contrast.push({ el: c.el, framer: c.framer, text: c.text, color: c.color, bg: `rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)})`, opacity: +c.op.toFixed(2), ratio: +ratio.toFixed(2), need: c.need });
  }
  scrollTo(0, 0);

  // 9. Heavy effects
  const blurs = [];
  document.querySelectorAll("body *").forEach((el) => { const cs = getComputedStyle(el); for (const p of ["filter", "backdropFilter"]) { const mm = (cs[p] || "").match(/blur\(([\d.]+)px\)/); if (mm && +mm[1] >= 10 && visible(el)) blurs.push({ el: el.getAttribute("data-framer-name") || sel(el), prop: p, px: +mm[1] }); } });

  // 10. Network: failed requests, third parties, total weight
  const failed = res.filter((e) => e.responseStatus >= 400).map((e) => ({ url: e.name.slice(0, 140), status: e.responseStatus }));
  const third = {}; res.forEach((e) => { try { const h = new URL(e.name).host; if (h !== host && !/framer(usercontent)?\.com|framerstatic|framer\.app|framer\.website/.test(h)) third[h] = (third[h] || 0) + (kb(e) || 0); } catch (_) {} });
  const totalKB = res.reduce((s, e) => s + (kb(e) || 0), 0);
  let lcp = null;
  try { lcp = await new Promise((resolve) => { new PerformanceObserver((list) => { const l = list.getEntries().pop(); resolve(l ? { el: l.element ? sel(l.element) : null, text: l.element ? text(l.element).slice(0, 60) : null, ms: Math.round(l.startTime), url: (l.url || "").split("?")[0].slice(0, 120) } : null); }).observe({ type: "largest-contentful-paint", buffered: true }); setTimeout(() => resolve(null), 1500); }); } catch (_) {}

  const out = { url: location.href, viewport: `${vw}x${innerHeight}`, meta, landmarks, headingJumps, empty, nestedLinks, duplicateIds,
    images, oversized, notModern, videos, iframes, moving, infiniteCss, fontFiles, faces, usedFamilies: [...usedFamilies].sort((a, b) => b[1] - a[1]),
    contrast, blurs, failed, thirdParty: third, totalKB, lcp };
  window.__flh = out;
  const clean = (o) => JSON.stringify(o).replace(/(https?:\/\/[^"?\s]+)\?[^"\s]*/g, "$1");
  return clean({
    url: out.url, viewport: out.viewport, totalKB, lcp, meta,
    landmarks, headingJumps: headingJumps.slice(0, 10),
    empty: Object.fromEntries(Object.entries(empty).map(([k, v]) => [k, v.length ? v.slice(0, 6) : 0])),
    nestedLinks: nestedLinks.length, duplicateIds: duplicateIds.slice(0, 10),
    images: images.length, oversized: oversized.slice(0, 12), notModernFormat: notModern.length,
    videos, iframes, tickersOrLoops: moving.slice(0, 8), infiniteCss: infiniteCss.length,
    fonts: { files: fontFiles, nonWoff2: fontFiles.filter((f) => f.format !== "woff2").length, faces: faces.length },
    contrastFails: contrast.length, contrast: contrast.slice(0, 15), blursOver10: blurs.slice(0, 10),
    failedRequests: failed, thirdPartyKB: third,
  });
})();
