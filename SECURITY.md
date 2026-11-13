# Security

## Reporting a problem

If you find a security problem in this skill or its scripts, please **don't open a public issue**. Email **hello@studiohans.agency** with:

* What you found and where (file and line, if you can)
* How to reproduce it
* What could happen if someone abused it

You'll get an answer within a few days. Once it's fixed, you'll be credited in the changelog unless you'd rather not be.

## What counts

* A script that could send page data, cookies or credentials anywhere
* Instructions in `SKILL.md` that could lead Claude to take an unsafe action, for example publishing a site, deleting assets or entering credentials without the owner's OK
* Anything that could expose an API key

## How the skill keeps you safe

* It never publishes your site unless you tell it to.
* It asks before any change you would notice, and never deletes original assets.
* The browser scripts only read the page they run on. They don't send data anywhere.
* It never reuses pagespeed.web.dev's internal requests or keys.
* Your PageSpeed API key, if you use one, stays in your own environment (`PSI_KEY`) and is never written into files.
