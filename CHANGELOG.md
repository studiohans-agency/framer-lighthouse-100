# Changelog

All notable changes to this skill. Versions follow [semantic versioning](https://semver.org/): a new minor version adds checks or fixes, a new major version changes how the skill works with you.

## [1.1.0] (2026-11-13)

### Added
* **Full site audit in the browser** (`scripts/browser_audit.js`): scrolls every page to the bottom, then checks every image, video, ticker, font, blur, embed, meta tag, heading and empty state, the real painted contrast, failed requests and third parties.
* **Reading the console and network logs** on every page.
* **PageSpeed in the owner's browser** as a fallback when the API is blocked or out of quota (`scripts/psi_browser.js`).
* **PDF report** (`scripts/report.py`), plus a full, detailed report in the chat.
* **Ask and keep asking:** one numbered list of everything that needs the owner's OK, repeated until every item is decided.
* **Tickers:** detection, and the suggestion to replace a ticker with a looping video of it.
* **Videos as WebM, images as WebP**, with the exact commands.
* **Fonts report:** every family and weight, file format, size and how often it is used.
* **Meta descriptions everywhere:** CMS templates, the 404 page, legal pages and every locale.
* **DeferredVideo** Framer code component that loads a hero video on first interaction.
* Logo, banner, Code of Conduct, Contributing guide, Security policy, issue and pull request templates, and release zips built automatically.

### Changed
* Contrast fixes are verified against the resolved color of the exact element, including breakpoint overrides and component variants, instead of assuming a token change worked.
* Lessons from two real client audits (mobile 75 to 100 and 73 to 100).

## [1.0.0] (2026-11-12)

First release: audit and fix a Framer site toward 100 in PageSpeed, with Framer's site optimization guidance and the Lighthouse 13.6 desktop breakpoint fix.

[1.1.0]: https://github.com/studiohans-agency/framer-lighthouse-100/releases/tag/v1.1.0
[1.0.0]: https://github.com/studiohans-agency/framer-lighthouse-100/releases/tag/v1.0.0
