"""Entry point: fetch all sources, normalize, diff against the persisted store,
update data/events.json, and hand off newly-seen events to the notifier.
"""
import json
import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scraper.sources import leekduck, reddit
from scraper.normalize import normalize_leekduck, normalize_reddit, combine
from notifier.telegram import notify

DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "events.json")

# Drop events this long after they end (or after first_seen, for events with no end date)
# so the store doesn't grow forever.
RETENTION_DAYS = 14


def _key(event):
    return f"{event['source']}|{event['id']}"


def load_store():
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        events = json.load(f)
    return {_key(ev): ev for ev in events}


def save_store(store):
    events = sorted(store.values(), key=lambda ev: ev.get("first_seen") or "")
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(events, f, indent=2, ensure_ascii=False)


def _fetch_source(name, fetch_fn, normalize_fn):
    try:
        return normalize_fn(fetch_fn())
    except Exception as exc:  # a single flaky source must not break the whole run
        print(f"Source {name!r} failed: {exc}")
        return []


def fetch_all():
    return combine(
        _fetch_source("leekduck", leekduck.fetch, normalize_leekduck),
        _fetch_source("reddit", reddit.fetch, normalize_reddit),
    )


def is_stale(event, now):
    reference = event.get("end") or event.get("first_seen")
    if not reference:
        return False
    try:
        ref_dt = datetime.fromisoformat(reference.replace("Z", "+00:00"))
        if ref_dt.tzinfo is None:
            ref_dt = ref_dt.replace(tzinfo=timezone.utc)
    except ValueError:
        return False
    return now - ref_dt > timedelta(days=RETENTION_DAYS)


def run():
    now = datetime.now(timezone.utc)
    store = load_store()
    fetched_events = fetch_all()

    new_events = []
    for event in fetched_events:
        if not event.get("id"):
            continue
        key = _key(event)
        if key in store:
            event["first_seen"] = store[key]["first_seen"]
        else:
            event["first_seen"] = now.isoformat()
            new_events.append(event)
        store[key] = event

    store = {k: v for k, v in store.items() if not is_stale(v, now)}
    save_store(store)

    print(f"Fetched {len(fetched_events)} events, {len(new_events)} new, store now has {len(store)}.")
    if new_events:
        notify(new_events)


if __name__ == "__main__":
    run()
