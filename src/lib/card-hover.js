// Card hover. Webflow can't style a child from its parent's :hover, so on mouse hover or keyboard focus this
// adds .is-hover to the card and to its parts, and the looks live in Webflow combo classes (e.g.
// .nw-post_img.is-hover zooms). Delegated from root, so cards added later (load more, swapped lists) work too.
//   cardHover(root, 'a.nw-card, a.nw-post', '.nw-card_img, .nw-post_img, ...')

export default function cardHover(root, cards, parts) {
  const set = (card, on) => {
    card.classList.toggle('is-hover', on);
    card.querySelectorAll(parts).forEach((el) => el.classList.toggle('is-hover', on));
  };
  root.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const card = e.target.closest(cards);
    if (card && !card.contains(e.relatedTarget)) set(card, true);
  });
  root.addEventListener('pointerout', (e) => {
    if (e.pointerType !== 'mouse') return;
    const card = e.target.closest(cards);
    if (card && !card.contains(e.relatedTarget)) set(card, false);
  });
  root.addEventListener('focusin', (e) => { const card = e.target.closest(cards); if (card) set(card, true); });
  root.addEventListener('focusout', (e) => {
    const card = e.target.closest(cards);
    if (card && !card.contains(e.relatedTarget)) set(card, false);
  });
}
