// Previous / next case study (Case Studies template). Root: data-module="prev-next", holding the .nw-pn row
// (same classes as the news articles) with [data-pn-prev] / [data-pn-next], and the hidden list [data-pn-all]
// of every case study (newest public date first). Its links get their href from data-cs-slug in
// global/case-study-cards.js, which runs before modules.

import prevNext from '../lib/prev-next.js';

export default function prevNextModule(root) {
  prevNext(root, { all: '[data-pn-all]', prev: '[data-pn-prev]', next: '[data-pn-next]' });
}
