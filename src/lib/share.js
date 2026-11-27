const text = (el) => (el?.textContent || '').trim();

// Share buttons (news articles and case studies): LinkedIn (new tab), email (mail app, title + link) and copy link. Each shows a tooltip
// ([data-nw-tip], moved to <body>) on hover or keyboard focus. Copying swaps the link icon for a tick
// (.is-done on the button and its .nw-share_icon parts) and the tooltip says "Link copied" for 2s.
const SHARE_LABEL = { linkedin: 'Share on LinkedIn', email: 'Share by email', copy: 'Copy link' };

export default function share(root) {
  const url = location.origin + location.pathname; // the clean address: no tracking tags or #anchors
  const title = text(document.querySelector('h1')) || document.title;
  const tip = document.querySelector('[data-nw-tip]');
  const tipText = tip?.querySelector('.button-text') || tip;
  if (tip && tip.parentElement !== document.body) document.body.appendChild(tip);
  let tipFor = null;
  const showTip = (el, label) => {
    if (!tip) return;
    tipFor = el;
    tipText.textContent = label;
    const r = el.getBoundingClientRect();
    tip.style.transform = 'none';
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    const x = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), window.innerWidth - w - 8);
    const y = r.top - h - 8 < 8 ? r.bottom + 8 : r.top - h - 8;
    tip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    tip.classList.add('is-shown');
  };
  const hideTip = (el) => { if (tip && tipFor === el) { tip.classList.remove('is-shown'); tipFor = null; } };
  window.addEventListener('scroll', () => { if (tipFor) hideTip(tipFor); }, { passive: true });

  const copy = async (value) => {
    try { await navigator.clipboard.writeText(value); return true; } catch (err) { /* fall back below */ }
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
    ta.remove();
    return ok;
  };

  root.querySelectorAll('[data-nw-share]').forEach((el) => {
    const how = el.getAttribute('data-nw-share');
    const label = SHARE_LABEL[how] || el.getAttribute('aria-label') || '';
    el.setAttribute('aria-label', label);
    let label2 = label; // what the tooltip says right now
    el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') showTip(el, label2); });
    el.addEventListener('pointerleave', () => hideTip(el));
    el.addEventListener('focus', () => showTip(el, label2));
    el.addEventListener('blur', () => hideTip(el));
    if (how === 'linkedin') {
      el.setAttribute('href', `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`);
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener');
    } else if (how === 'email') {
      el.setAttribute('href', `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${title}
${url}`)}`);
    } else if (how === 'copy') {
      el.setAttribute('role', 'button');
      let timer = 0;
      const parts = () => [el, ...el.querySelectorAll('.nw-share_icon')];
      el.addEventListener('click', async (e) => {
        e.preventDefault();
        const ok = await copy(url);
        label2 = ok ? 'Link copied' : 'Press Ctrl+C to copy';
        if (!ok) window.prompt('Copy this link:', url);
        parts().forEach((p) => p.classList.toggle('is-done', ok));
        el.setAttribute('aria-label', label2);
        showTip(el, label2);
        clearTimeout(timer);
        timer = setTimeout(() => {
          label2 = label;
          parts().forEach((p) => p.classList.remove('is-done'));
          el.setAttribute('aria-label', label);
          if (tipFor === el) showTip(el, label);
        }, 2000);
      });
    }
  });
}
