// Case study cards on the Professional Services page (#57). Styling lives in Webflow; this:
//
// 1. Links each card. The API can't set "link to the current Case Study", so cards carry their
//    slug in data-cs-slug and get /case-studies/<slug>. A link already set in the Designer
//    (Collection page > Current Case Studies) is left alone.
// 2. Hover and keyboard focus: adds .is-hover to .ps-cs_img (zoom), .ps-cs_tint
//    (darker overlay), .ps-cs_dots + .ps-cs_arrow (the emblem quarter slides in from the top right and
//    the arrow from the bottom left, as on the homepage service cards), and to .ps-cs-quote
//    (turns white). Webflow can't style children from a parent's hover, so the class is the hook.
// 3. Hides empty pills (.ps-cs_chip whose bound text is blank), e.g. no tenure in the CMS.
// 4. Makes the whole quote card open its case study, like the image cards.

const PARTS = '.ps-cs_img, .ps-cs_tint, .ps-cs_dots, .ps-cs_arrow';

function hover(card, on) {
  card.classList.toggle('is-hover', on);
  card.querySelectorAll(PARTS).forEach((el) => el.classList.toggle('is-hover', on));
}

function bindHover(card, target = card) {
  card.addEventListener('pointerenter', (event) => { if (event.pointerType === 'mouse') hover(target, true); });
  card.addEventListener('pointerleave', (event) => { if (event.pointerType === 'mouse') hover(target, false); });
  card.addEventListener('focusin', () => hover(target, true));
  card.addEventListener('focusout', (event) => { if (!card.contains(event.relatedTarget)) hover(target, false); });
}

export default function caseStudyCards() {
  document.querySelectorAll('a[data-cs-slug]').forEach((a) => {
    const slug = a.getAttribute('data-cs-slug');
    const href = a.getAttribute('href') || '';
    if (slug && !href.startsWith('/case-studies/')) a.setAttribute('href', `/case-studies/${slug}`);
  });

  document.querySelectorAll('.ps-cs_chip').forEach((chip) => {
    if (!chip.textContent.trim()) chip.hidden = true;
  });

  document.querySelectorAll('a.ps-cs').forEach((card) => bindHover(card));

  document.querySelectorAll('.ps-cs-quote').forEach((card) => {
    bindHover(card);
    const link = card.querySelector('a[href]');
    if (!link) return;
    card.addEventListener('click', (event) => {
      if (event.target.closest('a')) return; // the Read link handles itself
      if (window.getSelection()?.toString()) return; // let people select the quote
      link.click();
    });
  });
}
