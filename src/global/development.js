// Development page behaviour (Developments template). Each part does nothing if its elements are missing.
// Was: page code and embeds on the Developments template (see snippets/).

// Image alt text becomes the caption: [ps-item="caption"] next to an <img>
function captions() {
  document.querySelectorAll('[ps-item="caption"]').forEach((caption) => {
    const img = caption.parentElement?.querySelector('img');
    if (img && img.alt) {
      caption.textContent = img.alt;
      caption.style.display = 'block';
    } else {
      caption.style.display = 'none';
    }
  });
}

// Unit-type filter buttons built from the plots' unit types ([ps-filter="list|form|button"]).
// Each radio gets fs-list-field="type" + fs-list-value for Finsweet List v2 (the plot table's filter),
// and the chosen radio's label gets .is-active (v1 used fs-cmsfilter-active="is-active").
function unitFilter() {
  const list = document.querySelectorAll('[ps-filter="list"]');
  const form = document.querySelector('[ps-filter="form"]');
  if (!list.length || !form) return;

  const types = new Map(); // lower-case key -> text as it appears in the CMS
  list.forEach((el) => {
    const text = el.textContent.trim();
    const key = text.toLowerCase();
    if (key && !types.has(key)) types.set(key, text);
  });
  if (types.size === 1) {
    form.style.display = 'none';
    return;
  }

  const button = form.querySelector('[ps-filter="button"]');
  const row = form.querySelector('.fs-checkbox_row');
  if (!button || !row) return;
  const cap = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

  const setup = (el, key, text) => {
    const input = el.querySelector('input');
    const label = el.querySelector('span');
    input.value = cap(key);
    input.setAttribute('fs-list-field', 'type');
    input.setAttribute('fs-list-value', text);
    label.textContent = cap(key);
    return { input, label };
  };

  const [first, ...rest] = [...types.entries()];
  const buttons = [setup(button, first[0], first[1])];
  rest.forEach(([key, text]) => {
    const clone = button.cloneNode(true);
    const { input, label } = setup(clone, key, text);
    input.id = `Radio-${key}`;
    label.setAttribute('for', `Radio-${key}`);
    row.appendChild(clone);
    buttons.push({ input, label });
  });

  const markActive = () => buttons.forEach(({ input, label }) => label.classList.toggle('is-active', input.checked));
  form.addEventListener('change', markActive);
  markActive();
}

// Brochure download panel: [brochure="open"] / [brochure="close"]
function brochure() {
  const panel = document.querySelector('.brochure-download_component');
  document.querySelectorAll('[brochure="open"]').forEach((b) => b.addEventListener('click', (e) => {
    e.preventDefault();
    panel?.classList.add('open');
  }));
  document.querySelectorAll('[brochure="close"]').forEach((b) => b.addEventListener('click', (e) => {
    e.preventDefault();
    panel?.classList.remove('open');
  }));
}

// Development navbar mobile menu: [mini-nav="toggle"] on the toggle and on each link
function miniNav() {
  const toggle = document.querySelector('.dnb-mobile_toggle');
  const panel = document.querySelector('.dnb-mobile_component');
  if (!toggle || !panel) return;
  document.querySelectorAll('[mini-nav="toggle"]').forEach((el) => {
    el.addEventListener('click', (e) => {
      if (el.getAttribute('href') === '#') e.preventDefault();
      if (el === toggle) {
        panel.classList.toggle('open');
        toggle.classList.toggle('open');
      } else {
        panel.classList.remove('open');
        toggle.classList.remove('open');
      }
    });
  });
}

// Price list: row click opens the floor plan, sorting scrolls the list to the top,
// and the Shared Ownership / full price toggle.
// The old embed also clicked #default-sort on load, but that never ran (the hero gallery
// code replaced window.onload), so it is left out to keep the current behaviour.
function plots() {
  document.querySelectorAll('.pg_row').forEach((row) => {
    row.addEventListener('click', () => row.querySelector('.floorplan-lightbox-link')?.click());
  });
  document.querySelectorAll('.fs-sort_button-2').forEach((b) => {
    b.addEventListener('click', () => document.querySelector('.pg_cl')?.scrollTo(0, 0));
  });

  const link = document.querySelector('.toggle-link');
  const frame = document.querySelector('.toggle-frame');
  const knob = document.querySelector('.toggle-switch');
  if (!link || !frame || !knob) return;
  const sharedButton = document.getElementById('price-shared-button');
  const fullButton = document.getElementById('price-button');
  const sharedDivs = document.querySelectorAll('[id=price-shared-div]');
  const fullDivs = document.querySelectorAll('[id=price-standard]');

  const hasShared = Array.from(document.querySelectorAll('[fs-list-field="tenure"], [fs-cmssort-field="tenure"]')).some((el) =>
    [el.textContent, el.value, el.getAttribute('data-value')]
      .some((v) => String(v || '').trim().toLowerCase().includes('shared ownership')));

  const flash = () => document.querySelectorAll('.pg_ci').forEach((row) => {
    const pct = row.querySelector('[id=price-percentage]');
    const fx = row.querySelector('.row-flash');
    if (pct && pct.textContent.trim() && fx) {
      fx.style.transition = 'opacity 0.5s';
      fx.style.opacity = '0.5';
      setTimeout(() => { fx.style.opacity = '0'; }, 500);
    }
  });

  let on = false;
  const apply = (next, doFlash) => {
    on = next;
    frame.classList.toggle('toggle-frame-on', on);
    knob.classList.toggle('toggle-switch-on', on);
    sharedButton?.classList.toggle('hidden', !on);
    fullButton?.classList.toggle('hidden', on);
    sharedDivs.forEach((el) => el.classList.toggle('hidden', !on));
    fullDivs.forEach((el) => el.classList.toggle('hidden', on));
    if (on && doFlash) flash();
  };
  apply(hasShared, hasShared);
  link.addEventListener('click', (e) => {
    e.preventDefault();
    apply(!on, !on);
  });
}

// Share button (#shareBtn): native share sheet with the development name and description
function share() {
  const btn = document.getElementById('shareBtn');
  if (!btn) return;
  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!navigator.share) return;
    const name = document.title.split('|')[0].trim();
    const text = document.querySelector('meta[name="description"]')?.content || '';
    try {
      await navigator.share({ title: `Discover ${name} at Regenta`, text, url: location.href });
    } catch (err) {
      if (err.name !== 'AbortError') console.error('[regenta] share:', err);
    }
  });
}

export default function development() {
  captions();
  unitFilter();
  brochure();
  miniNav();
  plots();
  share();
}
