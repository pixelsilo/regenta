// Safari renders the button font slightly low, so nudge button text up 0.2em.
// Applies to .button-text and the text inside [shift="button-text"].
// Was: Site settings > Footer. Better fixed in CSS/font metrics later.
export default function safariShift() {
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  if (!isSafari) return;

  document.querySelectorAll('.button-text').forEach((el) => {
    el.style.transform = 'translateY(-0.2em)';
    el.style.display = 'inline-block';
  });

  document.querySelectorAll('[shift="button-text"]').forEach((el) => {
    const span = document.createElement('span');
    span.textContent = el.textContent.trim();
    span.style.display = 'inline-block';
    span.style.transform = 'translateY(-0.2em)';
    el.textContent = '';
    el.appendChild(span);
  });
}
