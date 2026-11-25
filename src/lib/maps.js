// Shared Google Maps helpers: the API loader, Regenta's pin and map style, and the
// Finsweet List v2 lookup that lets pins follow the Property Search filters.
let loading;

export const PIN = 'https://cdn.prod.website-files.com/68362e432005a0afe1416a06/6842c1858ab95beb6b0339ee_regenta-pin.png';
export const LONDON = { lat: 51.5074, lng: -0.1278 };

// https://mapstyle.withgoogle.com "Silver"
export const GREY = [
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

// Loads the Google Maps JS API once (async loader) and resolves with the libraries we use.
export function loadMaps(key) {
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      if (window.google?.maps?.importLibrary) return resolve();
      const cb = '__regentaMapsReady';
      window[cb] = () => resolve();
      const s = document.createElement('script');
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async&callback=${cb}`;
      s.async = true;
      s.onerror = () => reject(new Error('Google Maps failed to load'));
      document.head.appendChild(s);
    }).then(async () => {
      const [{ Map, InfoWindow }, { Marker }, { LatLngBounds }] = await Promise.all([
        google.maps.importLibrary('maps'),
        google.maps.importLibrary('marker'),
        google.maps.importLibrary('core'),
      ]);
      return { Map, InfoWindow, Marker, LatLngBounds, LatLng: google.maps.LatLng };
    });
  }
  return loading;
}

// The Finsweet List v2 instance that holds `cardSelector`, or null if the page has none
// (or the list never starts, after 8s).
export function findList(cardSelector) {
  return new Promise((resolve) => {
    if (!document.querySelector('[fs-list-element="list"]')) return resolve(null);
    const timer = setTimeout(() => resolve(null), 8000);
    window.FinsweetAttributes ||= [];
    window.FinsweetAttributes.push(['list', (lists) => {
      clearTimeout(timer);
      const card = document.querySelector(cardSelector);
      resolve(lists.find((l) => card && (l.listElement || l.wrapperElement)?.contains(card)) || null);
    }]);
  });
}
