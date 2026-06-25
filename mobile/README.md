# PoGo Event Tracker — app

App Expo (React Native, iOS + Android da un solo codebase) che mostra gli eventi
raccolti dal backend (`../scraper`) e ti avvisa con una notifica locale quando ne
trova di nuovi.

## Come funziona

- `src/api.ts` — legge `docs/data/events.json` direttamente da GitHub (raw.githubusercontent.com),
  lo stesso file che alimenta la [dashboard](../docs). Nessun backend dedicato per l'app.
- `src/status.ts` — stessa logica di stato/countdown della dashboard, portata in TypeScript.
- `src/notifications.ts` — confronta gli eventi appena scaricati con quelli già visti
  (salvati in `AsyncStorage`) e manda una notifica locale per ognuno di nuovo.
- L'app controlla aggiornamenti all'apertura e ogni volta che torna in foreground.

**Nota sui limiti**: queste sono notifiche *locali*, innescate quando l'app è aperta/in
foreground — non notifiche push che arrivano ad app chiusa. Per quello resta il bot
Telegram lato backend, che è server-initiated e funziona sempre. Se in futuro vorrai
push vere anche ad app chiusa, serve un piccolo backend che registri gli `Expo Push Token`
dei device e li richiami dal workflow GitHub Actions.

## Sviluppo locale

```
npm install
npx expo start          # poi premi i per iOS Simulator, a per Android, w per Web
```

## Build e pubblicazione (EAS)

Serve un account [Expo (EAS)](https://expo.dev/) gratuito per buildare, più gli
account a pagamento dei rispettivi store quando sarai pronto a pubblicare:
- Apple Developer Program — 99$/anno (richiesto per iOS/App Store, anche solo per TestFlight)
- Google Play Console — 25$ una tantum (richiesto per Android/Play Store)

```
npm install -g eas-cli
eas login

# build di test installabile su un device reale (TestFlight / internal testing)
eas build --platform ios --profile preview
eas build --platform android --profile preview

# build di produzione + invio allo store
eas build --platform all --profile production
eas submit --platform ios
eas submit --platform android
```

`eas build` gestisce certificati/provisioning/keystore automaticamente (chiede di
generarli al primo run). `eas.json` in questa cartella definisce già i profili
`development`, `preview` e `production`.

Prima della prima build, aggiorna in `app.json`:
- `expo.ios.bundleIdentifier` e `expo.android.package` (placeholder attuale: `com.savofats.pogoagent`)
- le icone in `assets/` (al momento sono quelle di default del template Expo)
