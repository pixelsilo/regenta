// Share buttons on the Case Studies template. Root: data-module="share" (the Share block in the side panel),
// holding [data-nw-share] buttons; the tooltip is [data-nw-tip]. Same code and classes as news articles.

import share from '../lib/share.js';

export default function shareModule(root) {
  share(root);
}
