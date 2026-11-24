# Regenta UK: Webflow custom code

Custom JavaScript for the Regenta UK Webflow site (site `68362e432005a0afe1416a06`). Vite builds it into `dist/site.js`, which is committed and served by jsDelivr from a git tag. One small snippet in the Webflow **footer** (`snippets/loader.html`) loads it. This is the same setup as Cocos Organic.

**Status (24 Nov 2026):** being moved over. The loader is in Site settings > Footer on `v2.4.0` (staging only so far) and carries the site-wide globals. Page code and embeds still hold the rest. Copies of the original code are in `snippets/`. The migration plan is below.

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

- `so-calculator.js`, `sd-calculator.js`: still loaded by the **live** calculator pages from tag `v1.0.0` until the next live publish. Staging now runs them from the bundle (`src/calculators/`). Tagged files stay on jsDelivr, so the root copies can be deleted once live is published; edit `src/calculators/` from now on.
- `slider.js`: loaded **unpinned from `@main`** by every development page (testimonials). Moving or changing it on `main` changes the live site. Delete it only after the development template loads the bundle instead.

## Snippets

Copies of the code on the site as of 24 Nov 2026, kept so any step can be undone by pasting the original back.

- `snippets/loader.html`: the loader, as in Site settings > Footer (VERSION there is the source of truth).
- `snippets/site-code/`: Site settings head and footer, exactly as read through the API.
- `snippets/page-code/`: Page settings head/footer for every page that has any, exactly as read through the API (CMS bindings included).
- `snippets/embeds/`: every embed that contains a script or style, taken from the published HTML. These show the rendered output (CMS values filled in), not the Designer source.
- This repo is public, so the Make webhook and Formspark addresses and the Google Maps keys are replaced with `REDACTED`. The originals are still in Webflow until later steps replace them. The only Maps key in use is the one on /property-search (Regenta Website project in Google Cloud, restricted to regenta.co.uk and regenta-uk.webflow.io).

## Custom code in the CMS

The Developments collection has a "Custom Code" rich-text field. In use on 24 Nov 2026:

- `jigsaw`, `dominion-house`: show the External gallery tab before Internal (script + style).
- `the-beacons` (archived): reorders the overview and USPs sections.

If more developments need this, a CMS switch plus a small module would be better than pasting script into each item. Many developments also have iframes (video embeds) in their rich text; those are content, not code.

## Migration plan

0. ✅ Save copies of the code and set up Vite with the loader. No site change.
1. ✅ (staging, 24 Nov) Removed dead code: the commented-out Slick on Home, and the broken map code and duplicate cmsfilter on the success and error pages. Home2, Christmas Home and SO Home are left alone because they're becoming drafts. The calculator loaders turned out not to be duplicated. The 404 page's `/develpoment/` redirect script is replaced by a 301 rule in Site settings > Publishing: `/develpoment/(.*)` → `/property-search`.
2. ✅ (staging, 24 Nov, `v2.0.0`) Site-wide globals into the bundle: footer year, `ps="grow"`, Safari button shift, price format, `ps-hide="on-touch"`. The loader went into Site settings > Footer, replacing the old footer scripts, and the two head scripts were removed. Then `v2.1.0`: the mobile menu toggle and navbar fade from the navigation component's embed (embed removed).
3. ✅ (staging, 24 Nov, `v2.2.0`) Development template, Property Search, Contact map, success-page text, news and services moved into the bundle:
   - `map` module (`[data-module="map"]`) on Property Search (`data-pins="location-item"`), Contact Us and the Developments template (lat/lng/name bound to CMS fields). The Maps key sits in `data-maps-key` in Webflow, not in this public repo.
   - `auto-scroll` module on the development hero gallery.
   - `global/development.js`: captions, unit filter, brochure panel, development navbar menu, price list, share button ("at Regenta", was "at SiteSales").
   - `global/testimonial-slider.js` replaces the unpinned `slider.js` (the root file can go once this is live).
   - `global/page-extras.js`: success/error page text, Property Search location dropdown, news YouTube autoplay, services Lottie resize.
   - Removed from Webflow: the map/gallery/caption/filter/slider code in the template footer, the brochure, navbar and share embeds (the price list embed keeps only its CSS), the location dropdown embed, and the Property Search, Contact, news, services and success-page code.
   - Still on the Developments template: the forms code (step 5), the hero CSS (step 6), the Finsweet accordion loader, and the noindex script in the head (remove once the CMS "Sitemap indexing" switch is set on unlisted developments).
   - Kept as before: the old embed's "click #default-sort on load" never ran (the gallery code replaced `window.onload`), so it isn't in the bundle either.
4. ✅ (staging, 24 Nov, `v2.3.0`) Calculators and the Shared Ownership FAQ in the bundle: `src/calculators/` (same code as `v1.1.0`, only the wrapper changed, plus a double-init guard; `window.SharedOwnershipCalculator` / `window.StampDutyCalculator` unchanged) and `src/global/faq.js`. Removed: the calculator loaders from both calculator pages' footers and from the two calculator components, and the script half of the FAQ embed (its CSS stays).
5. **Deferred (Luke, 24 Nov 2026):** forms stay exactly as they are until the #57 updates and other site work are live. Nothing in Make, Sugar or Brevo changes, and the form markup and scripts on the site are untouched (checked on staging: forms, hidden fields and form scripts identical to before). When this is picked up: Webflow forms plus a signed webhook to a `regenta-private` worker forwarding to Make (or the worker as the form endpoint with Turnstile), then new Make webhook addresses. The three Make scenarios are UK - Register Interest - v2, UK - Brochure Download - v2 and UK - Market Report Download, each answering with a 303 redirect the new route must reproduce.
6. ✅ (staging, 24 Nov) CSS out of custom code: the `ps="grow"` CSS moved from Site settings > Head into the `code-v2` component's css embed (with the fluid font size and other site CSS), and the development hero CSS moved from the template's page footer into its CSS embed. Site settings > Head now holds only cookie consent, GTM and the Finsweet scripts. The 404 page has no `code-v2` instance, so grow sections there show without the fade. 
7. ✅ (staging, 24 Nov, `v2.4.0`) Finsweet Attributes load per page from `src/global/finsweet.js`: each script is injected only when the page has its attribute (cmsfilter/cmssort on Property Search and development pages, rangeslider and mirrorclick on Property Search, richtext on case studies, numbercount in the stats component, accordion on service pages, Attributes v2 `fs-list` for the CMS sliders). Same script files and versions as before; inputactive (unused) dropped. Removed: the Finsweet tags in Site settings > Head, the rangeslider tag in Property Search's head, the accordion injector in the Developments template footer, and the loader embeds in the stats component and the Services template. Checked on staging against live: Property Search filters give the same results (tenure, bedrooms, price, location, clear), map toggle, development sliders and sort, About counters and the service accordion all work.
   - Still on v1 on purpose: moving cmsfilter/cmssort to Attributes v2 (`fs-list`) means renaming attributes across Property Search and the plot tables. Worth doing with #57's map view, which needs v2's list API anyway.
   - Seen on live and staging, not caused by this: the Formspark form embed on service pages and Contact Us calls `$` before jQuery loads (`$ is not defined`), so its dataLayer push probably never runs. Part of the deferred forms step.

Also decided: the leftover pages (Home2, Christmas Home, SO Home, Property Search - SO, Fabrica Resales, Calculator Dev) become Drafts. Development noindex uses the CMS "Sitemap indexing" switch instead of JS.

Each step is one staging publish, checked on regenta-uk.webflow.io before the next.
