// Case study gallery (Case Studies template, layout A).
// .cs-gal is a grid: the main image tile (.cs-gal_item, bound to Main Image) then the Gallery collection items
// (.cs-gal_item, each a native lightbox in group "gallery"). The wrapper and list are display: contents.
// This lays the tiles out by count and, with more than three photos, crossfades the extra ones through the slots.
// All the looks live in Webflow classes: .cs-gal.is-n1 / .is-n2, .cs-gal_item.is-slot-1..3 / .is-wide / .is-off / .is-fading / .is-top.

const STEP = 2600; // ms between swaps
const FADE = 1200; // matches the cs-gal_item opacity transition

function lightboxMain(tile) {
  // The main image isn't a lightbox in Webflow (lightbox media can't be bound to a single image field there),
  // so wrap it in one here, in the same group, so it opens first in the gallery.
  const img = tile.querySelector('img');
  if (!img || tile.querySelector('.w-lightbox')) return false;
  const link = document.createElement('a');
  link.href = '#';
  link.className = 'cs-gal_link w-inline-block w-lightbox';
  link.setAttribute('aria-label', 'Open photo gallery');
  const json = document.createElement('script');
  json.type = 'application/json';
  json.className = 'w-json';
  json.textContent = JSON.stringify({ items: [{ url: img.currentSrc || img.src, type: 'image' }], group: 'gallery' });
  img.replaceWith(link);
  link.append(img, json);
  return true;
}

function setup(gal) {
  const items = [...gal.querySelectorAll('.cs-gal_item')];
  const n = items.length;
  if (!n) return;

  if (lightboxMain(items[0])) {
    try { window.Webflow.require('lightbox').ready(); } catch (e) { /* lightbox not on the page */ }
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
