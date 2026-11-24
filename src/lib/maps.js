// Loads the Google Maps JS API once (async loader) and resolves with the libraries we use.
let loading;

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
      const [{ Map, InfoWindow }, { Marker }] = await Promise.all([
        google.maps.importLibrary('maps'),
        google.maps.importLibrary('marker'),
      ]);
      return { Map, InfoWindow, Marker, LatLng: google.maps.LatLng };
    });
  }
  return loading;
}
