// Fills every .footer-date with the current year.
// Was: Site settings > Footer (snippets/site-code/site-footer.html).
export default function copyrightYear() {
  const year = String(new Date().getFullYear());
  document.querySelectorAll('.footer-date').forEach((el) => {
    el.textContent = year;
  });
}
