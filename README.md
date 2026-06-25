# PoGo-Agent

Agente che monitora eventi Pokémon GO (globali e locali/regionali) e avvisa via Telegram
quando ne trova di nuovi, prima che finiscano senza che tu li abbia notati.

## Come funziona

```
scraper/sources/   fetch dalle fonti (ScrapedDuck/LeekDuck, Reddit RSS regionale)
scraper/normalize.py  uniforma i dati in un unico schema Event
scraper/main.py     orchestratore: fetch -> dedup contro data/events.json -> notifica i nuovi
notifier/telegram.py invia un messaggio per ogni evento nuovo
data/events.json    storico persistito (committato automaticamente dal workflow)
docs/               dashboard statica (GitHub Pages), legge docs/data/events.json
.github/workflows/check-events.yml  esegue tutto ogni 3 ore, sincronizza anche docs/data/events.json
```

## Setup

1. Crea un bot Telegram con [@BotFather](https://t.me/BotFather) e prendi il token.
2. Scrivi al bot, poi recupera il tuo `chat_id` (es. via `https://api.telegram.org/bot<token>/getUpdates`).
3. Nel repo GitHub: Settings → Secrets and variables → Actions, aggiungi `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID`.
4. Il workflow gira da solo ogni 3 ore (o lancialo manualmente da Actions → Check PoGo events → Run workflow).

## Dashboard (GitHub Pages)

1. Settings → Pages → Build and deployment → Source: "Deploy from a branch".
2. Branch: `main`, cartella: `/docs`. Salva.
3. Dopo qualche minuto la dashboard è online su `https://<utente>.github.io/PoGo-Agent/`.

La dashboard è statica (HTML/CSS/JS puro, nessuna build): mostra eventi in scadenza, in corso, in arrivo e le
segnalazioni locali/regionali raccolte da Reddit, con ricerca e filtri.

## Eseguire in locale

```
pip install -r requirements.txt
python scraper/main.py
```

Senza le variabili d'ambiente Telegram, gli eventi nuovi vengono solo stampati in console.
