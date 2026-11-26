// Case study gallery (Case Studies template, layout A).
// .cs-gal is a grid: the main image tile (.cs-gal_item, bound to Main Image) then the Gallery collection items
// (.cs-gal_item). The collection wrapper and list are display: contents. Clicking a tile opens .cs-lb.
// This lays the tiles out by count and, with more than three photos, crossfades the extra ones through the slots.
// All the looks live in Webflow classes: .cs-gal.is-n1 / .is-n2, .cs-gal_item.is-slot-1..3 / .is-wide / .is-off / .is-fading / .is-top.

const STEP = 2600; // ms between swaps
const FADE = 1200; // matches the cs-gal_item opacity transition

function lightbox(srcs) {
  // Our own lightbox (not Webflow's): the .cs-lb markup and its classes are built in Webflow on the
  // Case Studies template; this only opens it, swaps the photo and handles keys and swipes.
  const lb = document.querySelector('.cs-lb');
  if (!lb || !srcs.length) return null;
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

function setup(gal) {
  const items = [...gal.querySelectorAll('.cs-gal_item')]
    .filter((item) => !item.classList.contains('w-condition-invisible') && item.querySelector('img'));
  const n = items.length;
  if (!n) return;

  const open = lightbox(items.map((item) => item.querySelector('img').src));
  if (open) {
    items.forEach((item, k) => {
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.setAttribute('aria-label', `Open photo ${k + 1} of ${n}`);
      item.addEventListener('click', () => open(k));
      item.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(k); } });
    });
  }

  gal.classList.toggle('is-n1', n === 1);
  gal.classList.toggle('is-n2', n === 2);

  const slots = []; // item showing in slot 1..3 (index 0..2)
  items.forEach((item, i) => {
    if (i < 3) {
      item.classList.add(`is-slot-${i + 1}`);
      slots.push(item);
    } else {
      item.classList.add('is-off');
    }
  });
  if (n === 2) items[1].classList.add('is-wide');

  if (n <= 3 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const queue = items.slice(3);
  const order = [1, 2, 0]; // side tiles first, then the big one
  let turn = 0;
  let paused = false;
  gal.addEventListener('mouseenter', () => { paused = true; });
  gal.addEventListener('mouseleave', () => { paused = false; });

  setInterval(() => {
    if (paused || document.hidden) return;
    const s = order[turn % order.length];
    turn += 1;
    const out = slots[s];
    const next = queue.shift();
    const slotClass = `is-slot-${s + 1}`;

    next.classList.add(slotClass, 'is-top', 'is-fading');
    next.classList.remove('is-off');
    void next.offsetWidth; // start from opacity 0
    requestAnimationFrame(() => next.classList.remove('is-fading'));

    setTimeout(() => {
      out.classList.add('is-off');
      out.classList.remove(slotClass);
      next.classList.remove('is-top');
      queue.push(out);
    }, FADE);
    slots[s] = next;
  }, STEP);
}

export default function caseGallery() {
  document.querySelectorAll('.cs-gal').forEach(setup);
}
