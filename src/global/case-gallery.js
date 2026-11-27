import lightbox from '../lib/lightbox.js';

// Case study gallery (Case Studies template, layout A).
// .cs-gal is a grid: the main image tile (.cs-gal_item, bound to Main Image) then the Gallery collection items
// (.cs-gal_item). The collection wrapper and list are display: contents. Clicking a tile opens .cs-lb.
// This lays the tiles out by count and, with more than three photos, crossfades the extra ones through the slots.
// All the looks live in Webflow classes: .cs-gal.is-n1 / .is-n2, .cs-gal_item.is-slot-1..3 / .is-wide / .is-off / .is-fading / .is-top.

const STEP = 2600; // ms between swaps
const FADE = 1200; // matches the cs-gal_item opacity transition


function setup(gal) {
  // A tile only counts if it has a photo: a case study with no Main Image still renders an empty tile.
  const hasPhoto = (item) => {
    const img = item.querySelector('img');
    return img && img.getAttribute('src') && !img.classList.contains('w-dyn-bind-empty')
      && !img.classList.contains('w-condition-invisible') && !item.classList.contains('w-condition-invisible');
  };
  const all = [...gal.querySelectorAll('.cs-gal_item')];
  all.filter((item) => !hasPhoto(item)).forEach((item) => item.classList.add('is-off'));
  const items = all.filter(hasPhoto);
  const n = items.length;

  const count = gal.querySelector('.cs-gal_count');
  if (count) {
    if (n < 2) count.style.display = 'none';
    else (count.querySelector('.button-text') || count).textContent = `${n} photos`;
  }
  if (!n) return;

  // Load every photo now, so a hidden one is ready before it fades into a tile.
  items.forEach((item) => { item.querySelector('img').loading = 'eager'; });

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
    const img = queue[0].querySelector('img');
    if (!img.complete || !img.naturalWidth) return; // not loaded yet: try again next tick
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
