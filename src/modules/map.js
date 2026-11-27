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

// data-transit="toggle": a branded "Underground" button (top left) that shows or hides the Tube and
// rail lines and stations (Google's transit layer). Map controls are made in JS, so the look is set here.
function transitToggle(m) {
  const layer = new google.maps.TransitLayer();
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-pressed', 'false');
  button.innerHTML = '<span style="display:inline-block;width:.85rem;height:.85rem;border-radius:50%;border:2px solid currentColor;position:relative"><span style="position:absolute;left:-4px;right:-4px;top:50%;height:2px;margin-top:-1px;background:currentColor"></span></span><span>Underground</span>';
  const paint = (on) => {
    button.style.cssText = 'margin:12px;display:flex;align-items:center;gap:.55rem;font:inherit;font-size:.85rem;line-height:1;'
      + 'padding:.7rem 1rem;border-radius:99px;cursor:pointer;box-shadow:0 4px 14px rgba(11,43,38,.18);transition:background-color .2s,color .2s;'
      + (on ? 'background:#0b2b26;color:#e3e5db;border:1px solid #0b2b26;' : 'background:#fff;color:#0b2b26;border:1px solid rgba(11,43,38,.15);');
    button.setAttribute('aria-pressed', String(on));
  };
  let on = false;
  paint(on);
  button.addEventListener('click', () => {
    on = !on;
    layer.setMap(on ? m : null);
    paint(on);
  });
  m.controls[google.maps.ControlPosition.TOP_LEFT].push(button);
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
    const m = new Map(root, {
      center: position,
      zoom: parseInt(root.getAttribute('data-zoom'), 10) || 13,
      // data-gestures="greedy": scroll and drag the map without holding Ctrl (Contact Us)
      gestureHandling: root.getAttribute('data-gestures') || 'auto',
    });
    new Marker({ position, map: m, title: root.getAttribute('data-title') || '', icon: PIN });
    if (root.getAttribute('data-transit') === 'toggle') transitToggle(m);
  }).catch((err) => console.error('[regenta] map:', err));
}
