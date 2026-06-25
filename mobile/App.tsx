import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { fetchEvents } from "./src/api";
import { notifyAboutNewEvents } from "./src/notifications";
import {
  computeStatus,
  formatCountdown,
  matchesFilter,
  STATUS_LABEL,
  STATUS_ORDER,
} from "./src/status";
import { EventStatus, FilterKey, PogoEvent } from "./src/types";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Tutti" },
  { key: "soon", label: "In scadenza" },
  { key: "in-game", label: "In-game" },
  { key: "regional-lead", label: "Locali" },
];

const STATUS_COLOR: Record<EventStatus, string> = {
  soon: "#ff5a5f",
  ongoing: "#3ddc97",
  upcoming: "#5b8cff",
  lead: "#ffb84d",
  unknown: "#9aa1bd",
  past: "#9aa1bd",
};

export default function App() {
  const [events, setEvents] = useState<PogoEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(async (notify: boolean) => {
    try {
      setError(null);
      const fetched = await fetchEvents();
      setEvents(fetched);
      if (notify) {
        await notifyAboutNewEvents(fetched);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    load(true).finally(() => setLoading(false));

    const tick = setInterval(() => setNow(new Date()), 60_000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") load(true);
    });
    return () => {
      clearInterval(tick);
      sub.remove();
    };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }, [load]);

  const visibleEvents = useMemo(() => {
    const term = search.trim().toLowerCase();
    const decorated = events.map((event) => ({ event, status: computeStatus(event, now) }));

    const filtered = decorated.filter(({ event, status }) => {
      if (status === "past") return false;
      if (!matchesFilter(status, filter)) return false;
      if (term && !event.title.toLowerCase().includes(term)) return false;
      return true;
    });

    filtered.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
    return filtered;
  }, [events, filter, search, now]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View style={styles.logoDot} />
        <Text style={styles.title}>PoGo Event Tracker</Text>
      </View>
      <Text style={styles.subtitle}>Eventi globali e locali, sempre aggiornati.</Text>

      <TextInput
        style={styles.search}
        placeholder="Cerca un evento..."
        placeholderTextColor="#9aa1bd"
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.tabs}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[styles.tab, filter === f.key && styles.tabActive]}
          >
            <Text style={[styles.tabText, filter === f.key && styles.tabTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color="#ff5a5f" />
      ) : error ? (
        <Text style={styles.error}>Errore nel caricamento: {error}</Text>
      ) : (
        <FlatList
          data={visibleEvents}
          keyExtractor={({ event }) => `${event.source}|${event.id}`}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ff5a5f" />}
          ListEmptyComponent={<Text style={styles.empty}>Nessun evento trovato.</Text>}
          renderItem={({ item: { event, status } }) => (
            <Pressable style={styles.card} onPress={() => Linking.openURL(event.url)}>
              <View style={[styles.badge, { backgroundColor: `${STATUS_COLOR[status]}26` }]}>
                <Text style={[styles.badgeText, { color: STATUS_COLOR[status] }]}>
                  {STATUS_LABEL[status]}
                </Text>
              </View>
              <Text style={styles.cardTitle}>{event.title}</Text>
              <Text style={styles.cardMeta}>
                {event.source} · {event.location === "global" ? "Globale" : event.location}
              </Text>
              <Text style={styles.countdown}>{formatCountdown(event, now)}</Text>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0f1320" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  logoDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#ff5a5f" },
  title: { color: "#eef0f8", fontSize: 22, fontWeight: "700" },
  subtitle: { color: "#9aa1bd", paddingHorizontal: 16, marginTop: 4, marginBottom: 12 },
  search: {
    marginHorizontal: 16,
    backgroundColor: "#171c2e",
    borderColor: "#272d44",
    borderWidth: 1,
    borderRadius: 10,
    color: "#eef0f8",
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#171c2e",
    borderColor: "#272d44",
    borderWidth: 1,
  },
  tabActive: { backgroundColor: "#ff5a5f", borderColor: "#ff5a5f" },
  tabText: { color: "#9aa1bd", fontSize: 13 },
  tabTextActive: { color: "#1a0d0e", fontWeight: "700" },
  loader: { marginTop: 40 },
  error: { color: "#ff5a5f", textAlign: "center", marginTop: 40, paddingHorizontal: 24 },
  empty: { color: "#9aa1bd", textAlign: "center", marginTop: 40 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  card: {
    backgroundColor: "#171c2e",
    borderColor: "#272d44",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 6,
    marginBottom: 10,
  },
  badge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  cardTitle: { color: "#eef0f8", fontSize: 16, fontWeight: "700" },
  cardMeta: { color: "#9aa1bd", fontSize: 12 },
  countdown: { color: "#eef0f8", fontSize: 13, fontWeight: "600" },
});
