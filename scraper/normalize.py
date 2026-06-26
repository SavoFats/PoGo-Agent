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
    "pokemon": [{"name": str, "image": str, "shiny": bool}],  # featured Pokémon, if known
}
"""


def _extract_pokemon(extra_data):
    """Pull the featured Pokémon list out of leekduck's per-event-type extraData blob.

    Coverage varies by event type: spotlight hours, raid battles, and community
    days expose a structured list; other types (raid days, costume events, etc.)
    only name the Pokémon in the event title, so they yield an empty list here.
    """
    extra_data = extra_data or {}

    spotlight = extra_data.get("spotlight")
    if spotlight and spotlight.get("list"):
        return [
            {"name": p.get("name"), "image": p.get("image"), "shiny": bool(p.get("canBeShiny"))}
            for p in spotlight["list"]
        ]

    raidbattles = extra_data.get("raidbattles")
    if raidbattles and raidbattles.get("bosses"):
        shiny_names = {s.get("name") for s in raidbattles.get("shinies", [])}
        return [
            {"name": b.get("name"), "image": b.get("image"), "shiny": b.get("name") in shiny_names}
            for b in raidbattles["bosses"]
        ]

    communityday = extra_data.get("communityday")
    if communityday and communityday.get("spawns"):
        return [
            {"name": p.get("name"), "image": p.get("image"), "shiny": bool(p.get("canBeShiny"))}
            for p in communityday["spawns"]
        ]

    return []


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
            "pokemon": _extract_pokemon(ev.get("extraData")),
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
            "pokemon": [],
        })
    return normalized


def combine(*event_lists):
    combined = []
    for events in event_lists:
        combined.extend(events)
    return combined
