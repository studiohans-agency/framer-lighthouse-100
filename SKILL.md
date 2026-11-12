---
name: framer-lighthouse-100
description: Audit and fix a Framer website so it scores 100 in Lighthouse / PageSpeed Insights (Performance, Accessibility, Best Practices, SEO) on mobile and desktop. Safe fixes are applied directly; design or content changes are asked first. Ends with a clear report.
license: MIT
---

# Framer Lighthouse 100

You are improving a website built in Framer so that PageSpeed Insights scores it 100 in all four categories on both mobile and desktop. You work in three passes: **measure, fix, report**. You never change the look, the copy or the brand of the site without the owner's permission, and you never publish without being asked.

## What you need

1. **The live URL** of the site (for example `https://example.framer.website` or the custom domain).
2. **Access to the Framer project.** Use whichever Framer connection is available in this session (the Framer MCP server or the Framer plugin tools). If there is none, you can still measure and write the report, and give the owner step by step instructions for every fix instead of applying it.
3. Optional: a shell with `ffmpeg` and `cwebp` (or Node with `sharp`) for converting images and GIFs, and a browser tool for reading pagespeed.web.dev.

If the URL is missing, ask for it before doing anything else.

## The golden rules

* **Measure before and after.** Every claim in the report is backed by a PageSpeed run.
* **Run each test 3 times and use the median.** PageSpeed scores move a few points between runs. One run proves nothing.
* **Never publish** unless the owner says so. Tell them when a publish is needed to see the result.
* **Don't delete originals.** When you replace an asset, the old one stays in the Framer asset library.
* **Sort every finding into one of three buckets:**

| Bucket | Meaning | Examples |
|---|---|---|
| ✅ Fix now | Invisible to visitors, can't hurt the design | Alt text, semantic heading tags, image Resolution set to Auto, WebP for images Framer can't optimize, GIF to video, deferring external scripts, missing page titles and descriptions, link and button names, favicon, `lang` |
| ❓ Ask first | Changes how the site looks, reads or behaves | Fonts, colors (contrast), removing or changing animations, breakpoint widths, removing scripts or embeds, rewriting existing copy, titles or descriptions that already exist |
| 🚫 Can't fix | Caused by Framer's own platform | Framer runtime JavaScript ("Reduce unused JavaScript" on framer.mjs or motion.mjs), cache lifetimes on events.framer.com or framer.com files, small unused CSS from Framer |

Present the ❓ items as one grouped list of numbered questions so the owner can answer them all at once, for example "1 yes, 2 no, 3 yes".

## Pass 1: Measure

### Get the scores

Prefer the public PageSpeed API (no key needed for light use):

```bash
URL="https://example.com"
for s in mobile desktop; do
  for i in 1 2 3; do
    curl -s "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=$URL&strategy=$s&category=performance&category=accessibility&category=best-practices&category=seo" > psi_${s}_$i.json
  done
done
# scores
jq '[.lighthouseResult.categories[] | {(.id): (.score*100)}] | add' psi_mobile_1.json
# failing audits
jq -r '.lighthouseResult.audits[] | select(.score != null and .score < 1) | "\(.score)\t\(.id)\t\(.title)"' psi_mobile_1.json
```

If the API is rate limited or blocked, open `https://pagespeed.web.dev/analysis?url=<URL>` in a browser tool and read the report there, or ask the owner to paste screenshots of the mobile and desktop reports.

Run every page that matters (home, main service pages, contact), not only the home page.

### Check Framer's own optimization status

In Framer: **Menu → Site Settings → Versions**. The latest published version should say **Optimized**. If it says **Optimization Error** (red), Framer could not optimize the build. Open the warnings (Framer's help article "Address optimization warnings in your project") and fix those first, because nothing else will score well until they are resolved. Report this status in the final report.

### Record for each page and form factor

* The four scores (median of 3).
* FCP, LCP, TBT, CLS, Speed Index.
* **The LCP element** (Lighthouse shows it under "Largest Contentful Paint element"). This is the single most useful clue.
* Every failing audit with its affected elements and URLs.

### Know how the test sees the page

* **Mobile** emulates a 412 x 823 screen with a slow 4G connection and a slowed CPU.
* **Desktop** emulates a **1350 x 940** screen.
* Since Lighthouse 13.6, when the LCP is **text that appears in the very first paint**, LCP is counted the same as FCP. That makes a text hero almost free. An **image** LCP still pays the full cost of downloading the image.

## Pass 2: Fix

Work through the sections in order. Performance first, because it usually has the biggest gap.

### A. Performance

**1. Desktop breakpoint vs the 1350px test (very common in Framer).**
Framer templates often start the Desktop breakpoint at 1440px. PageSpeed desktop runs at 1350px, so it actually tests the **Tablet** layout. When the tablet hero differs from the server rendered one, Framer rebuilds it after its JavaScript loads, the LCP element is replaced, and desktop LCP jumps to around 2 seconds even though mobile scores 100.
Check: look at the breakpoints on the home page. If Desktop starts above 1350px and the desktop score is lower than mobile with a text LCP, this is the likely cause.
Fix (❓ ask first, it changes which layout 1200 to 1440px screens see): set the Desktop breakpoint width to 1200px on every page and on any layout template. Then screenshot each page at 1200px and fix anything cramped (fixed widths, nav, footer). Bonus for the owner: most 1280 to 1366px laptops now get the full desktop navigation.

**2. Make the LCP element cheap.**
* If the LCP is the hero heading: remove anything that delays it. Framer's guidance: on key elements at the top of the page, use **Appear** effects (they run before JavaScript loads) and **avoid Scroll Animation effects**. Also check "text effects" and opacity 0 starting states on the hero heading or its parents. If LCP is still late, shorten or remove the Appear effect on the LCP element itself. (❓ removing or changing an animation is a design change: ask, and offer to swap a Scroll Animation for an Appear effect, or keep the animation on elements below the hero.)
* If the LCP is an image: make it WebP, size it close to how it is displayed (around 1600px wide for full width desktop, 900 to 1000px for mobile), and make sure it is not lazy loaded. If a code component renders it, give the `<img>` `fetchpriority="high"`, `decoding="async"`, a `srcSet` and `sizes`.
* If the LCP is a video poster: same as the image rule, plus see "Video" below.

**3. Images (✅ fix now).**
Framer already converts images to WebP and resizes them, **but only when the image's Resolution is set to Auto**. So work in this order:
* **First, set Resolution to Auto** on every image fill (layers, components, CMS images). Images set to a fixed resolution such as Full or High skip part of Framer's optimization. This is the fix Framer itself recommends, and it changes nothing visible.
* **Upload normal images as they are** for images Framer renders. Framer's advice is not to pre-convert to WebP yourself when Auto is on.
* **Re-encode yourself only where Framer can't optimize**: images rendered inside code components (for example a video poster or a slider built in code), images in custom code or embeds, and originals that are absurdly large (for example a 6000px, 15 MB photo). For those, convert to WebP at quality 80 to 85 and downscale to about 2x the largest display width. Keep the social sharing image (Open Graph) as JPG or PNG, because some platforms don't read WebP.
* After Auto is set, rerun PageSpeed. If "Improve image delivery" still lists an image, that image is one of the cases above.
* Process for re-encoding: download the original, convert, upload the new file to the Framer project, swap the reference on the layer, component variable or CMS field. Check visually that nothing shifted.
* SVGs: Framer recommends placing an SVG inside a frame (create a frame, drop the image in it) rather than as a loose graphic.

```bash
cwebp -q 82 -resize 1600 0 in.jpg -o out.webp
# or: npx sharp-cli -i in.png -o out.webp --format webp --quality 82 resize 1600
```

* Framer lazy loads images below the fold by itself. Don't fight it. Just make sure the hero image is not lazy.

**4. GIFs (✅ fix now, with one exception).**
Animated GIFs are often several megabytes. Convert them to video:

```bash
ffmpeg -i in.gif -movflags +faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -c:v libx264 -crf 24 out.mp4
ffmpeg -i in.gif -c:v libvpx-vp9 -b:v 0 -crf 34 out.webm
```

Replace the GIF layer with a Framer Video layer using the same size and position: autoplay on, loop on, muted, plays inline, no controls, the first frame as the poster. Exception: if the GIF has transparency, MP4 loses it. Use an animated WebP instead, or ask the owner.

**5. Video.**
* **Framer always serves uploaded videos at their original resolution.** It does not make smaller versions for phones. So compress every uploaded video before upload (✅ if it looks the same): under about 4 MB for desktop, under about 1.5 MB for a separate mobile file.
* Framer lazy loads videos that are **muted, looped and without controls**, and only plays them when visible. Prefer that setup for decorative video.
* **Avoid autoplay** where it isn't essential, because it takes bandwidth from everything else on the page. (❓ ask, it changes the experience.)
* For long or content videos (talks, tutorials, showreels), Framer recommends **YouTube or Vimeo** via the components in the **Insert** menu, because they adapt quality to the connection and screen. Put them behind a click to load thumbnail if they sit above the fold. (❓ ask, it changes hosting.)
* Hero or background videos: add a poster image (WebP) and don't let the video block the first paint.
* A video that only plays on scroll or interaction should not download until that interaction happens. If a code component controls it, load the source on the first scroll, touch, pointer or key event.
* Offering a smaller mobile file, or swapping the video for the poster on phones, changes what visitors see: ❓ ask.

**6. Third party embeds and scripts.**
* Google Maps, YouTube, Calendly, chat widgets and similar iframes are very heavy. Put them behind a click to load placeholder or a consent gate (which also helps with privacy law in the EU). ❓ ask, because it changes what the visitor sees first.
* Framer lazy loads embeds, but they still add code. Heavy ones named by Framer: HubSpot forms and Spline 3D scenes. To prove an embed is the problem, test a **duplicate** of the site with the embed removed and compare scores. Never remove it from the real site without asking.
* Look in **Project settings → Custom code** (whole site) and **Page settings → Custom code** (one page). Report every script and say what it costs. Then apply Framer's rules:
  * A script that only one page needs (for example a newsletter form library) belongs in that page's custom code, not site wide. (❓ ask before moving it.)
  * External `<script src>` tags go at the **end of `<body>`** or get **`defer`**. Use `async` only if the script must run as early as possible. A script with neither is a problem. Adding `defer` to an analytics or library tag is ✅ in most cases, but test that the feature still works and ask if unsure.
  * Inline scripts and `type="module"` scripts are already fine.
  * Removing analytics, pixels or widgets is ❓ ask first.
* Remove preconnect or preload tags to `fonts.googleapis.com` or `fonts.gstatic.com` if Lighthouse marks them as unused. Framer hosts fonts itself, so these usually do nothing. (✅ if Lighthouse shows them unused, otherwise ask.)

**7. Fonts (report, then ❓ ask).**
Never change fonts on your own. Find and report:
* How many font families and weights load (each weight is a file). Four or more files on one page is worth flagging.
* Custom uploaded fonts in TTF or OTF instead of WOFF2. **Custom fonts uploaded before November 2023 were not converted to WOFF2.** Re-uploading the same font file in Framer converts it. This looks identical, so recommend it strongly, but the owner may need to do it because it needs the original font file.
* Weights outside **Light to Extra Bold** (Thin, Extra Light, Black). Framer recommends staying in that range so text doesn't flash invisible while fonts load.
* Custom uploaded fonts where a Google Font version exists. Framer recommends Google Fonts because only the characters the page needs are downloaded.
* Fonts used for only one small element.
* Whether the LCP text waits on a font (check the font files in the network waterfall before FCP).
Suggest concrete options, for example "drop the 300 weight, which is only used once in the footer", or "convert the uploaded TTF to WOFF2", and let the owner decide.

**8. Code components and overrides.**
Read every code file in the project. Flag and, where it changes nothing visible, fix:
* Large libraries imported for small jobs.
* Work done on mount that could wait (data fetching, heavy setup).
* Animation loops that run when off screen.
* Images inside components with no width and height (this causes layout shift).

**9. Shadows and blurs.**
Large shadows and blurs make scrolling and animations slow (this shows up as Total Blocking Time and a laggy feel, even when load time is fine). Framer recommends using them sparingly and keeping **blur values below 10**. Report every blur of 10 or more, especially background blur on sticky navs and large blurred images. Lowering a blur, or replacing a live blur with an image that is already blurred, is ❓ ask first.

**10. Layout shift (CLS).**
Give images, embeds and code components a fixed size or aspect ratio. Check fonts swapping in with very different sizes. Check cookie banners: make them overlay the page rather than push it.

### B. Accessibility

✅ Fix now (these don't change the design):
* **Alt text** on every meaningful image: short, specific, in the site's language. Decorative images get empty alt text.
* **Headings:** exactly one `h1` per page. Headings go in order (no jump from h2 to h4). Text that only looks like a heading but isn't one becomes a `p`. Change the tag only, never the text style.
* **Buttons and links need names.** Icon only buttons and links get an accessible label. Clickable frames that act as buttons get the button tag.
* **Site language:** set the correct language in Site Settings so `<html lang>` is right.
* Form fields have labels.
* No duplicate IDs, and ARIA roles are valid.

❓ Ask first:
* **Color contrast.** Report every failing pair with its current ratio and a suggested color that passes (4.5:1 for body text, 3:1 for large text). Show the owner the exact swap before changing a brand color.
* Tap targets that are too small or too close, when fixing them changes spacing.

### C. Best Practices

* Console errors: find the source (often a broken embed or custom code script) and report or fix it.
* Images displayed with the wrong aspect ratio, or at a far lower resolution than shown: fix the asset (✅).
* Third party cookies and deprecated APIs usually come from embeds: report, and suggest a consent gate (❓).
* HTTPS and a valid certificate: Framer handles this. If it fails, the custom domain DNS is the problem; tell the owner.

### D. SEO

✅ Fix now when missing:
* A unique **title** (under about 60 characters) and **meta description** (about 140 to 160 characters) on every page, in the site's language. If one already exists, ❓ ask before rewriting it.
* Favicon and social sharing image.
* Links have descriptive text (no bare "click here" without context). Changing visible link text is ❓ ask.
* The page is not set to noindex by accident. Check page settings and robots. (If a page is noindex on purpose, such as a thank you page, leave it.)
* Optional extras that help search and AI answers: JSON-LD structured data matching the business (Organization, LocalBusiness, WebSite, BreadcrumbList, FAQPage). Give the owner the code and where to paste it (Page Settings, Custom Code, end of body) rather than building a code component for it.

### After the fixes

Ask the owner to publish (or publish if they already said you may), then run the tests again, 3 times each, mobile and desktop. If a score is still below 100, read the failing audits again and go back to the matching section.

## Pass 3: Report

Finish with a short report in the owner's language:

```
## Lighthouse report: <site>

### Scores (median of 3 runs)
| | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| Mobile before / after | 75 / 100 | ... | ... | ... |
| Desktop before / after | 88 / 100 | ... | ... | ... |

### ✅ Fixed
* Converted 14 images to WebP (6.2 MB saved)
* Added alt text to 23 images
* ...

### ❓ Needs your OK
1. Move the desktop breakpoint from 1440px to 1200px. Why: PageSpeed tests desktop at 1350px, so it currently scores your tablet layout.
2. Remove the 300 font weight (used once). Why: one less file to load.
3. ...
Reply with the numbers you approve, for example "1 yes, 2 no".

### 🚫 Can't be fixed from the project
* "Reduce unused JavaScript" for framer.mjs: this is Framer's own runtime.
* ...

### Next step
Publish, then rerun PageSpeed 3 times on mobile and desktop.
```

Be honest. If something can't reach 100 (for example a required booking embed above the fold), say why and what it costs, and let the owner choose.

## Pitfalls learned the hard way

* A desktop score stuck at 88 to 92 while mobile is 100 is usually the breakpoint problem in A1, not images.
* Changing the hero font rarely helps. Framer already loads fonts with `font-display: swap`. Check the LCP element and breakpoints first.
* Scores can change between runs by 3 to 5 points. Don't call a change a win or a loss from one run.
* In Framer, text styles (presets) lock font properties. To change a font on one element, change or create a style instead of editing the layer.
* Video autoplay in a hero can quietly become the LCP. Give it a poster and delay loading the video itself.
* Don't fix things the score doesn't care about while the owner waits. Fix the biggest failing audits first.
* Before converting a pile of images, check their Resolution setting. Setting Auto often fixes "Improve image delivery" with no new uploads at all.
* A published version marked "Optimization Error" in Site Settings → Versions will hold every score back. Check it first.

Sources: Framer Help, "Site optimization" (framer.com/help/articles/site-optimization), and the Framer blog post on Lighthouse 13.6 (framer.com/blog/lighthouse-13-6), plus real fixes on client sites.
