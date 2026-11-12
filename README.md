# Framer Lighthouse 100

An open source Claude skill that audits a Framer website and works toward a perfect **100 / 100 / 100 / 100** in PageSpeed Insights (Performance, Accessibility, Best Practices, SEO) on **mobile and desktop**.

Made by [Studio Hans](https://studiohans.agency).

## What it does

1. **Measures** every important page 3 times on mobile and desktop and records the scores, the LCP element and every failing audit.
2. **Fixes what is safe** without asking: alt text, heading tags, image resolution set to Auto, WebP where Framer can't optimize, GIF to video, deferred scripts, missing titles and descriptions, button and link names, site language, favicon.
3. **Asks before changing the design**: fonts, colors, animations, breakpoints, scripts, embeds and existing copy.
4. **Reports** before and after scores, what it fixed, what needs your OK, and what Framer's platform controls.

It never publishes your site unless you tell it to.

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

## Install

**Claude (claude.ai, desktop app):** Settings → Capabilities → Skills → upload the `framer-lighthouse-100` folder as a zip. Or paste the contents of `SKILL.md` into a new skill.

**Claude Code:** copy the folder to `~/.claude/skills/framer-lighthouse-100/`.

For the fixes, connect Claude to your Framer project (the Framer MCP server or the Framer plugin). Without it, the skill still measures and gives you step by step instructions.

## Use

> Use the framer-lighthouse-100 skill on https://yoursite.com

## License

MIT
