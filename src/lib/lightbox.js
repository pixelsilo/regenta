// Our own photo lightbox (not Webflow's). The .cs-lb markup and its classes are built in Webflow
// (Case Studies template and News template); this only opens it, swaps the photo and handles keys and swipes.
//   .cs-lb (.is-open)  .cs-lb_img  .cs-lb_count  [data-lb="prev|next|close"]
// Returns open(index), or null when the page has no .cs-lb or there are no photos. The lightbox is moved to the
// end of <body> so it always covers the nav (same on the case study and news templates).

export default function lightbox(srcs) {
  const lb = document.querySelector('.cs-lb');
  if (!lb || !srcs.length) return null;
  // Lift it out of the page layout: a parent with its own stacking context (e.g. a container with a z-index)
  // would otherwise trap it under the fixed nav, whatever its own z-index.
  if (lb.parentElement !== document.body) document.body.appendChild(lb);
  const img = lb.querySelector('.cs-lb_img');
  const count = lb.querySelector('.cs-lb_count');
  let i = 0;
  let last = null;
  const show = () => {
    img.src = srcs[i];
    if (count) count.textContent = `${i + 1} / ${srcs.length}`;
  };
  const step = (d) => { i = (i + d + srcs.length) % srcs.length; show(); };
  const close = () => {
    lb.classList.remove('is-open');
    document.documentElement.style.overflow = '';
    if (last) last.focus?.();
  };
  lb.querySelectorAll('[data-lb="prev"], [data-lb="next"]').forEach((b) => { if (srcs.length < 2) b.style.display = 'none'; });
  if (count && srcs.length < 2) count.style.display = 'none';
  lb.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-lb]');
    if (btn) {
      const what = btn.getAttribute('data-lb');
      if (what === 'close') close(); else step(what === 'next' ? 1 : -1);
    } else if (e.target === lb) close();
  });
  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });
  let x0 = 0;
  lb.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
  });
  return (at) => {
    last = document.activeElement;
    i = at;
    show();
    lb.classList.add('is-open');
    document.documentElement.style.overflow = 'hidden';
    lb.querySelector('[data-lb="close"]')?.focus();
  };
}
