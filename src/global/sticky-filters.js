// Property Search (#57): the filter row stays pinned under the nav while you scroll; the
// "Start your search" heading above it scrolls away.
//
// Webflow: the green band [data-sticky-filters] (.search-band) is position: sticky from tablet
// up (relative on phones, where the filters would take a third of the screen). Its top has to
// be negative, so that only the filter row is left showing, and has to follow the nav, which
// shrinks from 112px to 70px as you scroll down and grows back on the way up. That offset is
// the only thing set here.

const GAP = 16; // px of band showing between the nav and the filters while pinned

export default function stickyFilters() {
  const band = document.querySelector('[data-sticky-filters]');
  const form = band?.querySelector('[data-filter-form]');
  if (!band || !form) return;
  const nav = document.querySelector('.navbar');

  let queued = false;
  function place() {
    queued = false;
    if (getComputedStyle(band).position !== 'sticky') {
      band.style.top = '';
      return;
    }
    const navBottom = nav ? Math.max(0, nav.getBoundingClientRect().bottom) : 0;
    const formTop = form.getBoundingClientRect().top - band.getBoundingClientRect().top;
    band.style.top = `${Math.round(navBottom + GAP - formTop)}px`;
  }
  const soon = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(place);
  };

  place();
  window.addEventListener('resize', soon);
  window.addEventListener('scroll', soon, { passive: true });
  if (nav && 'ResizeObserver' in window) new ResizeObserver(soon).observe(nav); // nav height animates
  document.fonts?.ready.then(soon);
}
