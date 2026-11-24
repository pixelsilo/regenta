// Google map with Regenta pins. Root: [data-module="map"] (the map box itself).
//   data-maps-key   Maps JS key (kept in Webflow, not in this public repo)
//   Single pin:  data-lat, data-lng, data-title, data-zoom (default 13)
//   Many pins:   data-pins="location-item" reads .w-dyn-item.location-item cards
//                (.data---slug, .data---latitude, .data---longitude, .data---info-window),
//                centred on London at zoom 10 with the grey style and info windows.
// Was: page code on Property Search, Contact Us and the Developments template.
import { loadMaps } from '../lib/maps.js';

const PIN = 'https://cdn.prod.website-files.com/68362e432005a0afe1416a06/6842c1858ab95beb6b0339ee_regenta-pin.png';
const LONDON = { lat: 51.5074, lng: -0.1278 };

// https://mapstyle.withgoogle.com "Silver"
const GREY = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dadada' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
  { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
];

function readPins() {
  return Array.from(document.querySelectorAll('.w-dyn-item.location-item')).map((el) => ({
    lat: Number(el.querySelector('.data---latitude')?.textContent),
    lng: Number(el.querySelector('.data---longitude')?.textContent),
    html: el.querySelector('.data---info-window')?.innerHTML || '',
  })).filter((p) => p.lat && p.lng);
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
      readPins().forEach((p) => {
        const marker = new Marker({ position: { lat: p.lat, lng: p.lng }, map: m, icon: PIN });
        marker.addListener('click', () => {
          info.setContent(p.html);
          info.open(m, marker);
        });
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
