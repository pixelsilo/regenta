// Featured developments strip (featured-developments component, #57 option B "brand poster").
// Each card is the development's brand colour (the CMS colour bound on .fd_logo-div, now the card's
// backdrop) with its photo fading into it. Webflow can't pick a text colour from a bound background,
// so this does: dark brand colours get .is-dark on the card (sand text) and on the bed icon. It also
// runs the card hover (description slides up, arrow fills) through .is-hover combos in Webflow.
import cardHover from '../lib/card-hover.js';

const DARK = 0.35; // relative luminance below which text switches to sand

function luminance(color) {
  const m = color.match(/[\d.]+/g);
  if (!m || (m[3] !== undefined && Number(m[3]) === 0)) return 1; // transparent: treat as light
  const [r, g, b] = m.slice(0, 3).map((v) => {
    const c = Number(v) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export default function featuredDevelopments() {
  const lists = document.querySelectorAll('.fd2_cl');
  if (!lists.length) return;
  document.querySelectorAll('a.fd2_slide').forEach((card) => {
    const brand = card.querySelector('.fd_logo-div');
    if (!brand) return;
    const dark = luminance(getComputedStyle(brand).backgroundColor) < DARK;
    card.classList.toggle('is-dark', dark);
    card.querySelectorAll('.li-icon').forEach((icon) => icon.classList.toggle('is-dark', dark));
  });
  lists.forEach((list) => cardHover(list, 'a.fd2_slide', '.fd2_more, .fd2_ar'));
}
