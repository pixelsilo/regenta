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
| `ps="grow-group"` + `ps="grow-item"` | `ps=grow-group` | same effect on every `grow-item` inside the group, however deeply nested, staggered 0.2s. Also used for CMS card rows whose list needs a filter: an attribute on the Collection List element itself breaks filter changes ("component map" conflict), so the group goes on a plain parent div and `grow-item` on each card (Services Template "Recent work"). Used where a script restructures the markup: the Our Services carousel (Slick wraps the cards in its own `slick-list`/`slick-track`, so they stop being direct children). The group attribute sits on `slider_contain`, outside the element Slick rebuilds. |

Both play once and don't animate under `prefers-reduced-motion`. Webflow keeps the elements hidden until its interactions runtime starts, so there's no flash and nothing depends on the bundle. Edit timing or easing in the Interactions panel.

Where it's used: `grow-children` on the stats strip, the featured-developments cards, the news strip cards and the Home "strategic partner" banner (text, then image); `grow-group` on the Our Services carousel; `grow` on single elements everywhere else. Professional Services (#57): `grow` on the "About Regenta" label, `grow-children` on each intro column, the "Recent work" header and the case study quote row; the featured case study and the grid use `grow-group` on their Collection List Wrapper and `grow-item` on each card, since an attribute on the Collection List element itself blocks filter changes. Elements imported through the Webflow API's HTML builder drop attributes, so there the attribute sits on a plain wrapper div built separately. Use `ps="grow-children"` on the parent for any row that should stagger. A Collection Item with its own grid placement gets a Webflow `w-node-…` id that repeats on every card, and a per-item scroll trigger then only animates the last card in the row (that was the case for the featured-developments and news strip cards, which now use `grow-children`).

**Built by Regenta strip parallax** (`regenta-homes-strip`, 26 Nov 2026): the new IX3 interaction "homes-strip parallax" (scroll scrub, `top bottom` to `bottom top`, scrub 1, off for reduced motion) moves `.regenta-homes-circle` 8rem to −8rem, `.regenta-homes_content` 4rem to −4rem, `.rb_image-1` 4% to −4% and `.hh_dots-copy` 0 to −8rem. Same distances as the old IX2 "regenta-banner" interaction it replaces (deleted). The content box uses `ps="grow-children"` so the grow and the parallax never write the same transform.

## Property Search map view (#57)

Staging only so far (`v3.10.1`). The old pop-up map at the bottom of Property Search is gone. A **List / Map** switch sits beside the filters (`[data-map-view-toggle="list|map"]`, `.is-active` + `aria-pressed`). Map shows `[data-module="map-view"]`: a map that fills the window below the filters, with a compact list of developments alongside. On phones the map sits above the list.

- Built in the Designer, all styled with classes there: `view-toggle`, `map-view`, `map-view_sidebar`, `map-view_list`, `map-card` (+ `is-active`), `map-popup`. The sidebar is its own Developments Collection List (Live on Site, same order as the results). Each item carries `data-slug`, `data-lat` and `data-lng` bound to the CMS, a compact card (`[data-map-card]`) and a hidden pin card (`[data-map-popup]` in `map-popup_holder`) that's copied onto the map above the pin when a pin or card is clicked. Since `v3.1.0` that card is our own (a Google `OverlayView`), not Google's InfoWindow, so it has no Google frame or close bar: `.map-popup` is the white card, the photo runs full width (`.map-popup_image-wrap`), the text sits in `.map-popup_body`, the close button `[data-map-popup-close]` (`.map-popup_close`, two `.map-popup_close-line`) sits on the photo, and `.map-popup_arrow` points at the pin. Clicking the map, Escape, or the close button closes it; the map pans a little if the card would be cut off.
- Pin card position (`v3.4.0`): every time a card opens, from a pin or from the list, the map glides (`panBy`, animated) so the card and its pin sit centred in the visible part of the map: below whatever the band covers, and on desktop within the window. On phones a list click first scrolls the map up under the pinned band, at least far enough for the band to pin.
- "View development" in the pin card (`[data-map-link]`): the Webflow API can't set a link to "Current Developments" (it saved `#`, then the bare `/development` template), so since `v3.6.1` `map-view` points each card's link at the same page as the matching results card. Setting the link to the current item in the Designer (Link settings > Collection page > Current Developments) is the proper fix; the script leaves a correct link alone.
- Prices: each card has the Price Alternative ("Coming soon") and "From £…"; the script shows the alternative when it's filled in.
- The map follows the Property Search filters (below) through `lib/filters.js`. The pin icon on each results card has `data-map-focus` (bound to the slug) and opens the map on that development. Its old `javascript:` link and `fs-mirrorclick-element` in the embed are dead and stopped in the capture phase; tidy the embed in the Designer when convenient.
- `?view=map` opens the map on load, and the switch keeps it in the address (see Layout below for how map mode works).
- Speed (`v3.0.0`, `v3.0.1`): the map is built as soon as the bundle starts, while hidden (fixed in the window, transparent, behind the page, `inert`), so Map opens on the next frame. Google skips drawing maps outside the window, which is why it isn't simply pushed aside. Card and pin clicks don't zoom (a zoom waits for new tiles: the first click used to take 2.4s, now about 5ms). The cards' photos are CMS originals with no responsive versions (26 photos, about 31 MB), so `map-view` parks them until the map is first opened, then loads them at thumbnail size using the `srcset` Webflow made for the same photo on the results cards. Every Property Search visit loads the map once, as the old bottom map did, which is what Google bills. `v3.0.1`: results card photos further down the page load at card size (Webflow marks them `sizes="100vw"`), about 17 MB to 12 MB for a visitor scrolling the whole list.
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

Branded dropdowns (`v3.1.0`, `global/filter-select.js`): each select sits in a `[data-filter-select="tenure|bedrooms|region"]` wrapper (`.filter-select`) with a `[data-filter-select-button]` (`.filter-select_button`, label `[data-filter-select-label]` in a `.button-text`, chevron `.filter-select_icon`) and a `[data-filter-select-list]` (`.filter-select_list`) holding one sample `[data-filter-select-option]` used as the template. The select stays the source of truth and is laid transparently over the button (`.filter-select_native`): on touch screens a tap opens the phone's own picker; with a mouse our list opens (arrow keys, Home/End, type-to-jump, Escape). JS only toggles classes styled in Webflow: `is-open` (button, icon, list), `is-filled` (button, when a filter is set), `is-selected` / `is-active` (options). The list's first item reads "All tenures" / "Any bedrooms" / "All locations" (override with `data-filter-select-any`); bedrooms read "2+ bedrooms". On desktop each button is as wide as its longest option, so the bar doesn't shift when you pick one.

Layout (`v3.6.0`, restructured after the scroll-based version proved jumpy): three green pieces, top to bottom.
- **Heading block** `.search-hero` (`[data-search-hero]`): the nav clearance (10rem, 7rem on phones) and "Start your search" (`heading-2.7-bold.is-compact` in `bm_2rem.is-tight`, page-only combos). It just scrolls away. It's a one-row grid (`search-hero_inner` inside, `min-height: 0; overflow: hidden`) so it can fold: `.search-hero.is-collapsed` sets the row to `0fr` and the padding to 8.5rem (6rem on phones), animated over 350ms in Webflow.
- **Filter bar** `.search-band` (`[data-sticky-filters]`): `position: sticky`, holding the filters (`search-form_component.is-band`, rows `sf_div1.is-fit` / `sf_div2.is-fit`, slider `is-light` combos), the List / Map switch on the right (`view-toggle`, `margin-left: auto`), and the count (`.search-count`, singular for 1) with Clear filters. `global/sticky-filters.js` only sets its `top` to the nav's bottom edge, rounded down (v3.16.1: rounding up left a hairline gap on phones, where rem sizes put the edge at e.g. 37.9px), via a ResizeObserver on the nav (which animates 112 to 70px, 76 to 38px on phones); no scroll handler. `z-index: 2` because every `1440-container` is its own stacking context and the results would otherwise cover open dropdowns.
- **Map mode is a layout, not a scroll position.** `map-view` toggles `section_property-search.is-band.is-map` and `search-hero.is-collapsed`. From tablet up `is-map` makes the section a window-high flex column and `.map-view` has `flex: 1 1 0`, so the map fills whatever is left under the bar; nothing is measured or scrolled into place, apart from starting at the top of the page. Phones (`is-map` is `display: block` at the small breakpoint) stack map over list and scroll normally. The map is pulled up under the bar's rounded bottom (`.map-view` top margin -3.5rem, -2.5rem on phones); `map-view` keeps pins and the open card clear of the part the bar covers.
- **`?view=map` links** open straight in map mode before the first paint: an HTML Embed right after the map block (on the page, not in the bundle) adds the two classes, hides the results list, switches the fold animation off for that load, and holds back the map photos. The bundle takes over from there (and turns the animation back on). Without it the list showed for ~150ms first, because the bundle loads at the end of the page.
- After a dropdown change or Clear made further down the page, `property-filter` scrolls back so the results list starts just under the pinned bar.
- Options that would show nothing alongside the other filters and the price range are greyed out (`v3.11.0`): e.g. Shared Ownership + 5 bedrooms, or Greater London + Re-Sale Homes. `property-filter` counts each option against the current filters, disables the empty ones on the native select (the phone picker greys them) and stores the count in `data-count`; `filter-select` adds `.is-disabled` (combo on `filter-select_option`: 35% opacity, no hover) and arrow keys, typing and clicks skip them. The choice already made is never disabled, so a shared link that lands on nothing can still be changed. Since `v3.12.0` our list also moves the available options to the top and the greyed ones to the bottom (each group in CMS order; the native select keeps its order), and keyboard moves follow the list as shown.
- The option list's scrollbar is branded in the `code-v2` CSS embed (Webflow can't style scrollbars): Chrome, Edge and Safari get a slim green pill inset from the edge and kept clear of the rounded corners (`::-webkit-scrollbar`); Firefox gets `scrollbar-width: thin` in green (only where `::-webkit-scrollbar` isn't supported, so Chrome keeps the pill). Checked 26 Nov 2026 in Edge and on LambdaTest (Safari 18.5 macOS, Firefox 160 Mac and Windows, Chrome 158 Mac): order and greying right everywhere; Safari and Chrome show the inset pill; Firefox shows its thin bar (Windows) or its overlay bar that appears while scrolling (Mac). Firefox can't inset the bar from the corners.

List / Map switch (`v3.2.0`): a green pill (`.view-toggle_indicator`, `[data-map-view-indicator]`) sits behind the two transparent buttons; `map-view` sets its `left` and `width` to the active button and the Webflow transition (350ms) slides and resizes it.

Price slider (`v3.1.0`): "Price" and the chosen range (`.range_label`, `.range_amount`) sit above a 4px track with white, green-ringed handles; the top end reads "£1,000,000+".

## Buyer / professional split (#57)

Staging only so far. The `navigation` component has two boolean props under "Links": **Professional links** (default on: Our services, About us, Built by Regenta, Case studies, News, Contact us) and **Buyer links** (default off: FAQs, Shared Ownership Calculator, Stamp Duty Calculator, Contact Us to `/contact-buyers`, Professional Services). Each set is shown or hidden by its prop, on desktop (`Div Block 152` and the `[data-nav-set="buyer"]` block) and in the mobile menu (each `nm_link`). Buyer pages switch Professional off and Buyer on: Property Search, both calculators, Shared Ownership FAQs, Contact Buyers. Development pages use their own navbar, not this component. No code involved.

**Services / Homes switch** (26 Nov 2026): the old UK / International division links beside the logo (`division-linls`) are now a switch between the two sides of the site. With Professional links on: "Services" (current, `navbar_mini-link events-none`) and "Homes" (faded link to Property Search). With Buyer links on: "Services" (faded link to Professional Services) and "Homes" (current). Each of the four is shown by its prop, and the switch shows on phones too. "Our services" is a plain link to Professional Services (desktop and mobile menu); its dropdown and the mobile services list were deleted. The buyer set's "Professional Services" link (desktop and mobile) was removed, since the switch covers it.

**Services menu** (26 Nov 2026, mock `mocks/services-menu.html`): "Services" in the switch is now a native Dropdown (`svc-switch_toggle`, chevron `svc-switch_icon`) on every page. Inside the toggle are two "Services" labels, shown by the Professional links prop (full colour) and the Buyer links prop (`svc-switch_faded`). The panel (`svc-menu` > `svc-menu_grid`) has a green card linking to Professional Services (`svc-menu_feature`: "Overview", "Professional services", the page's description, "View all services") and an "Or jump to" list of the four services as smaller links (`svc-menu_link`, static URLs, since lists inside components can't be set up through the API). On phones the panel is fixed full width under the nav. The right-hand "Our services" link was removed; the mobile menu keeps its "Our Services" link. Opens on click; tick "Open menu on hover" on the dropdown in the Designer if wanted. The homes-side link set now has a **Calculators** dropdown (`navbar_link` toggle, `calc-menu` panel, `svc-menu_link` items) for the Shared Ownership and Stamp Duty calculators instead of two long links, so it fits on one line down to about 1050px (it still wraps between 992 and roughly 1050px). On the services side the "Properties" pill is replaced by a 42px circle with just the search icon (`navbar_link-search is-circle`, shown by Professional links); the full pill shows only with Buyer links on. Both hide on tablet and phones as before (the mobile search icon takes over). Both "Services" labels and the calculator links use `.button-text` (the Area font centring fix); the faded label is `button-text is-faded`. The calculator items are link blocks (`svc-menu_link is-icon` > `calc-menu_icon` SVG embed (house / discount badge, `currentColor`) + `button-text`), not Webflow Dropdown Links, so the text can be wrapped.

**Compact navbar on scroll** (v3.16.0, 26 Nov 2026): `global/nav.js` adds `is-compact` to `.navbar` and its `.navbar_logo` when the page scrolls down (8px of travel counts as a direction) and removes it on scroll up or at the top; it pauses while the mobile menu is open. The look is the `is-compact` combo classes in Webflow: navbar 8rem to 5rem (6 to 3rem on phones), logo 2.5 to 2rem (2.2 to 1.5rem), animated by the existing 400ms height transitions on the base classes. Preview it in the Designer by adding the combo. It replaces the old IX2 page triggers navbar-shrink / navbar-grow (desktop-tablet and mobile), which were only on ten older pages (Home, About Us, Contact Us, Property Search, Case Studies, News, News Template, Services Template, Privacy Policy, Register Interest Success); newer pages like Professional Services never shrank. Those triggers set the same heights inline, so they don't clash, but they can be deleted from each of those pages. They also faded a `.previously-sitesales` label that is no longer on the site.

Homepage hero: "Find your home" (Property Search) and "Professional services" (`/professional-services`). `/contact-buyers` is phone only, with no form; `/contact-us` keeps its form for the professional side.

### Professional Services page (`v3.7.0` to `v3.9.1`)

`/professional-services`. The hero (`.ps-hero`) is a full-screen slider of the four services, styled in Webflow with `ps-hero_*` classes. `modules/service-hero.js` moves `.is-active` across the slide, image, text and tab, and times the tab's fill bar (7s; pauses only while the tab row or arrows are hovered or focused, and in a background tab; never on touch). The text panels sit in one grid cell (`align-content: end`); the script sets `.ps-hero_copy` to the current panel's height and Webflow eases it (600ms), so the "Professional services" label glides to 1rem above each title (`v3.8.1`). It mounts on the `.ps-hero` class because the Webflow API wouldn't keep an attribute on that element. Below the hero: the intro (`ps-intro_*`, `ps-who`; label above, heading top-aligned with the copy), the `stats` component, "Recent work" case studies and the Built by Regenta strip. The case studies are three Case Studies collection lists, newest `public-date` first: a feature (limit 1, `.ps-cs-feature`, summary shown as a quote), a grid (offset 1, limit 3, `.ps-cs-grid`; the first item spans two rows) and a row (`.ps-cs-row`, a div holding two lists): a quote card (offset 4, limit 1, `.ps-cs-quote`: summary as the quote, name, tenure, "Read") beside a wide card (offset 5, limit 1); lists in the row carry `.ps-cs-cell` (height 100%). Cards (`.ps-cs`) show the thumbnail, Tenures and Developer labels (hidden when empty via `:empty`), name and summary. `global/case-study-cards.js` (`v3.9.0`, was `case-study-links.js`): sets each card's link from `data-cs-slug` (the API can't set "link to current Case Study"; a Designer link is left alone), hides pills with no text, makes the whole quote card open its case study, and adds `.is-hover` on mouse hover or keyboard focus to `.ps-cs_img` (zoom 1.05), `.ps-cs_tint` (dark green overlay), `.ps-cs_dots` + `.ps-cs_arrow` (`v3.9.1`: copied from the homepage service cards; the Regenta dot emblem, 26rem and centred on the card's top-right corner, slides in from the top right while the arrow flies in from the bottom left and lands in its dot, 400ms cubic-bezier(.23, 1, .32, 1)) and `.ps-cs-quote` (turns white; its emblem is sand behind the text, `.is-quote` combos). Pill text sits in `.button-text` for Area's optical centring. The quote mark is an SVG (`.ps-cs-quote_mark`), flush with the text. The tab row sits 2.5rem up (2.75rem on phones) to clear the fixed cookie settings button. Mocks: `mocks/professional-services.html`, `mocks/professional-services-v2.html` (preview with the `mocks` launch config).

## Stats bento (`stats` component, `v3.10.1`)

On Home, About and Professional Services. Mocked as option C in `mocks/stats-options.html`. Statistics items are placed by the CMS **Order** field (lowest first): Order 1 is the big sand card (`sp-feat`, its own collection list: sort Order, limit 1), and the next three fill the main list (`sp_clw`/`sp_cl`/`sp_ci`: sort Order, offset 1, limit 3). The last of those spans both columns (`sp_ci:last-child`, a 13rem number column so the copy beside it doesn't move while counting). The feature card's "Since 1988" label and dot emblem are fixed in the component, not from the CMS. Icons are the sand line icons in `assets/stats-icons/` (uploaded as assets, on the items' Icon field). Tablet: the sand card goes full width above the others; phones: one column. No parallax: the old IX2 interaction "stats-parade" (while scrolling in view on `.stats-parade_component`) moved `.sp_clw`, so the list wrapper now uses `sp-list` and that interaction does nothing; it can be deleted in the Interactions panel.

Numbers count up with `global/count-up.js` (replaced Finsweet numbercount in `v3.10.0`; that script no longer loads). Put `count-up` on the number element and bind its **text** to Callout Number: the page ships the real number, which counts from 0 when 40% visible (1.6s, ease-out, `1,000` formatting), shows straight away for reduced motion, and is filled in if it's scrolled past unseen (`v3.10.1`).

API limit found here: inside a component, the Webflow API sets a collection list's source/limit/offset but not its sort, filters or CMS bindings (all fail with "No source connected"). Build the list natively with the Designer app connected, then set those in the Designer.

## Purchaser stories (`/purchaser-stories`, `v3.14.6`)

Mock: `mocks/purchaser-stories.html`. The green hero (`stories-hero`) has the same rounded bottom corners as the Property Search filter band (1.5rem, 1.25rem on phones). Verbatim Google and Trustpilot reviews from the **Reviews** collection, in a mosaic with filters and a full-review popup, so nothing is read out of context. Linked from the buyer nav (desktop buyer set, and a mobile link shown by the nav's Buyer links property).

- **Reviews fields:** Name (first name + initial), Initials (shown in the avatar), Excerpt (a sentence from the review, with … typed in where it's cut; on Big cards it stops before the Callout words; empty = show the whole review on the card), Callout (Big cards: the last few words of the sentence, shown large in Griffiths on their own line), Full review (rich text, exactly as posted), Review title (Trustpilot), Development or tenure, Date posted, Source (Google / Trustpilot), Link to review, Card style (lowercase options normal / big / dark / video, used as the card's class), First-time buyer / Shared Ownership / After moving in (filters), Order.
- **Order:** the list sorts by Order (highest first), then Date posted (newest first); reviews without an Order follow, newest first. To push a review to the top, give it a higher Order than any other.
- **Page (all native, nothing filled or hidden by script):** every card field is bound in Webflow, and what shows is set by conditional visibility (Source is Google / Trustpilot, Excerpt is set, Callout is set, Card style is / is not video, and so on), so unused parts aren't served. The card's style comes from a `class` attribute bound to Card style, with combo classes `review-card` + `big` / `dark` / `video` and `review-avatar` + `dark`. Card attributes `data-order`, `data-date`, `data-source`, `data-name`, `data-initials`, `data-dev` feed the script; hidden `[data-review-full|title|link|video-file|video-url]` and the three `[data-review-tag]` markers (visibility bound to the filter switches) feed the popup and filters. Popup: `review-modal` (`.is-open`), slots `[data-modal-*]`.
- **Script:** `modules/purchaser-stories.js` (root `[data-module="purchaser-stories"]`): orders the cards, lays them out left to right into the shortest of 3 / 2 / 1 columns, runs the filters (`.is-active` chip) and fills the shared popup (the quoted words highlighted with `.review-highlight`, video playback, Esc / backdrop / X close). It adds no classes to the cards and hides nothing on them.
- **Video case studies:** set Card style to video, add a Video poster, and upload the MP4 to **Video (MP4)** or put a direct MP4 link in **Video URL**. The card shows the poster full-bleed with the label, title and name; the popup plays the video. The demos are "Demo buyer" (slugs `demo-video-1`, `demo-video-2`); delete them or replace their video, poster and text before go-live.
- **Hero badge:** 4.5 from 90 Google reviews, static text in the hero; update it by hand. Don't link it to the Google reviews (Luke: some are negative).
- The Reviews template page (`/reviews/...`) can't be drafted through the API; turn the collection's template page off in the Designer, or leave it unlinked.

## Logo strip (`v3.15.0`)

Developer logos scrolling in a strip: on Professional Services at the bottom of "Your strategic partner" (no heading), and on Home under Our services with the "Who we work with" heading. Mock: `mocks/logo-carousel.html`.

- **CMS:** Developers > **Show in carousel** switch. Tick one entry per developer (the collection still has duplicate light/dark entries; the tidy is on hold).
- **Webflow:** `logos_viewport` (`data-module="logo-marquee"`) holds two `logos_fade` edges and `logos_track`, which holds two identical Developers collection lists (`logos_list` > `logos_item` > `logos_img`, filtered to Show in carousel is On, sorted by name). Logos are grey until hovered.
- **Script:** `modules/logo-marquee.js` moves the track left at 40px/s and wraps at half its width, eases to a stop on hover, runs only while on screen, and stays still with reduced motion.

## Case study dates

The Case Studies field **Case study date** (slug `public-date`) shows under the title on the case study page and sorts every case study list, newest first (the related strip puts Featured first).

## Services refresh (#57 part 6, CMS only so far)

Development Consultancy now includes Scheme Optimisation's copy, word for word under a "Scheme optimisation and specification" subheading. Customer Care and Scheme Optimisation are set to draft. All links to them come from CMS lists, but already-published items stay on the site until they're unpublished, which also removes them from live, so that waits for the live publish. Service pages (template): a "Recent work" section with three case studies in the Professional Services grid card (`ps-cs-grid`, `ps-cs`, newest `public-date` first; `case-study-cards.js` links and hovers them), and the Built by Regenta strip (`regenta-homes-strip`) after it. The list should show only case studies whose **Related Services** include the current service: the API can only filter on a fixed item, so set that filter in the Designer (Services Template > the list > Filter: Related Services contains Current Service). Until then every service page shows the three newest. The service template throws `$ is not defined` from an inline script (also on live); not from #57.

### Service pages (template, option C, 26 Nov 2026)

Mock: `mocks/service-template.html` (option C). Built natively on the Services Template, moving the existing CMS-bound elements so their bindings stayed:
- **Hero** (`svc-hero`, sand): `ps-eyebrow` "Our services", the Name as a big `svc-title` H1, buttons "Get in touch" (`button is-fit`, to the form anchor) and "Recent work" (`button outline`, to the Recent work section), then Hero Copy in `svc-statement` (its H2 is the statement, the paragraph under it).
- **Image band** (`svc-img`, rounded, 21:9, 4:3 on phones) with Hero Image.
- **How we work** (`svc-body`, `svc-body_grid`): Content Part 1, plus the Market Intelligence report sign-up (conditional, unchanged).
- **Recent work** (unchanged), then **contact** (`svc-contact-section` > `svc-contact`, green panel): lead contact photo, title, "Talk to … today", Email button; the existing service contact form, now always open (the Finsweet accordion was deleted). Its FormSpark action is still set from the Form ID field by the page script.
- **Our services list** (`svc-index`): a Services collection list sorted by Order, rows reuse `ps-index_row` + `is-svc`, `ps-index_name`, `svc-index_sum`, `ps-index_thumb`. Replaces the services carousel.
- Nav on this template is set to solid green (navbar-white on, faded off) so it reads over the sand hero.
- Removed: old photo hero, the sticky contact card, the services slider.
- **Rework (26 Nov, evening), closer to the mock:** title `svc-title` down to clamp(2.8rem, 5.5vw, 5rem); contact panel = `svc-person` (round `svc-person_img`, bound `svc-person_name`, the job title line), `svc-contact_heading` ("Talk to … today" on one line), `svc-contact_text` lines (bound email link, office phone); form in two columns (`form is-svc`, `form-row is-full` for phone/message, fields `text-field is-dark` outlined, `button-2 is-sand` send button, `form-scripts is-svc` hides the script embed's box); list rows are `0` + Order number, name, description, arrow (no images). Service **Order** renumbered 1-6 (same sequence) so the number reads 01-04.
- **Hero statements reworded shorter** (CMS Hero Copy, staging only, for Luke to review): Sales "Three decades of selling new homes, with *sales strategies built for each development*."; Marketing "Marketing that tells *each development's own story*, made with London's leading design and media partners."; Market Intelligence "*Clear, practical research* that guides decisions at every stage of a scheme." + "We combine data with our market experience to strengthen your development's numbers."; Development Consultancy "An *ever-evolving* range of consultancy expertise." The italics were taken out again (26 Nov, late): the larger Griffiths phrase opened up the line spacing where the statement wrapped. The `.svc-statement em` style is still set if an italic is ever used.
- **Later the same evening:** hero below the title is `svc-hero_split` (copy left, buttons right, stacked on phones); the contact section now comes before Recent work; the services list staggers in with `ps="grow-group"` on its Collection List Wrapper and `ps="grow-item"` on each row link (never on the Collection List itself). Rows go white on hover, names stay on one line on desktop, descriptions stack under names on phones. Luke set the list filters (not the current service, not the two retired ones) and the row link.
- **Rich text child styles** (set by Luke in the Designer, 26 Nov; the API can't create nested selectors): `.svc-statement h2` 2rem (1.5rem phones); `.svc-statement em` Griffiths 400, normal style, 1.3em, margin -0.1em left / 0.2em right; `.svc-rich blockquote` Griffiths 2rem (1.6rem phones), line height 1.2, no border or padding. CMS-bound rich text children can't be selected on the canvas, so to edit these add a temporary unbound Rich Text with the same class, style its sample children with "inside <class>", then delete it.


Before live: redirect `/services/customer-care` and `/services/scheme-optimisation-and-specification` (Site settings), and replace the 12-month stat (Statistics, Order 2).

## Footer (one CSS rule)

The footer is the `footer` component in Webflow (on every page). **Option C (26 Nov 2026, #57, staging only):** mocked in `mocks/footer-c.html`. `footer_main` is a two-column grid: the first column is the width of a quarter of the row minus gaps, then a 7rem gutter, then `footer_links` (three equal columns, 3rem gap). The first column is `footer_brand`, a sand panel (radius 1.5rem) sized to its content: logo, "Talk to us" eyebrow, phone and email (`footer_large`, 1.35rem, weight 500, an underline draws in on hover), address, and socials as 2.6rem outlined circles (`footer_social-link`; hover fills green and lifts 3px). Column titles are `footer_col-title` (link size, 45% opacity). Links (`footer_link`; the services list is a collection list with `footer_cms-list`) fade from 85% to full on hover and show an arrow that slides in after the text. The arrow is the only footer CSS outside the Designer (Webflow can't style `::after`): it sits in the `code-v2` css embed. The hero line paragraph is hidden, not deleted. Panel stacks above the three columns on tablet; one column on phones. The pre-option-C structure is the unused component "footer (backup 26 Nov 2026)"; it shares the classes, so it shows the new styling on the old layout.

Before option C (24 Nov 2026): five columns in `footer_main`: logo and the homepage hero line ("London's leading new homes sales and marketing specialist", script accents via `griffiths-font` spans); Buy a home (property search, Shared Ownership, FAQs, both calculators); Our services (Services collection list); Company; Get in touch (phone, email, address, socials). Three columns on tablet, two on small screens, one on phones. Legal strip: Privacy Policy on the left; ©, company number and VAT number in one line on the right (stacked under Privacy Policy on mobile). The section's bottom padding (5rem) keeps the bar clear of the fixed cookie settings button. The `.footer-date` span is filled by the `copyright-year` global. The old version is kept as the unused component "footer (old, backup 24 Nov 2026)"; delete it once the new one is live and approved.

## Area optical centring (no JS)

Area (Adobe Fonts, kit ptn3etu) has two sets of line metrics: OS/2 typo 0.75/0.25em (with USE_TYPO_METRICS) and hhea/win 1.30/0.34em, cap height 0.78em. Windows/Android browsers use typo, so capitals sit 0.14em high in any line box; Apple's text engine uses hhea, so they sit ~0.09em low. Measured 25 Nov 2026; same for every weight and for area-normal and area-extended. We can't edit or self-host the font (Adobe terms), so there's no `ascent-override`.

The fix is one block in the site CSS embed (component `code-v2` > `css`, copy in `snippets/embeds/global-fluid-font-size-css.html`):
- Text that sits inside a box (buttons, tabs, pills, nav links, form options, sort headers, the cookie banner buttons) goes in a `.button-text` element. Boxes keep even top/bottom padding.
- Where the browser supports `text-box` (Chrome 133+, Safari 18.2+, current Firefox), `.button-text` is trimmed to cap height and baseline and the space is added back with `margin-block: calc((1lh - 1cap) / 2)`, so capitals are centred exactly and heights don't change.
- Elsewhere (older browsers, e.g. Safari 17 / iOS 18.0) it shifts by `--area-optical-shift`: 0.14em, or -0.09em where `font: -apple-system-body` is supported.
- Checked 25 Nov 2026 on LambdaTest: Safari 17.6 and 18.5 (macOS), iOS 18.0 simulator, Firefox 160 (Mac, Windows), Chrome (Mac, Windows): boxed text within 0.02em of centre (iOS calculator button 0.045em). Real iPhones aren't on our LambdaTest plan.
- Special cases in the same block: `.heading-pill-1rem` (an h1 with bare text), the alert strip's rich text, and the FAQ page's nav pills.

Don't add padding or `top`/`transform` nudges to centre Area text; wrap the text in `.button-text` instead. Removed in Nov 2026: em padding on `.button`/`-2`/`-3`, `.register-interest`, `.wf_button`, `.mini-navbar_button`, `.navbar_link-search`, `.navbar_mini-link`, `.text-button`; the `button-text_shift-down` combo's padding; uneven padding on `.dg_tab`, `.dropdown-link`, `.map-info-window_link`, `.fs_accordion-2_header`, `.fs-checkbox_field`, `.fs-sort_button-2`, `.caption`, `.alert-strip`, `.heading-pill-1rem`, `Div Block 156`; the iOS-only `.button-text { top: -1em }` rule; the FAQ pills' 0.2em nudge and its Safari override; and `src/global/safari-shift.js` (bundle v3.0.2).

## Custom code in the CMS

The Developments collection has a "Custom Code" rich-text field. In use on 24 Nov 2026:

- `jigsaw`, `dominion-house`: show the External gallery tab before Internal (script + style).
- `the-beacons` (archived): reorders the overview and USPs sections.

If more developments need this, a CMS switch plus a small module would be better than pasting script into each item. Many developments also have iframes (video embeds) in their rich text; those are content, not code.

## Go-live checklist

Things to do at or after the next full live publish (only on Luke's go; a live publish ships every pending change).

- **Before publishing:** say what's pending. Staging carries the housekeeping work (#1, #2, #7 need Elle's approval), #57, the footer and the Area centring.
- **One Goodmayes temporary patch:** on 26 Nov 2026 its CMS "Custom Code" field (`custom-code-2`, item `6943cadf2a0286884687c3d5`) got a patch, published as that item only. It hides plots that were deleted but are still live (424, 437, 478, an old 458 and an old 463), sets "Pricing starting from" to £315,000 / £78,650, and leaves only Elle's five plots (417, 447, 458, 463, 477). After the full publish removes the deleted plots: clear that field, publish the item, and check the price list and starting price on the live page.
- **Unpublished and archived, still live until the full publish:** One Goodmayes plot 454 (at Elle's request); Beaufort Park and its plots 3059 and 3052 (25 Nov 2026). Check their pages stop resolving on regenta.co.uk after the publish.
- **Code:** merge the working branch to `main`; delete the root `slider.js`, `so-calculator.js` and `sd-calculator.js` (see "Old files in the repo root").
- **Webflow clean-up:** delete the unused "footer (old, backup 24 Nov 2026)" component once the new footer is approved.

## Migration plan

0. ✅ Save copies of the code and set up Vite with the loader. No site change.
1. ✅ (staging, 24 Nov) Removed dead code: the commented-out Slick on Home, and the broken map code and duplicate cmsfilter on the success and error pages. Home2, Christmas Home and SO Home are left alone because they're becoming drafts. The calculator loaders turned out not to be duplicated. The 404 page's `/develpoment/` redirect script is replaced by a 301 rule in Site settings > Publishing: `/develpoment/(.*)` → `/property-search`.
2. ✅ (staging, 24 Nov, `v2.0.0`) Site-wide globals into the bundle: footer year, `ps="grow"`, Safari button shift (removed in `v3.0.2`: the Area font centring is now a CSS fix in Webflow, and gallery captions wrap their text in `.button-text` to get it too), price format, `ps-hide="on-touch"`. The loader went into Site settings > Footer, replacing the old footer scripts, and the two head scripts were removed. Then `v2.1.0`: the mobile menu toggle and navbar fade from the navigation component's embed (embed removed).
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
