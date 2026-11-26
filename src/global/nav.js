// Navigation: mobile menu toggle and the navbar background fade-in once the page scrolls.
// Was: an HtmlEmbed ("navbar-animation") inside the navigation component (snippets/embeds/global-nav.html).
export default function nav() {
  const toggle = document.querySelector('.toggle-button');
  const menu = document.querySelector('.navbar-mobile');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      document.body.style.overflow = open ? 'hidden' : '';
    });
  }

  // .navbar_faded starts at opacity 0 in CSS; show it once the page has scrolled.
  const faded = document.querySelector('.navbar_faded');
  if (faded) {
    const update = () => { faded.style.opacity = window.scrollY === 0 ? '0' : '1'; };
    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  // Compact navbar: scrolling down adds `is-compact` to the navbar, its logo and the
  // "previously SiteSales" label; scrolling up (or reaching the top) removes it.
  // Sizes, fade and transitions are the `is-compact` combo classes in Webflow.
  // Replaces the old IX2 page triggers (navbar-shrink / navbar-grow).
  const bar = document.querySelector('.navbar');
  if (bar) {
    const els = [bar, ...bar.querySelectorAll('.navbar_logo, .previously-sitesales')];
    const STEP = 8; // px of travel before a direction counts, so tiny jitters don't toggle it
    let last = window.scrollY;
    let compact = null;
    const set = (on) => {
      if (on === compact) return;
      compact = on;
      els.forEach((el) => el.classList.toggle('is-compact', on));
    };
    const onScroll = () => {
      if (menu && menu.classList.contains('open')) return;
      const y = window.scrollY;
      if (y <= 0) { set(false); last = 0; return; }
      if (Math.abs(y - last) < STEP) return;
      set(y > last);
      last = y;
    };
    set(window.scrollY > 0);
    window.addEventListener('scroll', onScroll, { passive: true });
  }
}
