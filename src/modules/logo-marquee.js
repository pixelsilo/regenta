// Logo strip that scrolls left forever and eases to a stop while hovered (#57).
// Root: [data-module="logo-marquee"] (the .logos_viewport div). Inside it, .logos_track holds
// two identical Collection Lists of developer logos side by side, so moving the track by half
// its width and wrapping gives a seamless loop. Layout and styling live in Webflow.
// Visitors who prefer reduced motion get a still row.

const SPEED = 40; // px per second
const EASE = 6; // how quickly it slows down / speeds up (per second)

export default function logoMarquee(root) {
  const track = root.querySelector('.logos_track');
  if (!track) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let x = 0;
  let speed = SPEED;
  let target = SPEED;
  let visible = false;
  let last = 0;
  let frame = 0;

  root.addEventListener('mouseenter', () => { target = 0; });
  root.addEventListener('mouseleave', () => { target = SPEED; });

  const step = (now) => {
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;
    speed += (target - speed) * Math.min(1, EASE * dt);
    const half = track.scrollWidth / 2;
    if (half > 0) {
      x -= speed * dt;
      if (-x >= half) x += half;
      track.style.transform = `translate3d(${x}px, 0, 0)`;
    }
    frame = visible ? requestAnimationFrame(step) : 0;
  };

  // Only run while the strip is on screen
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !frame) { last = 0; frame = requestAnimationFrame(step); }
  }).observe(root);
}
