// Small page-specific behaviours. Each does nothing on pages without its elements.

// Success / error pages: ?success=fulham-quarter → "Fulham Quarter" in #development-name,
// ?department=customer-services → #department-name. Was: page head code on those pages.
function queryText() {
  const params = new URLSearchParams(location.search);
  const title = (s) => s.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  [['success', 'development-name'], ['department', 'department-name']].forEach(([param, id]) => {
    const value = params.get(param);
    const el = document.getElementById(id);
    if (value && el) el.textContent = title(value);
  });
}

// Property Search: fill the location dropdown (#field-3) from the hidden #location-names list.
// Was: an embed on Property Search.
function locationOptions() {
  const select = document.getElementById('field-3');
  const source = document.getElementById('location-names');
  if (!select || !source) return;
  const names = new Set();
  source.querySelectorAll('.location-name').forEach((el) => {
    const name = el.textContent.trim();
    if (name) names.add(name);
  });
  select.innerHTML = '<option value="">Locations</option>';
  names.forEach((name) => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });
}

// News articles: YouTube embeds autoplay. Was: News template page code.
function newsAutoplay() {
  if (!location.pathname.startsWith('/news/')) return;
  document.querySelectorAll('iframe.embedly-embed').forEach((iframe) => {
    const src = iframe.getAttribute('src') || '';
    if (src.includes('youtube.com/embed') && !src.includes('autoplay=1')) {
      iframe.setAttribute('src', src + (src.includes('?') ? '&' : '?') + 'autoplay=1');
    }
  });
}

// Service pages: keep Lottie animations sized on resize. Was: Services template page code.
function lottieResize() {
  if (!location.pathname.startsWith('/services/')) return;
  window.addEventListener('resize', () => {
    try { window.Webflow.require('lottie').lottie.resize(); } catch (e) { /* no lottie on page */ }
  });
}

export default function pageExtras() {
  queryText();
  locationOptions();
  newsAutoplay();
  lottieResize();
}
