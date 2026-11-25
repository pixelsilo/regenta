# Regenta UK: Webflow custom code

Custom JavaScript for the Regenta UK Webflow site (site `68362e432005a0afe1416a06`). Vite builds it into `dist/site.js`, which is committed and served by jsDelivr from a git tag. One small snippet in the Webflow **footer** (`snippets/loader.html`) loads it. This is the same setup as Cocos Organic.

**Status (24 Nov 2026):** being moved over. The loader is in Site settings > Footer on `v2.6.0` (staging only so far) and carries the site-wide globals. Page code and embeds still hold the rest. Copies of the original code are in `snippets/`. The migration plan is below.

## Develop

```bash
npm install
npm run dev     # terminal 1: rebuild on change
npm run serve   # terminal 2: serve dist/ at http://127.0.0.1:5500
```

Then open the site (staging or live) with `?dev` on the end of the URL. That browser loads `http://127.0.0.1:5500/site.js` until you visit with `?dev=off`. Everyone else keeps getting the tagged CDN build. Use Chrome, because Safari blocks localhost scripts on https pages.

**If bundle features don't work in your browser** (footer year blank, stats stuck at 0, no filters or maps), that browser is probably still in dev mode with no local server running. Visit any page with `?dev=off`; the console also warns about it.

## Conventions

- Hook JS to attributes, never to Webflow classes or IDs.
- Scroll reveals are Webflow interactions, not code (see Motion below).
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

## Motion (native Webflow interactions, no code)

The scroll reveals are Webflow interactions (Interactions panel), targeted by attribute so they work on any element on any page:

| Attribute | Interaction | Effect |
|---|---|---|
| `ps="grow"` | `ps=grow` | the element fades in and scales up from 95% (0.6s, ease-out) when its top reaches 85% of the viewport |
| `ps="grow-children"` | `ps=grow-children` | same effect on each direct child, staggered 0.2s (CMS card rows) |
| `ps="grow-group"` + `ps="grow-item"` | `ps=grow-group` | same effect on every `grow-item` inside the group, however deeply nested, staggered 0.2s. Used where a script restructures the markup: the Our Services carousel (Slick wraps the cards in its own `slick-list`/`slick-track`, so they stop being direct children). The group attribute sits on `slider_contain`, outside the element Slick rebuilds. |

Both play once and don't animate under `prefers-reduced-motion`. Webflow keeps the elements hidden until its interactions runtime starts, so there's no flash and nothing depends on the bundle. Edit timing or easing in the Interactions panel.

Where it's used: `grow-children` on the stats strip, the featured-developments cards, the news strip cards and the Home "strategic partner" banner (text, then image); `grow-group` on the Our Services carousel; `grow` on single elements everywhere else. Use `ps="grow-children"` on the parent for any row that should stagger. A Collection Item with its own grid placement gets a Webflow `w-node-…` id that repeats on every card, and a per-item scroll trigger then only animates the last card in the row (that was the case for the featured-developments and news strip cards, which now use `grow-children`).

## Property Search map view (#57)

Staging only so far (`v3.0.0`). The old pop-up map at the bottom of Property Search is gone. A **List / Map** switch sits beside the filters (`[data-map-view-toggle="list|map"]`, `.is-active` + `aria-pressed`). Map shows `[data-module="map-view"]`: a map that fills the window below the filters, with a compact list of developments alongside. On phones the map sits above the list.

- Built in the Designer, all styled with classes there: `view-toggle`, `map-view`, `map-view_sidebar`, `map-view_list`, `map-card` (+ `is-active`), `map-popup`. The sidebar is its own Developments Collection List (Live on Site, same order as the results). Each item carries `data-slug`, `data-lat` and `data-lng` bound to the CMS, a compact card (`[data-map-card]`) and a hidden pin card (`[data-map-popup]` in `map-popup_holder`) that's copied into the Google pop-up when a pin is clicked.
- Prices: each card has the Price Alternative ("Coming soon") and "From £…"; the script shows the alternative when it's filled in.
- The map follows the Property Search filters (below) through `lib/filters.js`. The pin icon on each results card has `data-map-focus` (bound to the slug) and opens the map on that development. Its old `javascript:` link and `fs-mirrorclick-element` in the embed are dead and stopped in the capture phase; tidy the embed in the Designer when convenient.
- `?view=map` opens the map on load, and the switch keeps it in the address.
- Speed (`v3.0.0`): the map is built as soon as the bundle starts, while hidden (fixed in the window, transparent, behind the page, `inert`), so Map opens on the next frame. Google skips drawing maps outside the window, which is why it isn't simply pushed aside. Card and pin clicks don't zoom (a zoom waits for new tiles: the first click used to take 2.4s, now about 5ms). The cards' photos are CMS originals with no responsive versions (26 photos, about 31 MB), so `map-view` parks them until the map is first opened, then loads them at thumbnail size using the `srcset` Webflow made for the same photo on the results cards. Every Property Search visit loads the map once, as the old bottom map did, which is what Google bills.
- Developments without coordinates (Jigsaw on 25 Nov) get no pin; clicking their card goes to the development page.
- Classic `google.maps.Marker` is still used. Moving to `AdvancedMarkerElement` needs a Map ID in Regenta's Google Cloud project.

### Property Search filters (no Finsweet)

Since `v3.0.0` Property Search runs no Finsweet scripts (only cookie consent). `global/property-filter.js` does the filtering: 26 developments, filtered instantly in the browser. Same results as Finsweet List v2 for every filter checked, including old v1 links.

- Form `[data-filter-form]`; selects `[data-filter-field="tenure|region|bedrooms"]` (bedrooms means "at least").
- Price slider: `[data-range]` (`data-range-min` 0, `data-range-max` 1000000, `data-range-step` 5000) with `[data-range-track]`, two `[data-range-handle]`, `[data-range-fill]`, two `[data-range-display]`. Drag, click the track, or use the arrow keys / Page Up / Page Down / Home / End. The ends mean "no limit". Developments with no price (Coming soon) drop out when a price limit is set, as before.
- `[data-filter-count]` (number of results), `[data-filter-clear]`.
- Each results item `[data-filter-item]`, with hidden `[data-filter-value="tenure"]` (one per tenure), `"region"`, `"bedrooms"` (Max Bedrooms), `"price"` (Prices From), and the slug on `[data-map-focus]`.
- The address uses Finsweet's format, so existing links keep working: `?tenure_equal=…&region_equal=…&bedrooms_greater-equal=…&price_greater-equal=…&price_less-equal=…`. `global/legacy-filter-links.js` still turns v1 links into this first.
- The development price list (plots) still uses Finsweet List v2 for its sort and unit-type filter. Mirror Click is no longer loaded anywhere.

## Footer (no code)

The footer is the `footer` component in Webflow (on every page). Redesigned 24 Nov 2026, staging only so far. Five columns in `footer_main`: logo and the homepage hero line ("London's leading new homes sales and marketing specialist", script accents via `griffiths-font` spans); Buy a home (property search, Shared Ownership, FAQs, both calculators); Our services (Services collection list); Company; Get in touch (phone, email, address, socials). Three columns on tablet, two on small screens, one on phones. Legal strip: Privacy Policy on the left; ©, company number and VAT number in one line on the right (stacked under Privacy Policy on mobile). The section's bottom padding (5rem) keeps the bar clear of the fixed cookie settings button. The `.footer-date` span is filled by the `copyright-year` global. The old version is kept as the unused component "footer (old, backup 24 Nov 2026)"; delete it once the new one is live and approved.

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

   - Seen on live and staging, not caused by this: the Formspark form embed on service pages and Contact Us calls `$` before jQuery loads (`$ is not defined`), so its dataLayer push probably never runs. Part of the deferred forms step.

8. ✅ (staging, 24 Nov, `v2.5.0`/`v2.5.1`) Property Search and the development price list moved from cmsfilter/cmssort v1 to Finsweet List v2:
   - Property Search: `fs-list-element="list"` on the Collection List (showquery, easing kept), `filters` on the form, `fs-list-field` tenure / region / bedrooms (`fs-list-operator="greater-equal"`) / price (`greater-equal` and `less-equal` on the From/To inputs), `results-count`, `clear`. Item fields carry `fs-list-fieldtype="number"` for bedrooms and price. Range slider and mirror click run on v2 too; the slider wrapper has `fs-rangeslider-lazy="true"` so it doesn't pre-fill the price filter on load (without it the list started at 20 of 26).
   - Development price list: `fs-list-instance="plots"` on the list, filter form and the nine `sort-trigger` buttons (`fs-list-ascclass="is-asc"`, `fs-list-descclass="is-desc"`). Number sorts for plot, sq ft, bedrooms, price and shared price; floor stays text ("2nd", "Third"). The unit-type radios get `fs-list-field="type"` / `fs-list-value` from `global/development.js`, which also keeps the `.is-active` label class.
   - The Property Search map pins follow the filtered list (List API `afterRender` hook in `modules/map.js`).
   - `global/legacy-filter-links.js` rewrites old v1 links (`?tenure=…&bedrooms=…&price=from,to`, `?plot-type=…`) to the v2 query format before the filters start, so links already in ads or emails keep working.
   - Checked on staging against the v1 results: all 26, Shared Ownership 17, bedrooms 2/3/4/5 → 21/10/4/0, West London 6, up to £300k 15, clear 26; slider, map toggle, sorting (asc/desc, numeric), unit-type filter (Granville Gardens Private Sale: House 3, Apartment 7) and the Shared Ownership price switch.
   - Property Search - SO and Fabrica Resales (leftovers) are still on v1 and keep loading the v1 scripts.

9. ✅ (staging, 24 Nov) Tidy-ups:
   - Leftover pages (Home2, Christmas Home, Shared Ownership - Home, Property Search - Shared Ownership, Fabrica Resales, Calculator Dev) are Drafts with `archived-…` slugs, so they stay in the Designer. Nothing on the site linked to them (all 120 sitemap pages checked). 301s in Site settings > Publishing cover the old addresses: `/home2`, `/christmas-home`, `/shared-ownership-home` → `/`; `/property-search-shared-ownership` → `/property-search?tenure_equal=Shared%20Ownership`; `/fabricaresales` → `/property-search`; `/calculator/calculator-dev` → `/calculator/shared-ownership-calculator`. (Webflow won't add a redirect for a path a page still uses, hence the slug change.)
   - The Developments template's JS noindex switch is gone. To hide a development from search engines, turn off "Sitemap indexing" on its CMS item (the API doesn't expose that switch). The old script also removed any noindex tag when "Live on Site" was on, so it would have cancelled the switch. On 24 Nov the only developments with "Live on Site" off were archived, so nothing changed for live pages.
   - The 404 page now has the `code-v2` component (site CSS: fluid font size, grow animation).
   - Leftover v1 `fs-cmsfilter-field` attributes removed from the featured-developments component and the page-level card copies on the SO FAQ and both calculator pages. The Property Search form block still shows an old `fs-cmsfilter-element="filters"` in the published HTML that the API can't see or remove; nothing reads it.
   - The plot list's default order is Webflow's own Collection List sort (price, ascending), so no default-sort script is needed.
   - Calculator component descriptions updated (they still described the old loaders).

Each step is one staging publish, checked on regenta-uk.webflow.io before the next.
