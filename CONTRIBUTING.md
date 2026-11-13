# Contributing

Thanks for helping make Framer Lighthouse 100 better. The skill grows from real audits, so results and edge cases from your own Framer sites are the most useful thing you can share.

## Ways to help

### Report a gap

Something the skill missed, a fix that didn't clear an audit, or advice that turned out wrong. Open an [issue](https://github.com/studiohans-agency/framer-lighthouse-100/issues/new/choose) using the "Audit problem" template and include:

* The URL (or a test copy of the site)
* Mobile and desktop scores before and after
* The audit that wouldn't clear, with the element PageSpeed names
* What the skill did, and what actually fixed it, if you found out

### Share a result

Before and after scores on a real Framer site, and which fixes mattered most. Use the "Share a result" template. With your permission, good results can go into the README.

### Improve the skill

1. Open an issue first for anything that changes the rules in `SKILL.md`, so we can agree on it before you write it.
2. Fork the repo and make a branch.
3. Keep changes small and focused, one topic per pull request.
4. Test it: run the skill on at least one real Framer site, and say in the pull request what you tested and the scores.
5. Open a pull request using the template.

## Writing style for SKILL.md and the README

* Plain, direct English. Short sentences.
* Say what to do and why, with the real numbers (widths, sizes, ratios).
* Put every new finding into a bucket: ✅ fix now, ❓ ask first, or 🚫 can't fix.
* Anything that changes how a site looks needs the owner's OK. Keep it that way.
* Lessons from real audits go under "Pitfalls learned the hard way" in `SKILL.md`.
* Don't add client names or private URLs without permission.

## Scripts

* `scripts/` holds small scripts Claude runs during an audit. Keep them dependency light: Python standard library, Bash, or plain browser JavaScript.
* Browser scripts must run when pasted into the page and must not send data anywhere.
* Check the syntax before opening a pull request:

```bash
bash -n scripts/psi.sh
python3 -m py_compile scripts/*.py
node -e "new Function(require('fs').readFileSync('scripts/browser_audit.js','utf8'))"
```

## Releases

Releases are made by pushing a version tag, for example `v1.2.0`. A GitHub Action then builds `framer-lighthouse-100-v1.2.0.zip` and attaches it to the release. Add a line to [CHANGELOG.md](CHANGELOG.md) for every release.

## Code of Conduct

Everyone taking part follows the [Code of Conduct](CODE_OF_CONDUCT.md).
