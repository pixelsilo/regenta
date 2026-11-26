// Form send buttons are real <button type="submit"> elements (text in .button-text, inline SVG arrow),
// not Webflow's <input type="submit">, so Webflow's data-wait text swap no longer applies.
// This does the same: on submit, the label becomes the button's data-wait text ("Please wait...").
// The form scripts that set `submitButton.value` still run; on a <button> that's simply invisible.

export default function submitWait() {
  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement)) return;
    const button = form.querySelector('button[type="submit"][data-wait]');
    const label = button && button.querySelector('.button-text');
    if (!label) return;
    if (!label.dataset.label) label.dataset.label = label.textContent;
    label.textContent = button.getAttribute('data-wait');
  }, true);
}
