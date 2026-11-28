"""Builds the JSON-LD schema markup for every Regenta UK page (Page settings > Schema markup).

Run:  python schema/build.py
Writes schema/out/<page-id>.json (static pages, plain JSON) and schema/out/<page-id>.jsonld.txt
(CMS templates: JSON with Webflow binding tokens inside strings). schema/out/pages.json lists every page with its source.

Every page gets one @graph: Organization + WebSite (shared @ids), a BreadcrumbList and the page
itself, plus whatever the page is about (Service, Article, RealEstateListing, WebApplication...).
URLs are absolute on the canonical domain https://regenta.co.uk (www redirects there).

Webflow CMS bindings. The Designer copies them as
  {{wf {&quot;path&quot;:&quot;name&quot;,&quot;type&quot;:&quot;PlainText&quot;\\} }}
but the Data API rejects that (\\} isn't valid JSON), so the backslash is dropped:
  {{wf {&quot;path&quot;:&quot;name&quot;,&quot;type&quot;:&quot;PlainText&quot;} }}
Webflow still fills that in on the published page (checked 27 Nov 2026), and the schema
stays valid JSON, so it can be sent as an object. Webflow HTML-escapes the value, so quotes can't break the JSON (an & shows as &amp;).
Never bind Rich Text fields here: they output raw HTML.
"""
import json
import os

BASE = "https://regenta.co.uk"
ORG = BASE + "/#organization"
SITE = BASE + "/#website"
LOGO = "https://cdn.prod.website-files.com/68362e432005a0afe1416a06/6836305f634f3730f2765fc0_regenta-webclip.png"
PHONE = "+44 20 8502 5758"
EMAIL = "info@regenta.co.uk"
SAME_AS = [
    "https://www.linkedin.com/company/regentauk",
    "https://www.instagram.com/regenta.uk/",
    "https://www.facebook.com/Regentauk/",
]
ADDRESS = {
    "@type": "PostalAddress",
    "streetAddress": "14 Devonshire Square",
    "addressLocality": "London",
    "postalCode": "EC2M 4YT",
    "addressCountry": "GB",
}
LANG = "en-GB"
SERVICES = [  # live services (Customer Care and Scheme Optimisation are drafts)
    ("Sales", "sales", "Three decades of selling new homes, with sales strategies built for each development."),
    ("Marketing", "marketing", "Marketing that tells each development's own story, made with London's leading design and media partners."),
    ("Market Intelligence", "market-intelligence", "Clear, practical research that guides decisions at every stage of a scheme."),
    ("Development Consultancy", "development-consultancy", "Land acquisition and disposal, planning and valuation advice for landowners, developers, housebuilders and local authorities."),
]


def wf(path, typ="PlainText"):
    """A Webflow CMS binding, as Webflow writes it in custom code."""
    return "{{wf {&quot;path&quot;:&quot;%s&quot;,&quot;type&quot;:&quot;%s&quot;} }}" % (path, typ)


# ---------- shared nodes ----------

def organization(full=False):
    org = {
        "@type": "Organization",
        "@id": ORG,
        "name": "Regenta",
        "alternateName": "SiteSales",
        "url": BASE + "/",
        "logo": {"@type": "ImageObject", "url": LOGO},
        "email": EMAIL,
        "telephone": PHONE,
        "address": ADDRESS,
        "sameAs": SAME_AS,
    }
    if full:
        org.update({
            "description": "Regenta is a multi-disciplined organisation offering a range of services to its clients from Development through to Sales, Marketing and After Care.",
            "slogan": "Setting the benchmark for property consultancy in London and beyond",
            "foundingDate": "1988",
            "founder": {"@type": "Person", "name": "Murray Smith"},
            "numberOfEmployees": {"@type": "QuantitativeValue", "value": 60},
            "vatID": "GB739963180",
            "identifier": {"@type": "PropertyValue", "propertyID": "Companies House company number", "value": "02406015"},
            "areaServed": [{"@type": "City", "name": "London"}, {"@type": "Place", "name": "South East England"}],
            "knowsAbout": ["New homes sales", "Property marketing", "Market intelligence", "Development consultancy",
                           "Shared Ownership", "Land acquisition", "Residential development"],
            "contactPoint": [
                {"@type": "ContactPoint", "contactType": "customer service", "telephone": PHONE, "email": EMAIL,
                 "areaServed": "GB", "availableLanguage": "English"},
                {"@type": "ContactPoint", "contactType": "sales", "telephone": PHONE, "email": EMAIL,
                 "areaServed": "GB", "availableLanguage": "English"},
            ],
        })
    return org


def website():
    return {"@type": "WebSite", "@id": SITE, "url": BASE + "/", "name": "Regenta",
            "publisher": {"@id": ORG}, "inLanguage": LANG}


def breadcrumb(url, crumbs):
    """crumbs: [(name, url)] after Home. The last one is the page itself."""
    items = [("Home", BASE + "/")] + crumbs
    return {
        "@type": "BreadcrumbList",
        "@id": url + "#breadcrumb",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": n, "item": u} for i, (n, u) in enumerate(items)
        ],
    }


def webpage(url, name, description, typ="WebPage", crumbs=None, **extra):
    page = {
        "@type": typ,
        "@id": url + "#webpage",
        "url": url,
        "name": name,
        "description": description,
        "inLanguage": LANG,
        "isPartOf": {"@id": SITE},
        "publisher": {"@id": ORG},
    }
    if crumbs is not None:
        page["breadcrumb"] = {"@id": url + "#breadcrumb"}
    page.update(extra)
    return page


def graph(path, name, description, typ="WebPage", crumbs=None, nodes=(), full_org=False, **extra):
    """crumbs=None: a page directly under Home, crumb is just the page."""
    url = BASE + path
    if crumbs is None:
        crumbs = [] if path == "/" else [(name, url)]
    g = [organization(full_org), website()]
    if crumbs:
        g.append(breadcrumb(url, crumbs))
    g.append(webpage(url, name, description, typ, crumbs if crumbs else None, **extra))
    g.extend(nodes)
    return {"@context": "https://schema.org", "@graph": g}


def service_node(name, slug, desc):
    return {
        "@type": "Service",
        "@id": BASE + "/services/" + slug + "#service",
        "name": name,
        "serviceType": name,
        "description": desc,
        "url": BASE + "/services/" + slug,
        "provider": {"@id": ORG},
        "areaServed": [{"@type": "City", "name": "London"}, {"@type": "Place", "name": "South East England"}],
        "audience": {"@type": "BusinessAudience", "audienceType": "Developers, housebuilders, landowners, housing associations and local authorities"},
    }


def calculator(path, name, desc, feature):
    url = BASE + path
    app = {
        "@type": "WebApplication",
        "@id": url + "#app",
        "name": name,
        "url": url,
        "description": desc,
        "applicationCategory": "FinanceApplication",
        "operatingSystem": "Any",
        "browserRequirements": "Requires JavaScript",
        "isAccessibleForFree": True,
        "featureList": feature,
        "offers": {"@type": "Offer", "price": "0", "priceCurrency": "GBP"},
        "provider": {"@id": ORG},
        "inLanguage": LANG,
    }
    return graph(path, name, desc, nodes=[app], mainEntity={"@id": url + "#app"},
                 about={"@type": "Thing", "name": "Shared ownership", "sameAs": "https://en.wikipedia.org/wiki/Shared_ownership"} if "Shared" in name
                 else {"@type": "Thing", "name": "Stamp Duty Land Tax", "sameAs": "https://en.wikipedia.org/wiki/Stamp_duty_in_the_United_Kingdom"})


# ---------- static pages ----------

STATIC = {}

STATIC["68362e432005a0afe14169e5"] = graph(
    "/", "Regenta | London's exemplary development, sales and marketing agency",
    "Regenta is a multi-disciplined organisation offering a range of services to its clients from Development through to Sales, Marketing and After Care.",
    full_org=True, about={"@id": ORG},
)

STATIC["68362e432005a0afe14169e8"] = graph(
    "/property-search", "London Property Search",
    "Search our extensive range of developments and find your next home.", "CollectionPage",
    about={"@type": "Thing", "name": "New homes for sale and Shared Ownership in London and the South East"},
)

STATIC["6b075647dbebc556f1ca6827"] = graph(
    "/professional-services", "Professional Services",
    "Sales, marketing and development consultancy for new homes in London and the South East, from Regenta.",
    nodes=[service_node(*s) for s in SERVICES] + [{
        "@type": "OfferCatalog",
        "@id": BASE + "/professional-services#services",
        "name": "Regenta professional services",
        "itemListElement": [
            {"@type": "Offer", "itemOffered": {"@id": BASE + "/services/" + s[1] + "#service"}} for s in SERVICES
        ],
    }],
    mainEntity={"@id": BASE + "/professional-services#services"},
)

STATIC["68362e432005a0afe14169f2"] = graph(
    "/case-studies", "Case Studies",
    "Case studies of the new homes developments Regenta has sold and marketed across London and the South East.",
    "CollectionPage",
)

STATIC["68362e432005a0afe14169f3"] = graph(
    "/news", "News",
    "News, market insight, events and awards from Regenta.", "CollectionPage",
)

STATIC["68362e432005a0afe14169f4"] = graph(
    "/careers", "Careers - Join the team",
    "Careers at Regenta, the London new homes sales, marketing and development consultancy.",
    about={"@id": ORG},
)

STATIC["68362e432005a0afe14169f5"] = graph(
    "/whats-shared-ownership", "What is Shared Ownership?",
    "Shared Ownership is a government-backed scheme designed to assist people who are unable to afford to buy a home outright.",
    about={"@type": "Thing", "name": "Shared ownership", "sameAs": "https://en.wikipedia.org/wiki/Shared_ownership"},
    audience={"@type": "Audience", "audienceType": "Home buyers, including first-time buyers"},
    relatedLink=[BASE + "/shared-ownership-faqs", BASE + "/calculator/shared-ownership-calculator", BASE + "/calculator/stamp-duty-calculator"],
)

STATIC["68362e432005a0afe14169f7"] = graph(
    "/policies/privacy-policy", "Privacy Policy",
    "How Regenta collects, uses and protects your personal data.",
)

STATIC["68362e432005a0afe14169fe"] = graph(
    "/directors-statement", "Directors Statement",
    "Our aim at Regenta is to provide a full range of exemplary development, sales and marketing services to support any client in their development ambitions - across London and the home counties.",
    "AboutPage", about={"@id": ORG},
)

STATIC["6ad017b2011147ba279b5b9d"] = calculator(
    "/calculator/shared-ownership-calculator", "Shared Ownership Calculator",
    "Work out your monthly Shared Ownership costs, including mortgage, rent and service charge.",
    ["Monthly mortgage on your share", "Rent on the unsold share", "Service charge", "Deposit and share size"],
)

STATIC["6ad017b33ce3dd63e14c1e4a"] = calculator(
    "/calculator/stamp-duty-calculator", "Stamp Duty Calculator",
    "Estimate the Stamp Duty you'll pay on your home, with first-time buyer relief and additional property rates for England and Northern Ireland.",
    ["Standard rates", "First-time buyer relief", "Additional property rates", "England and Northern Ireland"],
)

STATIC["68362e432005a0afe14169f0"] = graph(
    "/contact-us", "Contact Us",
    "Get in touch with the Regenta team to find out how we can help make your next development a success.",
    "ContactPage", full_org=True, mainEntity={"@id": ORG},
)

STATIC["6b0756197cae398ca3d4bb6c"] = graph(
    "/contact-buyers", "Contact Us | Buying a Home",
    "Call Regenta about buying a new home, or find a development and enquire directly with its sales team.",
    "ContactPage", mainEntity={"@id": ORG},
    audience={"@type": "Audience", "audienceType": "Home buyers"},
)

STATIC["6b0acdda3f3e76eb9ad0e8ad"] = graph(
    "/about-us", "About Us",
    "Regenta sells new homes across London and the South East, from Shared Ownership to private sale, with sales teams on site at every development since 1988.",
    "AboutPage", about={"@id": ORG}, mainEntity={"@id": ORG},
    audience={"@type": "Audience", "audienceType": "Home buyers, including first-time buyers"},
    relatedLink=[BASE + "/property-search", BASE + "/shared-ownership-faqs", BASE + "/purchaser-stories", BASE + "/built-by-regenta"],
    nodes=[{
        "@type": "HowTo",
        "@id": BASE + "/about-us#buying-steps",
        "name": "Buying a new home with Regenta, from first viewing to your keys",
        "step": [
            {"@type": "HowToStep", "position": i + 1, "name": n, "text": t}
            for i, (n, t) in enumerate([
                ("Find a home and book a viewing", "Browse the developments, then book a viewing through the development's page or by calling its sales team."),
                ("Reserve", "A reservation fee secures the home while the legal work and your mortgage are arranged."),
                ("Mortgage and solicitor", "You appoint a solicitor and arrange your mortgage."),
                ("Exchange", "Both sides become legally committed. This is typically four to eight weeks after reserving."),
                ("Completion and keys", "Usually one to four weeks after exchange. Then the home is yours."),
            ])
        ],
    }],
)

STATIC["6b082d33995cb711db7e6b93"] = graph(
    "/purchaser-stories", "Purchaser stories",
    "What buyers say on Google and Trustpilot about finding and buying their new homes with Regenta, from first viewing to getting the keys.",
    "CollectionPage", about={"@id": ORG},
)

STATIC["6ae9ad4f56ed133e4daca1b4"] = graph(
    "/research-breakfast/q3-26", "Q3 Market Insight Breakfast Briefing",
    "Download your copy of Regenta's London Residential Research Report from the Market Insight Breakfast Briefing.",
    crumbs=[("Q3 Market Insight Breakfast Briefing", BASE + "/research-breakfast/q3-26")],
    about={"@type": "Report", "name": "London Residential Research Report Q3 2026", "author": {"@id": ORG}, "publisher": {"@id": ORG}},
)

STATIC["6aec819f67aef696c62f5427"] = graph(
    "/research-breakfast/london-residential-research-q3-26-download", "London Residential Research Report Q3 2026",
    "Download your copy of Regenta's London Residential Research Report for Q3 2026.",
    crumbs=[("Q3 Market Insight Breakfast Briefing", BASE + "/research-breakfast/q3-26"),
            ("London Residential Research Report Q3 2026", BASE + "/research-breakfast/london-residential-research-q3-26-download")],
    about={"@type": "Report", "name": "London Residential Research Report Q3 2026", "author": {"@id": ORG}, "publisher": {"@id": ORG}},
)

STATIC["68362e432005a0afe1416a02"] = graph(
    "/reports/market-report-q4-2024", "Market Report - Q4 2024",
    "Insights into London's property market from the Regenta Q4 2024 Market Report.",
    about={"@type": "Report", "name": "Regenta Market Report Q4 2024", "author": {"@id": ORG}, "publisher": {"@id": ORG}},
)

# Utility pages: a plain WebPage so every page carries the site graph.
for pid, path, name in [
    ("68362e432005a0afe1416a03", "/reports/market-report-success", "Market Report Success"),
    ("68362e432005a0afe14169ef", "/success-message", "Register Interest Success"),
    ("68362e432005a0afe14169fb", "/contact-form-success", "Contact Form Success"),
    ("68362e432005a0afe14169fc", "/form-error", "Form Error"),
    ("68362e432005a0afe14169fd", "/404", "Page not found"),
    ("68362e432005a0afe14169f8", "/401", "Protected page"),
    ("68362e432005a0afe14169e9", "/styleguide", "Style guide"),
]:
    STATIC[pid] = graph(path, name, name + " | Regenta")


# About and Built by Regenta keep the detail written for them before (team list, built developments).
EXISTING = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "existing.json"), encoding="utf-8"))

STATIC["68362e432005a0afe14169f1"] = graph(
    "/about", "About Us",
    "With an enviable reputation for delivering comprehensive premium property expertise, Regenta has established itself as the leading development partner and agent for developers, housebuilders and local authorities across London, the Southeast and beyond.",
    "AboutPage", full_org=True, about={"@id": ORG}, mainEntity={"@id": ORG},
)
STATIC["68362e432005a0afe14169f1"]["@graph"][0]["employee"] = [
    {"@type": "Person", "name": n, "jobTitle": t, "worksFor": {"@id": ORG}} for n, t in EXISTING["members"]
]

STATIC["68405a9268beb324e8f2c212"] = graph(
    "/built-by-regenta", "Built by Regenta",
    "An award-winning, family-owned business providing high-quality homes in London and the South East.",
    "AboutPage", about={"@id": ORG}, mainEntity={"@id": BASE + "/built-by-regenta#developments"},
    nodes=[{
        "@type": "ItemList",
        "@id": BASE + "/built-by-regenta#developments",
        "name": "Developments built by Regenta",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "item": {
                "@type": "Residence", "name": n, "description": d, "image": img,
                "address": {"@type": "PostalAddress", "streetAddress": a, "postalCode": pc, "addressCountry": "GB"},
            }} for i, (n, d, a, pc, img) in enumerate(EXISTING["built"])
        ],
    }],
)


# ---------- CMS templates ----------

def template(path_prefix, crumbs_parent, page_type, nodes, name_path="name", desc=None, **extra):
    url = BASE + path_prefix + "/" + wf("slug")
    name = wf(name_path)
    crumbs = ([crumbs_parent] if crumbs_parent else []) + [(name, url)]
    g = [organization(), website(), breadcrumb(url, crumbs),
         webpage(url, name, desc or name, page_type, crumbs, **extra)]
    g.extend(nodes(url))
    return {"@context": "https://schema.org", "@graph": g}


TEMPLATES = {}

# Developments
TEMPLATES["68362e432005a0afe14169e6"] = template(
    "/development", ("Property search", BASE + "/property-search"), "WebPage",
    lambda url: [
        {
            "@type": "RealEstateListing",
            "@id": url + "#listing",
            "name": wf("name"),
            "url": url,
            "description": wf("short-description"),
            "image": wf("main-image", "ImageRef"),
            "about": {"@id": url + "#place"},
            "provider": {"@id": ORG},
            "offers": {
                "@type": "AggregateOffer",
                "priceCurrency": "GBP",
                "lowPrice": wf("max-price", "Number"),
                "availability": "https://schema.org/InStock",
                "offeredBy": {"@id": ORG},
            },
        },
        {
            "@type": "Residence",
            "@id": url + "#place",
            "name": wf("name"),
            "description": wf("short-description"),
            "image": wf("main-image", "ImageRef"),
            "telephone": wf("phone-2", "Phone"),
            "address": {
                "@type": "PostalAddress",
                "streetAddress": wf("address"),
                "postalCode": wf("post-code"),
                "addressRegion": wf("regions", "Option"),
                "addressCountry": "GB",
            },
            "geo": {"@type": "GeoCoordinates", "latitude": wf("latitude"), "longitude": wf("longitude")},
            "containedInPlace": {"@type": "Place", "name": wf("regions", "Option")},
        },
        {
            "@type": "Organization",
            "@id": url + "#developer",
            "name": wf("developer:name"),
            "description": wf("developer:name") + " is the developer of " + wf("name") + ".",
        },
    ],
    desc=wf("short-description"),
    mainEntity={"@id": BASE + "/development/" + wf("slug") + "#listing"},
    primaryImageOfPage={"@type": "ImageObject", "url": wf("main-image", "ImageRef")},
)
TEMPLATES["68362e432005a0afe14169e6"]["@graph"][3]["mentions"] = {"@id": BASE + "/development/" + wf("slug") + "#developer"}

# News
TEMPLATES["68362e432005a0afe14169ec"] = template(
    "/news", ("News", BASE + "/news"), "WebPage",
    lambda url: [{
        "@type": "NewsArticle",
        "@id": url + "#article",
        "headline": wf("name"),
        "url": url,
        "mainEntityOfPage": {"@id": url + "#webpage"},
        "image": wf("thumbnail-image", "ImageRef"),
        "datePublished": wf("stored-date", "Date"),
        "dateModified": wf("updated-on", "Date"),
        "articleSection": wf("category", "Option"),
        "author": {"@id": ORG},  # most posts have no Author set, and an empty Person is invalid
        "publisher": {"@id": ORG},
        "inLanguage": LANG,
        "isPartOf": {"@id": SITE},
    }],
    desc="",
    mainEntity={"@id": BASE + "/news/" + wf("slug") + "#article"},
    primaryImageOfPage={"@type": "ImageObject", "url": wf("thumbnail-image", "ImageRef")},
)

# Case studies
TEMPLATES["68362e432005a0afe14169ed"] = template(
    "/case-studies", ("Case studies", BASE + "/case-studies"), "WebPage",
    lambda url: [{
        "@type": "Article",
        "@id": url + "#article",
        "headline": wf("name"),
        "name": wf("name"),
        "url": url,
        "mainEntityOfPage": {"@id": url + "#webpage"},
        "image": wf("thumbnail-image", "ImageRef"),
        "datePublished": wf("public-date", "Date"),
        "dateModified": wf("updated-on", "Date"),
        "articleSection": "Case studies",
        "author": {"@id": ORG},
        "publisher": {"@id": ORG},
        "about": {
            "@type": "Residence",
            "name": wf("name"),
        },
        "mentions": {"@type": "Organization", "name": wf("developer:name")},
        "inLanguage": LANG,
        "isPartOf": {"@id": SITE},
    }],
    desc="",
    mainEntity={"@id": BASE + "/case-studies/" + wf("slug") + "#article"},
    primaryImageOfPage={"@type": "ImageObject", "url": wf("thumbnail-image", "ImageRef")},
)

# Services
TEMPLATES["68362e432005a0afe14169ee"] = template(
    "/services", ("Professional services", BASE + "/professional-services"), "WebPage",
    lambda url: [{
        "@type": "Service",
        "@id": url + "#service",
        "name": wf("name"),
        "serviceType": wf("name"),
        "description": wf("short-description"),
        "url": url,
        "image": wf("hero-image", "ImageRef"),
        "provider": {"@id": ORG},
        "areaServed": [{"@type": "City", "name": "London"}, {"@type": "Place", "name": "South East England"}],
        "audience": {"@type": "BusinessAudience", "audienceType": "Developers, housebuilders, landowners, housing associations and local authorities"},
    }],
    desc=wf("short-description"),
    mainEntity={"@id": BASE + "/services/" + wf("slug") + "#service"},
    primaryImageOfPage={"@type": "ImageObject", "url": wf("hero-image", "ImageRef")},
)

# Built by Regenta items
TEMPLATES["689cb721a0ce83ad62e5714e"] = template(
    "/built-by-regenta", ("Built by Regenta", BASE + "/built-by-regenta"), "WebPage",
    lambda url: [{
        "@type": "Residence",
        "@id": url + "#place",
        "name": wf("name"),
        "description": wf("description"),
        "image": wf("image", "ImageRef"),
        "address": {"@type": "PostalAddress", "streetAddress": wf("address"), "addressCountry": "GB"},
        "additionalProperty": {"@type": "PropertyValue", "name": "Status", "value": wf("status")},
    }],
    desc=wf("description"),
    mainEntity={"@id": BASE + "/built-by-regenta/" + wf("slug") + "#place"},
    about={"@id": BASE + "/built-by-regenta/" + wf("slug") + "#place"},
)

# Insights
TEMPLATES["698af3f9acb4842fc3454e81"] = template(
    "/insights", None, "WebPage",
    lambda url: [{
        "@type": "Article",
        "@id": url + "#article",
        "headline": wf("name"),
        "description": wf("subhead"),
        "url": url,
        "mainEntityOfPage": {"@id": url + "#webpage"},
        "dateModified": wf("updated-on", "Date"),
        "author": {"@id": ORG},
        "publisher": {"@id": ORG},
        "inLanguage": LANG,
    }],
    desc=wf("subhead"),
    mainEntity={"@id": BASE + "/insights/" + wf("slug") + "#article"},
)

# Reviews (verbatim Google / Trustpilot reviews)
TEMPLATES["6b082bc30185d088a23384df"] = template(
    "/reviews", ("Purchaser stories", BASE + "/purchaser-stories"), "WebPage",
    lambda url: [{
        "@type": "Review",
        "@id": url + "#review",
        "datePublished": wf("date-posted", "Date"),
        "author": {"@type": "Person", "name": wf("name")},
        "itemReviewed": {"@id": ORG},
        "publisher": {"@type": "Organization", "name": wf("source", "Option")},
        "url": url,
    }],
    desc="A review of Regenta by " + wf("name") + ", posted on " + wf("source", "Option") + ".",
    mainEntity={"@id": BASE + "/reviews/" + wf("slug") + "#review"},
)


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.join(here, "out")
    os.makedirs(out, exist_ok=True)
    pages = []
    for pid, data in STATIC.items():
        text = json.dumps(data, indent=2, ensure_ascii=False)
        json.loads(text)
        open(os.path.join(out, pid + ".json"), "w", encoding="utf-8").write(text)
        pages.append({"id": pid, "file": pid + ".json"})
    for pid, data in TEMPLATES.items():
        text = json.dumps(data, indent=2, ensure_ascii=False)
        open(os.path.join(out, pid + ".jsonld.txt"), "w", encoding="utf-8").write(text)
        pages.append({"id": pid, "file": pid + ".jsonld.txt"})
    json.dump(pages, open(os.path.join(out, "pages.json"), "w"), indent=1)
    print(len(STATIC), "static,", len(TEMPLATES), "templates")


if __name__ == "__main__":
    main()
