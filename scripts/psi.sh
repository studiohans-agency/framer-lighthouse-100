#!/usr/bin/env bash
# Run PageSpeed Insights through the public API, N times per form factor.
# Usage: scripts/psi.sh <url> [runs=3] [outdir=psi] [label=before]
# Optional: export PSI_KEY=<your Google API key> to avoid the shared daily quota.
set -uo pipefail
URL="${1:?usage: psi.sh <url> [runs] [outdir] [label]}"
RUNS="${2:-3}"
OUT="${3:-psi}"
LABEL="${4:-before}"
mkdir -p "$OUT"
KEY=""
[ -n "${PSI_KEY:-}" ] && KEY="&key=$PSI_KEY"
ENC=$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1],safe=""))' "$URL")
SLUG=$(python3 -c 'import sys,re;print(re.sub(r"[^a-z0-9]+","_",sys.argv[1].lower().split("//")[-1]).strip("_")[:60])' "$URL")
fail=0
for s in mobile desktop; do
  for i in $(seq 1 "$RUNS"); do
    f="$OUT/${LABEL}_${SLUG}_${s}_${i}.json"
    curl -s --max-time 120 "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=$ENC&strategy=$s&category=performance&category=accessibility&category=best-practices&category=seo$KEY" > "$f"
    if python3 -c 'import json,sys;d=json.load(open(sys.argv[1]));sys.exit(0 if "lighthouseResult" in d else 1)' "$f" 2>/dev/null; then
      echo "ok   $s run $i -> $f"
    else
      msg=$(python3 -c 'import json,sys
try:
  raw=open(sys.argv[1]).read()
  if not raw.strip(): print("no response: the network may block googleapis.com here")
  elif not raw.lstrip().startswith("{") and ("blocked" in raw.lower() or "forbidden" in raw.lower() or "proxy" in raw.lower()):
    print("no response: a proxy or firewall blocks googleapis.com here (" + raw.strip()[:80] + ")")
  else:
    d=json.loads(raw); print(d.get("error",{}).get("message","unknown error")[:200])
except Exception as e: print("not json:",e)' "$f")
      echo "FAIL $s run $i: $msg"
      rm -f "$f"; fail=1
      case "$msg" in *"no response"*) echo "NETWORK: use pagespeed.web.dev in the owner's browser instead (see SKILL.md)."; exit 3;; esac
      case "$msg" in *uota*|*ate*imit*) echo "QUOTA: the shared API quota is used up. Fall back to pagespeed.web.dev in the browser (see SKILL.md) or set PSI_KEY."; exit 2;; esac
    fi
    sleep 2
  done
done
exit $fail
