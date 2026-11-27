// Property Search filters (#57, option A: filter pills). global/property-filter.js still does all the
// filtering, the address and the "no results" greying on the native selects (hidden in the panel). This
// draws the panel's buttons from those selects and keeps them in step. On desktop each pill in the bar
// opens the panel as a small popover showing just that filter; on phones the Filters button opens the
// whole panel as a bottom sheet.
//
// Webflow attributes:
//   [data-filter-panel]                       the panel (.ps-side; .is-open = sheet open on phones)
//   [data-filter-picks="tenure|bedrooms|region"]  a group of buttons, built from that select's options
//     [data-filter-pick-template]             one sample button, used as the template. Its first
//                                             .button-text gets the option's label; .nw-chip_n / .ps-loc_n
//                                             get its count; .ps-loc_tick is the radio dot
//                                             Classes set: button .is-active / .is-off (no results with the
//                                             other filters; a .csl-chip, .ps-beds_btn or .ps-loc), tick .is-active
//   [data-price-preset="from,to"]             quick price ranges ("" = no limit), .is-active when set
//   [data-filter-active]                      the active filter chips (built here: button.ps-active_chip)
//   [data-filter-total]                       "12 developments";  [data-filter-go] "Show 12 developments"
//   [data-filter-active-n]                    number of filters set (hidden at 0)
//   [data-filter-sheet-open] / [data-filter-sheet-close]   phones: open / close the sheet (.ps-sheet_bg .is-open)
//   [data-filter-pop="tenure|bedrooms|region|price"]  desktop pill (.ps-pill): opens the panel as a popover
//                                             (.ps-side .is-pop) under it, showing only the matching
//     [data-filter-section="…"]               section. Pill .is-open while open, .is-set when that filter
//     [data-filter-pop-label]                 is on; its label then shows the value ("3+ beds")
//   In the popover the panel's Clear all link becomes "Reset" for that one filter.

const ALL = { tenure: 'All', bedrooms: 'Any', region: 'All areas' };
const label = (field, option) => {
  if (option.value === '') return ALL[field] || 'All';
  return field === 'bedrooms' && /^\d+$/.test(option.value) ? `${option.value}+` : option.text.trim();
};
const money = (n) => `£${Number(n).toLocaleString('en-GB')}`;
// Pill labels: £250k, £1.2m
const short = (n) => (n >= 1e6 ? `£${+(n / 1e6).toFixed(2)}m` : n >= 1000 ? `£${Math.round(n / 1000)}k` : money(n));
const devs = (n) => `${n} ${n === 1 ? 'development' : 'developments'}`;
const X = '<svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true" style="display:block"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7"/></svg>';

export default function filterPanel() {
  const panel = document.querySelector('[data-filter-panel]');
  const form = document.querySelector('[data-filter-form]');
  if (!panel || !form) return;

  const groups = [...panel.querySelectorAll('[data-filter-picks]')].map((wrap) => {
    const field = wrap.getAttribute('data-filter-picks');
    const select = form.querySelector(`[data-filter-field="${field}"]`);
    const template = wrap.querySelector('[data-filter-pick-template]');
    if (!select || !template) return null;
    template.remove();
    template.removeAttribute('data-filter-pick-template');
    return { field, wrap, select, template, buttons: [] };
  }).filter(Boolean);

  const presets = [...panel.querySelectorAll('[data-price-preset]')].map((el) => {
    const [from, to] = el.getAttribute('data-price-preset').split(',').map((v) => (v === '' ? null : Number(v)));
    return { el, from, to };
  });
  const active = document.querySelector('[data-filter-active]');
  const totals = [...document.querySelectorAll('[data-filter-total]')];
  const gos = [...document.querySelectorAll('[data-filter-go]')];
  const badges = [...document.querySelectorAll('[data-filter-active-n]')];
  let state = { tenure: '', region: '', bedrooms: null, priceFrom: null, priceTo: null };

  const priceText = (fmt = money) => {
    const { priceFrom: from, priceTo: to } = state;
    if (!from && to === null) return '';
    return to === null ? `${fmt(from)}+` : !from ? `Up to ${fmt(to)}` : `${fmt(from)} – ${fmt(to)}`;
  };
  const valueText = (field) => {
    const g = groups.find((x) => x.field === field);
    if (!g || !g.select.value) return '';
    const option = g.select.options[g.select.selectedIndex];
    return field === 'bedrooms' ? `${option.value}+ beds` : option.text.trim();
  };
  const pills = [...document.querySelectorAll('[data-filter-pop]')].map((el) => {
    const text = el.querySelector('[data-filter-pop-label]');
    return { el, field: el.getAttribute('data-filter-pop'), text, base: text?.getAttribute('data-filter-pop-label') || '' };
  });
  const sections = [...panel.querySelectorAll('[data-filter-section]')];
  // The bar's own Clear all only shows once a filter is on
  const barClears = [...document.querySelectorAll('[data-filter-clear]')].filter((el) => !panel.contains(el));
  sections.forEach((sec) => { sec.dataset.first = String(sec.classList.contains('is-first')); });

  const choose = (g, value) => {
    if (g.select.value === value) return;
    g.select.value = value;
    g.select.dispatchEvent(new Event('change', { bubbles: true })); // property-filter.js filters
    g.select.dispatchEvent(new Event('filter:sync')); // global/filter-select.js (hidden here) keeps up
  };
  const setPrice = (from, to) => form.dispatchEvent(new CustomEvent('filter:price', { detail: { from, to } }));

  // Build each group's buttons from its select (a location added in the CMS shows up here too)
  function build(g) {
    g.wrap.querySelectorAll(':scope > [data-pick]').forEach((b) => b.remove());
    g.buttons = [...g.select.options].map((option) => {
      const b = g.template.cloneNode(true);
      b.setAttribute('data-pick', option.value);
      const text = b.querySelector('.button-text');
      if (text) text.textContent = label(g.field, option);
      b.addEventListener('click', () => {
        if (b.classList.contains('is-off')) return;
        choose(g, option.value);
      });
      g.wrap.appendChild(b);
      return { b, option };
    });
  }

  function sync() {
    groups.forEach((g) => {
      if (g.buttons.length !== g.select.options.length) build(g);
      g.buttons.forEach(({ b, option }) => {
        const on = g.select.value === option.value;
        const off = option.disabled && !on;
        b.classList.toggle('is-active', on);
        b.classList.toggle('is-off', off);
        b.setAttribute('aria-pressed', String(on));
        b.setAttribute('aria-disabled', String(off));
        b.querySelector('.ps-loc_tick')?.classList.toggle('is-active', on);
        const n = b.querySelector('.nw-chip_n, .ps-loc_n');
        const count = option.getAttribute('data-count');
        if (n && count !== null) n.textContent = count;
      });
    });
    presets.forEach((p) => {
      const on = (state.priceFrom ?? null) === (p.from || null) && (state.priceTo ?? null) === p.to;
      p.el.classList.toggle('is-active', on);
      p.el.setAttribute('aria-pressed', String(on));
    });
    chips();
  }

  function chips() {
    const list = [];
    groups.forEach((g) => {
      if (!g.select.value) return;
      const option = g.select.options[g.select.selectedIndex];
      const text = g.field === 'bedrooms' ? `${option.value}+ bedrooms` : option.text.trim();
      list.push({ text, clear: () => choose(g, '') });
    });
    const price = priceText();
    if (price) list.push({ text: price, clear: () => setPrice(null, null) });
    pills.forEach(({ el, field, text, base }) => {
      const value = field === 'price' ? priceText(short) : valueText(field);
      el.classList.toggle('is-set', !!value);
      if (text) text.textContent = value || base;
    });
    if (active) {
      active.textContent = '';
      list.forEach((c) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'ps-active_chip';
        b.setAttribute('aria-label', `Remove filter: ${c.text}`);
        b.innerHTML = `<span class="button-text"></span>${X}`;
        b.firstChild.textContent = c.text;
        b.addEventListener('click', c.clear);
        active.appendChild(b);
      });
      active.style.display = list.length ? '' : 'none';
    }
    barClears.forEach((el) => { el.style.visibility = list.length ? '' : 'hidden'; });
    badges.forEach((el) => {
      // The number sits in a .button-text span so Area's capitals centre in the circle.
      let num = el.querySelector('.button-text');
      if (!num) { num = document.createElement('span'); num.className = 'button-text'; el.replaceChildren(num); }
      num.textContent = String(list.length);
      el.style.display = list.length ? '' : 'none';
    });
  }

  presets.forEach((p) => p.el.addEventListener('click', () => setPrice(p.from || null, p.to)));

  form.addEventListener('filter:applied', (event) => {
    state = event.detail.state;
    const n = event.detail.count;
    totals.forEach((el) => { el.textContent = devs(n); });
    gos.forEach((el) => { el.textContent = n ? `Show ${devs(n)}` : 'No developments match'; });
    sync();
  });
  groups.forEach((g) => g.select.addEventListener('filter:sync', sync));

  // Phones: the panel is a bottom sheet
  const bg = document.querySelector('.ps-sheet_bg');
  let opener = null;
  const open = (on) => {
    pop(null);
    panel.classList.toggle('is-open', on);
    bg?.classList.toggle('is-open', on);
    document.documentElement.style.overflow = on ? 'hidden' : '';
    if (on) { opener = document.activeElement; panel.querySelector('[data-filter-sheet-close]')?.focus({ preventScroll: true }); }
    else opener?.focus?.({ preventScroll: true });
  };
  document.querySelectorAll('[data-filter-sheet-open]').forEach((b) => b.addEventListener('click', () => open(true)));
  document.querySelectorAll('[data-filter-sheet-close]').forEach((b) => b.addEventListener('click', () => {
    if (current) pop(null, true); else open(false);
  }));

  // Desktop: each pill opens the panel as a popover under it, with just its own section
  let current = null; // the open pill
  const clears = [...panel.querySelectorAll('[data-filter-clear]')];
  const clearText = new Map(clears.map((c) => [c, c.querySelector('.button-text')?.textContent || '']));
  const place = () => {
    if (!current) return;
    const r = current.el.getBoundingClientRect();
    panel.style.top = `${Math.round(r.bottom + 8)}px`;
    panel.style.left = `${Math.round(Math.max(16, Math.min(r.left, window.innerWidth - panel.offsetWidth - 16)))}px`;
  };
  function pop(pill, refocus) {
    const was = current;
    if (was) {
      was.el.classList.remove('is-open');
      was.el.setAttribute('aria-expanded', 'false');
    }
    current = pill;
    panel.classList.toggle('is-pop', !!pill);
    sections.forEach((sec) => {
      const on = !pill || sec.getAttribute('data-filter-section') === pill.field;
      sec.style.display = on ? '' : 'none';
      sec.classList.toggle('is-first', pill ? on : sec.dataset.first === 'true');
    });
    clears.forEach((c) => {
      const t = c.querySelector('.button-text');
      if (t) t.textContent = pill ? 'Reset' : clearText.get(c);
    });
    if (pill) {
      pill.el.classList.add('is-open');
      pill.el.setAttribute('aria-expanded', 'true');
      place();
      panel.querySelector(`[data-filter-section="${pill.field}"] button:not(.is-off)`)?.focus({ preventScroll: true });
    } else {
      panel.style.top = '';
      panel.style.left = '';
      if (refocus && was) was.el.focus({ preventScroll: true });
    }
  }
  pills.forEach((p) => p.el.addEventListener('click', () => pop(current === p ? null : p)));
  // In a popover, Clear all resets just that filter (capture: runs before property-filter.js's own handler)
  panel.addEventListener('click', (e) => {
    const c = current && e.target.closest('[data-filter-clear]');
    if (!c) return;
    e.preventDefault();
    e.stopPropagation();
    if (current.field === 'price') setPrice(null, null);
    else { const g = groups.find((x) => x.field === current.field); if (g) choose(g, ''); }
  }, true);
  document.addEventListener('pointerdown', (e) => {
    if (current && !panel.contains(e.target) && !current.el.contains(e.target)) pop(null);
  });
  window.addEventListener('scroll', place, { passive: true });
  window.addEventListener('resize', () => { if (current && !current.el.offsetParent) pop(null); else place(); });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (current) pop(null, true);
    else if (panel.classList.contains('is-open')) open(false);
  });

  groups.forEach(build);
  sync();
}
