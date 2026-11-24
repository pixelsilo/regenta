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
}
