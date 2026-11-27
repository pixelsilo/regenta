// Contact pages (#57, 27 Nov 2026): /contact-us (map-first layout, .ct-hero) and /contact-buyers
// (two routes, .bt-routes).
// - Hovers: Webflow can't style a child from its parent's :hover, so lib/card-hover.js adds .is-hover;
//   the quick links and link rows nudge their arrow (.ct-arrow.is-hover). Fills and colours are plain
//   :hover in Webflow. The development tiles are the featured cards (.fd2_cl.is-mini), whose hover
//   comes from featured-developments.js.
// - Copy email: button[data-copy] copies its value; the [data-copy-tip] beside it (.ct-tip, shown with
//   .is-show) says "Copy email" on hover or focus and "Copied" after a click.
// - "Send a message" (a[href="#contact-form"]) scrolls the form to just under the navbar. The navbar
//   shrinks as the page scrolls down (nav.js, .is-compact: 5rem, 3rem on phones), so the offset uses
//   the compact height, not the height at the moment of the click.
import cardHover from '../lib/card-hover.js';

const GAP = 24; // px between the navbar and the form
const TIP_HOVER = 'Copy email';
const TIP_DONE = 'Copied';

function compactNavHeight() {
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  return (window.matchMedia('(max-width: 767px)').matches ? 3 : 5) * rem;
}

function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.cssText = 'position:fixed;opacity:0';
  document.body.appendChild(area);
  area.select();
  document.execCommand('copy');
  area.remove();
  return Promise.resolve();
}

function copyButtons() {
  document.querySelectorAll('button[data-copy]').forEach((button) => {
    const tip = button.parentElement.querySelector('[data-copy-tip]');
    let timer;
    const show = (text) => {
      if (!tip) return;
      tip.textContent = text;
      tip.classList.add('is-show');
    };
    const hide = () => {
      if (tip && !timer) tip.classList.remove('is-show');
    };
    button.addEventListener('pointerenter', () => show(TIP_HOVER));
    button.addEventListener('focus', () => show(TIP_HOVER));
    button.addEventListener('pointerleave', hide);
    button.addEventListener('blur', hide);
    button.addEventListener('click', () => {
      copyText(button.getAttribute('data-copy')).then(() => {
        show(TIP_DONE);
        clearTimeout(timer);
        timer = setTimeout(() => {
          timer = null;
          if (button.matches(':hover, :focus-visible')) show(TIP_HOVER);
          else tip?.classList.remove('is-show');
        }, 1600);
      });
    });
  });
}

function formAnchor() {
  // Capture phase on window, and stop the event: Webflow's own same-page anchor scroll (delegated on
  // document) would otherwise run after this and put the form's top edge under the navbar.
  window.addEventListener('click', (event) => {
    const link = event.target.closest('a[href="#contact-form"]');
    const form = document.getElementById('contact-form');
    if (!link || !form) return;
    event.preventDefault();
    event.stopPropagation();
    const top = form.getBoundingClientRect().top + window.scrollY - compactNavHeight() - GAP;
    window.scrollTo({ top, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    history.replaceState(null, '', '#contact-form');
  }, true);
}

export default function contactPages() {
  const roots = document.querySelectorAll('.ct-hero, .bt-routes');
  if (!roots.length) return;
  roots.forEach((root) => cardHover(root, 'a.ct-quick_link, a.bt-row', '.ct-arrow'));
  copyButtons();
  formAnchor();
}
