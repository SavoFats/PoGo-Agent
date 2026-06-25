import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { PogoEvent } from "./types";

const SEEN_IDS_KEY = "pogo-agent:seen-event-ids";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

async function getSeenIds(): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(SEEN_IDS_KEY);
  if (!raw) return new Set();
  try {
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

async function saveSeenIds(ids: Set<string>) {
  await AsyncStorage.setItem(SEEN_IDS_KEY, JSON.stringify([...ids]));
}

/**
 * Compares the freshly fetched events against what we've already shown the
 * user, fires a local notification for each genuinely new one, and persists
 * the updated "seen" set. Safe to call every time the app is opened/foregrounded.
 */
export async function notifyAboutNewEvents(events: PogoEvent[]): Promise<PogoEvent[]> {
  const seen = await getSeenIds();
  const isFirstRun = seen.size === 0;

  const newEvents = events.filter((event) => !seen.has(`${event.source}|${event.id}`));

  for (const event of events) {
    seen.add(`${event.source}|${event.id}`);
  }
  await saveSeenIds(seen);

  // Don't spam a notification per event on the very first launch, when
  // everything is technically "new" to this device.
  if (isFirstRun || newEvents.length === 0) return newEvents;

  const granted = await requestNotificationPermission();
  if (!granted) return newEvents;

  for (const event of newEvents.slice(0, 10)) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: event.type === "regional-lead" ? "Possibile evento locale" : "Nuovo evento PoGo",
        body: event.title,
        data: { url: event.url },
      },
      trigger: null,
    });
  }

  return newEvents;
}

export const isAndroid = Platform.OS === "android";
