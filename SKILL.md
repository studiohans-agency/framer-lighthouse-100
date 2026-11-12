---
name: framer-lighthouse-100
description: Audit and fix a Framer website so it scores 100 in Lighthouse / PageSpeed Insights (Performance, Accessibility, Best Practices, SEO) on mobile and desktop. Measures with the PageSpeed API and in the owner's own browser, reads console and network logs, audits every image, video, font, ticker, color and meta tag on every page, fixes what is safe, asks before anything visible, keeps asking until every item is decided, and delivers a detailed report in the chat plus a downloadable PDF.
license: MIT
---

# Framer Lighthouse 100

You are getting a website built in Framer to 100 in all four PageSpeed categories on mobile and desktop. Work in five passes: **measure, fix, ask, verify, report**. Fix everything that is invisible to visitors straight away. Ask before anything that changes how the site looks, reads or behaves, and keep asking until every open item has a yes or a no. Never publish unless the owner tells you to.

PageSpeed is the referee, but it is not the whole audit. It only sees what loads in the first viewport of one page, it skips hidden states, and it trusts whatever color the browser happens to paint at that moment. This skill exists because the real problems are often the ones PageSpeed does not flag. Measure the whole site, not only the score.

## What you need

1. **The live URL** (the custom domain, or the `framer.website` address). If it is missing, ask for it before doing anything else.
2. **Access to the Framer project.** Use whichever Framer connection the session has (the Framer MCP server with `exec`, or the Framer plugin tools). Without it you can still measure and report, and give step by step instructions instead of fixing.
3. **A browser tool on the owner's computer** (Claude in Chrome, or the built in browser). Use it to run PageSpeed the way the owner sees it, to load the live site, and to read console and network logs. If none is available, say so and use the API and a headless browser instead.
4. **A shell** with `ffmpeg`, `cwebp` (or Node `sharp`) and Python. The helper scripts live in `scripts/`:

| Script | What it does |
|---|---|
| `scripts/psi.sh <url> [runs] [dir] [label]` | Runs the PageSpeed API 3 times per form factor, saves the JSON, detects the daily quota |
| `scripts/psi_summary.py <runs...> --json out.json` | Medians, LCP element, every failing audit with its elements, every media and font request by size, console errors |
| `scripts/browser_audit.js` | Paste into the browser on the live page. Scrolls the whole page, then audits images, videos, tickers, fonts, meta, headings, empty states, real painted contrast, blurs, failed requests and third parties. Result in `window.__flh` |
| `scripts/psi_browser.js` | Paste into a finished pagespeed.web.dev report. Waits for both reports, returns scores, metrics, LCP element, total weight and every failing audit with URLs stripped so browser tools don't block the output |
| `scripts/report.py report.json out.pdf` | Builds the PDF report |
| `components/DeferredVideo.tsx` | Framer code component for hero and decorative video that stays out of PageSpeed's critical path (see Video below) |

## The golden rules

* **Measure before and after**, 3 runs each, and use the median. Scores move 3 to 5 points between runs. One run proves nothing.
* **Never assume a fix worked. Verify it.** After every patch, read the node back from Framer, and after publishing, read the value the browser actually paints. A patch can land on the wrong breakpoint, a token can be overridden by a component variant, and a color can be hidden by opacity or a sibling layer. When an audit still fails after a fix, go to the exact element, read its resolved values, and fix the layer that really renders.
* **Audit the whole site.** Every page, every CMS template, the 404 page, legal pages, every locale, every breakpoint, every component state (hover, active, inactive, open, empty).
* **Never publish** unless the owner says so. Tell them when a publish is needed to see the result. Before reporting, check which branch you edited. If the owner publishes from main while your work sits on another branch, nothing changes.
* **Never delete originals.** New assets are added next to the old ones.
* **Sort every finding into a bucket:**

| Bucket | Meaning | Examples |
|---|---|---|
| ✅ Fix now | Invisible to visitors, can't hurt the design | Alt text, heading tags, landmarks, button and link names, form labels, image Resolution set to Auto, resizing oversized images, WebP for images Framer does not convert, recompressing a video to WebM at the same look, GIF to video, `defer` on scripts, missing titles and meta descriptions, favicon, `lang`, nested links, iframe titles |
| ❓ Ask first | Changes how the site looks, reads or behaves | Fonts, colors and contrast, animations, tickers, replacing a ticker with a video, autoplay, hiding a video on phones, breakpoint widths, removing or gating embeds and scripts, blur values, rewriting existing copy, titles or descriptions |
| 🚫 Can't fix | Framer's own platform | Framer runtime JavaScript (framer.mjs, motion.mjs), cache lifetimes on Framer files, small unused CSS from Framer, which images Framer lazy loads, the `<html lang>` value (set by the default locale in Site Settings → Localization, not through the API) |

* **Patch only what was approved.** When applying an approved change, target the exact layers it names. A project wide sweep (for example "every blur of 10px or more") also changes layers the owner never agreed to; list those as new ❓ items instead.

## Pass 1: Measure

### 1. List every page

Read the page list from the Framer project, plus `https://<site>/sitemap.xml`. Include CMS detail pages (one real item per template), the 404 page, legal pages and every locale (for example `/de/`). Performance is tested on the home page and the main landing pages; SEO, Accessibility and Best Practices are checked on all of them.

### 2. PageSpeed API, 3 runs per form factor

```bash
bash scripts/psi.sh https://example.com 3 psi before
python3 scripts/psi_summary.py psi/before_*_mobile_*.json --json psi/before_mobile.json
python3 scripts/psi_summary.py psi/before_*_desktop_*.json --json psi/before_desktop.json
```

The shared API quota runs out quickly. If `psi.sh` reports QUOTA, ask the owner for a free API key (`export PSI_KEY=...`), or use the browser method below and say in the report how many runs you could do.

If `psi.sh` reports NETWORK (for example `request blocked: no rule allows host "www.googleapis.com"` from a sandbox proxy), the workspace cannot reach Google at all. Don't retry with other commands; go straight to the browser method. The same proxy usually blocks plain `curl` of the live site too, so fetch pages and files from inside the browser tab instead.

### 3. PageSpeed in the owner's browser

Open `https://pagespeed.web.dev/analysis?url=<URL>` in a new tab in the owner's browser and wait for both reports. Read the result from the page, not from screenshots alone: run `scripts/psi_browser.js` (prefixed with `await`), which waits for both panels and returns everything with URLs stripped. Browser tools refuse to return text that contains query strings or cookie-like data, so always strip `?`, `=`, `&` and full URLs from anything you print.

* **Force a fresh run** after publishing by adding a throwaway query to the tested URL (`https://site.com/?r=2`, then `?r=3`...). Without it pagespeed.web.dev may show a cached report from before your change.
* Each browser run is one sample. When the API is unavailable, run at least two browser reports for the final numbers and say how many you ran. Useful selectors inside the report: `.lh-gauge__percentage` (scores), `.lh-metric__value` (metrics), `.lh-audit--fail` and `.lh-audit--average` (audits), `.lh-node__snippet` (affected elements, for example inside `#color-contrast`). The mobile and desktop reports live in separate tab panels.

**Never copy, replay or script pagespeed.web.dev's own network requests**, for example by reading its API call from the page's resource entries and firing it again. That reuses Google's private key, and browser safety checks will rightly flag it as an attack. For repeated runs, reload the normal page or use the public API from a shell.

### 4. The live site in the owner's browser

This is where the problems PageSpeed misses show up. For the home page and each main page:

1. Open the page in a new tab and let it load fully. Wait for every appear and scroll animation to finish before you judge anything.
2. Run `scripts/browser_audit.js` (paste the file into the JavaScript runner, prefixed with `await`). It scrolls the whole page first, so cards and images far down the page are loaded and measured. Read the returned summary, then page through `window.__flh` for details. Strip query strings from URLs when you print them, or browser tools may block the output.
3. **Read the console**: errors and warnings (`read_console_messages` with `onlyErrors`, pattern `error|warn|fail|refused|blocked`). Note each message and its source (an embed, custom code, a code component, or Framer).
4. **Read the network log**: failed requests (status 400 or higher), the heaviest files, third party hosts, and fonts or scripts loading before the first paint.
5. Repeat at phone width (412 px wide) and at **1350 px** wide, which is what PageSpeed's desktop test uses.

### 5. Inventory in the Framer project

Through the Framer connection, list:

* Breakpoints and their widths on every page and layout template.
* Every image fill (layers, components, CMS fields) with its Resolution setting and original pixel size.
* Every video: Video components and their source files, sizes, formats and settings (autoplay, loop, muted, controls, poster).
* Ticker components and any looping or scroll driven animation.
* Code components and overrides (read every code file).
* Project and page custom code (scripts, their position, `async` or `defer`).
* Fonts in use: text styles, families, weights, uploaded custom fonts and their format.
* Blurs and shadows of 10px or more.
* Per page SEO: title, description, social image, noindex, and the same for CMS templates (which should use CMS fields) and the site defaults.
* **Site Settings → Versions**: the latest published version should say **Optimized**. **Optimization Error** (red) holds every score back; fix its warnings first (nested links are a common cause).

### 6. Record

For each page and form factor: the four scores (median), FCP, LCP, TBT, CLS, Speed Index, **the LCP element**, every failing audit with its elements, and everything the browser audit found. Know how the test sees the page:

* **Mobile** is a 412 x 823 screen on slow 4G with a slowed CPU. **Desktop** is **1350 x 940**.
* Since Lighthouse 13.6, a text LCP that appears in the first paint counts the same as FCP, so a text hero is nearly free. An image or video LCP pays the full download.
* **Speed Index** measures how fast the visible page stops changing. Anything that keeps moving in the first viewport (a ticker, an autoplay video, a looping animation) keeps it high even when everything has loaded.

## Pass 2: Fix

Work through the sections in order. Performance usually has the biggest gap. After each group of fixes, read the changed nodes back from Framer to confirm the patch landed on the primary layer and on every breakpoint replica.

### A. Performance

**Order of attack.** Fix the LCP element first, then whatever loads before it, then overall weight. On a real site, cutting the home page from 12.6 MB to 2.2 MB (WebM video, every image resized) moved mobile only from 73 to 76, because the LCP element was still a large hero image or video. Changing what the LCP element is took it to 98 to 100. Read the LCP element from the report before touching anything else.

**1. Desktop breakpoint vs the 1350px test.**
Many Framer templates start Desktop at 1440px, so PageSpeed desktop actually tests the Tablet layout. When the tablet hero differs from the server rendered one, Framer rebuilds it after load and desktop LCP jumps to about 2 seconds while mobile scores 100.
Fix (❓ ask, it changes which layout 1200 to 1440px screens see): set Desktop to 1200px on every page and layout template, then check each page at 1200px for anything cramped.

**2. Make the LCP element cheap.**
* Text LCP: remove whatever delays it. Use **Appear** effects at the top of the page, not Scroll Animation, and check opacity 0 starting states and text effects on the heading and its parents. (❓ changing an animation is a design change.)
* Image LCP: WebP, sized close to its display size (about 1600px for full width desktop, 900 to 1000px for phones), not lazy loaded. In a code component give the `<img>` `fetchpriority="high"`, `decoding="async"`, `srcSet` and `sizes`.
* Video LCP or video poster: see Video below.
* **Phone hero (❓, it changes the phone layout).** On PageSpeed's slow phone, a full screen image or video hero rarely beats about 7 seconds, even when the file is small, because it competes with Framer's runtime and every other request. The reliable fix is a phone only hero where the heading is the largest thing on the first screen:
  * Text first: eyebrow, heading, subline. No Appear effect, text effect, parallax or loop on any of it (patch `appearEffect`, `textEffect`, `parallaxEffect` to `null` on the **phone breakpoint replica** only, so desktop and tablet keep them).
  * The media moves into a normal block under the text (`position: relative`, fixed height, rounded corners if the design allows), using `tree.move` within the phone replica.
  * Anything image like that is even partly inside the first 823px and larger than the heading becomes the LCP again. Either keep the block fully below the first screen, or keep it in view but render a plain placeholder background instead of the still image (see Video).
  * Result on a real site: mobile 76 → 98 to 100, LCP 7.0 s → 0.9 s, with the video still visible under the text on the first screen.

**3. Images: check every one, not only the ones PageSpeed lists.**
PageSpeed only flags images that load during its test. Images below the fold, inside cards, sliders, tabs and CMS lists often load later and are never flagged, even when each one is several megabytes. In one audit, the five portfolio cards were the biggest files on the site and PageSpeed said nothing about them. So use the browser audit's `oversized` and `notModern` lists and the media list from `psi_summary.py`, and look at every card grid.
* **First set Resolution to Auto** on every image fill. Framer only converts to WebP and resizes when Resolution is Auto. This changes nothing visible and is often the whole fix.
* An image is oversized when its file is more than about 1.6 times wider than twice its displayed width, or heavier than about 300 KB. Downscale the original to about 2x the largest display width and re-upload.
* **Every image should reach the browser as WebP** (or AVIF). After Auto is set, check the network log: anything still served as PNG, JPG or GIF is a case Framer does not convert (code components, embeds, CSS backgrounds in custom code, absurdly large originals). Convert those yourself:

```bash
cwebp -q 82 -resize 1600 0 in.png -o out.webp
# or: npx sharp-cli -i in.png -o out.webp --format webp --quality 82 resize 1600
```

* Keep the social sharing image (Open Graph) as JPG or PNG, since some platforms do not read WebP.
* Swap the reference on the layer, component variable or CMS field, then check visually that nothing shifted.
* **Swap a replaced asset everywhere in one pass.** The same file is often referenced as a layer fill, a component instance control, a component variable's default, a CMS item field, and on breakpoint replicas. Walk the whole tree, match the asset id inside the reference string (and inside `{ src }` image objects), patch every hit, then walk again to confirm zero references remain. Skip `metadata.socialImage` on the root and pages so the sharing image stays full quality.
* Practical sizes that kept the look on a real site: cards and grid images 1200px wide at WebP quality 72, full width photos and hero stills 1600px at quality 70. That cut each file by 50 to 70%.
* Framer usually lazy loads images below the fold, **but not always**. Check the network log for image requests that start at the same moment as the page (start time within the first ~200 ms). On one site every image on the home page, about 2 MB, loaded at once and competed with the hero on the slow mobile test. This can't be changed through the API, so the fix is making those files small, and making sure the LCP element doesn't depend on an image at all (see the phone hero above). Make sure the hero image itself is not lazy.
* **Images inside code components:** give each `<img>` a `sizes` value along with `srcSet` (for example `"(max-width: 809px) 100vw, 50vw"`), plus `loading="lazy"` and `decoding="async"` when below the fold. With `srcSet` but no `sizes`, browsers download the largest file, and PageSpeed lists it under "Improve image delivery".

**4. GIFs.** Convert to video (WebM, see below) and replace the GIF with a Video layer of the same size: autoplay, loop, muted, plays inline, no controls, first frame as poster. A GIF with transparency needs an animated WebP instead.

**5. Video: WebM, light, and only when needed.**
* **Framer serves uploaded videos at their original resolution and format.** It never makes a smaller version. So every video must be prepared before upload.
* Convert to **WebM (VP9)**, sized to how it is shown. A decorative or hero loop should usually be 1080px wide or less and under about 1.5 MB:

```bash
ffmpeg -i in.mp4 -vf "scale=1080:-2:flags=lanczos" -c:v libvpx-vp9 -crf 40 -b:v 0 -an -row-mt 1 -deadline good out.webm
# sharper version for a full screen or click to play view:
ffmpeg -i in.mp4 -c:v libvpx-vp9 -crf 34 -b:v 0 -row-mt 1 -deadline good out_hd.webm
```

  Drop the audio track (`-an`) for muted loops. Recompressing at the same look is ✅; a visibly softer video is ❓.
* In Framer, play WebM through the **Video component** (source Upload). A WebM set as a frame's fill does not play.
* Framer lazy loads videos that are muted, looped and without controls, and plays them only when visible. Prefer that for decorative video.
* **Compressing alone does not fix a video LCP on mobile.** PageSpeed's slow phone downloads about 1.6 Mbit/s, so even a 2 MB WebM shows after about 10 seconds. On a real site, 8.9 MB MP4 → 2.1 MB WebM moved mobile from 73 to 71 (noise). Do the WebM anyway for real visitors and payload, but tell the owner up front that the score needs one of the options below.
* **Keep the video out of the test with `components/DeferredVideo.tsx`.** It requests the video only on the first pointer move, tap, scroll, wheel or key press, or after a fallback timer once the page has loaded. Lighthouse never interacts, so the download falls outside its trace.
  * A fallback shorter than about 5 to 6 seconds after load still lands inside the trace (the mobile report showed the full video weight with 0.6 s and 2.5 s delays). Use 6 seconds.
  * What sits in the block until then decides the LCP. **Show Still on** puts a still image there, which becomes the LCP when it is in the first screen (mobile stayed at 74 to 76). **Show Still off** shows a plain placeholder background (a gradient in the brand colors), which is not an LCP candidate (mobile 98 to 100).
  * Swap it in next to the existing Video component (same parent, same size), hide the old one rather than deleting it, and set the still image and WebM in its controls.
* A video that keeps playing in the first viewport raises **Speed Index**, mostly on mobile. Options to offer (❓), from smallest to largest change: the deferred video above; a phone only hero with text first and the video block under it (see LCP above); a still image on phones with the video on larger screens; moving the video below the fold. Owners often reject "still image on phones", so lead with the first two.
* Showreels and long videos: a small muted loop in the page, with the full quality version in a click to play overlay, loads only when clicked. For long content, Framer recommends YouTube or Vimeo behind a click to load thumbnail (❓).
* A video that only plays on scroll or interaction should not download until then. In a code component, load the source on the first scroll, touch, pointer or key event.

**6. Tickers and anything that never stops moving.**
The browser audit lists elements whose transform keeps changing (`tickersOrLoops`) and infinite CSS animations. A Framer Ticker moves every item on every frame for as long as the page is open. On phones that costs main thread time (Total Blocking Time), and in the first viewport it keeps Speed Index high.
Alert the owner and offer options (❓):
* **Replace the ticker with a looping video of the ticker.** It looks the same, and a muted looping WebM is lazy loaded and decoded off the main thread. Offer to make the video: capture or rebuild the ticker row at 2x, render a seamless loop where the last frame meets the first, encode it as WebM, and drop it in with a Video component. Keep the logos' names as alt text or a visually hidden list so nothing is lost for screen readers and search.
* Slow it down, pause it when off screen, or show it only from tablet width up.
* Make it static on phones.

**7. Third party embeds and scripts.**
* Maps, YouTube, Calendly, chat widgets and similar iframes are heavy and often cause the console errors and third party cookies that cost Best Practices. Put them behind a click to load placeholder or a consent gate (❓). An embed that is empty or not ready yet (for example a booking link that does not exist yet) can be hidden until it is ready (❓).
* HubSpot forms and Spline scenes are heavy. To prove an embed is the problem, test a duplicate of the site without it.
* Check **Project settings → Custom code** and each page's custom code. External `<script src>` tags go at the end of `<body>` or get `defer` (✅ in most cases; test the feature afterwards). Scripts only one page needs belong on that page (❓). Removing analytics, pixels or widgets is ❓.
* Remove unused preconnect or preload tags to `fonts.googleapis.com` or `fonts.gstatic.com` when Lighthouse marks them unused.

**8. Fonts: report all of them, then ❓ ask.**
Never change fonts on your own. From the browser audit (`fonts`, `faces`, `usedFamilies`) and the Framer text styles, report:
* Every family and weight that loads, how many files, their sizes, and how often each is used. Four or more files on a page is worth flagging; a weight used once or twice is an easy cut.
* Fonts that are not WOFF2. **Custom fonts uploaded before November 2023 were not converted to WOFF2**; re-uploading the same file converts them.
* Weights outside Light to Extra Bold (Thin, Extra Light, Black), which Framer recommends avoiding.
* Custom uploads where a Google Font version exists (Google Fonts are subset to the characters used).
* Fallback fonts painting real text (for example generic `sans-serif` in `usedFamilies`), which usually means a font is missing or misnamed.
* Fonts loaded only by invisible elements. Framer's **Locale Selector** defaults to Inter, and it loads even when the selector is stretched invisibly over a custom language switch. Setting its font control to the site's own family (for example `{ fontSelector: "GF;Jost-regular" }`) drops a font file with no visible change (✅).
* Whether the LCP text waits on a font file (font requests before FCP in the network log).
Give concrete options ("drop Inter 300, used only in the footer note") and let the owner decide. Text styles lock font properties, so change or create a style rather than editing single layers.

**9. Code components and overrides.** Read every code file. Fix where invisible: large libraries for small jobs, work on mount that could wait, animation loops that run off screen, images without width and height, images rendered at full size without `srcSet`.

**10. Shadows and blurs.** Blur values of 10 or more (filter or backdrop filter) slow scrolling and animation, especially on sticky navs and large surfaces. Framer recommends keeping blur under 10. Report every one with its value; lowering it is ❓.

**11. Layout shift (CLS).** Give images, embeds and code components fixed sizes or aspect ratios. Make cookie banners overlay the page instead of pushing it.

### B. Accessibility

✅ Fix now:
* **Alt text** on every meaningful image, short and in the site's language. Decorative images get empty alt. Logo links get their name through the logo's alt text.
* **Headings:** one `h1` per page, no skipped levels. Text that only looks like a heading becomes `p`. Change the tag, never the style.
* **Landmarks:** content wrapped in a `main` region; navigation in `nav`.
* **Names:** icon only buttons and links get a label. Clickable frames that act as buttons get the button tag (then `aria-label` is allowed). Iframes get a `title`.
* **Forms:** every input, select and textarea has a label.
* **Site language** set in Site Settings so `<html lang>` is right. No duplicate IDs, valid ARIA. With Localization on, `<html lang>` follows the default locale, which the API cannot change: when a German site still reports `en-US`, tell the owner to set the default locale's language in Site Settings → Localization.
* **ARIA widgets in code components.** A custom control with `role="slider"` needs `aria-valuenow` (kept in sync with its value, for example through `useMotionValueEvent`), plus `aria-valuemin`, `aria-valuemax` and a label. Without `aria-valuenow`, both "ARIA required attributes" and "Accessibility tree is not well formed" fail on mobile and desktop.
* **Empty states.** Check the browser audit's `empty` lists and look for: headings with no text (often a hidden variant or an emptied CMS field; make them `p` or remove them), links with `href="#"` or none, buttons without names, sections that render as blank space, CMS lists with no items and no empty message, form success and error messages, placeholder copy like "Lorem ipsum" or "Max Mustermann", and the 404 page.

❓ Ask first:
* **Color contrast.** Report each failing pair with its current ratio and a passing replacement (4.5:1 for body text, 3:1 for text 24px and up or 18.66px bold). Show the exact swap before changing a brand color.
* Tap targets that are too small or too close, when fixing them changes spacing.

**How to fix contrast so it actually clears.** Lighthouse reports the color the browser paints, and that is not always the color you think you set. When a contrast audit still fails after your patch, stop patching tokens and do this:
1. Take the exact failing element from the audit (`.lh-node__snippet` on pagespeed.web.dev, or the `contrast` list in `window.__flh`).
2. Find it in the live page and read its **resolved** values: computed `color` (or `fill` for SVG text), the opacity of the element and all its ancestors, and what is really painted behind it (`document.elementsFromPoint`, because Framer often paints a card's background on a sibling layer rather than a parent). The browser audit does this for you.
3. Map it back to the Framer node and check every place the color can come from: the token's value, a hard coded value on the node, the **breakpoint replica** (tablet and phone overrides win over the primary layer), the **component variant** (hover, active, inactive, selected, open, disabled), **select and dropdown options**, **input placeholder** text, text inside **code components**, and opacity on a parent.
4. Patch the layer that really renders, then read it back, publish when the owner agrees, and confirm the resolved color in the browser again.

Also check states PageSpeed never sees: hover and active variants, open menus and dropdowns, inactive tabs, focused inputs, and text over images, videos or gradients (judge those by eye or sample the darkest and lightest pixels behind the text).

Contrast failures that come from animation and component variants, not from colors:
* **Word by word text reveals.** A Framer text effect (`textEffect` with tokenization `word`) that starts each word at a low opacity (for example 0.12) fails contrast for every word still waiting below the fold, because Lighthouse measures that faint state. Starting the words at opacity 0 fixes it: fully transparent text is ignored. Patch `"textEffect.style.opacity": 0` on every node with the effect, including breakpoint replicas (❓, the reveal starts from invisible instead of faint).
* **Navigation and switches in the wrong variant per breakpoint.** A component instance can use a different variant on each breakpoint replica. A dark label variant chosen for an open phone menu (light background) can also be set on the closed phone menu, where it sits over a dark hero. Check `$control__variant` on every breakpoint replica of the nav and its nested instances.
* **Muted grey on tinted backgrounds.** A grey that passes on white or off white can fail on a sand or beige section (4.31:1 on #F0EBE3). Check each text token against every background it sits on, and update the token plus any hard coded copies of the same hex (component controls, code component props).

### C. Best Practices

* **Console errors and warnings:** every message from the console log, with its source. Fix what comes from the project (custom code, code components, broken asset links); gate or remove (❓) what comes from embeds.
* **Failed requests** (404 and others) from the network log: broken image, font or script links.
* Third party cookies and deprecated APIs: almost always an embed. Suggest a consent gate or click to load (❓).
* Images with the wrong aspect ratio or far below their display resolution: fix the asset (✅).
* **Nested links** (a link inside a linked card or frame) break the HTML and cause Framer optimization warnings. Remove the outer link and keep the inner one, copying the destination first if the inner link is empty (✅ when the click target stays the same).
* HTTPS: Framer handles it. A failure points to the custom domain's DNS.

### D. SEO

✅ Fix when missing, on **every** page:
* A unique **title** (under about 60 characters) and **meta description** (about 140 to 160 characters) in the site's language. That includes CMS detail templates (bind the title and description to CMS fields so every article gets its own), the 404 page, legal pages, and every locale. Replace Framer's defaults ("My Framer Site", "Made with Framer") in the site settings. An existing title or description is ❓ before rewriting.
* Favicon and a social sharing image, on the site and on CMS templates.
* Descriptive link text. Changing visible text is ❓.
* No accidental noindex (thank you pages may be noindex on purpose). A canonical that points to the right domain (www or not, consistently).
* CMS detail pages: bind the page metadata to fields, `tree.patch(detailPage, { "metadata.title": tree.ref(titleVar, detailPage), "metadata.description": tree.ref(summaryVar, detailPage) })`. It reads back as `{{Title}}` and `{{Summary}}`.
* **"robots.txt is not valid: Timed out fetching resource"** (often desktop only, SEO 92) is usually PageSpeed's own fetch failing, not the site. Load `/robots.txt` in the browser, check it returns 200 quickly with valid rules and a sitemap line, then rerun. If it passes on the rerun, report it as a one off; don't change anything.
* "ARD manifest is invalid" (Agentic Resource Discovery) is a newer informational check for AI agents. It doesn't count toward the SEO score; mention it, don't chase it.
* Optional: JSON-LD structured data (Organization, LocalBusiness, WebSite, BreadcrumbList, FAQPage) in the page's custom code at the end of body.

## Pass 3: Ask, and keep asking

Present every ❓ item as one numbered list, each with what you would change, why, and the expected effect on the score. The owner answers in one line, for example "1 yes, 2 no, 3 yes".

Then:
* Apply the approved items right away, and verify each one.
* For a "no", note it in the report as a known cost and do not ask again.
* For an unclear answer, ask once more about that item only.
* New findings after a round (for example an audit that still fails after the fix) go into the next numbered list.
* Repeat until every item is approved, declined, or explained as unfixable. Then ask whether to publish (or ask the owner to publish) so you can verify.

Things that always need a yes first: publishing, deleting assets or pages, changing fonts, colors, copy, animations, breakpoints, embeds or scripts, and anything the owner will see.

## Pass 4: Verify

After the owner publishes:
1. Run PageSpeed again, 3 runs per form factor, API or browser.
2. Run `browser_audit.js` again on each page and read the console and network logs again.
3. Confirm the resolved values of every color you changed, every replaced asset (format and size in the network log), and every meta description.
4. If anything is below 100, read the failing audits again and go back to the matching section. A fix that did not clear is a reason to inspect the real element, not to repeat the same patch.

## Pass 5: Report

Always give **both**: a full, detailed report in the chat, and the PDF. The PDF is for keeping and sharing; the chat is where the owner reads and decides. Never reply with only "the report is ready", and never put findings only in the PDF.

The chat report is written in the owner's language and is as detailed as the findings need. It covers:

* **Scores**, before and after, mobile and desktop, as medians, with the key metrics and the LCP element.
* **What is wrong**: every problem found, grouped by category, each with where it is (page, section, layer or file), what it costs (score, kilobytes, seconds, contrast ratio) and how it was found (PageSpeed, browser audit, console or network log, Framer inventory). Include the problems PageSpeed did not flag.
* **What you changed**: every fix, with the before and after value (file size and format, color and ratio, tag, text added) and how you verified it.
* **What you will change next**, once approved or published.
* **What you suggest**: every ❓ item as a numbered question with the change, the reason and the expected effect, so the owner can answer "1 yes, 2 no".
* **What can't be fixed** from the project, and why.
* **The next step**, and a line saying the PDF report is ready to download (send the file itself with it).

Chat report outline:

```
## Lighthouse report: <site>

### Scores (median of 3 runs)
| | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| Mobile before / after | 75 / 100 | ... | ... | ... |
| Desktop before / after | 88 / 100 | ... | ... | ... |

Mobile: FCP 0.9 s, LCP 1.1 s (hero heading), TBT 40 ms, CLS 0, Speed Index 2.1 s
Desktop: ...

### What's wrong
**Performance**
* Five portfolio card images on the home page are 3000px PNGs shown at 560px (4.8 MB in total). PageSpeed didn't flag them because they load below the fold; the browser audit found them.
* The logo ticker under the hero moves 28 elements on every frame, which keeps phones busy and holds mobile Speed Index at 5.7 s.
* ...
**Accessibility**
* "Budget" field placeholder: #9CA3AF on white, 2.5:1 (needs 4.5:1). The color comes from the phone breakpoint override, not the token.
* ...
**Best Practices**: console errors and their source, failed requests ...
**SEO**: pages without a meta description, listed by URL ...

### ✅ Fixed
* Resized the five portfolio card images and served them as WebP: 4.8 MB → 0.7 MB. Checked in the network log.
* ...

### Next, once you approve or publish
* ...

### ❓ Needs your OK
1. Replace the logo ticker with a looping video. Why: it moves on every frame and slows phones. I can make the video.
2. ...
Reply with the numbers you approve, for example "1 yes, 2 no".

### 🚫 Can't be fixed from the project
* "Reduce unused JavaScript" for framer.mjs: Framer's own runtime.

### Next step
Publish, then I rerun PageSpeed 3 times on mobile and desktop.

📄 The full PDF report is ready to download: Lighthouse_report_<site>.pdf
```

PDF report: write a `report.json` (format at the top of `scripts/report.py`, example in `examples/report_example.json`) with the scores, metrics, LCP elements, fixed items, open questions, platform limits, media before and after, fonts, console findings, per page scores and optional screenshots, then:

```bash
python3 scripts/report.py report.json Lighthouse_report_<site>.pdf
```

Open the PDF and look at every page before sending it. Screenshots for the report are taken after the page has fully loaded and animations have finished. Be honest: if something cannot reach 100 (a required booking embed above the fold, a hero video the owner wants to keep), say why and what it costs.

## Working with Framer

* **Read before you write, and read back after.** `api.tree.get(id)` before a patch, `api.tree.patch(id, {...})`, then `get` again to confirm.
* **Breakpoint replicas.** Tablet and phone layers are replicas whose IDs are the breakpoint's ID followed by the primary layer's ID. An override on a replica wins over the primary layer, so check and patch the replicas too.
* **Tokens vs hard coded values vs variants.** A color can come from a color token, a value typed on the layer, or a component variant. Find which one renders before changing anything.
* **Uploading assets:** get an upload URL from the Framer connection, `curl -sS -X PUT --data-binary "@file" "<uploadUrl>"`, then pass the returned URL to `api.tree.assetReference(url)` and set it on the layer or component control. Keep the original asset.
* **Video:** use the Video component with an uploaded source for WebM. Settings: muted, loop, plays inline, no controls for decorative video. Its file control (`$control__srcFile`) needs an asset reference: pass the upload URL through `await api.tree.assetReference(url)` first. A plain URL string is rejected, and if you had already switched `$control__srcType` to `Upload` the video is left with no source, so read it back.
* **Removing an effect on one breakpoint:** patch `appearEffect`, `textEffect` or `parallaxEffect` to `null` on the breakpoint replica (for example the phone replica of the hero). The primary layer and other breakpoints keep theirs. Reorder layers inside a replica with `tree.move(replicaChildId, replicaParentId, index)`.
* **Code component and layout template quirks:** variant roots of components need a fixed pixel width (`auto` is silently ignored and shows as 200px); an absolutely positioned layout template instance pinned left and right still needs `width: "100%"` to stretch.
* **Text styles** lock font properties. Change the style, not single layers.
* **Branches:** check the active branch before editing and tell the owner where the work is. Merge into main only when the owner agrees.
* **Never publish** from the API unless the owner asked in this conversation.

## Pitfalls learned the hard way

* PageSpeed does not flag images that load after its test. Oversized images in portfolio cards, sliders and CMS grids are common and invisible to it. Always run the full page browser audit.
* A contrast patch that does not clear the audit usually changed the wrong layer: a token while a variant or breakpoint override renders, or a parent while a sibling layer paints the background. Inspect the resolved color of the exact element.
* Hidden hover layers and opacity 0 elements are not failures, but forcing everything visible (for screenshots or audits) makes them look like broken UI. Judge hidden states one at a time.
* Screenshots and scroll videos taken before animations finish show half revealed text. Wait for the page to load fully and for appear animations to complete.
* A desktop score stuck at 88 to 92 while mobile is 100 is usually the 1440px breakpoint, not images.
* A constantly moving hero video or ticker can raise mobile Speed Index to 5 seconds or more even when LCP is fast.
* A WebM set as a frame fill shows nothing. Use the Video component.
* Changing the hero font rarely helps. Framer loads fonts with `font-display: swap`. Check the LCP element and breakpoints first.
* Setting image Resolution to Auto often fixes "Improve image delivery" with no new uploads.
* A published version marked "Optimization Error" holds every score back. Nested links are a frequent cause.
* The shared PageSpeed API quota runs out after a few runs. Plan for the browser fallback or an API key. In sandboxed sessions the API may be blocked outright (403 from a proxy); `psi.sh` now reports that as NETWORK.
* Shrinking every file is not the same as fixing mobile performance. A real site went from 12.6 MB to 2.2 MB and from 73 to only 76; changing the LCP element to the hero heading took it to 98 to 100.
* A video "after page load" with a short delay still counts: PageSpeed's trace keeps recording for several seconds after load. Load on interaction, with a fallback of about 6 seconds.
* A still image or video block that peeks even 100px into the first phone screen can become the LCP again if it is larger than the heading.
* A word by word text reveal that starts at low opacity fails contrast on every word waiting below the fold.
* A desktop SEO 92 from a robots.txt timeout is usually PageSpeed's fetch, not the site. Verify the file and rerun before changing anything.
* Never replay pagespeed.web.dev's internal requests from the browser.
* Fix the biggest failing audits first; don't polish what the score ignores while the owner waits.

Sources: Framer Help, "Site optimization" (framer.com/help/articles/site-optimization); the Framer blog on Lighthouse 13.6 (framer.com/blog/lighthouse-13-6); and real audits of client sites built in Framer.
