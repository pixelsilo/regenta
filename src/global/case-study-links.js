// Case study cards built through the Webflow API (#57, Professional Services page) can't be set
// to "link to the current Case Study" (the API has no such option), so each card carries its slug
// in data-cs-slug and this points it at /case-studies/<slug>. A card already linked properly in the
// Designer (Link settings > Collection page > Current Case Studies) is left alone.

export default function caseStudyLinks() {
  document.querySelectorAll('a[data-cs-slug]').forEach((a) => {
    const slug = a.getAttribute('data-cs-slug');
    const href = a.getAttribute('href') || '';
    if (!slug || href.startsWith('/case-studies/')) return;
    a.setAttribute('href', `/case-studies/${slug}`);
  });
}
