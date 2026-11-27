// Contact pages (#57, 27 Nov 2026): /contact-us (map-first layout, .ct-hero) and /contact-buyers
// (two routes, .bt-routes). Webflow can't style a child from its parent's :hover, so lib/card-hover.js
// adds .is-hover: the development tiles zoom their photo (.bt-tile_img.is-hover) and the quick links
// and link rows nudge their arrow (.ct-arrow.is-hover). Fills and colours are plain :hover in Webflow.
import cardHover from '../lib/card-hover.js';

export default function contactPages() {
  document.querySelectorAll('.ct-hero, .bt-routes').forEach((root) => {
    cardHover(root, 'a.bt-tile', '.bt-tile_img');
    cardHover(root, 'a.ct-quick_link, a.bt-row', '.ct-arrow');
  });
}
