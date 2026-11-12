#!/usr/bin/env python3
"""Build the PDF performance report from a report JSON file.

Usage: python3 scripts/report.py report.json [out.pdf]

report.json (fill in what you have, everything is optional except site):
{
  "site": "example.com",
  "date": "12 November 2026",
  "summary": "One or two sentences on where the site stands.",
  "scores": {                       # medians, before and after
    "mobile":  {"before": {"performance": 75, "accessibility": 92, "best-practices": 100, "seo": 100},
                "after":  {"performance": 100, "accessibility": 100, "best-practices": 100, "seo": 100}},
    "desktop": {"before": {...}, "after": {...}}
  },
  "metrics": {"mobile": {"FCP": 900, "LCP": 1100, "TBT": 30, "CLS": 0.0, "Speed Index": 1400}, "desktop": {...}},
  "lcp": {"mobile": "Hero heading", "desktop": "Hero heading"},
  "fixed":   [{"title": "Alt text on 23 images", "detail": "..."}],
  "ask":     [{"title": "Replace the logo ticker with a video", "why": "...", "impact": "..."}],
  "cant":    [{"title": "Reduce unused JavaScript (framer.mjs)", "detail": "Framer runtime"}],
  "media":   [{"item": "hero.webm", "before": "6.2 MB MP4", "after": "1.4 MB WebM"}],
  "fonts":   [{"font": "Inter 300, 400, 500", "note": "3 files, WOFF2"}],
  "console": ["Calendly: third party cookie warning"],
  "pages":   [{"url": "/", "mobile": 100, "desktop": 100}],
  "screenshots": [{"path": "shots/home_mobile.png", "caption": "Home, mobile"}],
  "next": ["Publish", "Rerun PageSpeed 3 times"]
}
"""
import base64, html, json, os, shutil, subprocess, sys, tempfile

CATS = [("performance", "Performance"), ("accessibility", "Accessibility"), ("best-practices", "Best Practices"), ("seo", "SEO")]


def color(v):
    if v is None:
        return "#9aa0a6"
    return "#0c8a4a" if v >= 90 else ("#c26a00" if v >= 50 else "#c5221f")


def gauge(v, label, small=False):
    size = 74 if small else 96
    r = size / 2 - 7
    c = 2 * 3.14159 * r
    frac = (v or 0) / 100
    return f"""<div class="g"><svg width="{size}" height="{size}" viewBox="0 0 {size} {size}">
<circle cx="{size/2}" cy="{size/2}" r="{r}" fill="{color(v)}14" stroke="#e8e8e8" stroke-width="6"/>
<circle cx="{size/2}" cy="{size/2}" r="{r}" fill="none" stroke="{color(v)}" stroke-width="6" stroke-linecap="round"
 stroke-dasharray="{c*frac:.1f} {c:.1f}" transform="rotate(-90 {size/2} {size/2})"/>
<text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-size="{22 if not small else 18}" font-weight="600" fill="{color(v)}">{'' if v is None else int(v)}</text></svg>
<div class="gl">{html.escape(label)}</div></div>"""


def esc(x):
    return html.escape(str(x)) if x is not None else ""


def li_list(items, keys):
    out = []
    for it in items:
        if isinstance(it, str):
            out.append(f"<li>{esc(it)}</li>")
            continue
        head = esc(it.get(keys[0], ""))
        rest = " ".join(f"<span class='d'>{esc(it[k])}</span>" for k in keys[1:] if it.get(k))
        out.append(f"<li><b>{head}</b>{'<br>' + rest if rest else ''}</li>")
    return "<ul>" + "".join(out) + "</ul>"


def img_tag(path):
    try:
        ext = os.path.splitext(path)[1].lstrip(".").lower() or "png"
        data = base64.b64encode(open(path, "rb").read()).decode()
        return f"<img src='data:image/{'jpeg' if ext in ('jpg','jpeg') else ext};base64,{data}'>"
    except Exception:
        return ""


def build_html(r):
    parts = []
    parts.append(f"""<section class="cover"><div class="eyebrow">Lighthouse performance report</div>
<h1>{esc(r.get('site'))}</h1><div class="date">{esc(r.get('date',''))}</div>
<p class="lead">{esc(r.get('summary',''))}</p></section>""")
    for dev in ("mobile", "desktop"):
        sc = (r.get("scores") or {}).get(dev)
        if not sc:
            continue
        rows = ""
        for phase in ("before", "after"):
            if sc.get(phase):
                rows += f"<div class='row'><div class='phase'>{phase.title()}</div>" + "".join(gauge(sc[phase].get(k), lab, small=True) for k, lab in CATS) + "</div>"
        met = (r.get("metrics") or {}).get(dev) or {}
        mt = "".join(f"<div class='m'><div class='mv'>{esc(v if k=='CLS' else (str(round(v/1000,1))+' s' if isinstance(v,(int,float)) and k!='TBT' else str(v)+' ms'))}</div><div class='ml'>{esc(k)}</div></div>" for k, v in met.items())
        lcp = (r.get("lcp") or {}).get(dev)
        parts.append(f"<section><h2>{dev.title()}</h2>{rows}<div class='metrics'>{mt}</div>{'<p class=small>Largest Contentful Paint element: <b>'+esc(lcp)+'</b></p>' if lcp else ''}</section>")
    if r.get("pages"):
        rows = "".join(f"<tr><td>{esc(p.get('url'))}</td><td style='color:{color(p.get('mobile'))}'>{esc(p.get('mobile'))}</td><td style='color:{color(p.get('desktop'))}'>{esc(p.get('desktop'))}</td></tr>" for p in r["pages"])
        parts.append(f"<section><h2>All pages, Performance</h2><table><tr><th>Page</th><th>Mobile</th><th>Desktop</th></tr>{rows}</table></section>")
    if r.get("fixed"):
        parts.append("<section><h2><span class='dot ok'></span>Fixed</h2>" + li_list(r["fixed"], ["title", "detail"]) + "</section>")
    if r.get("ask"):
        items = "".join(f"<li><b>{i+1}. {esc(a.get('title'))}</b><br><span class='d'>{esc(a.get('why',''))}</span>{'<br><span class=d><i>Expected: '+esc(a['impact'])+'</i></span>' if a.get('impact') else ''}</li>" for i, a in enumerate(r["ask"]))
        parts.append(f"<section><h2><span class='dot ask'></span>Needs your OK</h2><ol class='plain'>{items}</ol><p class='small'>Reply with the numbers you approve, for example \"1 yes, 2 no\".</p></section>")
    if r.get("cant"):
        parts.append("<section><h2><span class='dot no'></span>Controlled by Framer</h2>" + li_list(r["cant"], ["title", "detail"]) + "</section>")
    if r.get("media"):
        rows = "".join(f"<tr><td>{esc(m.get('item'))}</td><td>{esc(m.get('before'))}</td><td>{esc(m.get('after'))}</td></tr>" for m in r["media"])
        parts.append(f"<section><h2>Images and video</h2><table><tr><th>Asset</th><th>Before</th><th>After</th></tr>{rows}</table></section>")
    if r.get("fonts"):
        parts.append("<section><h2>Fonts</h2>" + li_list(r["fonts"], ["font", "note"]) + "</section>")
    if r.get("console"):
        parts.append("<section><h2>Console and network</h2>" + li_list(r["console"], ["message"]) + "</section>")
    if r.get("screenshots"):
        shots = "".join(f"<figure>{img_tag(s['path'])}<figcaption>{esc(s.get('caption',''))}</figcaption></figure>" for s in r["screenshots"])
        parts.append(f"<section><h2>Screenshots</h2><div class='shots'>{shots}</div></section>")
    if r.get("next"):
        parts.append("<section><h2>Next steps</h2>" + li_list(r["next"], ["step"]) + "</section>")
    parts.append("<footer>Measured with Google PageSpeed Insights (Lighthouse). Scores are medians of repeated runs and vary a few points between runs.</footer>")
    css = """
@page { size: A4; margin: 16mm 15mm; }
* { box-sizing: border-box; }
body { font-family: Inter, 'Helvetica Neue', Arial, sans-serif; color: #1d1f22; font-size: 10.5pt; line-height: 1.5; margin: 0; }
.cover { padding: 8mm 0 6mm; border-bottom: 1px solid #e4e4e4; margin-bottom: 6mm; }
.eyebrow { text-transform: uppercase; letter-spacing: .12em; font-size: 8pt; color: #6b6f76; }
h1 { font-size: 26pt; margin: 4pt 0 2pt; letter-spacing: -.01em; }
.date { color: #6b6f76; font-size: 9.5pt; }
.lead { font-size: 12pt; margin-top: 10pt; max-width: 150mm; }
section { page-break-inside: avoid; margin: 0 0 7mm; }
h2 { font-size: 13pt; margin: 0 0 8pt; display: flex; align-items: center; gap: 8px; }
.row { display: flex; align-items: center; gap: 14px; margin-bottom: 6pt; }
.phase { width: 52px; font-size: 9pt; color: #6b6f76; text-transform: uppercase; letter-spacing: .08em; }
.g { width: 92px; text-align: center; }
.gl { font-size: 8.5pt; color: #3c4043; margin-top: 2px; }
.metrics { display: flex; gap: 10px; margin-top: 8pt; flex-wrap: wrap; }
.m { border: 1px solid #ececec; border-radius: 8px; padding: 6pt 10pt; min-width: 92px; }
.mv { font-weight: 600; font-size: 11.5pt; }
.ml { font-size: 8pt; color: #6b6f76; }
ul, ol.plain { padding-left: 16px; margin: 0; }
ol.plain { list-style: none; padding-left: 0; }
li { margin: 0 0 6pt; }
.d { color: #4a4e54; font-size: 9.5pt; }
.small { font-size: 9pt; color: #5f6368; }
table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
th, td { text-align: left; padding: 5pt 6pt; border-bottom: 1px solid #eee; }
th { color: #6b6f76; font-weight: 500; }
.dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.dot.ok { background: #0c8a4a; } .dot.ask { background: #c26a00; } .dot.no { background: #9aa0a6; }
.shots { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
figure { margin: 0; } figure img { width: 100%; border: 1px solid #eee; border-radius: 6px; }
figcaption { font-size: 8.5pt; color: #6b6f76; }
footer { margin-top: 8mm; font-size: 8pt; color: #8a8f95; border-top: 1px solid #eee; padding-top: 4pt; }
"""
    return f"<!doctype html><html><head><meta charset='utf-8'><title>Lighthouse report {esc(r.get('site'))}</title><style>{css}</style></head><body>{''.join(parts)}</body></html>"


def to_pdf(html_path, pdf_path):
    # 1. Playwright (Python)
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            b = p.chromium.launch()
            pg = b.new_page()
            pg.goto("file://" + os.path.abspath(html_path))
            pg.pdf(path=pdf_path, format="A4", print_background=True, margin={"top": "16mm", "bottom": "16mm", "left": "15mm", "right": "15mm"})
            b.close()
        return "playwright"
    except Exception:
        pass
    # 2. Chrome or Chromium headless
    for exe in ("chromium", "chromium-browser", "google-chrome", "google-chrome-stable", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"):
        if shutil.which(exe) or os.path.exists(exe):
            r = subprocess.run([exe, "--headless", "--disable-gpu", "--no-sandbox", "--no-pdf-header-footer", f"--print-to-pdf={pdf_path}", "file://" + os.path.abspath(html_path)], capture_output=True)
            if r.returncode == 0 and os.path.exists(pdf_path):
                return exe
    # 3. WeasyPrint
    try:
        import weasyprint
        weasyprint.HTML(html_path).write_pdf(pdf_path)
        return "weasyprint"
    except Exception:
        return None


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    r = json.load(open(sys.argv[1]))
    pdf = sys.argv[2] if len(sys.argv) > 2 else f"Lighthouse_report_{r.get('site','site').replace('/','_')}.pdf"
    html_path = os.path.splitext(pdf)[0] + ".html"
    open(html_path, "w").write(build_html(r))
    how = to_pdf(html_path, pdf)
    if how:
        print(f"PDF written with {how}: {pdf}")
    else:
        print(f"No PDF engine found. HTML written: {html_path} (open it and print to PDF, or pip install playwright)")


if __name__ == "__main__":
    main()
