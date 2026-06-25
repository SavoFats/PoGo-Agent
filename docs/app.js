const DATA_URL = "data/events.json";
const SOON_THRESHOLD_MS = 24 * 60 * 60 * 1000;

let events = [];
let activeFilter = "all";
let searchTerm = "";
let showPast = false;

const gridEl = document.getElementById("grid");
const emptyEl = document.getElementById("empty");
const statsEl = document.getElementById("stats");
const lastUpdatedEl = document.getElementById("last-updated");

function parseDate(value) {
  if (!value) return null;
  const iso = value.endsWith("Z") || /[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

function computeStatus(event, now) {
  if (event.type === "regional-lead") return "lead";

  const start = parseDate(event.start);
  const end = parseDate(event.end);

  if (!start && !end) return "unknown";
  if (end && now > end) return "past";
  if (start && now < start) return "upcoming";
  if (end && end.getTime() - now.getTime() <= SOON_THRESHOLD_MS) return "soon";
  return "ongoing";
}

function formatDate(d) {
  if (!d) return null;
  return d.toLocaleString("it-IT", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function formatCountdown(event, now) {
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

const STATUS_LABEL = {
  soon: "In scadenza",
  ongoing: "In corso",
  upcoming: "Prossimo",
  past: "Passato",
  lead: "Segnalazione",
  unknown: "Senza data",
};

const STATUS_ORDER = { soon: 0, ongoing: 1, upcoming: 2, lead: 3, unknown: 4, past: 5 };

function matchesFilter(status, filter) {
  if (filter === "all") return status !== "past";
  if (filter === "soon") return status === "soon";
  if (filter === "in-game") return status !== "lead" && status !== "past";
  if (filter === "regional-lead") return status === "lead";
  return true;
}

function render() {
  const now = new Date();
  const term = searchTerm.trim().toLowerCase();

  const decorated = events.map((event) => ({
    event,
    status: computeStatus(event, now),
  }));

  let visible = decorated.filter(({ event, status }) => {
    if (status === "past" && !showPast) return false;
    if (!matchesFilter(status, activeFilter)) return false;
    if (term && !event.title.toLowerCase().includes(term)) return false;
    return true;
  });

  visible.sort((a, b) => {
    const orderDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (orderDiff !== 0) return orderDiff;
    const aDate = parseDate(a.event.start) || parseDate(a.event.first_seen);
    const bDate = parseDate(b.event.start) || parseDate(b.event.first_seen);
    if (!aDate || !bDate) return 0;
    return aDate.getTime() - bDate.getTime();
  });

  gridEl.innerHTML = "";
  emptyEl.classList.toggle("hidden", visible.length > 0);

  for (const { event, status } of visible) {
    gridEl.appendChild(renderCard(event, status, now));
  }

  renderStats(decorated);
}

function renderCard(event, status, now) {
  const card = document.createElement("article");
  card.className = `card status-${status}`;

  const badge = document.createElement("span");
  badge.className = `badge badge-${status}`;
  badge.textContent = STATUS_LABEL[status];

  const title = document.createElement("h2");
  title.textContent = event.title;

  const meta = document.createElement("p");
  meta.className = "meta";
  meta.textContent = `${event.source} · ${event.location === "global" ? "Globale" : event.location}`;

  const countdown = document.createElement("p");
  countdown.className = "countdown";
  countdown.textContent = formatCountdown(event, now);

  const link = document.createElement("a");
  link.href = event.url;
  link.target = "_blank";
  link.rel = "noopener";
  link.className = "card-link";
  link.textContent = "Apri";

  card.append(badge, title, meta, countdown, link);
  return card;
}

function renderStats(decorated) {
  const counts = { soon: 0, ongoing: 0, upcoming: 0, lead: 0 };
  for (const { status } of decorated) {
    if (counts[status] !== undefined) counts[status] += 1;
  }
  statsEl.innerHTML = "";
  const items = [
    [counts.soon, "in scadenza"],
    [counts.ongoing, "in corso"],
    [counts.upcoming, "in arrivo"],
    [counts.lead, "segnalazioni locali"],
  ];
  for (const [count, label] of items) {
    const chip = document.createElement("div");
    chip.className = "stat-chip";
    chip.innerHTML = `<strong>${count}</strong><span>${label}</span>`;
    statsEl.appendChild(chip);
  }
}

function tickCountdowns() {
  render();
}

async function load() {
  try {
    const resp = await fetch(DATA_URL, { cache: "no-store" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    events = await resp.json();
    lastUpdatedEl.textContent = `${events.length} eventi nel database`;
    render();
  } catch (err) {
    gridEl.innerHTML = "";
    emptyEl.classList.remove("hidden");
    emptyEl.textContent = `Errore nel caricamento dati: ${err.message}`;
  }
}

document.getElementById("search").addEventListener("input", (e) => {
  searchTerm = e.target.value;
  render();
});

document.getElementById("show-past").addEventListener("change", (e) => {
  showPast = e.target.checked;
  render();
});

document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activeFilter = btn.dataset.filter;
    render();
  });
});

load();
setInterval(tickCountdowns, 60_000);
