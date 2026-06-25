"""Send a Telegram message for each newly-discovered event.

Requires TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID env vars. If either is
missing (e.g. running locally without secrets), notifications are skipped
and the events are just printed instead.
"""
import os

import requests

API_URL = "https://api.telegram.org/bot{token}/sendMessage"


def _format_message(event):
    lines = [f"🆕 {event['title']}", f"Tipo: {event['type']} | Fonte: {event['source']}"]
    if event.get("start"):
        lines.append(f"Inizio: {event['start']}")
    if event.get("end"):
        lines.append(f"Fine: {event['end']}")
    if event.get("location") and event["location"] != "global":
        lines.append(f"Luogo: {event['location']}")
    if event.get("url"):
        lines.append(event["url"])
    return "\n".join(lines)


def notify(events):
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID")

    if not token or not chat_id:
        print("TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID not set, skipping Telegram notifications:")
        for event in events:
            print(" -", event["title"])
        return

    url = API_URL.format(token=token)
    for event in events:
        resp = requests.post(url, data={
            "chat_id": chat_id,
            "text": _format_message(event),
            "disable_web_page_preview": False,
        }, timeout=15)
        if not resp.ok:
            print(f"Telegram notify failed for {event['title']!r}: {resp.status_code} {resp.text}")
