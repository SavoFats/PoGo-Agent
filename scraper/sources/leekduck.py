"""Fetch global in-game events from the ScrapedDuck community feed (mirrors leekduck.com)."""
import requests

FEED_URL = "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.json"


def fetch():
    resp = requests.get(FEED_URL, timeout=20)
    resp.raise_for_status()
    return resp.json()
