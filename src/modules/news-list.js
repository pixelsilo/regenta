// News page (/news, layout C). Mock: mocks/news.html. Root: the block with data-module="news-list".
// Everything is built and styled in Webflow; this filters the stories by category, shows them a page at a time
// and pulls in stories from Webflow's later pages, so the filter covers every story.
//
//   a[data-nw-slug]           card links: href set to /news/<slug> (lib/item-links.js)
//   .nw-feat a[href]          the featured cards (Collection List filtered to "Featured?"); skipped in the grid
//   .nw-grid > .w-dyn-item    one per story (100 per Webflow page); its category is the text of its .csl-tag
//   [data-nw-filter="<cat>"]  category pills ('' = all), .is-active; .nw-chip_n is each pill's count
//   [data-nw-count]           "46 stories"
//   [data-nw-more]            shows PAGE more; hidden when there are none left
//   .w-pagination-wrapper     Webflow's own pagination: left in the page for search engines and as the no-script
//                             fallback. The script fetches the next pages' stories, then hides it.

import linkItems from '../lib/item-links.js';

const PAGE = 12;
const text = (el) => (el?.textContent || '').trim();
const plural = (n) => `${n} ${n === 1 ? 'story' : 'stories'}`;

export default function newsList(root) {
  const grid = root.querySelector('.nw-grid');
  if (!grid) return;
  linkItems(root, 'data-nw-slug', '/news');

  // Story pages only: a card whose link isn't set yet (href="#") must not hide every story
  const story = (a) => a && a.getAttribute('href') !== '#' && a.pathname !== location.pathname;
  const featured = new Set([...root.querySelectorAll('.nw-feat a[href]')].filter(story).map((a) => a.pathname));
  const items = [];
  const add = (els) => els.forEach((el) => {
    const a = el.querySelector('a[href]');
    if (story(a) && featured.has(a.pathname)) { el.remove(); return; } // already in the featured cards
    items.push({ el, cat: text(el.querySelector('.csl-tag')) });
  });
  add([...grid.children]);

  const buttons = [...root.querySelectorAll('[data-nw-filter]')];
  const count = root.querySelector('[data-nw-count]');
  const more = root.querySelector('[data-nw-more]');
  let cat = '';
  let shown = PAGE;

  function render() {
    const matches = items.filter((i) => !cat || i.cat === cat);
    items.forEach((i) => { i.el.style.display = 'none'; });
    matches.slice(0, shown).forEach((i) => { i.el.style.display = ''; });
    if (more) more.style.display = matches.length > shown ? '' : 'none';
    if (count) count.textContent = plural(matches.length);
    buttons.forEach((b) => {
      const c = b.getAttribute('data-nw-filter') || '';
      const on = c === cat;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
      const n = items.filter((i) => !c || i.cat === c).length;
      const badge = b.querySelector('.nw-chip_n');
      if (badge) badge.textContent = String(n);
      b.style.display = n ? '' : 'none'; // a category with no stories yet
    });
  }

  root.addEventListener('click', (e) => {
    const f = e.target.closest('[data-nw-filter]');
    if (f) { cat = f.getAttribute('data-nw-filter') || ''; shown = PAGE; render(); return; }
    if (e.target.closest('[data-nw-more]')) { shown += PAGE; render(); }
  });
  render();

  // Past 100 stories Webflow paginates: fetch each next page and add its stories to this grid.
  const pager = root.querySelector('.w-pagination-wrapper');
  let next = root.querySelector('.w-pagination-next');
  if (pager) pager.style.display = 'none';
  (async () => {
    const seen = new Set([location.href]);
    while (next?.getAttribute('href')) {
      const url = new URL(next.getAttribute('href'), location.href).href;
      if (seen.has(url)) break;
      seen.add(url);
      try {
        const doc = new DOMParser().parseFromString(await (await fetch(url)).text(), 'text/html');
        const g = doc.querySelector('[data-module="news-list"] .nw-grid');
        if (!g) break;
        const els = [...g.children].map((el) => document.importNode(el, true));
        els.forEach((el) => linkItems(el, 'data-nw-slug', '/news'));
        grid.append(...els);
        add(els);
        render();
        next = doc.querySelector('[data-module="news-list"] .w-pagination-next');
      } catch (err) {
        if (pager) pager.style.display = ''; // fall back to Webflow's page links
        break;
      }
    }
  })();
}
