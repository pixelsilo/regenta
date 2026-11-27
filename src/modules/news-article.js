// News article (News Template, layout 1). Mock: mocks/news.html (Article 1). Root: data-module="news-article".
// Built and styled in Webflow; this adds the gallery lightbox, previous/next story links and the share buttons.
//
//   .nw-gal .w-dyn-item img    gallery photos: click opens the lightbox (.cs-lb, see lib/lightbox.js)
//   [data-nw-gal-count]        "8 photos"; [data-nw-gal] (heading + grid) is hidden when there are no photos
//   [data-nw-all] .w-dyn-item  hidden Collection List of every story (newest first, .nw-post cards): the source for
//                              previous/next and for "More news"
//   [data-nw-related]          "More news": its list gets three stories from this story's category (.csl-tag)
//   [data-nw-prev] / [data-nw-next]   links; their .nw-pn_title gets the story's name. Hidden when there isn't one
//   [data-nw-share="linkedin" | "email" | "copy"]

import lightbox from '../lib/lightbox.js';
import linkItems from '../lib/item-links.js';
import cardHover from '../lib/card-hover.js';
import prevNext from '../lib/prev-next.js';

const text = (el) => (el?.textContent || '').trim();

function gallery(root) {
  const wrap = root.querySelector('[data-nw-gal]');
  const imgs = [...root.querySelectorAll('.nw-gal .w-dyn-item img')]
    .filter((img) => img.getAttribute('src') && !img.classList.contains('w-dyn-bind-empty'));
  if (!imgs.length) { if (wrap) wrap.style.display = 'none'; return; }
  const n = root.querySelector('[data-nw-gal-count]');
  if (n) n.textContent = `${imgs.length} ${imgs.length === 1 ? 'photo' : 'photos'}`;
  const open = lightbox(imgs.map((img) => img.currentSrc || img.src));
  if (!open) return;
  imgs.forEach((img, k) => {
    const item = img.closest('.w-dyn-item');
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    item.setAttribute('aria-label', `Open photo ${k + 1} of ${imgs.length}`);
    item.addEventListener('click', () => open(k));
    item.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(k); } });
  });
}

// "More news": up to three stories in this story's category (newest first), topped up with the latest
// stories when the category has fewer. Webflow can't filter a list by "same option as this item", so the
// visible list (newest three) is the Designer preview and no-script fallback, and this swaps in the right ones.
function related(root) {
  const list = root.querySelector('[data-nw-related] .w-dyn-items');
  if (!list) return;
  const cat = text(root.querySelector('.nw-art_head .csl-tag'));
  const others = [...root.querySelectorAll('[data-nw-all] .w-dyn-item')]
    .filter((item) => item.querySelector('a[href]')?.pathname !== location.pathname);
  if (!others.length) return;
  const same = others.filter((item) => cat && text(item.querySelector('.csl-tag')) === cat);
  const pick = [...same, ...others.filter((item) => !same.includes(item))].slice(0, 3);
  list.replaceChildren(...pick.map((item) => item.cloneNode(true)));
  const h = root.querySelector('.nw-related_h');
  if (h && cat && same.length) h.textContent = `More ${cat.toLowerCase()}`;
}

function share(root) {
  const url = location.href.split('#')[0];
  const title = text(root.querySelector('h1')) || document.title;
  root.querySelectorAll('[data-nw-share]').forEach((el) => {
    const how = el.getAttribute('data-nw-share');
    if (how === 'linkedin') {
      el.setAttribute('href', `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`);
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener');
    } else if (how === 'email') {
      el.setAttribute('href', `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`);
    } else if (how === 'copy') {
      el.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          await navigator.clipboard.writeText(url);
          el.setAttribute('aria-label', 'Link copied');
          el.classList.add('is-done');
          setTimeout(() => { el.setAttribute('aria-label', 'Copy link'); el.classList.remove('is-done'); }, 2000);
        } catch (err) { /* clipboard blocked: nothing to do */ }
      });
    }
  });
}

export default function newsArticle(root) {
  linkItems(root, 'data-nw-slug', '/news');
  cardHover(root, 'a.nw-post', '.nw-post_img, .nw-post_title');
  gallery(root);
  related(root);
  prevNext(root, { all: '[data-nw-all]', prev: '[data-nw-prev]', next: '[data-nw-next]', title: '.nw-post_title' });
  share(root);
}
