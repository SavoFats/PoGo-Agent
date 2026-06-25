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
import { LinearGradient } from "expo-linear-gradient";

import { fetchEvents } from "./src/api";
import { notifyAboutNewEvents } from "./src/notifications";
import {
  computeStatus,
  formatCountdown,
  matchesLocationFilter,
  matchesStatusFilter,
  STATUS_LABEL,
  STATUS_ORDER,
} from "./src/status";
import { EventStatus, LocationFilterKey, PogoEvent, StatusFilterKey } from "./src/types";

const STATUS_FILTERS: { key: StatusFilterKey; label: string }[] = [
  { key: "all", label: "Tutti" },
  { key: "ongoing", label: "In corso" },
  { key: "upcoming", label: "Prossimamente" },
];

const LOCATION_FILTERS: { key: LocationFilterKey; label: string }[] = [
  { key: "global", label: "Globale" },
  { key: "local", label: "Locale" },
];

const STATUS_COLOR: Record<EventStatus, string> = {
  soon: "#ee1515",
  ongoing: "#1fa451",
  upcoming: "#2f8fdb",
  lead: "#f0a020",
  unknown: "#4c8a76",
  past: "#4c8a76",
};

export default function App() {
  const [events, setEvents] = useState<PogoEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>("all");
  const [locationFilter, setLocationFilter] = useState<LocationFilterKey[]>(["global", "local"]);
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

  const toggleLocationFilter = useCallback((key: LocationFilterKey) => {
    setLocationFilter((current) =>
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key]
    );
  }, []);

  const visibleEvents = useMemo(() => {
    const term = search.trim().toLowerCase();
    const decorated = events.map((event) => ({ event, status: computeStatus(event, now) }));

    const filtered = decorated.filter(({ event, status }) => {
      if (status === "past") return false;
      if (!matchesStatusFilter(status, statusFilter)) return false;
      if (!matchesLocationFilter(event.type, locationFilter)) return false;
      if (term && !event.title.toLowerCase().includes(term)) return false;
      return true;
    });

    filtered.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
    return filtered;
  }, [events, statusFilter, locationFilter, search, now]);

  return (
    <LinearGradient colors={["#eafff2", "#bdf0d6"]} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <View style={styles.logoDot} />
          <Text style={styles.title}>PoGo Event Tracker</Text>
        </View>
        <Text style={styles.subtitle}>Eventi globali e locali, sempre aggiornati.</Text>

        <TextInput
          style={styles.search}
          placeholder="Cerca un evento..."
          placeholderTextColor="#4c8a76"
          value={search}
          onChangeText={setSearch}
        />

        <View style={styles.tabs}>
          {STATUS_FILTERS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setStatusFilter(f.key)}
              style={[styles.tab, statusFilter === f.key && styles.tabActive]}
            >
              <Text style={[styles.tabText, statusFilter === f.key && styles.tabTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.tabs}>
          {LOCATION_FILTERS.map((f) => {
            const active = locationFilter.includes(f.key);
            return (
              <Pressable
                key={f.key}
                onPress={() => toggleLocationFilter(f.key)}
                style={[styles.tab, active && styles.tabActive]}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loader} color="#ee1515" />
        ) : error ? (
          <Text style={styles.error}>Errore nel caricamento: {error}</Text>
        ) : (
          <FlatList
            data={visibleEvents}
            keyExtractor={({ event }) => `${event.source}|${event.id}`}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ee1515" />}
            ListEmptyComponent={<Text style={styles.empty}>Nessun evento trovato.</Text>}
            renderItem={({ item: { event, status } }) => (
              <Pressable style={styles.card} onPress={() => Linking.openURL(event.url)}>
                <View style={[styles.badge, { backgroundColor: `${STATUS_COLOR[status]}1f` }]}>
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1, backgroundColor: "transparent" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  logoDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#ee1515",
    borderWidth: 2,
    borderColor: "#1a1a1a",
  },
  title: { color: "#0a5c45", fontSize: 22, fontWeight: "800" },
  subtitle: { color: "#4c8a76", fontWeight: "600", paddingHorizontal: 16, marginTop: 4, marginBottom: 12 },
  search: {
    marginHorizontal: 16,
    backgroundColor: "#ffffff",
    borderColor: "#d3eedd",
    borderWidth: 1,
    borderRadius: 999,
    color: "#0a5c45",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 12,
  },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    borderColor: "#d3eedd",
    borderWidth: 1,
  },
  tabActive: { backgroundColor: "#ee1515", borderColor: "#ee1515" },
  tabText: { color: "#4c8a76", fontSize: 13, fontWeight: "700" },
  tabTextActive: { color: "#ffffff", fontWeight: "800" },
  loader: { marginTop: 40 },
  error: { color: "#ee1515", textAlign: "center", marginTop: 40, paddingHorizontal: 24 },
  empty: { color: "#4c8a76", textAlign: "center", marginTop: 40, fontWeight: "600" },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#d3eedd",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 6,
    marginBottom: 10,
    shadowColor: "#0a5c45",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  badge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  cardTitle: { color: "#0a5c45", fontSize: 16, fontWeight: "800" },
  cardMeta: { color: "#4c8a76", fontSize: 12, fontWeight: "600" },
  countdown: { color: "#0a5c45", fontSize: 13, fontWeight: "700" },
});
