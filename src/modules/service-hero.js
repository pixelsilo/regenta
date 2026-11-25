// Professional services page (#57): the full-screen hero cycles through the services.
//
// Webflow builds and styles it all (classes on the Professional Services page); this only
// moves the .is-active class along and runs the progress bar.
//   .ps-hero                       root. main.js gives it data-module="service-hero" (the Webflow
//                                  API wouldn't keep an attribute on this element, so the class is the hook)
//     .ps-hero_slide > .ps-hero_img  one per service, in order (background image)
//     .ps-hero_text                  one per service, in order (title, line, button)
//     .ps-hero_tab                   one per service, in order; holds .ps-hero_tab-fill
//     [data-service-prev] / [data-service-next]   arrows
// Optional on the root: data-service-hero-delay="7000" (ms per service).
//
// .is-active goes on the current slide, image, text and tab; the root gets .is-paused while
// hovered or focused. The fill bar's width is the only thing set inline (it times the slide).

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

export default function serviceHero(root) {
  const slides = [...root.querySelectorAll('.ps-hero_slide')];
  const texts = [...root.querySelectorAll('.ps-hero_text')];
  const tabs = [...root.querySelectorAll('.ps-hero_tab')];
  const count = Math.min(slides.length, texts.length, tabs.length);
  if (count < 2) return;

  const delay = Number(root.getAttribute('data-service-hero-delay')) || 7000;
  let index = 0;
  let timer = 0;
  let startedAt = 0;
  let remaining = delay;
  let paused = false;

  const fill = (i) => tabs[i].querySelector('.ps-hero_tab-fill');

  function runBar(i, ms, from = 0) {
    const bar = fill(i);
    if (!bar) return;
    bar.style.transition = 'none';
    bar.style.width = `${from}%`;
    void bar.offsetWidth; // restart from `from`
    if (REDUCED.matches) { bar.style.width = '100%'; return; }
    bar.style.transition = `width ${ms}ms linear`;
    bar.style.width = '100%';
  }

  function schedule(ms) {
    clearTimeout(timer);
    remaining = ms;
    startedAt = performance.now();
    timer = setTimeout(() => go(index + 1), ms);
  }

  function go(n) {
    index = (n + count) % count;
    for (let i = 0; i < count; i += 1) {
      const on = i === index;
      slides[i].classList.toggle('is-active', on);
      slides[i].querySelector('.ps-hero_img')?.classList.toggle('is-active', on);
      texts[i].classList.toggle('is-active', on);
      texts[i].setAttribute('aria-hidden', String(!on));
      texts[i].querySelectorAll('a').forEach((a) => { a.tabIndex = on ? 0 : -1; });
      tabs[i].classList.toggle('is-active', on);
      tabs[i].setAttribute('aria-pressed', String(on));
      if (!on) { const bar = fill(i); if (bar) { bar.style.transition = 'none'; bar.style.width = '0%'; } }
    }
    if (paused) {
      // Picked while hovered: hold here, and start the full timer once the pointer leaves.
      remaining = delay;
      const bar = fill(index);
      if (bar) { bar.style.transition = 'none'; bar.style.width = '0%'; }
      return;
    }
    runBar(index, delay);
    schedule(delay);
  }

  function pause() {
    if (paused) return;
    paused = true;
    root.classList.add('is-paused');
    clearTimeout(timer);
    remaining = Math.max(0, remaining - (performance.now() - startedAt));
    const bar = fill(index);
    if (bar) {
      const width = (bar.getBoundingClientRect().width / bar.parentElement.getBoundingClientRect().width) * 100;
      bar.style.transition = 'none';
      bar.style.width = `${width}%`;
    }
  }

  function resume() {
    if (!paused) return;
    paused = false;
    root.classList.remove('is-paused');
    const bar = fill(index);
    const from = bar ? parseFloat(bar.style.width) || 0 : 0;
    runBar(index, remaining, from);
    schedule(remaining);
  }

  const press = (el, fn) => {
    el.addEventListener('click', (event) => { event.preventDefault(); fn(); });
    el.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); fn(); }
    });
  };
  tabs.slice(0, count).forEach((tab, i) => press(tab, () => go(i)));
  const prev = root.querySelector('[data-service-prev]');
  const next = root.querySelector('[data-service-next]');
  if (prev) press(prev, () => go(index - 1));
  if (next) press(next, () => go(index + 1));

  // Hover or keyboard focus holds the current service; touch never pauses.
  root.addEventListener('pointerenter', (event) => { if (event.pointerType === 'mouse') pause(); });
  root.addEventListener('pointerleave', (event) => { if (event.pointerType === 'mouse') resume(); });
  root.addEventListener('focusin', pause);
  root.addEventListener('focusout', (event) => { if (!root.contains(event.relatedTarget)) resume(); });
  // Don't advance in a background tab.
  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : resume()));

  go(0);
}
