import { EventStatus, EventType, LocationFilterKey, PogoEvent, StatusFilterKey } from "./types";

const SOON_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const iso = value.endsWith("Z") || /[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

export function computeStatus(event: PogoEvent, now: Date): EventStatus {
  if (event.type === "regional-lead") return "lead";

  const start = parseDate(event.start);
  const end = parseDate(event.end);

  if (!start && !end) return "unknown";
  if (end && now > end) return "past";
  if (start && now < start) return "upcoming";
  if (end && end.getTime() - now.getTime() <= SOON_THRESHOLD_MS) return "soon";
  return "ongoing";
}

export function formatDate(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCountdown(event: PogoEvent, now: Date): string {
  const start = parseDate(event.start);
  const end = parseDate(event.end);

  if (event.type === "regional-lead") return "Da verificare";
  if (start && now < start) return `Inizia il ${formatDate(start)}`;
  if (end && now <= end) {
    const diffMs = end.getTime() - now.getTime();
    const hours = Math.floor(diffMs / 3_600_000);
    const minutes = Math.floor((diffMs % 3_600_000) / 60_000);
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `Finisce in ${days}g ${hours % 24}h`;
    }
    return `Finisce in ${hours}h ${minutes}m`;
  }
  if (end && now > end) return `Finito il ${formatDate(end)}`;
  return "Data non disponibile";
}

export const STATUS_LABEL: Record<EventStatus, string> = {
  soon: "In scadenza",
  ongoing: "In corso",
  upcoming: "Prossimo",
  past: "Passato",
  lead: "Segnalazione locale",
  unknown: "Senza data",
};

export const STATUS_ORDER: Record<EventStatus, number> = {
  soon: 0,
  ongoing: 1,
  upcoming: 2,
  lead: 3,
  unknown: 4,
  past: 5,
};

export function matchesStatusFilter(status: EventStatus, filter: StatusFilterKey): boolean {
  if (filter === "all") return true;
  if (filter === "ongoing") return status === "ongoing" || status === "soon";
  if (filter === "upcoming") return status === "upcoming";
  return true;
}

export function matchesLocationFilter(eventType: EventType, locations: LocationFilterKey[]): boolean {
  const key: LocationFilterKey = eventType === "regional-lead" ? "local" : "global";
  return locations.includes(key);
}
