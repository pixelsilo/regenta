// Regenta UK: site-wide behaviour and opt-in modules.
// Globals run on every page. Modules mount on [data-module="<name>"] roots.
// Code is being moved in from Webflow step by step; see README.md and snippets/.

import copyrightYear from './global/copyright-year.js';
import formatPrice from './global/format-price.js';
import hideOnTouch from './global/hide-on-touch.js';
import grow from './global/grow.js';
import safariShift from './global/safari-shift.js';

// Site-wide behaviour that runs on every page
const GLOBALS = [copyrightYear, formatPrice, hideOnTouch, grow, safariShift];

// Opt-in modules, mounted on [data-module="<name>"] roots
const MODULES = {};

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
