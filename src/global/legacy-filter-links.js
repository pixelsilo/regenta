// Keeps old filter links working after the move from Finsweet cmsfilter v1 to List v2.
// v1 wrote links like /property-search?tenure=Shared+Ownership&bedrooms=2&price=,300000;
// v2 reads ?tenure_equal=…&bedrooms_greater-equal=…&price_less-equal=… (and prefixes the
// development price list with "plots_" because that page has several lists).
// Runs before the Finsweet loader, so v2 sees the rewritten URL when it starts.
const LEGACY = {
  tenure: ['tenure_equal'],
  region: ['region_equal'],
  bedrooms: ['bedrooms_greater-equal'],
  price: ['price_greater-equal', 'price_less-equal'], // v1 range: "from,to"
  'plot-type': ['plots_type_equal'],
};

export default function legacyFilterLinks() {
  if (!document.querySelector('[fs-list-element="filters"]')) return;
  const url = new URL(location.href);
  let changed = false;

  Object.entries(LEGACY).forEach(([oldKey, newKeys]) => {
    if (!url.searchParams.has(oldKey)) return;
    const parts = url.searchParams.get(oldKey).split(',');
    url.searchParams.delete(oldKey);
    newKeys.forEach((newKey, i) => {
      const value = (newKeys.length === 1 ? parts.find((p) => p.trim()) : parts[i])?.trim();
      if (value && !url.searchParams.has(newKey)) url.searchParams.set(newKey, value);
    });
    changed = true;
  });

  if (changed) history.replaceState(history.state, '', url);
}
