// Slowly scrolls a horizontal gallery to the end and back, forever. Root: [data-module="auto-scroll"].
// Was: Developments template page code (.development-hero_gallery), which ran on window.onload.
const DURATION = 10000;
const PAUSE = 1000;
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

function animate(el, distance, done) {
  const start = el.scrollLeft;
  const t0 = performance.now();
  const step = (now) => {
    const p = Math.min((now - t0) / DURATION, 1);
    el.scrollLeft = start + distance * ease(p);
    if (p < 1) requestAnimationFrame(step); else done();
  };
  requestAnimationFrame(step);
}

export default function autoScroll(root) {
  const run = () => {
    const forward = () => setTimeout(() => animate(root, root.scrollWidth - root.clientWidth, back), PAUSE);
    const back = () => setTimeout(() => animate(root, -(root.scrollWidth - root.clientWidth), forward), PAUSE);
    forward();
  };
  // Wait for images so the scroll width is right
  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run, { once: true });
}
