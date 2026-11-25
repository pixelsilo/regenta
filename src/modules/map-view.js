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
// ?view=map opens the map on load, and the switch keeps that in the address. Opening the map
// scrolls the page to where the filters pin, so the map fills the window under them.
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
const STASH_GAP = 24; // px between the filters and the map, used while the map is hidden
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
    link: el.querySelector('[data-map-link]')?.href || '',
  }));
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

  // Desktop: the map fills the window below the filters. Phones: CSS stacks map over list.
  // While it's hidden, measure from where it will open: the top of the results list (which
  // it replaces), or failing that the bottom of the filters.
  function size(pin) {
    if (!DESKTOP.matches) {
      root.style.height = '';
      return;
    }
    const list = listViews.find((el) => el.offsetParent);
    const filters = document.querySelector('[data-filter-form]');
    let top = root.getBoundingClientRect().top + window.scrollY;
    // (plus the map's own top margin: it's pulled up under the green band's rounded corners)
    if (stashed && list) top = list.getBoundingClientRect().top + window.scrollY + (parseFloat(getComputedStyle(root).marginTop) || 0);
    else if (stashed && filters) top = filters.getBoundingClientRect().bottom + window.scrollY + STASH_GAP;
    // The map is seen with the page at the point where the filters pin (see revealMap), so it
    // fills the window from there down, whatever the page is scrolled to now.
    root.style.height = `${Math.max(MIN_HEIGHT, Math.round(window.innerHeight - (top - (pin ?? pinScroll()))))}px`;
  }

  // How far down the page the green band pins under the nav ("Start your search" is gone by
  // then). 0 if there's no pinned band.
  function pinScroll() {
    if (!band || getComputedStyle(band).position !== 'sticky') return 0;
    // (the band's own position reads as its pinned one while stuck; its section's doesn't)
    const sectionTop = band.parentElement.getBoundingClientRect().top + window.scrollY;
    return Math.max(0, Math.round(sectionTop - (parseFloat(band.style.top) || 0)));
  }

  function isPinned() {
    return !!band && band.getBoundingClientRect().top <= (parseFloat(band.style.top) || 0) + 1;
  }

  // Opening the map: jump to where the filters pin, wherever the list was scrolled to, so the
  // map sits right under them and fills the window. The nav changes height as the page
  // scrolls (which moves the pin point), so check again once it has settled.
  // The nav is at full height at the top of the page and grows back to it whenever you scroll
  // up, so a jump up the page will end with it at full height: allow for that straight away.
  const navbar = document.querySelector('.navbar');
  const navFull = navbar && window.scrollY < 10 ? navbar.getBoundingClientRect().bottom : null;
  function revealMap() {
    const go = () => {
      let target = pinScroll();
      if (navFull && target < window.scrollY) {
        target = Math.max(0, target - Math.max(0, navFull - navbar.getBoundingClientRect().bottom));
      }
      window.scrollTo({ top: target, behavior: 'instant' });
      size(target);
    };
    go();
    setTimeout(() => {
      if (view !== 'map') return;
      if (!isPinned() || Math.abs(window.scrollY - pinScroll()) > 2) {
        go();
        if (gmap) google.maps.event.trigger(gmap, 'resize');
      }
    }, 450);
  }

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
        gestureHandling: DESKTOP.matches ? 'greedy' : 'cooperative',
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

  // Phones: scroll so the map sits just under the pinned band (at least far enough for the band
  // to pin, so the heading is gone). Returns the part of the map that will be visible once
  // there, in map pixels (the scroll is smooth, so it can't be measured yet).
  function scrollMapIntoView() {
    const sticky = band && getComputedStyle(band).position === 'sticky';
    const stuckTop = sticky ? parseFloat(band.style.top) || 0 : 0;
    let pinnedBottom = sticky ? stuckTop + band.offsetHeight : 0;
    // (the band's own position reads as its pinned one while stuck; its section's doesn't)
    const bandDocTop = band ? band.parentElement.getBoundingClientRect().top + window.scrollY : 0;
    const canvasDocTop = canvas.getBoundingClientRect().top + window.scrollY;
    let target = canvasDocTop - pinnedBottom;
    if (sticky) target = Math.max(target, bandDocTop - stuckTop); // where the band pins
    // Scrolling up grows the nav back to full height, which pins the band that much lower.
    const growth = navFull && target < window.scrollY ? Math.max(0, navFull - navbar.getBoundingClientRect().bottom) : 0;
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
    if (isMap) {
      showImages();
      stash(false);
      root.style.display = '';
    } else if (ready) {
      stash(true); // keep it drawn for next time
    } else {
      root.style.display = 'none';
    }
    listViews.forEach((el) => { el.style.display = isMap ? 'none' : ''; });
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
    revealMap();
    return init().then(fit);
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
