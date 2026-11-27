// "Latest articles" strip (news-strip component, #57): its cards use the News page card classes
// (a.nw-post), so they get the same hover: photo zoom and title underline through the .is-hover
// combos in Webflow (lib/card-hover.js). Links come from Webflow (Collection page link).
import cardHover from '../lib/card-hover.js';

export default function newsStrip() {
  document.querySelectorAll('.section_blog-post-banner').forEach((root) => {
    cardHover(root, 'a.nw-post', '.nw-post_img, .nw-post_title');
  });
}
