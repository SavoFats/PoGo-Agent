import { PogoEvent } from "./types";

// Kept in sync by the backend cron workflow (.github/workflows/check-events.yml),
// which copies data/events.json -> docs/data/events.json on every run.
export const EVENTS_URL =
  "https://raw.githubusercontent.com/SavoFats/PoGo-Agent/main/docs/data/events.json";

export async function fetchEvents(): Promise<PogoEvent[]> {
  const res = await fetch(EVENTS_URL, { cache: "no-store" } as RequestInit);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return (await res.json()) as PogoEvent[];
}
