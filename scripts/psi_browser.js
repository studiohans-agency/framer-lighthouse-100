// Framer Lighthouse 100: read a finished report on pagespeed.web.dev.
// Open https://pagespeed.web.dev/analysis?url=<encoded URL> in the owner's browser, then run this file
// in the browser tool's JavaScript runner (prefixed with `await`). It waits until both the mobile and
// desktop reports are rendered, then returns scores, metrics, the LCP element and every failing audit.
//
// Tips:
// * Add a throwaway query to the tested URL (https://site.com/?r=2) to force a fresh run instead of a cached report.
// * Browser tools block output that contains URLs with query strings or cookie-like text. Everything below is
//   stripped down to file names, and characters like ? = & ; are removed, so the result gets through.
// * Never copy or replay pagespeed.web.dev's own network requests (see SKILL.md).
(async () => {
  for (let i = 0; i < 60; i++) {
    const ps = document.querySelectorAll("[role=tabpanel]");
    if (ps.length === 2 && [...ps].every((p) => p.querySelectorAll(".lh-gauge__percentage").length >= 4)) break;
    await new Promise((r) => setTimeout(r, 3000));
  }
  const strip = (s) => (s || "")
    .replace(/https?:\/\/[^\s"']+/g, (m) => "[" + m.split("?")[0].split("/").pop().slice(0, 32) + "]")
    .replace(/[?=&;]/g, " ").replace(/\s+/g, " ").trim();
  const panels = [...document.querySelectorAll("[role=tabpanel]")];
  return JSON.stringify(panels.map((p) => {
    const snip = (id) => [...p.querySelectorAll(`[id="${id}"] .lh-node__snippet`)].map((e) => strip(e.textContent).slice(0, 160)).slice(0, 6);
    return {
      formFactor: (p.getAttribute("aria-labelledby") || "").replace("_tab", ""),
      scores: [...p.querySelectorAll(".lh-gauge__percentage")].map((e) => e.textContent).slice(0, 4), // perf, a11y, best practices, seo
      metrics: [...p.querySelectorAll(".lh-metric")].map((m) => strip((m.querySelector(".lh-metric__title") || {}).textContent) + ": " + strip((m.querySelector(".lh-metric__value") || {}).textContent)),
      lcpElement: snip("lcp-breakdown-insight")[0] || null,
      totalWeight: strip((p.querySelector('[id="total-byte-weight"] .lh-audit__display-text') || {}).textContent),
      failing: [...p.querySelectorAll(".lh-audit--fail, .lh-audit--average")].map((a) => a.id + " | " + strip((a.querySelector(".lh-audit__title") || {}).textContent) + " | " + strip((a.querySelector(".lh-audit__display-text") || {}).textContent)),
      contrastNodes: snip("color-contrast"),
      ariaNodes: snip("aria-required-attr"),
    };
  }));
})();
