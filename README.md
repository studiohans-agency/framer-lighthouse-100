# Framer Lighthouse 100

An open source Claude skill that audits a Framer website and works toward a perfect **100 / 100 / 100 / 100** in PageSpeed Insights (Performance, Accessibility, Best Practices, SEO) on **mobile and desktop**, and hands you a PDF report at the end.

Made by [Studio Hans](https://studiohans.agency).

## What it does

1. **Measures properly.** Runs PageSpeed 3 times per device through the API, and also in your own browser on pagespeed.web.dev. Opens your live site, scrolls every page to the bottom, and reads the console and network logs.
2. **Finds what PageSpeed misses.** Checks every image (including cards and sliders far down the page that PageSpeed never flags), every video, ticker, font, blur, embed and script. Checks contrast using the colors your browser actually paints, and finds empty states and missing meta descriptions on every page, CMS template, 404 page, legal page and locale.
3. **Fixes what is safe**, without asking: alt text, heading tags, landmarks, button, link and form labels, image Resolution set to Auto, oversized images resized, images as WebP, videos compressed to WebM, GIF to video, deferred scripts, nested links, titles and meta descriptions, site language, favicon.
4. **Asks before anything you would notice**: fonts, colors, animations, tickers, breakpoints, embeds, scripts and existing copy. It sends one numbered list ("reply 1 yes, 2 no"), applies what you approve, and keeps going until every item is decided.
5. **Verifies.** Re-reads every change in Framer, checks the resolved values in the browser after you publish, and reruns PageSpeed.
6. **Reports in full, twice.** A detailed report in the chat: what is wrong and where, what it changed with before and after values, what it will change next, what it suggests, and what Framer controls. Plus a **PDF** of the same report, ready to download and share.

It never publishes your site unless you tell it to.

### Things it catches that a PageSpeed score alone doesn't

* Five portfolio card images of several megabytes each, below the fold, never flagged by PageSpeed.
* A contrast failure that survived a color fix, because the color the browser painted came from a different layer than the one that was changed. The skill now inspects the exact nodes and their resolved colors instead of assuming.
* A logo ticker that keeps phones busy on every frame. It suggests swapping it for a looping video of the same ticker, and can make that video for you.
* A hero video that keeps the mobile Speed Index high even though the page loads fast.
* Fonts that are not WOFF2, weights used once, and fallback fonts painting real text.
* Missing meta descriptions on CMS articles, the 404 page and legal pages.

## Results

Real client site (a premium car detailing business, built in Framer), PageSpeed Insights, median of 3 runs:

| | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| Mobile before | 75 | 100 | 100 | 100 |
| Mobile after | **100** | **100** | **100** | **100** |
| Desktop before | 88 | 100 | 100 | 100 |
| Desktop after | **100** | **100** | **100** | **100** |

The two fixes that mattered most:

* **Images and video:** WebP for images Framer couldn't optimize itself, a lighter mobile video, and loading the video only after the first scroll.
* **The desktop breakpoint:** PageSpeed tests desktop at 1350px wide. The site's desktop layout started at 1440px, so the test was scoring the tablet layout, where Framer rebuilds the hero after its code loads. Moving the desktop breakpoint to 1200px took desktop from 92 to 100.

Second real client site (a luxury villa in Croatia, German and English, built in Framer), single PageSpeed runs in the browser:

| | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| Mobile before | 73 | 92 | 100 | 100 |
| Mobile after | **100** | **100** | **100** | **100** |
| Desktop before | 99 | 91 | 100 | 100 |
| Desktop after | **100** | **100** | **100** | **100** |

What it took:

* **Changing the LCP element, not only the file sizes.** Cutting the home page from 12.6 MB to 2.2 MB (WebM hero video, every image resized) moved mobile only from 73 to 76. A phone only hero with the heading first, no animation, and the video in a block under it took mobile to 98 to 100.
* **A deferred video component** that loads the drone loop on the first touch or scroll, showing a brand colored panel until then.
* **Accessibility:** `aria-valuenow` on a custom before/after slider, a slightly darker grey on sand backgrounds, and a word by word text reveal that now starts invisible instead of faint.

## What's in the folder

| File | Purpose |
|---|---|
| `SKILL.md` | The instructions Claude follows |
| `scripts/psi.sh` | PageSpeed API runs, 3 per device |
| `scripts/psi_summary.py` | Medians, failing audits, every media and font request |
| `scripts/browser_audit.js` | Full page audit in the browser: images, video, tickers, fonts, meta, empty states, painted contrast, logs |
| `scripts/psi_browser.js` | Reads a finished pagespeed.web.dev report in the browser when the API is blocked or out of quota |
| `scripts/report.py` | Builds the PDF report |
| `components/DeferredVideo.tsx` | Framer code component: hero video that loads on first interaction, keeping it out of PageSpeed's test |
| `examples/report_example.json` | Example input for the PDF |

## Install

**Claude (claude.ai, desktop app):** Settings → Capabilities → Skills → upload the `framer-lighthouse-100` folder as a zip.

**Claude Code:** copy the folder to `~/.claude/skills/framer-lighthouse-100/`.

For the fixes, connect Claude to your Framer project (the Framer MCP server or the Framer plugin). For the browser checks, use Claude in Chrome or the Claude desktop app's browser. Without them, the skill still measures and gives you step by step instructions.

For the PDF, the report script uses Playwright, Chrome or WeasyPrint, whichever is installed.

## Use

> Use the framer-lighthouse-100 skill on https://yoursite.com

## License

MIT
