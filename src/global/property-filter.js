// Property Search filters (#57). Replaces Finsweet List v2, Range Slider and Mirror Click on
// that page: 26 developments filter instantly in the browser, and the map view follows.
//
// Webflow attributes:
//   [data-filter-form]                     the filters form (never submits)
//   select[data-filter-field="tenure"]     equal
//   select[data-filter-field="region"]     equal
//   select[data-filter-field="bedrooms"]   at least
//   [data-range]                           price slider, with data-range-min / data-range-max /
//                                          data-range-step; inside it [data-range-track],
//                                          two [data-range-handle], [data-range-fill] and two
//                                          [data-range-display] (from / to)
//   [data-filter-count]                    number of results
//   [data-filter-clear]                    resets everything
//   [data-filter-item]                     one per development, with inside it:
//     [data-filter-value="tenure"]         (one or more), "region", "bedrooms", "price"
//     [data-map-focus="slug"]              the development's slug (also used by the map view)
//
// The address keeps the same query format Finsweet used, so links in ads and emails still work:
// ?tenure_equal=…&region_equal=…&bedrooms_greater-equal=…&price_greater-equal=…&price_less-equal=…
// (global/legacy-filter-links.js turns the older v1 links into these first).
// The slider's ends mean "no limit", so a £1,050,000 home still shows with the slider at £1,000,000.
import { publishVisible } from '../lib/filters.js';

const PARAMS = {
  tenure: 'tenure_equal',
  region: 'region_equal',
  bedrooms: 'bedrooms_greater-equal',
  priceFrom: 'price_greater-equal',
  priceTo: 'price_less-equal',
};

const text = (el) => (el?.textContent || '').trim();
const num = (value) => {
  const n = parseFloat(String(value).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : null;
};
const same = (a, b) => a.toLowerCase() === b.toLowerCase();
const money = (n) => n.toLocaleString('en-GB');

// --- price slider -------------------------------------------------------------

function rangeSlider(root, onChange) {
  const min = num(root.getAttribute('data-range-min')) ?? 0;
  const max = num(root.getAttribute('data-range-max')) ?? 1000000;
  const step = num(root.getAttribute('data-range-step')) || 5000;
  const track = root.querySelector('[data-range-track]');
  const handles = [...root.querySelectorAll('[data-range-handle]')].slice(0, 2);
  const fill = root.querySelector('[data-range-fill]');
  const displays = [...root.querySelectorAll('[data-range-display]')];
  const values = [min, max];

  const pct = (v) => ((v - min) / (max - min)) * 100;
  function render() {
    handles.forEach((h, i) => {
      h.style.left = `${pct(values[i])}%`;
      h.setAttribute('aria-valuenow', String(values[i]));
      h.setAttribute('aria-valuetext', `£${money(values[i])}`);
    });
    if (fill) {
      fill.style.left = `${pct(values[0])}%`;
      fill.style.width = `${pct(values[1]) - pct(values[0])}%`;
    }
    // The top end means "no limit": £1,000,000+.
    displays.forEach((d, i) => { if (i < 2) d.textContent = money(values[i]) + (i === 1 && values[1] >= max ? '+' : ''); });
  }

  function set(i, value, notify = true) {
    const snapped = Math.round((value - min) / step) * step + min;
    const lo = i === 0 ? min : values[0];
    const hi = i === 0 ? values[1] : max;
    values[i] = Math.min(hi, Math.max(lo, snapped));
    render();
    if (notify) onChange(values[0] > min ? values[0] : null, values[1] < max ? values[1] : null);
  }

  handles.forEach((handle, i) => {
    handle.setAttribute('role', 'slider');
    handle.setAttribute('tabindex', '0');
    handle.setAttribute('aria-label', i === 0 ? 'Minimum price' : 'Maximum price');
    handle.setAttribute('aria-valuemin', String(min));
    handle.setAttribute('aria-valuemax', String(max));
    handle.style.touchAction = 'none';

    handle.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      handle.setPointerCapture(event.pointerId);
      const move = (e) => {
        const r = track.getBoundingClientRect();
        set(i, min + ((e.clientX - r.left) / r.width) * (max - min));
      };
      const up = () => {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        handle.removeEventListener('pointercancel', up);
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
      handle.addEventListener('pointercancel', up);
    });

    handle.addEventListener('keydown', (event) => {
      const big = (max - min) / 10;
      const moves = { ArrowLeft: -step, ArrowDown: -step, ArrowRight: step, ArrowUp: step, PageDown: -big, PageUp: big };
      if (event.key in moves) set(i, values[i] + moves[event.key]);
      else if (event.key === 'Home') set(i, min);
      else if (event.key === 'End') set(i, max);
      else return;
      event.preventDefault();
    });
  });

  // Click on the track: move the nearer handle there.
  track?.addEventListener('pointerdown', (event) => {
    if (handles.includes(event.target)) return;
    const r = track.getBoundingClientRect();
    const value = min + ((event.clientX - r.left) / r.width) * (max - min);
    set(Math.abs(value - values[0]) <= Math.abs(value - values[1]) ? 0 : 1, value);
  });

  render();
  return {
    setRange(from, to) {
      values[0] = from ?? min;
      values[1] = to ?? max;
      set(0, values[0], false);
      set(1, values[1], false);
    },
  };
}

// --- filter -------------------------------------------------------------------

export default function propertyFilter() {
  const form = document.querySelector('[data-filter-form]');
  const items = [...document.querySelectorAll('[data-filter-item]')];
  if (!form || !items.length) return;

  const data = items.map((el) => ({
    el,
    slug: el.querySelector('[data-map-focus]')?.getAttribute('data-map-focus') || '',
    tenures: [...el.querySelectorAll('[data-filter-value="tenure"]')].map(text).filter(Boolean),
    region: text(el.querySelector('[data-filter-value="region"]')),
    bedrooms: num(text(el.querySelector('[data-filter-value="bedrooms"]'))),
    price: num(text(el.querySelector('[data-filter-value="price"]'))),
  }));

  // Webflow marks the card photos as full window width (sizes="100vw", because they're
  // absolutely positioned), so browsers fetch 1600-2000px versions for ~430px cards. For the
  // ones further down that haven't started loading yet, give the real width.
  items.forEach((el) => {
    el.querySelectorAll('img[srcset][loading="lazy"]').forEach((img) => {
      const r = img.getBoundingClientRect();
      if (img.complete || !r.width || r.top < window.innerHeight * 1.5) return;
      img.sizes = `${Math.ceil(r.width)}px`;
    });
  });

  const selects = {
    tenure: form.querySelector('[data-filter-field="tenure"]'),
    region: form.querySelector('[data-filter-field="region"]'),
    bedrooms: form.querySelector('[data-filter-field="bedrooms"]'),
  };
  const counts = [...document.querySelectorAll('[data-filter-count]')];
  const state = { tenure: '', region: '', bedrooms: null, priceFrom: null, priceTo: null };

  function matches(d) {
    if (state.tenure && !d.tenures.some((t) => same(t, state.tenure))) return false;
    if (state.region && !same(d.region, state.region)) return false;
    if (state.bedrooms !== null && (d.bedrooms === null || d.bedrooms < state.bedrooms)) return false;
    if (state.priceFrom !== null && (d.price === null || d.price < state.priceFrom)) return false;
    if (state.priceTo !== null && (d.price === null || d.price > state.priceTo)) return false;
    return true;
  }

  function writeQuery() {
    const url = new URL(window.location.href);
    Object.entries(PARAMS).forEach(([key, param]) => {
      const value = state[key];
      if (value === '' || value === null) url.searchParams.delete(param);
      else url.searchParams.set(param, String(value));
    });
    history.replaceState(history.state, '', url);
  }

  let queued = false;
  function apply({ remember = true } = {}) {
    const shown = new Set();
    data.forEach((d) => {
      const on = matches(d);
      d.el.style.display = on ? '' : 'none';
      if (on) shown.add(d.slug);
    });
    counts.forEach((c) => {
      (c.querySelector('strong') || c).textContent = String(shown.size);
      // "Showing 1 development" / "Showing 8 developments" (the word after the number)
      const noun = c.nextSibling;
      if (noun?.nodeType === 3 && /development/.test(noun.textContent)) {
        noun.textContent = shown.size === 1 ? ' development' : ' developments';
      }
    });
    publishVisible(shown);
    if (remember) writeQuery();
  }
  // After a filter change made further down the page, bring the top of the results (the count)
  // back into view just under the pinned filters (global/sticky-filters.js), so you see the new
  // list from its start rather than somewhere in the middle of a shorter one.
  function backToResults() {
    const anchor = counts[0];
    const list = items[0]?.closest('[data-list-view]');
    if (!anchor || (list && !list.offsetParent)) return; // map view: nothing to scroll to
    const band = document.querySelector('[data-sticky-filters]');
    const pinnedBottom = band && getComputedStyle(band).position === 'sticky' ? band.getBoundingClientRect().bottom : 0;
    const top = anchor.getBoundingClientRect().top;
    if (top < pinnedBottom) window.scrollTo({ top: window.scrollY + top - pinnedBottom - 24 });
  }

  // Slider drags fire often: filter at most once a frame.
  function applySoon() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; apply(); });
  }

  // Selects
  Object.entries(selects).forEach(([key, select]) => {
    select?.addEventListener('change', () => {
      state[key] = key === 'bedrooms' ? num(select.value) : select.value;
      apply();
      backToResults();
    });
  });

  // Price slider
  const rangeRoot = form.querySelector('[data-range]');
  const range = rangeRoot && rangeSlider(rangeRoot, (from, to) => {
    state.priceFrom = from;
    state.priceTo = to;
    applySoon();
  });

  // Never submit (Enter in the form, old Webflow form handling)
  form.addEventListener('submit', (event) => event.preventDefault());

  // Clear
  document.querySelectorAll('[data-filter-clear]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      Object.assign(state, { tenure: '', region: '', bedrooms: null, priceFrom: null, priceTo: null });
      Object.values(selects).forEach((s) => {
        if (!s) return;
        s.value = '';
        s.dispatchEvent(new Event('filter:sync')); // global/filter-select.js redraws its button
      });
      range?.setRange(null, null);
      apply();
      backToResults();
    });
  });

  // Start from the address
  const params = new URLSearchParams(window.location.search);
  const pick = (select, value) => {
    if (!select || !value) return '';
    const option = [...select.options].find((o) => same(o.value, value));
    if (option) select.value = option.value;
    return option ? option.value : value;
  };
  state.tenure = pick(selects.tenure, params.get(PARAMS.tenure));
  state.region = pick(selects.region, params.get(PARAMS.region));
  state.bedrooms = num(pick(selects.bedrooms, params.get(PARAMS.bedrooms)) || '');
  state.priceFrom = num(params.get(PARAMS.priceFrom) || '');
  state.priceTo = num(params.get(PARAMS.priceTo) || '');
  range?.setRange(state.priceFrom, state.priceTo);
  apply({ remember: false });
}
