// Regenta UK: site-wide behaviour and opt-in modules.
// Globals run on every page. Modules mount on [data-module="<name>"] roots.
// Code is being moved in from Webflow step by step; see README.md and snippets/.

import copyrightYear from './global/copyright-year.js';
import formatPrice from './global/format-price.js';
import hideOnTouch from './global/hide-on-touch.js';
import grow from './global/grow.js';
import safariShift from './global/safari-shift.js';
import nav from './global/nav.js';
import testimonialSlider from './global/testimonial-slider.js';
import development from './global/development.js';
import pageExtras from './global/page-extras.js';
import faq from './global/faq.js';
import finsweet from './global/finsweet.js';
import sharedOwnershipCalculator from './calculators/shared-ownership.js';
import stampDutyCalculator from './calculators/stamp-duty.js';
import map from './modules/map.js';
import autoScroll from './modules/auto-scroll.js';

// Site-wide behaviour that runs on every page.
// Order matters: page fixes that change the DOM (prices, location options) run before finsweet loads the filters.
const GLOBALS = [copyrightYear, formatPrice, hideOnTouch, grow, safariShift, nav, testimonialSlider, development, pageExtras, faq, sharedOwnershipCalculator, stampDutyCalculator, finsweet];

// Opt-in modules, mounted on [data-module="<name>"] roots
const MODULES = { map, 'auto-scroll': autoScroll };

function boot() {
  GLOBALS.forEach((init) => {
    try {
      init();
    } catch (err) {
      console.error('[regenta] global failed:', err);
    }
  });

  document.querySelectorAll('[data-module]').forEach((root) => {
    if (root.hasAttribute('data-ready')) return; // guard double init
    const init = MODULES[root.getAttribute('data-module')];
    if (!init) return;
    try {
      init(root);
      root.setAttribute('data-ready', '');
    } catch (err) {
      console.error('[regenta] module failed:', root.getAttribute('data-module'), err);
    }
  });
}

// Injected scripts load async, so wait for Webflow's own JS and the DOM
window.Webflow ||= [];
window.Webflow.push(() => {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
});
