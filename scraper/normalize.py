"""Convert raw records from each source into a single common Event schema:

{
    "id": str,            # stable identifier, unique within its source
    "source": str,        # e.g. "leekduck", "reddit/r/TheSilphRoad"
    "type": str,          # "in-game" | "regional-lead"
    "title": str,
    "start": str | None,  # ISO timestamp, when known
    "end": str | None,
    "location": str,      # "global" for in-game events, otherwise a free-text hint
    "url": str,
}
"""


def normalize_leekduck(raw_events):
    normalized = []
    for ev in raw_events:
        normalized.append({
            "id": ev.get("eventID"),
            "source": "leekduck",
            "type": "in-game",
            "title": ev.get("name"),
            "start": ev.get("start"),
            "end": ev.get("end"),
            "location": "global",
            "url": ev.get("link"),
        })
    return normalized


def normalize_reddit(raw_posts):
    normalized = []
    for post in raw_posts:
        normalized.append({
            "id": post.get("id"),
            "source": f"reddit/r/{post.get('subreddit')}",
            "type": "regional-lead",
            "title": post.get("title"),
            "start": None,
            "end": None,
            "location": "unknown (check link)",
            "url": post.get("link"),
        })
    return normalized


def combine(*event_lists):
    combined = []
    for events in event_lists:
        combined.extend(events)
    return combined
