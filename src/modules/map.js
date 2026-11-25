// Google map with Regenta pins. Root: [data-module="map"] (the map box itself).
//   data-maps-key   Maps JS key (kept in Webflow, not in this public repo)
//   Single pin:  data-lat, data-lng, data-title, data-zoom (default 13)
//   Many pins:   data-pins="location-item" reads .w-dyn-item.location-item cards
//                (.data---latitude, .data---longitude, .data---info-window), centred on London
//                at zoom 10 with the grey style and info windows. With Finsweet List v2 on the
//                page, pins follow the filtered cards.
// Was: page code on Property Search, Contact Us and the Developments template.
import { loadMaps, findList, GREY, LONDON, PIN } from '../lib/maps.js';

// One pin per development card: .data---latitude / .data---longitude / .data---info-window inside it.
function pinFor(el) {
  const lat = Number(el.querySelector('.data---latitude')?.textContent);
  const lng = Number(el.querySelector('.data---longitude')?.textContent);
  if (!lat || !lng) return null;
  return { el, lat, lng, html: el.querySelector('.data---info-window')?.innerHTML || '' };
}

export default function map(root) {
  const key = root.getAttribute('data-maps-key');
  if (!key) throw new Error('map: missing data-maps-key');

  loadMaps(key).then(({ Map, InfoWindow, Marker }) => {
    if (root.getAttribute('data-pins') === 'location-item') {
      const m = new Map(root, {
        center: LONDON,
        zoom: 10,
        mapTypeId: 'roadmap',
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        scrollwheel: false,
        styles: GREY,
      });
      const info = new InfoWindow();
      const CARDS = '.w-dyn-item.location-item';

      // Pins follow the filtered list: when Finsweet List v2 re-renders the cards, only the
      // visible developments keep their pin. Without a v2 list, every card gets a pin.
      findList(CARDS).then((list) => {
        const elements = list ? list.items.value.map((item) => item.element) : [...document.querySelectorAll(CARDS)];
        const markers = new globalThis.Map();
        elements.map(pinFor).filter(Boolean).forEach((p) => {
          const marker = new Marker({ position: { lat: p.lat, lng: p.lng }, map: m, icon: PIN });
          marker.addListener('click', () => {
            info.setContent(p.html);
            info.open(m, marker);
          });
          markers.set(p.el, marker);
        });
        if (!list) return;

        const show = (items) => {
          const visible = new Set(items.map((item) => item.element));
          markers.forEach((marker, el) => marker.setMap(visible.has(el) ? m : null));
          info.close();
        };
        list.addHook('afterRender', (items) => {
          show(items);
          return items;
        });
        show(list.items.value.filter((item) => item.element.isConnected));
      });
      return;
    }

    const lat = parseFloat(root.getAttribute('data-lat'));
    const lng = parseFloat(root.getAttribute('data-lng'));
    if (Number.isNaN(lat) || Number.isNaN(lng)) return; // no coordinates in the CMS
    const position = { lat, lng };
    const m = new Map(root, { center: position, zoom: parseInt(root.getAttribute('data-zoom'), 10) || 13 });
    new Marker({ position, map: m, title: root.getAttribute('data-title') || '', icon: PIN });
  }).catch((err) => console.error('[regenta] map:', err));
}
