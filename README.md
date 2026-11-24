# Regenta UK: Webflow custom code

Custom JavaScript for the Regenta UK Webflow site (site `68362e432005a0afe1416a06`). Vite builds it into `dist/site.js`, which is committed and served by jsDelivr from a git tag. One small snippet in the Webflow **footer** (`snippets/loader.html`) loads it. This is the same setup as Cocos Organic.

**Status (24 Nov 2026):** being moved over. The scaffold is in place, but the loader isn't in Webflow yet and the bundle is empty. The site still runs the old code in Site settings, Page settings and embeds. Copies of all of it are in `snippets/`. The migration plan is below.

## Develop

```bash
npm install
npm run dev     # terminal 1: rebuild on change
npm run serve   # terminal 2: serve dist/ at http://127.0.0.1:5500
```

Then open the site (staging or live) with `?dev` on the end of the URL. That browser loads `http://127.0.0.1:5500/site.js` until you visit with `?dev=off`. Everyone else keeps getting the tagged CDN build. Use Chrome, because Safari blocks localhost scripts on https pages.

## Conventions

- Hook JS to attributes, never to Webflow classes or IDs.
- Site-wide behaviour lives in `src/global/` and is listed in `GLOBALS` in `src/main.js`.
- Opt-in modules live in `src/modules/`. They're registered in `MODULES` and mount on `[data-module="<name>"]`. A module is `export default function (root) {}` and only queries inside `root`. `data-ready` on a root means it has been initialised.
- CMS values the JS needs go on elements as `data-` attributes, not printed into scripts.
- **CSS doesn't live in this repo.** It goes in a `code_css` HTML embed in Webflow, so it previews in the Designer.
- Form endpoints and secrets never go in this repo or the page. Forms submit through Webflow, and the workers in `regenta-private` handle anything after that.

## Release

```bash
npm run build
git add -A && git commit -m "<what changed>"
git push
git tag -a v2.0.0 -m "<what changed>"
git push origin v2.0.0
```

1. Check that `https://cdn.jsdelivr.net/gh/pixelsilo/regenta@v2.0.0/dist/site.js` returns 200 with the new build.
2. Bump `VERSION` in the Webflow loader (Site settings > Custom code > Footer) and publish to **staging** (regenta-uk.webflow.io) only.
3. Check the staging page: no console errors, and `[data-module]` roots have `data-ready`.
4. Publish live only after approval and Luke's go. A live publish ships every pending change on the site.

Rollback: set `VERSION` back to the previous tag and republish. Never move or re-push an existing tag, because jsDelivr caches tagged files permanently. Tags used so far: `v1.0.0`, `v1.1.0` (calculators). `v1.2.0` was deleted and must never be reused. The bundle starts at `v2.0.0`.

## Old files in the repo root (don't move yet)

- `so-calculator.js`, `sd-calculator.js`: loaded by the calculator pages from tags `v1.0.0` (live) and `v1.1.0` (staging). Tagged files stay on jsDelivr, so the root copies can go once the calculators are in the bundle.
- `slider.js`: loaded **unpinned from `@main`** by every development page (testimonials). Moving or changing it on `main` changes the live site. Delete it only after the development template loads the bundle instead.

## Snippets

Copies of the code on the site as of 24 Nov 2026, kept so any step can be undone by pasting the original back.

- `snippets/loader.html`: the new loader. Not pasted into Webflow yet.
- `snippets/site-code/`: Site settings head and footer, exactly as read through the API.
- `snippets/page-code/`: Page settings head/footer for every page that has any, exactly as read through the API (CMS bindings included).
- `snippets/embeds/`: every embed that contains a script or style, taken from the published HTML. These show the rendered output (CMS values filled in), not the Designer source.
- This repo is public, so the Make webhook and Formspark addresses are replaced with `REDACTED`. The originals are still in Webflow until step 5 replaces them.

## Migration plan

0. ✅ Save copies of the code and set up Vite with the loader. No site change.
1. ✅ (staging, 24 Nov) Removed dead code: the commented-out Slick on Home, and the broken map code and duplicate cmsfilter on the success and error pages. Home2, Christmas Home and SO Home are left alone because they're becoming drafts. The calculator loaders turned out not to be duplicated. The 404 page's `/develpoment/` redirect script is replaced by a 301 rule in Site settings > Publishing: `/develpoment/(.*)` → `/property-search`.
2. Site-wide globals into the bundle: footer year, `ps="grow"`, Safari button shift, price format, `ps-hide="on-touch"` (moved to CSS), nav. Luke pastes the loader, and the same publish removes the old code.
3. Development template, Property Search, Contact map, success-page text, news, services. One `map` module, using only the Property Search Maps key.
4. Calculators and the Shared Ownership FAQ into the bundle.
5. Forms: native Webflow submit plus a signed webhook to a worker (`regenta-private`), forwarding to Make. Contact Us uses Webflow email notifications. Remove the cookie-consent gate. Keep the `formSubmission` dataLayer event until GTM has been checked. Then rotate the old Make and Formspark addresses.
6. CSS from Site settings into a global `code_css` embed. Optionally move from Finsweet Attributes v1 to v2.

Also decided: the leftover pages (Home2, Christmas Home, SO Home, Property Search - SO, Fabrica Resales, Calculator Dev) become Drafts. Development noindex uses the CMS "Sitemap indexing" switch instead of JS.

Each step is one staging publish, checked on regenta-uk.webflow.io before the next.
