// Property Search side panel (#57, option B). global/property-filter.js still does all the filtering, the
// address and the "no results" greying on the native selects (now hidden in the panel). This draws the
// panel's buttons from those selects and keeps them in step, shows the active filters as chips, and on
// phones turns the panel into a bottom sheet.
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

const ALL = { tenure: 'All', bedrooms: 'Any', region: 'All areas' };
const label = (field, option) => {
  if (option.value === '') return ALL[field] || 'All';
  return field === 'bedrooms' && /^\d+$/.test(option.value) ? `${option.value}+` : option.text.trim();
};
const money = (n) => `£${Number(n).toLocaleString('en-GB')}`;
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
    if (state.priceFrom !== null || state.priceTo !== null) {
      const text = state.priceTo === null ? `From ${money(state.priceFrom)}`
        : state.priceFrom === null ? `Up to ${money(state.priceTo)}`
        : `${money(state.priceFrom)} – ${money(state.priceTo)}`;
      list.push({ text, clear: () => setPrice(null, null) });
    }
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
    badges.forEach((el) => {
      el.textContent = String(list.length);
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
    panel.classList.toggle('is-open', on);
    bg?.classList.toggle('is-open', on);
    document.documentElement.style.overflow = on ? 'hidden' : '';
    if (on) { opener = document.activeElement; panel.querySelector('[data-filter-sheet-close]')?.focus({ preventScroll: true }); }
    else opener?.focus?.({ preventScroll: true });
  };
  document.querySelectorAll('[data-filter-sheet-open]').forEach((b) => b.addEventListener('click', () => open(true)));
  document.querySelectorAll('[data-filter-sheet-close]').forEach((b) => b.addEventListener('click', () => open(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel.classList.contains('is-open')) open(false); });

  groups.forEach(build);
  sync();
}
