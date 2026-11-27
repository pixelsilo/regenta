// Previous / next item links (news articles, case studies). A hidden Collection List of every item, newest
// first, holds the links; this finds the current page in it and fills the two links (.nw-pn_title gets the
// item's name). A side with no item (newest or oldest) is hidden, as are both if the page isn't in the list.
//   prevNext(root, { all: '[data-pn-all]', prev: '[data-pn-prev]', next: '[data-pn-next]', title: '.nw-post_title' })

const text = (el) => (el?.textContent || '').trim();

export default function prevNext(root, { all, prev, next, title }) {
  const links = [...root.querySelectorAll(`${all} a[href]`)];
  const at = links.findIndex((a) => a.pathname === location.pathname);
  const fill = (el, a) => {
    if (!el) return;
    if (!a) { el.style.display = 'none'; return; }
    el.setAttribute('href', a.getAttribute('href'));
    const t = el.querySelector('.nw-pn_title');
    if (t) t.textContent = text((title && a.querySelector(title)) || a);
  };
  // Newest first: the next (newer) item is the one before this one
  fill(root.querySelector(next), at > 0 ? links[at - 1] : null);
  fill(root.querySelector(prev), at >= 0 ? links[at + 1] : null);
}
