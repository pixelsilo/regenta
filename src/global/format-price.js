// Formats raw CMS prices ("445000") with thousands separators ("445,000").
// Targets #price (the ID is repeated on every listing card) and [data-price].
// Was: Site settings > Head (snippets/site-code/site-head.html).
export default function formatPrice() {
  document.querySelectorAll('[id="price"], [data-price]').forEach((el) => {
    const raw = el.textContent.trim();
    const value = parseFloat(raw);
    if (!raw || Number.isNaN(value)) return;
    el.textContent = value.toLocaleString('en-US');
  });
}
