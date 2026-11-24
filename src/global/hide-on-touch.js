// Collapses [ps-hide="on-touch"] elements on small touch screens (≤991px).
// Was: Site settings > Head. Could become pure CSS later (see README step 6).
const SELECTOR = '[ps-hide="on-touch"]';

export default function hideOnTouch() {
  const els = document.querySelectorAll(SELECTOR);
  if (!els.length) return;

  const update = () => {
    const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    const hide = isTouch && window.innerWidth <= 991;
    els.forEach((el) => {
      el.style.width = hide ? '0px' : '';
      el.style.height = hide ? '0px' : '';
      el.style.overflow = hide ? 'hidden' : '';
    });
  };

  update();
  window.addEventListener('resize', update);
}
