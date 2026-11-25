// Property Search map view (#57): a List / Map switch beside the filters. Map shows a
// full-height map with a compact list of developments alongside; clicking a pin opens a
// small card (image, description, bedrooms, price), clicking a card finds its pin.
//
// Root: [data-module="map-view"] with data-maps-key. Inside it:
//   [data-map]              the map canvas
//   [data-map-sidebar]      the scrolling list column
//   [data-map-count]        "Showing 12 of 26 developments"
//   [data-map-item]         one per development (Collection List item), with data-slug,
//                           data-lat, data-lng bound to the CMS
//     [data-map-card]       the compact card (role="button")
//     [data-map-popup]      the pin card, kept in a hidden holder and copied into the pop-up
//     [data-map-link]       link to the development page (inside the pop-up)
//     [data-map-price]      holds [data-map-price-alt] ("Coming soon") and
//                           [data-map-price-from] ("From £…"); only one shows
// Elsewhere on the page:
//   [data-map-view-toggle="list|map"]  the switch buttons (.is-active + aria-pressed)
//   [data-list-view]        hidden while the map is open (the normal results list)
//   [data-map-focus="slug"] on a results card: opens the map on that development
//
// The map follows the Finsweet List v2 filters on the results list. ?view=map opens the
// map on load, and the switch keeps that in the address so the view can be linked to.
// Google Maps only loads the first time the map is opened.
import { loadMaps, findList, GREY, LONDON, PIN } from '../lib/maps.js';

const DESKTOP = window.matchMedia('(min-width: 768px)');
const MIN_HEIGHT = 480; // px, desktop map height floor
const FOCUS_ZOOM = 13; // zoom in at least this far when a development is picked
const ONE_PIN_ZOOM = 13;

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
  if (!key || !canvas) throw new Error('map-view: missing data-maps-key or [data-map]');

  const sidebar = root.querySelector('[data-map-sidebar]');
  const count = root.querySelector('[data-map-count]');
  const listViews = [...document.querySelectorAll('[data-list-view]')];
  const toggles = [...document.querySelectorAll('[data-map-view-toggle]')];

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

  let view = 'list';
  let visible = new Set(items.map((item) => item.slug));
  let gmap = null;
  let info = null;
  let ready = null;
  let active = null;
  const markers = new Map();

  // --- layout ---------------------------------------------------------------

  // Desktop: the map fills the window below the filters. Phones: CSS stacks map over list.
  function size() {
    if (!DESKTOP.matches) {
      root.style.height = '';
      return;
    }
    const top = root.getBoundingClientRect().top + window.scrollY;
    root.style.height = `${Math.max(MIN_HEIGHT, Math.round(window.innerHeight - top))}px`;
  }

  // --- map ------------------------------------------------------------------

  function init() {
    if (ready) return ready;
    ready = loadMaps(key).then(({ Map: GMap, InfoWindow, Marker }) => {
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
      info = new InfoWindow({ maxWidth: 320 });
      info.addListener('closeclick', () => setActive(null));

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
    gmap.fitBounds(bounds, 48);
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

  // Open a development's card on the map. From a pin: highlight its list card.
  // From the list: pan to the pin (and on phones bring the map into view).
  function open(item, { pan = true, scrollList = !pan } = {}) {
    const marker = markers.get(item.slug);
    if (!marker || !gmap) {
      if (item.link) window.location.href = item.link; // no coordinates: go to the page
      return;
    }
    const content = item.popup ? item.popup.cloneNode(true) : document.createTextNode(item.name);
    info.setContent(content);
    info.open({ map: gmap, anchor: marker, shouldFocus: false });
    if (pan) {
      gmap.panTo(marker.getPosition());
      if (gmap.getZoom() < FOCUS_ZOOM) gmap.setZoom(FOCUS_ZOOM);
      if (!DESKTOP.matches) canvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setActive(item, { scroll: scrollList });
  }

  // --- filters ----------------------------------------------------------------

  function applyFilter() {
    items.forEach((item) => {
      const on = visible.has(item.slug);
      item.el.style.display = on ? '' : 'none';
      markers.get(item.slug)?.setMap(on && gmap ? gmap : null);
    });
    if (active && !visible.has(active.slug)) {
      info?.close();
      setActive(null);
    }
    if (count) {
      const shown = items.filter((item) => visible.has(item.slug)).length;
      const noun = (n) => (n === 1 ? 'development' : 'developments');
      count.textContent = shown === items.length
        ? `Showing all ${shown} ${noun(shown)}`
        : `Showing ${shown} of ${items.length} ${noun(items.length)}`;
    }
    if (view === 'map') fit();
  }

  // The results list carries [data-map-focus="slug"] on each card.
  findList('[data-map-focus]').then((list) => {
    if (!list) return;
    const slugsOf = (listItems) => new Set(listItems
      .map((i) => i.element.querySelector('[data-map-focus]')?.getAttribute('data-map-focus'))
      .filter(Boolean));
    list.addHook('afterRender', (listItems) => {
      visible = slugsOf(listItems);
      applyFilter();
      return listItems;
    });
    visible = slugsOf(list.items.value.filter((i) => i.element.isConnected));
    applyFilter();
  });

  // --- view switch -------------------------------------------------------------

  function setView(next, { remember = true } = {}) {
    view = next === 'map' ? 'map' : 'list';
    const isMap = view === 'map';
    root.style.display = isMap ? '' : 'none';
    listViews.forEach((el) => { el.style.display = isMap ? 'none' : ''; });
    toggles.forEach((button) => {
      const on = button.getAttribute('data-map-view-toggle') === view;
      button.classList.toggle('is-active', on);
      button.setAttribute('aria-pressed', String(on));
    });
    if (remember) {
      const url = new URL(window.location.href);
      if (isMap) url.searchParams.set('view', 'map');
      else url.searchParams.delete('view');
      history.replaceState(history.state, '', url);
    }
    if (!isMap) {
      info?.close();
      setActive(null);
      return Promise.resolve();
    }
    size();
    return init().then(fit);
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
  // old embed's javascript: link and Finsweet mirror-click never run.
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest?.('[data-map-focus]');
    if (!trigger || root.contains(trigger)) return;
    event.preventDefault();
    event.stopPropagation();
    const item = bySlug.get(trigger.getAttribute('data-map-focus'));
    window.scrollTo({ top: 0 });
    setView('map').then(() => item && open(item, { pan: true, scrollList: true }));
  }, true);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && view === 'map' && active) {
      info?.close();
      setActive(null);
    }
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (view !== 'map') return;
      size();
      gmap?.setOptions({ gestureHandling: DESKTOP.matches ? 'greedy' : 'cooperative' });
    }, 150);
  });

  setView(new URLSearchParams(window.location.search).get('view') === 'map' ? 'map' : 'list', { remember: false });
}
