// Loads each Finsweet Attributes script only on pages that use it (was: all of them on every page,
// from Site settings > Head, plus rangeslider in Property Search's page head, numbercount and accordion
// in embeds, and an accordion injector in the Developments template footer).
// Cookie consent stays in the head because it has to run first.
//
// Each entry: the element that shows the page needs it → the script to load.
// v1 scripts are the same files as before. Attributes v2 (`fs-list`) only powers the CMS sliders.
const SCRIPTS = [
  { needs: '[fs-cmsfilter-element="list"]', src: 'https://cdn.jsdelivr.net/npm/@finsweet/attributes-cmsfilter@1/cmsfilter.js' },
  { needs: '[fs-cmssort-element="list"]', src: 'https://cdn.jsdelivr.net/npm/@finsweet/attributes-cmssort@1/cmssort.js' },
  { needs: '[fs-rangeslider-element]', src: 'https://cdn.jsdelivr.net/npm/@finsweet/attributes-rangeslider@1/rangeslider.js' },
  { needs: '[fs-mirrorclick-element]', src: 'https://cdn.jsdelivr.net/npm/@finsweet/attributes-mirrorclick@1/mirrorclick.js' },
  { needs: '[fs-richtext-element]', src: 'https://cdn.jsdelivr.net/npm/@finsweet/attributes-richtext@1/richtext.js' },
  { needs: '[fs-numbercount-element]', src: 'https://cdn.jsdelivr.net/npm/@finsweet/attributes-numbercount@1/numbercount.js' },
  { needs: '[fs-accordion-element]', src: 'https://cdn.jsdelivr.net/npm/@finsweet/attributes-accordion@1/accordion.js' },
  { needs: '[fs-list-element]', src: 'https://cdn.jsdelivr.net/npm/@finsweet/attributes@2/attributes.js', module: true, attrs: { 'fs-list': '' } },
];

export default function finsweet() {
  SCRIPTS.forEach(({ needs, src, module, attrs }) => {
    if (!document.querySelector(needs)) return;
    if (document.querySelector(`script[src="${src}"]`)) return; // already on the page (e.g. old page code)
    const s = document.createElement('script');
    s.src = src;
    if (module) s.type = 'module';
    else s.async = true;
    Object.entries(attrs || {}).forEach(([k, v]) => s.setAttribute(k, v));
    document.head.appendChild(s);
  });
}
