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

// Share buttons: LinkedIn (new tab), email (mail app, title + link) and copy link. Each shows a tooltip
// ([data-nw-tip], moved to <body>) on hover or keyboard focus. Copying swaps the link icon for a tick
// (.is-done on the button and its .nw-share_icon parts) and the tooltip says "Link copied" for 2s.
const SHARE_LABEL = { linkedin: 'Share on LinkedIn', email: 'Share by email', copy: 'Copy link' };

function share(root) {
  const url = location.href.split('#')[0];
  const title = text(root.querySelector('h1')) || document.title;
  const tip = document.querySelector('[data-nw-tip]');
  const tipText = tip?.querySelector('.button-text') || tip;
  if (tip && tip.parentElement !== document.body) document.body.appendChild(tip);
  let tipFor = null;
  const showTip = (el, label) => {
    if (!tip) return;
    tipFor = el;
    tipText.textContent = label;
    const r = el.getBoundingClientRect();
    tip.style.transform = 'none';
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    const x = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), window.innerWidth - w - 8);
    const y = r.top - h - 8 < 8 ? r.bottom + 8 : r.top - h - 8;
    tip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    tip.classList.add('is-shown');
  };
  const hideTip = (el) => { if (tip && tipFor === el) { tip.classList.remove('is-shown'); tipFor = null; } };
  window.addEventListener('scroll', () => { if (tipFor) hideTip(tipFor); }, { passive: true });

  const copy = async (value) => {
    try { await navigator.clipboard.writeText(value); return true; } catch (err) { /* fall back below */ }
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
    ta.remove();
    return ok;
  };

  root.querySelectorAll('[data-nw-share]').forEach((el) => {
    const how = el.getAttribute('data-nw-share');
    const label = SHARE_LABEL[how] || el.getAttribute('aria-label') || '';
    el.setAttribute('aria-label', label);
    let label2 = label; // what the tooltip says right now
    el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') showTip(el, label2); });
    el.addEventListener('pointerleave', () => hideTip(el));
    el.addEventListener('focus', () => showTip(el, label2));
    el.addEventListener('blur', () => hideTip(el));
    if (how === 'linkedin') {
      el.setAttribute('href', `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`);
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener');
    } else if (how === 'email') {
      el.setAttribute('href', `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${title}
${url}`)}`);
    } else if (how === 'copy') {
      el.setAttribute('role', 'button');
      let timer = 0;
      const parts = () => [el, ...el.querySelectorAll('.nw-share_icon')];
      el.addEventListener('click', async (e) => {
        e.preventDefault();
        const ok = await copy(url);
        label2 = ok ? 'Link copied' : 'Press Ctrl+C to copy';
        if (!ok) window.prompt('Copy this link:', url);
        parts().forEach((p) => p.classList.toggle('is-done', ok));
        el.setAttribute('aria-label', label2);
        showTip(el, label2);
        clearTimeout(timer);
        timer = setTimeout(() => {
          label2 = label;
          parts().forEach((p) => p.classList.remove('is-done'));
          el.setAttribute('aria-label', label);
          if (tipFor === el) showTip(el, label);
        }, 2000);
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
