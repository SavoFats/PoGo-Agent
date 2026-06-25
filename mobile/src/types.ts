export type EventType = "in-game" | "regional-lead";

export interface PogoEvent {
  id: string;
  source: string;
  type: EventType;
  title: string;
  start: string | null;
  end: string | null;
  location: string;
  url: string;
  first_seen: string;
}

export type EventStatus =
  | "soon"
  | "ongoing"
  | "upcoming"
  | "past"
  | "lead"
  | "unknown";

export type StatusFilterKey = "all" | "ongoing" | "upcoming";
export type LocationFilterKey = "global" | "local";
