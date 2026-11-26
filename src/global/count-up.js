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

  const pending = new Set();
  const done = (el) => { pending.delete(el); io?.unobserve(el); };

  const io = still ? null : new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      done(entry.target);
      run(entry.target);
    });
  }, { threshold: 0.4 });

  // Jumped past a number without it ever showing (anchor link, fast fling)? Show the real value,
  // so nobody scrolls back up to a 0.
  let queued = false;
  const checkPassed = () => {
    queued = false;
    pending.forEach((el) => {
      if (el.getBoundingClientRect().bottom >= 0) return;
      done(el);
      el.textContent = fmt(Number(el.dataset.countTo));
    });
    if (!pending.size) window.removeEventListener('scroll', onScroll);
  };
  const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(checkPassed); } };

  els.forEach((el) => {
    const to = Number(el.textContent.replace(/[^\d.]/g, ''));
    if (!el.textContent.trim() || !Number.isFinite(to)) return;
    el.dataset.countTo = String(to);
    el.setAttribute('aria-label', fmt(to));
    if (still) { el.textContent = fmt(to); return; }
    el.textContent = '0';
    pending.add(el);
    io.observe(el);
  });
  if (pending.size) {
    window.addEventListener('scroll', onScroll, { passive: true });
    checkPassed();
  }
}
