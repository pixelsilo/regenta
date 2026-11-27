// Collection item links. The Webflow API can't link a card to "Current item", so cards built by API carry their
// item's slug in an attribute (bound to the Slug field) and get their href here. A link already set to the item
// page in the Designer (href starting with base/) is left alone.
//   linkItems(root, 'data-nw-slug', '/news')  ->  a[data-nw-slug="q3-26"] gets href="/news/q3-26"

export default function linkItems(root, attr, base) {
  root.querySelectorAll(`a[${attr}]`).forEach((a) => {
    const slug = a.getAttribute(attr);
    const href = a.getAttribute('href') || '';
    if (slug && !href.startsWith(`${base}/`)) a.setAttribute('href', `${base}/${slug}`);
  });
}
