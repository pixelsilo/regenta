// Property Search (#57): the green filter bar stays pinned under the nav while you scroll.
//
// Webflow does the pinning: the bar [data-sticky-filters] (.search-band) is position: sticky,
// and the "Start your search" heading is a separate block above it ([data-search-hero]) that
// simply scrolls away. The one thing CSS can't know is the nav's height, which animates
// between 112px and 70px (76px and 38px on phones) as you scroll; this keeps the bar's `top`
// equal to the nav's bottom edge, following it as it animates. No scroll handler.

export default function stickyFilters() {
  const bar = document.querySelector('[data-sticky-filters]');
  if (!bar) return;
  const nav = document.querySelector('.navbar');

  const place = () => {
    bar.style.top = `${nav ? Math.max(0, Math.round(nav.getBoundingClientRect().bottom)) : 0}px`;
  };
  place();
  if (nav && 'ResizeObserver' in window) new ResizeObserver(place).observe(nav);
  window.addEventListener('resize', place);
}
