// Property Search map view (#57): a List / Map switch beside the filters. Map shows a
// full-height map with a compact list of developments alongside; clicking a pin opens a
// small card (image, description, bedrooms, price), clicking a card finds its pin.
//
// Root: [data-module="map-view"] with data-maps-key. Inside it:
//   [data-map]              the map canvas
//   [data-map-sidebar]      the scrolling list column
//   [data-map-count]        optional "Showing 12 of 26 developments" (removed in v3.4.0: the
//                           band's count says it)
//   [data-map-item]         one per development (Collection List item), with data-slug,
//                           data-lat, data-lng bound to the CMS
//     [data-map-card]       the compact card (role="button")
//     [data-map-popup]      the pin card, kept in a hidden holder and copied onto the map
//                           above the pin (our own card, not Google's InfoWindow), with
//                           [data-map-popup-close] inside it
//     [data-map-link]       link to the development page (inside the pop-up)
//     [data-map-price]      holds [data-map-price-alt] ("Coming soon") and
//                           [data-map-price-from] ("From £…"); only one shows
// Elsewhere on the page:
//   [data-map-view-toggle="list|map"]  the switch buttons (.is-active + aria-pressed)
//   [data-map-view-indicator]  the green pill behind them; slides and resizes to the
//                           active button (its transition is set in Webflow)
//   [data-list-view]        hidden while the map is open (the normal results list)
//   [data-map-focus="slug"] on a results card: opens the map on that development
//
// The map follows the Property Search filters (global/property-filter.js via lib/filters.js).
// ?view=map opens the map on load, and the switch keeps that in the address. Map mode is a
// layout switch (see setMode): the heading folds away and the map fills the window.
//
// Speed: the map is built straight away, hidden (see stash()), so opening it is instant.
// The cards' photos are the CMS originals (several MB each, no responsive versions), so
// they're held back until the map is first opened and then loaded at thumbnail size using
// the responsive versions Webflow made for the same photo on the results cards.
import { loadMaps, GREY, LONDON, PIN } from '../lib/maps.js';
import { onVisible } from '../lib/filters.js';

const DESKTOP = window.matchMedia('(min-width: 768px)');
const MIN_HEIGHT = 480; // px, desktop map height floor
const ONE_PIN_ZOOM = 13;
const PIN_HEIGHT = 62; // px: the pin image is 51px tall; the card's pointer tip ends just above it
const CARD_MARGIN = 16; // px kept between an open card and the map's edges

// The pin card drawn on the map: an OverlayView holding a copy of [data-map-popup]. All of
// its look comes from the Webflow classes; this only places it above the pin.
function makeCard(OverlayView, onClose) {
  class Card extends OverlayView {
    constructor() {
      super();
      this.el = document.createElement('div');
      this.el.setAttribute('role', 'dialog');
      Object.assign(this.el.style, { position: 'absolute', zIndex: '10', cursor: 'auto' });
      OverlayView.preventMapHitsAndGesturesFrom(this.el); // clicks and scrolls stay on the card
      this.el.addEventListener('click', (event) => {
        if (event.target.closest('[data-map-popup-close]')) onClose();
      });
      this.position = null;
    }

    show(map, position, content, label) {
      this.position = position;
      this.el.replaceChildren(content);
      this.el.setAttribute('aria-label', label);
      if (this.getMap() === map) this.draw();
      else this.setMap(map);
    }

    hide() {
      this.position = null;
      this.setMap(null);
    }

    isOpen() { return !!this.position && !!this.getMap(); }

    onAdd() { this.getPanes().floatPane.appendChild(this.el); }

    onRemove() { this.el.remove(); }

    draw() {
      const point = this.position && this.getProjection()?.fromLatLngToDivPixel(this.position);
      if (!point) return;
      this.el.style.left = `${point.x}px`;
      this.el.style.top = `${point.y}px`;
      this.el.style.transform = `translate(-50%, calc(-100% - ${PIN_HEIGHT}px))`;
    }
  }
  return new Card();
}

function number(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) && n !== 0 ? n : null;
}

// "Coming soon" when the CMS has a price alternative, otherwise "From £…"
function pickPrice(scope) {
  scope.querySelectorAll('[data-map-price]').forEach((price) => {
    const alt = price.querySelector('[data-map-price-alt]');
    const from = price.querySelector('[data-map-price-from]');
    const hasAlt = Boolean(alt?.textContent.trim());
    if (alt) alt.style.display = hasAlt ? '' : 'none';
    if (from) from.style.display = hasAlt ? 'none' : '';
  });
}

// A development's page address: the [data-map-link] href if it points at an item page, else
// the link on the results card with the same slug.
function pageLink(slug, el) {
  const own = el.querySelector('[data-map-link]')?.getAttribute('href') || '';
  if (slug && own.endsWith(`/${slug}`)) return own;
  const focus = slug && document.querySelector(`[data-filter-item] [data-map-focus="${CSS.escape(slug)}"]`);
  const result = focus?.closest('[data-filter-item]');
  const href = [...(result?.querySelectorAll('a[href]') || [])].map((a) => a.getAttribute('href'))
    .find((h) => h && slug && h.endsWith(`/${slug}`));
  return href || own.replace(/^#$/, '');
}

export default function mapView(root) {
  const key = root.getAttribute('data-maps-key');
  const canvas = root.querySelector('[data-map]');
  const band = document.querySelector('[data-sticky-filters]'); // the pinned green search band
  if (!key || !canvas) throw new Error('map-view: missing data-maps-key or [data-map]');

  const sidebar = root.querySelector('[data-map-sidebar]');
  const count = root.querySelector('[data-map-count]');
  const listViews = [...document.querySelectorAll('[data-list-view]')];
  const toggles = [...document.querySelectorAll('[data-map-view-toggle]')];
  const indicators = [...document.querySelectorAll('[data-map-view-indicator]')];

  const items = [...root.querySelectorAll('[data-map-item]')].map((el) => ({
    el,
    slug: el.getAttribute('data-slug'),
    lat: number(el.getAttribute('data-lat')),
    lng: number(el.getAttribute('data-lng')),
    name: el.querySelector('[data-map-card] h3')?.textContent.trim() || '',
    card: el.querySelector('[data-map-card]'),
    popup: el.querySelector('[data-map-popup]'),
    link: pageLink(el.getAttribute('data-slug'), el),
  }));
  // The pop-up's "View development" link should point at the item's own page. If it's been
  // set to anything else in Webflow ('#' or the bare /development template), point it at the
  // page the matching results card links to.
  items.forEach((item) => {
    item.el.querySelectorAll('[data-map-link]').forEach((a) => { if (item.link) a.href = item.link; });
  });
  const bySlug = new Map(items.map((item) => [item.slug, item]));
  pickPrice(root);
  holdImages();

  let view = 'list';
  let visible = new Set(items.map((item) => item.slug));
  let gmap = null;
  let card = null; // the pin card on the map (makeCard)
  let ready = null;
  let active = null;
  const markers = new Map();

  // --- layout ---------------------------------------------------------------

  // Map mode is a layout, not a scroll position. The section (this root's parent) gets .is-map:
  // in Webflow that's a window-high flex column from tablet up, so the map simply fills what's
  // left under the filter bar. The "Start your search" block folds away (.is-collapsed, an
  // animated grid-row collapse in Webflow). Phones stack map over list and scroll as normal.
  const section = root.parentElement;
  const hero = document.querySelector('[data-search-hero]');
  const FOLD_MS = 380; // a little over the fold transition set in Webflow (350ms)

  function setMode(isMap, { animate = true } = {}) {
    if (hero && !animate) hero.style.transition = 'none';
    section.classList.toggle('is-map', isMap);
    hero?.classList.toggle('is-collapsed', isMap);
    if (hero && !animate) {
      hero.getBoundingClientRect(); // apply before turning the transition back on
      hero.style.transition = '';
    }
  }

  // Desktop/tablet: in map mode the flex layout sizes the map, so no height is set here. While
  // the map is hidden (stashed) it gets the size it will have in map mode: the window less the
  // heading block's top padding (the heading itself is folded away), the filter bar and its
  // margin, plus the strip that tucks under the bar. Phones: CSS stacks map over list.
  function size() {
    // Side panel layout (Property Search option B): Webflow sizes the map (.map-view.is-panel).
    if (root.classList.contains('is-panel')) {
      root.style.height = '';
      return;
    }
    if (!DESKTOP.matches || (!stashed && getComputedStyle(section).display === 'flex')) {
      root.style.height = '';
      return;
    }
    const px = (el, prop) => (el ? parseFloat(getComputedStyle(el)[prop]) || 0 : 0);
    const top = px(hero, 'paddingTop') + (band ? band.offsetHeight : 0) + px(band, 'marginBottom') + px(root, 'marginTop');
    root.style.height = `${Math.max(MIN_HEIGHT, Math.round(window.innerHeight - top))}px`;
  }

  // The nav is at full height at the top of the page and grows back to it whenever you scroll
  // up; the pinned filter bar follows it down (global/sticky-filters.js).
  const navbar = document.querySelector('.navbar');
  const navFull = navbar && window.scrollY < 10 ? navbar.getBoundingClientRect().bottom : null;

  // Keep the map laid out in the window but fully transparent and behind the page, so Google
  // draws it (tiles, pins, bounds) before anyone asks for it. Google skips drawing maps that
  // are off screen, hence in the window rather than pushed aside. Opening the map is then
  // just un-stashing it.
  let stashed = false;
  function stash(on) {
    stashed = on;
    if (on) root.setAttribute('aria-hidden', 'true');
    else root.removeAttribute('aria-hidden');
    root.inert = on;
    Object.assign(root.style, on
      ? { display: '', position: 'fixed', left: '0px', top: '0px', width: `${root.parentElement.clientWidth}px`, opacity: '0', zIndex: '-1', pointerEvents: 'none' }
      : { position: '', left: '', top: '', width: '', opacity: '', zIndex: '', pointerEvents: '' });
  }

  // Build the map in the background straight away.
  function warm() {
    if (ready) return;
    if (view !== 'map') stash(true);
    size();
    init();
  }

  // --- map ------------------------------------------------------------------

  function init() {
    if (ready) return ready;
    ready = loadMaps(key).then(({ Map: GMap, OverlayView, Marker }) => {
      gmap = new GMap(canvas, {
        center: LONDON,
        zoom: 10,
        styles: GREY,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        clickableIcons: false,
        // The panel layout's phone map is full screen, so one finger moves it there too
        gestureHandling: DESKTOP.matches || root.classList.contains('is-panel') ? 'greedy' : 'cooperative',
      });
      card = makeCard(OverlayView, closeCard);
      gmap.addListener('click', closeCard); // a click on the map itself closes the card

      items.forEach((item) => {
        if (item.lat === null || item.lng === null) return; // no coordinates in the CMS
        const marker = new Marker({ position: { lat: item.lat, lng: item.lng }, icon: PIN, title: item.name });
        marker.addListener('click', () => open(item, { pan: false }));
        markers.set(item.slug, marker);
      });
      applyFilter();
    });
    ready.catch((err) => console.error('[regenta] map-view:', err));
    return ready;
  }

  // The map is pulled up under the green band's rounded bottom (a negative top margin in
  // Webflow), and the band stays pinned over it as you scroll: keep pins and the open card
  // clear of whatever the band covers.
  function tuck() {
    if (!band || stashed) return 0;
    return Math.max(0, Math.round(band.getBoundingClientRect().bottom - canvas.getBoundingClientRect().top));
  }

  function fit() {
    if (!gmap) return;
    const shown = items.filter((item) => visible.has(item.slug) && markers.has(item.slug));
    if (!shown.length) {
      gmap.setCenter(LONDON);
      gmap.setZoom(10);
      return;
    }
    if (shown.length === 1) {
      gmap.setCenter({ lat: shown[0].lat, lng: shown[0].lng });
      gmap.setZoom(ONE_PIN_ZOOM);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    shown.forEach((item) => bounds.extend({ lat: item.lat, lng: item.lng }));
    const pad = 48;
    gmap.fitBounds(bounds, { top: tuck() + 64, right: pad, bottom: pad, left: pad }); // top: room for the 51px pin above its point
  }

  function setActive(item, { scroll = false } = {}) {
    active = item;
    items.forEach((i) => i.card?.classList.toggle('is-active', i === item));
    if (!item || !scroll || !sidebar) return;
    if (DESKTOP.matches) {
      const top = item.el.getBoundingClientRect().top - sidebar.getBoundingClientRect().top + sidebar.scrollTop - 16;
      sidebar.scrollTo({ top, behavior: 'smooth' });
    }
  }

  // Open a development's card on the map, from a pin or from the list, and glide the map so
  // the card and its pin sit centred in the part of the map you can see (below the green
  // band). On phones, a click in the list first scrolls the map up under the pinned band.
  function open(item, { pan = true, scrollList = !pan } = {}) {
    const marker = markers.get(item.slug);
    if (!marker || !gmap) {
      if (item.link) window.location.href = item.link; // no coordinates: go to the page
      return;
    }
    const content = item.popup ? item.popup.cloneNode(true) : document.createTextNode(item.name);
    content.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    card.show(gmap, marker.getPosition(), content, item.name);
    const phoneScroll = pan && !DESKTOP.matches ? scrollMapIntoView() : null;
    // Wait two frames so the card has been drawn and can be measured.
    requestAnimationFrame(() => requestAnimationFrame(() => centreCard(marker, phoneScroll)));
    setActive(item, { scroll: scrollList });
  }

  function closeCard() {
    card?.hide();
    setActive(null);
  }

  // Phones: scroll so the map sits just under the pinned filter bar. Returns the part of the
  // map that will be visible once there, in map pixels (the scroll is smooth, so it can't be
  // measured yet).
  function scrollMapIntoView() {
    const sticky = band && getComputedStyle(band).position === 'sticky';
    let pinnedBottom = sticky ? (parseFloat(band.style.top) || 0) + band.offsetHeight : 0;
    const canvasDocTop = canvas.getBoundingClientRect().top + window.scrollY;
    let target = Math.max(0, canvasDocTop - pinnedBottom);
    // Scrolling up grows the nav back to full height, and the bar moves down with it.
    const growth = sticky && navFull && target < window.scrollY ? Math.max(0, navFull - navbar.getBoundingClientRect().bottom) : 0;
    if (growth) {
      target = Math.max(0, target - growth);
      pinnedBottom += growth;
    }
    window.scrollTo({ top: target, behavior: 'smooth' });
    const canvasTop = canvasDocTop - target; // in the window, once scrolled
    return {
      visibleTop: Math.max(0, pinnedBottom - canvasTop),
      visibleBottom: Math.min(canvas.clientHeight, window.innerHeight - canvasTop),
    };
  }

  // Pan so the card plus its pin are centred in the visible part of the map. panBy animates
  // whenever the move is smaller than the map, which it is for anything already on screen.
  function centreCard(marker, view) {
    if (!card?.isOpen()) return;
    const point = card.getProjection()?.fromLatLngToContainerPixel(marker.getPosition());
    const height = card.el.offsetHeight;
    if (!point || !height) return;
    const rect = canvas.getBoundingClientRect();
    const visibleTop = view ? view.visibleTop : tuck();
    const visibleBottom = view ? view.visibleBottom : Math.min(canvas.clientHeight, window.innerHeight - rect.top);
    const space = visibleBottom - visibleTop;
    const group = height + PIN_HEIGHT; // card top to the pin's point
    const targetY = group + CARD_MARGIN > space
      ? visibleTop + CARD_MARGIN + group // too tall to centre: keep the card's top in view
      : visibleTop + (space - group) / 2 + group;
    const dx = Math.round(point.x - canvas.clientWidth / 2);
    const dy = Math.round(point.y - targetY);
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) gmap.panBy(dx, dy);
  }

  // --- photos -------------------------------------------------------------------

  // Park every photo in the map items (no src, so nothing downloads while hidden).
  function holdImages() {
    root.querySelectorAll('[data-map-item] img[src]').forEach((img) => {
      img.setAttribute('data-hold-src', img.getAttribute('src'));
      img.removeAttribute('src');
      img.removeAttribute('srcset');
    });
  }

  // Put them back, borrowing the results cards' responsive versions of the same photo.
  let imagesShown = false;
  function showImages() {
    if (imagesShown) return;
    imagesShown = true;
    const srcsets = new Map();
    document.querySelectorAll('img[srcset]').forEach((img) => srcsets.set(img.getAttribute('src'), img.getAttribute('srcset')));
    root.querySelectorAll('img[data-hold-src]').forEach((img) => {
      const src = img.getAttribute('data-hold-src');
      const srcset = srcsets.get(src);
      if (srcset) {
        img.sizes = img.closest('[data-map-popup]') ? '256px' : '96px';
        img.srcset = srcset;
      }
      img.src = src;
      img.removeAttribute('data-hold-src');
    });
  }

  // --- filters ----------------------------------------------------------------

  function applyFilter() {
    items.forEach((item) => {
      const on = visible.has(item.slug);
      item.el.style.display = on ? '' : 'none';
      markers.get(item.slug)?.setMap(on && gmap ? gmap : null);
    });
    if (active && !visible.has(active.slug)) closeCard();
    if (count) {
      const shown = items.filter((item) => visible.has(item.slug)).length;
      const noun = (n) => (n === 1 ? 'development' : 'developments');
      count.textContent = shown === items.length
        ? `Showing all ${shown} ${noun(shown)}`
        : `Showing ${shown} of ${items.length} ${noun(items.length)}`;
    }
    fit();
  }

  onVisible((slugs) => {
    visible = slugs;
    applyFilter();
  });

  // --- view switch -------------------------------------------------------------

  function setView(next, { remember = true } = {}) {
    view = next === 'map' ? 'map' : 'list';
    const isMap = view === 'map';
    listViews.forEach((el) => { el.style.display = isMap ? 'none' : ''; });
    setMode(isMap, { animate: remember });
    if (isMap) {
      showImages();
      stash(false);
      root.style.display = '';
      // Map mode starts at the top of the page, wherever the list was scrolled to.
      if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: 'instant' });
    } else if (ready) {
      stash(true); // keep it drawn for next time
    } else {
      root.style.display = 'none';
    }
    toggles.forEach((button) => {
      const on = button.getAttribute('data-map-view-toggle') === view;
      button.classList.toggle('is-active', on);
      button.setAttribute('aria-pressed', String(on));
    });
    moveIndicator();
    if (remember) {
      const url = new URL(window.location.href);
      if (isMap) url.searchParams.set('view', 'map');
      else url.searchParams.delete('view');
      history.replaceState(history.state, '', url);
    }
    if (!isMap) {
      closeCard();
      return Promise.resolve();
    }
    size();
    // Fit the pins once the heading has finished folding away (the map grows as it folds).
    const folded = remember ? new Promise((resolve) => setTimeout(resolve, FOLD_MS)) : Promise.resolve();
    return Promise.all([init(), folded]).then(fit);
  }

  // Slide the switch's pill under the active button, at that button's size.
  function moveIndicator({ animate = true } = {}) {
    indicators.forEach((pill) => {
      const button = [...pill.parentElement.querySelectorAll('[data-map-view-toggle]')]
        .find((b) => b.getAttribute('data-map-view-toggle') === view);
      if (!button || !button.offsetWidth) return;
      if (!animate) pill.style.transition = 'none';
      pill.style.left = `${button.offsetLeft}px`;
      pill.style.width = `${button.offsetWidth}px`;
      if (!animate) {
        pill.getBoundingClientRect(); // apply before turning the transition back on
        pill.style.transition = '';
      }
    });
  }

  toggles.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      setView(button.getAttribute('data-map-view-toggle'));
    });
  });

  items.forEach((item) => {
    if (!item.card) return;
    item.card.addEventListener('click', () => open(item));
    item.card.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      open(item);
    });
  });

  // The pin icon on a results card opens the map on that development. Capture phase, so the
  // old embed's javascript: link never runs.
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest?.('[data-map-focus]');
    if (!trigger || root.contains(trigger)) return;
    event.preventDefault();
    event.stopPropagation();
    const item = bySlug.get(trigger.getAttribute('data-map-focus'));
    setView('map').then(() => item && open(item, { pan: true, scrollList: true }));
  }, true);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && view === 'map' && active) closeCard();
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      moveIndicator({ animate: false });
      if (!ready) return;
      if (stashed) root.style.width = `${root.parentElement.clientWidth}px`;
      size();
      gmap?.setOptions({ gestureHandling: DESKTOP.matches ? 'greedy' : 'cooperative' });
    }, 150);
  });

  setView(new URLSearchParams(window.location.search).get('view') === 'map' ? 'map' : 'list', { remember: false });
  moveIndicator({ animate: false });
  document.fonts?.ready.then(() => moveIndicator({ animate: false })); // button widths change with the font

  setTimeout(warm, 0);
}
