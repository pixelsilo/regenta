// Case studies listing (/case-studies, layout B "index list"). Mock: mocks/case-studies-list.html.
// Root: the section with data-module="case-study-list". Everything is built and styled in Webflow; this
// only filters the rows by service, keeps the counts current, opens the phone filter sheet and shows the
// desktop photo preview.
//
//   .csl-row                    one per case study (Collection Item); its service tags are .csl-tag
//   [data-csl-filter="<name>"]  filter buttons: desktop pills (.csl-chip) and phone sheet options (.csl-opt);
//                               "" = all. Active state: .is-active on both
//   [data-csl-count]            "16 case studies"; [data-csl-value] the phone button's current service
//   .csl-opt_n                  count beside each sheet option
//   [data-csl-open] / [data-csl-sheet] (.is-open) / [data-csl-close]   the phone filter sheet
//   [data-csl-launch] .csl-stat_value   bound to the launch date; shown as just the year
//   [data-csl-peek] .csl-peek_img       desktop hover preview (.is-on), fed by each row's Thumbnail image

const text = (el) => (el?.textContent || '').trim();
const plural = (n) => `${n} case ${n === 1 ? 'study' : 'studies'}`;

export default function caseStudyList(root) {
  const rows = [...root.querySelectorAll('.csl-row')].map((el) => ({
    el,
    services: [...el.querySelectorAll('.csl-tag')].map(text),
    img: el.querySelector('.csl-row_img'),
    ar: el.querySelector('.csl-row_ar'),
  }));
  if (!rows.length) return;

  // Launch date as a year ("Feb 28, 2025" -> "2025")
  root.querySelectorAll('[data-csl-launch] .csl-stat_value').forEach((v) => {
    const year = text(v).match(/\d{4}/);
    if (year) v.textContent = year[0];
  });

  const buttons = [...root.querySelectorAll('[data-csl-filter]')];
  const countOf = (s) => rows.filter((r) => !s || r.services.includes(s)).length;
  buttons.forEach((b) => {
    const s = b.getAttribute('data-csl-filter') || '';
    const n = countOf(s);
    if (!n) b.style.display = 'none'; // a service with no case studies yet
    const badge = b.querySelector('.csl-opt_n');
    if (badge) badge.textContent = String(n);
  });

  const count = root.querySelector('[data-csl-count]');
  const value = root.querySelector('[data-csl-value]');
  const sheet = root.querySelector('[data-csl-sheet]');

  function setFilter(s) {
    let shown = 0;
    rows.forEach((r) => {
      const on = !s || r.services.includes(s);
      r.el.style.display = on ? '' : 'none';
      if (on) shown += 1;
    });
    buttons.forEach((b) => {
      const on = (b.getAttribute('data-csl-filter') || '') === s;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    if (count) count.textContent = plural(shown);
    if (value) value.textContent = s || 'All services';
  }

  const openSheet = () => {
    if (!sheet) return;
    sheet.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    sheet.querySelector('.csl-opt.is-active, .csl-opt')?.focus({ preventScroll: true });
  };
  const closeSheet = () => {
    if (!sheet?.classList.contains('is-open')) return;
    sheet.classList.remove('is-open');
    document.body.style.overflow = '';
    root.querySelector('[data-csl-open]')?.focus({ preventScroll: true });
  };

  root.addEventListener('click', (e) => {
    const f = e.target.closest('[data-csl-filter]');
    if (f) {
      setFilter(f.getAttribute('data-csl-filter') || '');
      if (sheet?.contains(f)) closeSheet();
      return;
    }
    if (e.target.closest('[data-csl-open]')) { openSheet(); return; }
    if (e.target.closest('[data-csl-close]')) closeSheet();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });
  setFilter('');

  // Desktop: a photo preview follows the cursor over each row
  const peek = root.querySelector('[data-csl-peek]');
  const peekImg = peek?.querySelector('img');
  let hovered = null;
  const hover = (r) => {
    if (hovered === r) return;
    hovered?.ar?.classList.remove('is-hover');
    hovered = r;
    r?.ar?.classList.add('is-hover');
  };
  root.addEventListener('mousemove', (e) => {
    const el = e.target.closest('.csl-row');
    const r = el && rows.find((x) => x.el === el);
    hover(r || null);
    if (!peek || !r || window.innerWidth < 992 || !r.img) { peek?.classList.remove('is-on'); return; }
    const src = r.img.currentSrc || r.img.src;
    if (src && peekImg.getAttribute('src') !== src) peekImg.src = src;
    peek.style.transform = `translate(${Math.min(e.clientX + 24, window.innerWidth - peek.offsetWidth - 16)}px, ${Math.max(12, e.clientY - peek.offsetHeight / 2)}px)`;
    peek.classList.add('is-on');
  });
  root.addEventListener('mouseleave', () => { peek?.classList.remove('is-on'); hover(null); });
}
