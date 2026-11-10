# Flat Expense Manager — Mobile App

React Native (Expo SDK 58) + TypeScript client for the Flat Expense Manager backend running on your laptop. Android + iOS.

**The phone never talks to Ollama.** Every AI request goes phone → FastAPI (laptop) → Ollama (laptop). All financial validation happens server-side; the AI never writes to the database without your confirmation.

---

## At a glance

| | |
|---|---|
| Entry | `npx expo start` (then press `a` / `i` / scan QR with Expo Go or a dev build) |
| API base URL | Editable in-app at **Settings → Server**, and via `EXPO_PUBLIC_API_URL` in `.env` |
| Laptop address | **Never `localhost`.** Phones use the laptop's LAN IP (e.g. `http://10.168.226.205:8000`) |
| Metro bundler port | 8081 (phones and laptop must share Wi-Fi) |
| Backend port | 8000 (unchanged, unchanged CORS, unchanged SQLite) |

---

## 1. One-time setup on the laptop

1. **Start the backend** (as before):
   ```powershell
   cd backend
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
   Restart it if it is still running the older in-memory code, so the **live-sync WebSocket** and `/version` are available. (Your database is untouched — the migration only reacts to missing columns.)
2. **Find the laptop's Wi-Fi IP**: `ipconfig` → "Wireless LAN adapter Wi-Fi" → **IPv4 Address** (e.g. `10.168.226.205`). Reserve it in your router (DHCP reservation: bind the laptop's MAC to that IP) so all three phones keep working after router reboots.
3. **Windows Firewall**: Inbound rule → Port → TCP → 8000 → Allow (Private network). Ollama stays on `127.0.0.1:11434` — never expose it.

## 2. One-time setup for the phones

Pick ONE of these (both work):

**A. Expo Go (fastest, limited):** install Expo Go from Play Store / App Store on each phone. Works for trying the app, but custom sounds/interactive notifications are reduced and **remote push is not available in Expo Go on Android**.

**B. Development build (recommended — required for full sounds/haptics/notifications fidelity):**
```powershell
cd mobile
npm install          # first time only
npx eas-cli@latest login   # create a free Expo account (once)
npx eas build --profile development --platform android   # builds a dev client APK
```
Install the resulting APK on each Android phone. iOS: same with `--platform ios` (needs an Apple Developer account for device installs; a Mac for local builds).

## 3. Run the app

```powershell
cd mobile
npx expo start
```
- On the connected phone: press `a` (USB-debug Android), or open the QR with Expo Go, or the dev client.
- On iOS: the same QR flow, or `npx expo start --ios` on a Mac.

## 4. Configure the server address on each phone

Settings → Server:
- Set `http://<LAN-IP>:8000` (e.g. `http://10.168.226.205:8000`) and **Save address**
- Tap **Test connection** — you should see `Connected · API v2.1.0 · <ms>`
- If it fails: backend down / wrong IP / firewall / different Wi-Fi. The app also codifies this in Settings → Server
- `http://localhost:8000` is rejected on purpose (it means *this phone*)

Settings are stored on the phone (AsyncStorage) — group, identity, sounds, haptics, server address.

## 5. Identity ("I am …")

Settings → Identity picks who *this phone* belongs to (used for AI parsing context, your hero totals, settlement defaults). It is **not authentication** — anyone on the Wi-Fi can open the app. It's a display choice like the web app's "I am" dropdown. No secrets are stored or transmitted beyond your network.

---

## Notifications — what works, honestly

| App state | Behavior |
|---|---|
| **Open (foreground)** | WebSocket pushes a `data_changed` event; the UI invalidates its queries, updates balances/activity instantly, shows an in-app toast, plays the notify chime (if enabled) and a light haptic. Works fully offline from the internet. |
| **Backgrounded, alive** (you switched to another app briefly) | A local notification is posted via `expo-notifications` when a WS frame arrives (iOS/Android may kill the socket first — treat this as best-effort). |
| **Fully closed** | **No Wi-Fi-only push is technically possible.** The OS suspends the app's radios. You need FCM (Android) / APNs (iOS) relays — e.g. Expo Push (free tier) — which requires internet access and an Expo account + credentials. This build does not include those credentials; it documents the gap rather than fake it. Enable it later via `npx expo-doctor` + `eas credentials`. |
| **Return to app** | On foreground the app refetches everything; if expenses changed while you were away, a local "while you were away"-style update appears with the live data. |

In-app toasts can be tapped ("View" → Activity). Notification preferences live in Settings → Notifications.

---

## AI behavior

Same contract as the web app: natural language → **draft(s)** → edit → confirm → save. The AI never writes to the DB on its own; every draft shows issues (unmatched names, date oddities, total mismatches) and nothing saves until you press **Confirm & save**. llama3.2 on CPU takes ~3–20 s; the orb animation sets expectations, and Cancel is honored client-side.

## Realtime architecture

`WS ws://<LAN-IP>:8000/ws/groups/{group_id}` → FastAPI in-memory hub broadcasts `data_changed` (expense/settlement/user/group events) after each committed mutation. Phones treat frames as **invalidation hints** and refetch via REST — the database remains the only source of truth. Reconnect: exponential backoff + jitter (cap 30 s), `NetInfo` reconnect detection, app-level `ping` every 25 s. Fallback: TanStack Query refetches on foreground and on reconnect; pull-to-refresh in Balances/Activity. Own-phone saves suppress the self-notification echo (4 s window).

## Sounds & haptics

Original synthesized chimes (`assets/sounds/*.wav`): save (two-note), notify (soft marimba), error (low thud), tap (quiet click). All switchable in Settings → Preferences, individually and via the master switch. Haptics cover selection, success, warning and error.

---

## Android APK (installable without a store)

Two honest routes:

**A. Cloud (easiest — no Android SDK needed on the laptop):**
```powershell
npx eas-cli@latest login
npx eas build --platform android --profile preview   # produces an installable APK
```
Requires internet + a free Expo account. The APK is downloaded as a file and sideloaded on each phone ("Install unknown apps" permission). **No APK has been built here** — this machine has no Android SDK/EAS session; the build must run under your account.

**B. Local gradle (needs Android Studio / SDK + JDK on the laptop):**
```powershell
npx expo prebuild --platform android
cd android
.\gradlew assembleRelease   # APK in android\app\build\outputs\apk\release\
```
Not run here (no Android SDK on this machine).

## iOS

- Simulator: `npx expo start --ios` on a Mac.
- Physical iPhone: development build via EAS (route A above) with an Apple Developer account; install via TestFlight or direct device install. No config changes needed for LAN HTTP — `NSAllowsLocalNetworking` is already set.

---

## Tests & verification status

| Suite | Command | Result (this machine) |
|---|---|---|
| Mobile unit tests (money, dates, drafts, API errors) | `npx vitest run` | **36/36 pass** |
| TypeScript (strict) | `npm run typecheck` | **clean** |
| Android production bundle | `npx expo export --platform android` | **built OK** (Hermes bundle, ~7.2 MB) |
| Backend tests (WS + all prior suites) | `python -m pytest tests/ -q` | **104/104 pass** |
| On-phone runtime | — | **Not executed here** — no device/emulator on this machine; install via Expo Go to click through |

Known limitations: no component/E2E tests yet (Maestro flows are a good next step); APK not built (no SDK/credentials on this machine); closed-app push not possible over LAN; llama3.2 output quality varies (guardrails flag issues — always review drafts).
