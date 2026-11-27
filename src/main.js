// Regenta UK: site-wide behaviour and opt-in modules.
// Globals run on every page. Modules mount on [data-module="<name>"] roots.
// Code is being moved in from Webflow step by step; see README.md and snippets/.

import copyrightYear from './global/copyright-year.js';
import formatPrice from './global/format-price.js';
import hideOnTouch from './global/hide-on-touch.js';
import nav from './global/nav.js';
import testimonialSlider from './global/testimonial-slider.js';
import development from './global/development.js';
import pageExtras from './global/page-extras.js';
import faq from './global/faq.js';
import finsweet from './global/finsweet.js';
import legacyFilterLinks from './global/legacy-filter-links.js';
import propertyFilter from './global/property-filter.js';
import filterSelect from './global/filter-select.js';
import stickyFilters from './global/sticky-filters.js';
import caseStudyCards from './global/case-study-cards.js';
import countUp from './global/count-up.js';
import submitWait from './global/submit-wait.js';
import caseGallery from './global/case-gallery.js';
import sharedOwnershipCalculator from './calculators/shared-ownership.js';
import stampDutyCalculator from './calculators/stamp-duty.js';
import map from './modules/map.js';
import mapView from './modules/map-view.js';
import autoScroll from './modules/auto-scroll.js';
import serviceHero from './modules/service-hero.js';
import purchaserStories from './modules/purchaser-stories.js';
import logoMarquee from './modules/logo-marquee.js';
import caseStudyList from './modules/case-study-list.js';

// Site-wide behaviour that runs on every page.
// Order matters: page fixes that change the DOM (prices, location options) run before finsweet loads the filters.
const GLOBALS = [copyrightYear, formatPrice, hideOnTouch, nav, testimonialSlider, development, pageExtras, faq, sharedOwnershipCalculator, stampDutyCalculator, legacyFilterLinks, propertyFilter, filterSelect, stickyFilters, caseStudyCards, countUp, submitWait, caseGallery, finsweet];

// Opt-in modules, mounted on [data-module="<name>"] roots
const MODULES = { map, 'map-view': mapView, 'auto-scroll': autoScroll, 'service-hero': serviceHero, 'purchaser-stories': purchaserStories, 'logo-marquee': logoMarquee, 'case-study-list': caseStudyList };

function boot() {
  window.__regentaBooted = true; // the loader shows hidden content if this never happens
  GLOBALS.forEach((init) => {
    try {
      init();
    } catch (err) {
      console.error('[regenta] global failed:', err);
    }
  });

  // The Professional Services hero mounts on its class: Webflow won't keep an attribute on that element.
  document.querySelectorAll('.ps-hero:not([data-module])').forEach((root) => root.setAttribute('data-module', 'service-hero'));

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
