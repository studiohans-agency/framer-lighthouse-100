#!/usr/bin/env python3
"""Summarise PageSpeed JSON runs: median scores and metrics, LCP element, every failing audit
with its affected elements, plus a full image inventory (not only the images Lighthouse flagged).

Usage: python3 scripts/psi_summary.py psi/before_*mobile*.json [--json out.json]
Pass all runs of ONE page and ONE form factor together, so the medians make sense.
"""
import json, sys, statistics

CATS = ["performance", "accessibility", "best-practices", "seo"]
METRICS = {
    "first-contentful-paint": "FCP",
    "largest-contentful-paint": "LCP",
    "total-blocking-time": "TBT",
    "cumulative-layout-shift": "CLS",
    "speed-index": "Speed Index",
}


def load(paths):
    runs = []
    for p in paths:
        try:
            d = json.load(open(p))
            if "lighthouseResult" in d:
                runs.append(d["lighthouseResult"])
        except Exception as e:
            print(f"skip {p}: {e}", file=sys.stderr)
    return runs


def items_of(audit):
    det = audit.get("details") or {}
    out = []
    for it in det.get("items", []) or []:
        node = it.get("node") or {}
        row = {
            "selector": node.get("selector") or it.get("selector"),
            "snippet": (node.get("snippet") or "")[:200],
            "label": node.get("nodeLabel"),
            "url": it.get("url") or ((it.get("source") or {}).get("url") if isinstance(it.get("source"), dict) else None),
            "explanation": (node.get("explanation") or it.get("description") or "")[:300],
            "wasted": it.get("wastedBytes") or it.get("wastedMs"),
            "total": it.get("totalBytes"),
        }
        # nested item lists (for example color contrast subitems)
        for sub in (it.get("subItems") or {}).get("items", []) or []:
            sn = sub.get("relatedNode") or {}
            row.setdefault("related", []).append(sn.get("snippet", "")[:120])
        out.append({k: v for k, v in row.items() if v not in (None, "", [])})
    return out


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    out_json = None
    if "--json" in sys.argv:
        out_json = sys.argv[sys.argv.index("--json") + 1]
        args = [a for a in args if a != out_json]
    runs = load(args)
    if not runs:
        sys.exit("no valid runs")
    med = lambda xs: statistics.median(xs) if xs else None
    scores = {c: med([round((r["categories"][c]["score"] or 0) * 100) for r in runs if c in r["categories"]]) for c in CATS}
    metrics = {}
    for k, name in METRICS.items():
        vals = [r["audits"][k]["numericValue"] for r in runs if k in r["audits"]]
        v = med(vals)
        metrics[name] = round(v, 3) if name == "CLS" else (round(v) if v is not None else None)
    # use the run closest to the median performance score for details
    perf = scores["performance"]
    rep = min(runs, key=lambda r: abs(round((r["categories"]["performance"]["score"] or 0) * 100) - perf))
    a = rep["audits"]
    lcp_el = items_of(a.get("largest-contentful-paint-element", {}))
    failing = []
    for aid, au in a.items():
        sc = au.get("score")
        if sc is None or sc >= 0.9 or au.get("scoreDisplayMode") in ("notApplicable", "manual", "informative"):
            continue
        failing.append({"id": aid, "score": sc, "title": au.get("title"), "display": au.get("displayValue"), "items": items_of(au)[:40]})
    failing.sort(key=lambda x: x["score"])
    # every image request, so oversized images that Lighthouse did not flag are still visible
    images = []
    for it in (a.get("network-requests", {}).get("details", {}) or {}).get("items", []) or []:
        if it.get("resourceType") in ("Image", "Media", "Font") or any(x in (it.get("mimeType") or "") for x in ("image", "video", "font")):
            images.append({"url": it.get("url"), "type": it.get("mimeType"), "kb": round((it.get("transferSize") or 0) / 1024)})
    images.sort(key=lambda x: -x["kb"])
    console = items_of(a.get("errors-in-console", {}))
    weight = a.get("total-byte-weight", {}).get("numericValue")
    res = {
        "url": rep.get("finalDisplayedUrl") or rep.get("finalUrl"),
        "formFactor": rep.get("configSettings", {}).get("formFactor"),
        "runs": len(runs),
        "runScores": [{c: round((r["categories"][c]["score"] or 0) * 100) for c in CATS} for r in runs],
        "scores": scores,
        "metrics": metrics,
        "lcpElement": lcp_el,
        "totalKB": round((weight or 0) / 1024),
        "failing": failing,
        "media": images[:60],
        "console": console,
        "lighthouseVersion": rep.get("lighthouseVersion"),
    }
    if out_json:
        json.dump(res, open(out_json, "w"), indent=1)
    print(f"# {res['url']} ({res['formFactor']}, median of {res['runs']} runs, Lighthouse {res['lighthouseVersion']})")
    print("scores:", scores, " per run:", res["runScores"])
    print("metrics (ms):", metrics, " total KB:", res["totalKB"])
    print("LCP element:", lcp_el[:1])
    print("\nFailing or weak audits:")
    for f in failing:
        print(f"  [{f['score']}] {f['id']}: {f['title']} {f['display'] or ''}")
        for it in f["items"][:8]:
            print("      ", json.dumps(it, ensure_ascii=False)[:240])
    print("\nHeaviest media and font requests (check these even if no audit flags them):")
    for m in images[:15]:
        print(f"  {m['kb']:>6} KB  {m['type']}  {m['url'][:120]}")
    if console:
        print("\nConsole errors:")
        for c in console:
            print("  ", json.dumps(c, ensure_ascii=False)[:240])


if __name__ == "__main__":
    main()
