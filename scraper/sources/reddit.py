"""Catch regional/local PoGo events (museum pop-ups, city-specific activations, etc.)
that never make it into the official event feeds, by scanning community subreddits
via their public RSS (no API key required).
"""
import re
import xml.etree.ElementTree as ET

import requests

SUBREDDITS = ["TheSilphRoad", "pokemongo"]

# Heuristics for posts likely describing a real-world / location-specific event,
# as opposed to routine in-game discussion.
KEYWORDS = [
    "museum", "pop-up", "popup", "exclusive", "real-world", "real world",
    "in-person", "venue", "exhibit", "activation", "store", "city", "regional",
    "limited-time location", "campfire event",
]

ATOM_NS = {"atom": "http://www.w3.org/2005/Atom"}
HEADERS = {"User-Agent": "pogo-event-tracker/1.0 (+https://github.com/SavoFats/PoGo-Agent)"}


def _matches_keywords(text):
    text = text.lower()
    return any(kw in text for kw in KEYWORDS)


def fetch():
    items = []
    for sub in SUBREDDITS:
        url = f"https://www.reddit.com/r/{sub}/new.rss?limit=50"
        resp = requests.get(url, headers=HEADERS, timeout=20)
        resp.raise_for_status()
        root = ET.fromstring(resp.content)
        for entry in root.findall("atom:entry", ATOM_NS):
            title = entry.findtext("atom:title", default="", namespaces=ATOM_NS)
            summary = entry.findtext("atom:summary", default="", namespaces=ATOM_NS)
            link_el = entry.find("atom:link", ATOM_NS)
            link = link_el.get("href") if link_el is not None else None
            published = entry.findtext("atom:published", default="", namespaces=ATOM_NS)
            entry_id = entry.findtext("atom:id", default="", namespaces=ATOM_NS)

            if not _matches_keywords(f"{title} {summary}"):
                continue

            items.append({
                "id": entry_id or link,
                "title": re.sub(r"\s+", " ", title).strip(),
                "link": link,
                "published": published,
                "subreddit": sub,
                "summary": summary,
            })
    return items
