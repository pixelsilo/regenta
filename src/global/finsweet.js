// Loads each Finsweet Attributes script only on pages that use it (was: all of them on every page,
// from Site settings > Head, plus rangeslider in Property Search's page head, numbercount and accordion
// in embeds, and an accordion injector in the Developments template footer).
// Cookie consent stays in the head because it has to run first.
//
// Each entry: the element that shows the page needs it → the script to load.
// v1 scripts are the same files as before; they only load on pages that still use v1 attributes.
// Property Search uses none of these since #57: its filters are global/property-filter.js.
// Number count is gone too (#57): the stats use global/count-up.js.
// Mirror Click is gone (only the old Property Search map used it); the results cards' pin
// embeds still carry fs-mirrorclick-element, which nothing reads now.
const SCRIPTS = [
  { needs: '[fs-cmsfilter-element="list"]', src: 'https://cdn.jsdelivr.net/npm/@finsweet/attributes-cmsfilter@1/cmsfilter.js' },
  { needs: '[fs-cmssort-element="list"]', src: 'https://cdn.jsdelivr.net/npm/@finsweet/attributes-cmssort@1/cmssort.js' },
  { needs: '[fs-rangeslider-element]', v1Only: true, src: 'https://cdn.jsdelivr.net/npm/@finsweet/attributes-rangeslider@1/rangeslider.js' },
  { needs: '[fs-richtext-element]', src: 'https://cdn.jsdelivr.net/npm/@finsweet/attributes-richtext@1/richtext.js' },
  { needs: '[fs-accordion-element]', src: 'https://cdn.jsdelivr.net/npm/@finsweet/attributes-accordion@1/accordion.js' },
];

// Attributes v2: one script; each solution is switched on by an attribute on the script tag.
// v1 and v2 can't share a page, so on v2 pages the range slider and mirror click use v2 too
// (same fs-rangeslider-* / fs-mirrorclick-* attributes).
const V2_SRC = 'https://cdn.jsdelivr.net/npm/@finsweet/attributes@2/attributes.js';
const V2_SOLUTIONS = [
  { needs: '[fs-list-element]', attr: 'fs-list' },
  { needs: '[fs-rangeslider-element]', attr: 'fs-rangeslider' },
];

const add = (src, attrs = {}, module = false) => {
  if (document.querySelector(`script[src="${src}"]`)) return; // already on the page (e.g. old page code)
  const s = document.createElement('script');
  s.src = src;
  if (module) s.type = 'module';
  else s.async = true;
  Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
  document.head.appendChild(s);
};

export default function finsweet() {
  const v2 = !!document.querySelector('[fs-list-element]');

  SCRIPTS.forEach(({ needs, src, v1Only }) => {
    if (v1Only && v2) return;
    if (document.querySelector(needs)) add(src);
  });

  if (v2) {
    const attrs = {};
    V2_SOLUTIONS.forEach(({ needs, attr }) => {
      if (document.querySelector(needs)) attrs[attr] = '';
    });
    add(V2_SRC, attrs, true);
  }
}
