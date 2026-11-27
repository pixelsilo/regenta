"""Checks the JSON-LD on every staging page: parses, no unfilled bindings, one graph per page.

Run:  python schema/validate.py   (reads the sitemap, plus pages the sitemap leaves out)
"""
import json
import re
import sys
import time
import urllib.request
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor

STAGING = "https://regenta-uk.webflow.io"
EXTRA = ["/purchaser-stories", "/professional-services", "/contact-buyers", "/success-message", "/contact-form-success",
         "/form-error", "/reports/market-report-success", "/research-breakfast/q3-26",
         "/research-breakfast/london-residential-research-q3-26-download", "/insights/housing-outlook-2026"]


def fetch(path):
    url = STAGING + path + ("&" if "?" in path else "?") + "v=%d" % time.time()
    try:
        return urllib.request.urlopen(url, timeout=30).read().decode("utf-8", "replace")
    except Exception as e:  # noqa: BLE001
        return "ERROR " + str(e)


def empties(node, path=""):
    out = []
    if isinstance(node, dict):
        for k, v in node.items():
            out += empties(v, path + "." + k)
    elif isinstance(node, list):
        for v in node:
            out += empties(v, path + "[]")
    elif node == "":
        out.append(path)
    return out


def check(path):
    html = fetch(path)
    if html.startswith("ERROR"):
        return path, ["fetch " + html], [], None
    blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S)
    problems, empty, types = [], [], None
    if len(blocks) != 1:
        problems.append("%d JSON-LD blocks" % len(blocks))
    for b in blocks:
        if "{{wf" in b:
            problems.append("unfilled binding")
        try:
            data = json.loads(b)
        except Exception as e:  # noqa: BLE001
            problems.append("invalid JSON: %s" % e)
            continue
        graph = data.get("@graph", [data])
        types = [n.get("@type") for n in graph]
        empty = empties(data)
    return path, problems, empty, types


def main():
    xml = fetch("/sitemap.xml")
    paths = sorted({re.sub(r"^https?://[^/]+", "", u) or "/" for u in re.findall(r"<loc>([^<]+)", xml)} | set(EXTRA))
    with ThreadPoolExecutor(8) as ex:
        results = list(ex.map(check, paths))
    bad = [r for r in results if r[1]]
    empty_by_section = defaultdict(Counter)
    for path, _, empty, _ in results:
        section = "/" + path.strip("/").split("/")[0] if path.count("/") > 1 else path
        for e in empty:
            empty_by_section[section][e] += 1
    print("pages checked:", len(results), "| with problems:", len(bad))
    for path, problems, _, types in bad:
        print("  ", path, problems)
    print("\nTypes per section (first page seen):")
    seen = set()
    for path, _, _, types in results:
        section = path.split("/")[1] if path.count("/") > 1 else path
        if section not in seen:
            seen.add(section)
            print("  ", path, types)
    print("\nEmpty values (CMS fields not filled in), by section:")
    for section, c in sorted(empty_by_section.items()):
        print("  ", section, dict(c))
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
