// Branded dropdowns for the Property Search filters (#57). The native <select> stays the
// source of truth (global/property-filter.js listens to its change events); this draws the
// button and option list built in Webflow, and keeps them in step with the select.
//
// Webflow attributes, one wrapper per filter:
//   [data-filter-select="tenure|bedrooms|region"]   wrapper (.filter-select)
//     select[data-filter-field]                     the real select, laid transparently over
//                                                   the button (.filter-select_native)
//     [data-filter-select-button]                   the visible button
//       [data-filter-select-label]                  its text (a .button-text, so Area's capitals
//                                                   centre like every other button)
//       .filter-select_icon                         the chevron
//     [data-filter-select-list]                     the option list (hidden until .is-open)
//       [data-filter-select-option]                 one sample option, used as the template
//
// Optional on the wrapper: data-filter-select-any="All tenures" (the "no filter" option text).
//
// Phones and tablets keep the native picker: the transparent select sits on top of the
// button, so a tap opens the phone's own list. With a mouse, our list opens instead.
// Classes toggled (styled in Webflow): button .is-open / .is-filled, icon .is-open,
// list .is-open, option .is-selected / .is-active. Option text goes in a .button-text too.
//
// On desktop each button is as wide as its longest option, so picking one doesn't shift the
// bar along. On phones the wrappers share the row instead (Webflow's small breakpoint).

const ANY = { tenure: 'All tenures', bedrooms: 'Any bedrooms', region: 'All locations' };
const FINE = window.matchMedia('(hover: hover) and (pointer: fine)');
const WIDE = window.matchMedia('(min-width: 768px)');

// How an option reads in the list and on the button.
const LABELS = {
  bedrooms: (text) => (/^\d+$/.test(text) ? `${text}+ bedrooms` : text),
};

let uid = 0;
const opened = new Set();

function setup(wrap) {
  const name = wrap.getAttribute('data-filter-select');
  const select = wrap.querySelector('select');
  const button = wrap.querySelector('[data-filter-select-button]');
  const label = wrap.querySelector('[data-filter-select-label]');
  const icon = wrap.querySelector('.filter-select_icon');
  const list = wrap.querySelector('[data-filter-select-list]');
  const template = list?.querySelector('[data-filter-select-option]');
  if (!select || !button || !label || !list || !template) return;

  const id = `filter-select-${++uid}`;
  const placeholder = select.options[0]?.value === '' ? select.options[0].text : '';
  const anyText = wrap.getAttribute('data-filter-select-any') || ANY[name] || 'Any';
  const show = (text) => (LABELS[name] ? LABELS[name](text) : text);
  let options = [];
  let activeIndex = -1;

  // --- build the list from the select's options --------------------------------
  function build() {
    list.textContent = '';
    options = [...select.options].map((opt, i) => {
      const el = template.cloneNode(true);
      el.id = `${id}-opt-${i}`;
      el.setAttribute('role', 'option');
      const text = document.createElement('div');
      text.className = 'button-text';
      text.textContent = opt.value === '' ? anyText : show(opt.text);
      el.replaceChildren(text);
      el.addEventListener('mousedown', (event) => event.preventDefault()); // keep focus in the list
      el.addEventListener('click', () => choose(i));
      el.addEventListener('mousemove', () => setActive(i, false));
      list.appendChild(el);
      return el;
    });
    fitWidth();
  }

  // Desktop: widen the button to fit the longest thing it can say.
  function fitWidth() {
    button.style.minWidth = '';
    if (!WIDE.matches) return;
    const current = label.textContent;
    let widest = 0;
    [placeholder || anyText, ...[...select.options].filter((o) => o.value !== '').map((o) => show(o.text))]
      .forEach((text) => {
        label.textContent = text;
        widest = Math.max(widest, button.scrollWidth);
      });
    label.textContent = current;
    button.style.minWidth = `${Math.ceil(widest) + 1}px`;
  }

  function sync() {
    const i = select.selectedIndex;
    const opt = select.options[i];
    const filled = !!opt && opt.value !== '';
    label.textContent = filled ? show(opt.text) : placeholder || anyText;
    button.classList.toggle('is-filled', filled);
    options.forEach((el, n) => {
      el.classList.toggle('is-selected', n === i);
      el.setAttribute('aria-selected', String(n === i));
    });
  }

  // --- open / close ----------------------------------------------------------------
  function isOpen() { return list.classList.contains('is-open'); }

  function open() {
    if (isOpen()) return;
    opened.forEach((close) => close());
    if (list.children.length !== select.options.length) { build(); sync(); }
    list.classList.add('is-open');
    button.classList.add('is-open');
    icon?.classList.add('is-open');
    button.setAttribute('aria-expanded', 'true');
    setActive(Math.max(0, select.selectedIndex));
    list.focus({ preventScroll: true });
    opened.add(close);
  }

  function close({ focusButton = false } = {}) {
    if (!isOpen()) return;
    list.classList.remove('is-open');
    button.classList.remove('is-open');
    icon?.classList.remove('is-open');
    button.setAttribute('aria-expanded', 'false');
    list.removeAttribute('aria-activedescendant');
    options.forEach((el) => el.classList.remove('is-active'));
    opened.delete(close);
    if (focusButton) button.focus({ preventScroll: true });
  }

  function setActive(i, scroll = true) {
    activeIndex = Math.max(0, Math.min(options.length - 1, i));
    options.forEach((el, n) => el.classList.toggle('is-active', n === activeIndex));
    const el = options[activeIndex];
    if (!el) return;
    list.setAttribute('aria-activedescendant', el.id);
    if (scroll) el.scrollIntoView({ block: 'nearest' });
  }

  function choose(i) {
    const changed = select.selectedIndex !== i;
    select.selectedIndex = i;
    sync();
    close({ focusButton: true });
    if (changed) select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // --- wiring ------------------------------------------------------------------------
  build();
  sync();

  list.id = `${id}-list`;
  list.setAttribute('role', 'listbox');
  list.setAttribute('tabindex', '-1');
  list.setAttribute('aria-label', placeholder || name);
  button.setAttribute('aria-haspopup', 'listbox');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', list.id);

  // Which control is live: our button with a mouse, the native select on touch.
  function mode() {
    const fine = FINE.matches;
    select.style.pointerEvents = fine ? 'none' : '';
    select.tabIndex = fine ? -1 : 0;
    select.toggleAttribute('aria-hidden', fine);
    button.tabIndex = fine ? 0 : -1;
    button.toggleAttribute('aria-hidden', !fine);
    if (!fine) close();
  }
  mode();
  FINE.addEventListener?.('change', mode);
  WIDE.addEventListener?.('change', fitWidth);
  document.fonts?.ready.then(fitWidth); // the Adobe font arrives after first paint

  button.addEventListener('click', () => (isOpen() ? close({ focusButton: true }) : open()));
  button.addEventListener('keydown', (event) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      open();
    }
  });

  let typed = '';
  let typedTimer;
  list.addEventListener('keydown', (event) => {
    const keys = {
      ArrowDown: () => setActive(activeIndex + 1),
      ArrowUp: () => setActive(activeIndex - 1),
      Home: () => setActive(0),
      End: () => setActive(options.length - 1),
      PageDown: () => setActive(activeIndex + 5),
      PageUp: () => setActive(activeIndex - 5),
      Enter: () => choose(activeIndex),
      ' ': () => choose(activeIndex),
      Escape: () => close({ focusButton: true }),
    };
    if (keys[event.key]) {
      event.preventDefault();
      keys[event.key]();
      return;
    }
    if (event.key === 'Tab') { close(); return; }
    // Type to jump: "e" → East London.
    if (event.key.length === 1 && /\S/.test(event.key)) {
      clearTimeout(typedTimer);
      typed += event.key.toLowerCase();
      typedTimer = setTimeout(() => { typed = ''; }, 600);
      const hit = options.findIndex((el) => el.textContent.toLowerCase().startsWith(typed));
      if (hit >= 0) setActive(hit);
    }
  });
  list.addEventListener('focusout', (event) => {
    if (!wrap.contains(event.relatedTarget)) close();
  });

  // Native changes (touch picker, filters set from the address, Clear) → redraw.
  select.addEventListener('change', sync);
  select.addEventListener('filter:sync', sync);
  // Options can be rebuilt by other scripts (the location list fills from the CMS).
  new MutationObserver(() => { build(); sync(); }).observe(select, { childList: true });
}

export default function filterSelect() {
  const wraps = document.querySelectorAll('[data-filter-select]:not([data-filter-select-ready])');
  if (!wraps.length) return;
  wraps.forEach((wrap) => {
    wrap.setAttribute('data-filter-select-ready', '');
    setup(wrap);
  });
  // A click anywhere outside the dropdowns closes an open list.
  document.addEventListener('pointerdown', (event) => {
    if (!event.target.closest?.('[data-filter-select]')) opened.forEach((close) => close());
  });
}
