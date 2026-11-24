// Scroll reveal for [ps="grow"]: adds .is-visible while in view (CSS in Site settings > Head).
// Siblings get a 200ms stagger; inside a Slick slider the stagger cycles per visible slide.
// Was: Site settings > Footer.
const DELAY = 200;

function stagger(parent) {
  const $ = window.jQuery;
  const children = Array.from(parent.children).filter((child) => child.hasAttribute('ps'));
  const slick = $ ? $(parent).closest('.slick-slider') : null;

  if (slick && slick.length && slick.slick) {
    const visible = slick.slick('getSlick').options.slidesToShow || 1;
    children.forEach((el, i) => { el.style.transitionDelay = `${(i % visible) * DELAY}ms`; });
  } else {
    children.forEach((el, i) => { el.style.transitionDelay = `${i * DELAY}ms`; });
  }
}

export default function grow() {
  const els = document.querySelectorAll('[ps="grow"]');
  if (!els.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const el = entry.target;
      const parent = el.parentElement;
      if (entry.isIntersecting) {
        if (parent && !parent.dataset.staggered) {
          stagger(parent);
          parent.dataset.staggered = 'true';
        }
        el.classList.add('is-visible');
      } else {
        el.classList.remove('is-visible');
      }
    });
  }, { rootMargin: '-10% 0px', threshold: 0.25 });

  els.forEach((el) => observer.observe(el));

  const $ = window.jQuery;
  if ($) {
    const restagger = () => document.querySelectorAll('.slick-slider').forEach(stagger);
    $('.slick-slider').on('afterChange', restagger);
    $(window).on('resize', restagger);
  }
}
