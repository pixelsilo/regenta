// Count-up numbers (#57, replaces Finsweet numbercount).
//
// Put `count-up` on the element that holds the number and bind its text to the CMS number field
// (Statistics > Callout Number). The page ships the real number, so it reads correctly with no JS,
// to search engines and to screen readers. When the number scrolls into view it counts from 0 to
// the real value (1.6s, ease-out), formatted with thousands separators (1000 → 1,000).
// Reduced motion: no count, just the formatted number.

const DURATION = 1600;
const fmt = (n) => Math.round(n).toLocaleString('en-GB');

function run(el) {
  const to = Number(el.dataset.countTo);
  const start = performance.now();
  const tick = (now) => {
    const k = Math.min(1, (now - start) / DURATION);
    el.textContent = fmt(to * (1 - (1 - k) ** 3));
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export default function countUp() {
  const els = [...document.querySelectorAll('[count-up]')].filter((el) => !el.dataset.countTo);
  if (!els.length) return;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window);

  const io = still ? null : new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      io.unobserve(entry.target);
      run(entry.target);
    });
  }, { threshold: 0.4 });

  els.forEach((el) => {
    const to = Number(el.textContent.replace(/[^\d.]/g, ''));
    if (!el.textContent.trim() || !Number.isFinite(to)) return;
    el.dataset.countTo = String(to);
    el.setAttribute('aria-label', fmt(to));
    if (still) { el.textContent = fmt(to); return; }
    el.textContent = '0';
    io.observe(el);
  });
}
