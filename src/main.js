// Regenta UK: site-wide behaviour and opt-in modules.
// Globals run on every page. Modules mount on [data-module="<name>"] roots.
// Code is being moved in from Webflow step by step; see README.md and snippets/.

// Site-wide behaviour that runs on every page
const GLOBALS = [];

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
