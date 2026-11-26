// Purchaser stories (#57): a mosaic of verbatim Google and Trustpilot reviews from the Reviews
// collection, with filters and a full-review popup so nothing is read out of context.
// Mock: mocks/purchaser-stories.html. Styling lives in Webflow; this only orders, lays out,
// filters and opens reviews.
//
// Webflow structure (root has data-module="purchaser-stories"):
//   [data-stories-filter="first|so|after"]   filter buttons; "" = All stories (aria-pressed toggled)
//   [data-stories-list]                      the collection list (items are laid out in columns here)
//     [data-review]                          one per review, with attributes bound to CMS fields:
//         data-order (Order), data-date (Date posted), data-style (Card style: Normal|Big|Dark),
//         data-source (Source: Google|Trustpilot)
//       [data-review-tag="first|so|after"]  (hidden) one per filter, visibility bound to its switch
//                                          (Webflow can't bind a Switch to an attribute)
//       [data-review-quote]                  the card's quote, bound in Webflow: Excerpt, Callout
//                                          (Big cards) or the Full review, by conditional visibility
//       [data-review-excerpt], [data-review-callout]   the bound Excerpt and Callout in the quote
//       [data-review-full]     (hidden)      Full review (rich text), for the popup
//       [data-review-name], [data-review-year], [data-review-avatar] (bound to Initials),
//       [data-review-dev],
//       [data-review-title] (hidden), [data-review-link] (hidden link, Link to review)
//       [data-review-more]                   "Read full review" (conditional: Excerpt is set)
//       [data-review-google] / [data-review-trustpilot]   source labels (conditional: Source is …)
//       [data-review-video] (poster image + play button), hidden links [data-review-video-file]
//       (Video (MP4) upload) and [data-review-video-url] (Video URL): either makes it a video card
//   [data-stories-filter="video"]            shows only video case studies
//   [data-review-modal]                      the popup (hidden until .is-open), with
//       [data-modal-video] (an embed holding a <video controls> element),
//       [data-modal-avatar], [data-modal-name], [data-modal-sub], [data-modal-title],
//       [data-modal-text], [data-modal-google], [data-modal-trustpilot], [data-modal-link],
//       [data-modal-close] (one or more), [data-modal-panel]
//
// Order: highest Order first, then reviews with no Order, newest first.
// Layout: cards go left to right into the shortest column (3 columns, 2 below 992px, 1 below 600px).
// Classes added (styled in Webflow): card .is-big / .is-dark, avatar .is-dark, filter .is-active,
// modal .is-open, body .is-modal-open,
// .review-callout on the italic phrase, .review-highlight on the excerpt inside the popup.

const COLS = [[599, 1], [991, 2], [Infinity, 3]];
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const text = (el) => (el?.textContent || '').trim();
const on = (v) => /^(true|1|yes)$/i.test(String(v || '').trim());
// Webflow keeps conditionally hidden elements in the page with this class
const shown = (el) => !!el && !el.classList.contains('w-condition-invisible');
// Hide or show regardless of the element's display class (a [hidden] attribute loses to display:flex)
const hide = (el, off) => { if (el) { el.hidden = off; el.style.display = off ? 'none' : ''; } };
// The words the card quotes, as they appear in the full review (no ellipses)
const quoted = (excerpt, callout) => [excerpt, callout].filter(Boolean).join(' ').replace(/^…+|…+$/g, '').trim();

export default function purchaserStories(root) {
  const list = root.querySelector('[data-stories-list]');
  const modal = root.querySelector('[data-review-modal]') || document.querySelector('[data-review-modal]');
  if (!list) return;

  const reviews = [...list.querySelectorAll('[data-review]')].map((el) => {
    const excerpt = text(el.querySelector('[data-review-excerpt]'));
    const callout = text(el.querySelector('[data-review-callout]'));
    const name = text(el.querySelector('[data-review-name]'));
    const avatarText = text(el.querySelector('[data-review-avatar]'));
    const style = (el.getAttribute('data-style') || '').toLowerCase();
    const source = (el.getAttribute('data-source') || 'Google').toLowerCase().includes('trust') ? 'trustpilot' : 'google';
    const date = Date.parse(el.getAttribute('data-date') || '') || 0;
    const tag = (t) => shown(el.querySelector(`[data-review-tag="${t}"]`)) || on(el.getAttribute(`data-${t}`));
    const r = {
      el, name, source, date, initials: avatarText, quote: quoted(excerpt, callout),
      order: Number.parseFloat(el.getAttribute('data-order')),
      tags: { first: tag('first'), so: tag('so'), after: tag('after') },
      full: el.querySelector('[data-review-full]'),
      title: text(el.querySelector('[data-review-title]')),
      dev: text(el.querySelector('[data-review-dev]')),
      year: date ? String(new Date(date).getFullYear()) : text(el.querySelector('[data-review-year]')),
      link: (el.querySelector('[data-review-link]')?.getAttribute('href') || '').replace(/^#$/, ''),
      // Video case study: the uploaded MP4, or else the Video URL
      video: [el.querySelector('[data-review-video-file]'), el.querySelector('[data-review-video-url]')]
        .map((a) => (a?.getAttribute('href') || '').replace(/^#$/, '')).find(Boolean) || '',
      poster: el.querySelector('[data-review-video] img')?.getAttribute('src') || '',
    };
    r.tags.video = !!r.video;

    // Card style (Big / Dark): Webflow can't set a class from an option field
    el.classList.toggle('is-big', style === 'big');
    el.classList.toggle('is-dark', style === 'dark');
    el.querySelector('[data-review-avatar]')?.classList.toggle('is-dark', style === 'dark');
    // What shows on each card (source label, Read full review, development, the video poster
    // or the review layout) is set with conditional visibility in Webflow, so the parts a
    // review doesn't use are never served. This script hides nothing on the cards.

    // Video cards: a full-bleed poster (4:5) with a play button and the label, title and name
    // over a gradient, as in the mock.
    if (r.video) {
      el.classList.add('is-video');
      el.querySelector('[data-review-video]')?.classList.add('is-full');
    }

    // Every card opens its full review
    el.setAttribute('role', 'button');
    el.tabIndex = 0;
    el.setAttribute('aria-label', r.video ? `Watch ${r.title || 'the video case study'}` : `Read ${name}'s full review`);
    el.addEventListener('click', (event) => { if (!event.target.closest('a')) open(r); });
    el.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(r); }
    });
    return r;
  });

  // Highest Order first, then no Order, newest first
  const ordered = Number.isFinite;
  reviews.sort((a, b) => {
    if (ordered(a.order) || ordered(b.order)) return (ordered(b.order) ? b.order : -Infinity) - (ordered(a.order) ? a.order : -Infinity) || b.date - a.date;
    return b.date - a.date;
  });

  // --- layout: columns filled left to right -------------------------------------------
  let filter = '';
  let colCount = 0;
  function layout(force) {
    const n = COLS.find(([w]) => window.innerWidth <= w)[1];
    if (n === colCount && !force) return;
    colCount = n;
    const cols = Array.from({ length: n }, () => {
      const col = document.createElement('div');
      col.className = 'stories-col';
      return col;
    });
    list.replaceChildren(...cols);
    reviews.forEach((r) => {
      const show = !filter || r.tags[filter];
      if (!show) return;
      cols.reduce((a, b) => (b.offsetHeight < a.offsetHeight ? b : a)).appendChild(r.el);
    });
  }
  layout(true);
  let resizeQueued = false;
  window.addEventListener('resize', () => {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => { resizeQueued = false; layout(); });
  });
  document.fonts?.ready.then(() => layout(true));

  // --- filters ---------------------------------------------------------------------------
  const buttons = [...root.querySelectorAll('[data-stories-filter]')];
  buttons.forEach((button) => {
    const pressed = (button.getAttribute('data-stories-filter') || '') === filter;
    button.setAttribute('aria-pressed', String(pressed));
    button.classList.toggle('is-active', pressed);
    button.addEventListener('click', (event) => {
      event.preventDefault();
      filter = button.getAttribute('data-stories-filter') || '';
      buttons.forEach((b) => {
        b.setAttribute('aria-pressed', String(b === button));
        b.classList.toggle('is-active', b === button);
      });
      layout(true);
    });
  });

  // --- popup -----------------------------------------------------------------------------
  let lastFocus = null;
  const slot = (name) => modal?.querySelector(`[data-modal-${name}]`);

  function open(r) {
    if (!modal) return;
    lastFocus = document.activeElement;
    const av = slot('avatar');
    if (av) (av.querySelector('.button-text') || av).textContent = r.initials;
    if (slot('name')) slot('name').textContent = r.name;
    if (slot('sub')) slot('sub').textContent = [r.dev, r.year].filter(Boolean).join(' · ');
    if (slot('title')) { slot('title').textContent = r.title; hide(slot('title'), !r.title); }
    const body = slot('text');
    if (body && r.full) {
      body.innerHTML = r.full.innerHTML;
      // highlight the sentence the card quoted
      if (r.quote) {
        const ex = esc(r.quote);
        body.querySelectorAll('p').forEach((p) => {
          if (p.innerHTML.includes(ex)) p.innerHTML = p.innerHTML.replace(ex, `<mark class="review-highlight">${ex}</mark>`);
        });
      }
    }
    hide(slot('google'), !!r.video || r.source !== 'google');
    hide(slot('trustpilot'), !!r.video || r.source !== 'trustpilot');
    hide(modal.querySelector('.stories-stars'), !!r.video);
    hide(modal.querySelector('.review-meta'), !!r.video); // nothing to show in it for a video
    const player = slot('video');
    const videoEl = player?.querySelector('video');
    hide(player, !r.video);
    if (videoEl) {
      if (r.video) {
        videoEl.poster = r.poster;
        videoEl.src = r.video;
        videoEl.play?.().catch(() => {}); // autoplay may be blocked; the controls are there
      } else {
        videoEl.removeAttribute('src');
        videoEl.load();
      }
    }
    const link = slot('link');
    if (link) {
      hide(link, !r.link || !!r.video);
      if (r.link) link.setAttribute('href', r.link);
      const label = link.querySelector('div') || link;
      label.textContent = r.source === 'trustpilot' ? 'See it on Trustpilot' : 'See it on Google';
    }
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-modal-open');
    (slot('panel') || modal).scrollTop = 0;
    modal.querySelector('[data-modal-close]')?.focus({ preventScroll: true });
  }

  function close() {
    if (!modal?.classList.contains('is-open')) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-modal-open');
    const videoEl = slot('video')?.querySelector('video');
    if (videoEl) { videoEl.pause(); videoEl.removeAttribute('src'); videoEl.load(); }
    lastFocus?.focus?.({ preventScroll: true });
  }

  if (modal) {
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-hidden', 'true');
    modal.addEventListener('click', (event) => {
      if (event.target.closest('[data-modal-close]') || !event.target.closest('[data-modal-panel]')) close();
    });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
  }
}
