// Navigation: mobile menu toggle and the navbar background fade-in once the page scrolls.
// Was: an HtmlEmbed ("navbar-animation") inside the navigation component (snippets/embeds/global-nav.html).

// Phone menu tabs: Homes / Services. Both link sets ([data-nm-set]) are built in the Navbar component;
// the sliding pill is .nm_seg_knob (.is-right for Services), the active tab .nm_seg_btn.is-active and
// the shown set .nm_set.is-on, all styled in Webflow. [data-nm-buyer] is only rendered when the
// component's Buyer links property is on, so the menu opens on Homes on buyer pages.
function menuTabs(menu) {
  const panel = menu?.querySelector('[data-nm-panel]');
  if (!panel) return null;
  const buttons = [...panel.querySelectorAll('[data-nm-tab]')];
  const sets = [...panel.querySelectorAll('[data-nm-set]')];
  const knob = panel.querySelector('.nm_seg_knob');
  const marker = panel.querySelector('[data-nm-buyer]');
  const home = marker && !marker.classList.contains('w-condition-invisible') ? 'homes' : 'services';
  sets.forEach((set) => { set.id ||= `nm-set-${set.getAttribute('data-nm-set')}`; });
  const show = (key) => {
    buttons.forEach((b) => {
      const on = b.getAttribute('data-nm-tab') === key;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      b.setAttribute('aria-controls', `nm-set-${b.getAttribute('data-nm-tab')}`);
    });
    sets.forEach((s) => s.classList.toggle('is-on', s.getAttribute('data-nm-set') === key));
    knob?.classList.toggle('is-right', key === 'services');
  };
  buttons.forEach((b) => {
    b.addEventListener('click', () => show(b.getAttribute('data-nm-tab')));
    b.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const next = buttons[(buttons.indexOf(b) + 1) % buttons.length];
      next.focus();
      show(next.getAttribute('data-nm-tab'));
    });
  });
  show(home);
  return { reset: () => show(home) };
}

export default function nav() {
  const toggle = document.querySelector('.toggle-button');
  const menu = document.querySelector('.navbar-mobile');
  const tabs = menuTabs(menu);
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) tabs?.reset(); // always opens on the side of the page you're on
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
      els.forEach((el) => {
        el.classList.toggle('is-compact', on);
        // An old Webflow interaction also writes the height inline (shrinks on scroll down, grows only
        // on a real scroll up). After a jump to the top (map view on phones) that inline 3rem kept the
        // nav short with a gap under it: clear it so the class decides.
        el.style.height = '';
      });
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
