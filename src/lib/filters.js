// Shared Property Search filter result: which developments (by slug) are showing.
// The filter (global/property-filter.js) publishes; the map view listens.
let visible = null; // null until the filter has run (= everything showing)
const listeners = new Set();

export function publishVisible(slugs) {
  visible = slugs;
  listeners.forEach((fn) => fn(visible));
}

// Calls fn now (if the filter has already run) and after every change.
export function onVisible(fn) {
  listeners.add(fn);
  if (visible) fn(visible);
  return () => listeners.delete(fn);
}
