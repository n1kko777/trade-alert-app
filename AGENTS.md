# Agent Guide

Use this file as a quick orientation when making changes to the repo.

## Context
Trade Alert App is an Expo React Native app that monitors Bybit spot prices and generates alerts based on percent change within a time window. It supports polling, realtime WebSocket streaming, and background tasks, and persists state in AsyncStorage.

## Entry points
- `index.ts`: registers `App` with Expo.
- `App.tsx`: owns global state, persistence, polling/WebSocket logic, background scheduling, and navigation.

## Key modules
- `src/screens/*`: top-level tabs (Dashboard, Alerts, Settings).
- `src/components/*`: UI panels and cards.
- `src/services/bybit.ts`: REST calls for single/all tickers.
- `src/services/notifications.ts`: Android notification channel helper.
- `src/background/task.ts`: background task logic (poll, alert, notify).
- `src/utils/data.ts`: alert math, rule resolution, pruning, settings normalization.
- `src/utils/format.ts`: formatting and parsing helpers.
- `src/constants.ts`: defaults and storage keys.

## Settings changes checklist
When adding or changing a setting, update all of the following:
- `src/types.ts` (Settings type)
- `src/constants.ts` (DEFAULT_SETTINGS)
- `src/utils/data.ts` (normalizeSettings)
- `App.tsx` state + persistence
- `src/components/SettingsPanel.tsx` (form inputs)

If the setting affects background behavior, mirror logic in `src/background/task.ts`.

## Data flow summary
- Polling uses `fetchTicker` / `fetchAllTickers` and updates price history.
- WebSocket uses `wss://stream.bybit.com/v5/public/spot` and is disabled when tracking all symbols.
- Alerts are created when `abs(changePct) >= thresholdPct` and cooldown has elapsed.
- Alert history and price history are pruned via `pruneAlertsList` and `pruneHistoryMap`.

## Persistence
- Settings and alert/history caches use AsyncStorage keys in `src/constants.ts`.
- Use `normalizeSettings` to guard against partial or malformed stored data.

## Running the app
```bash
npm install
npm run start
```

Optional targets:
```bash
npm run ios
npm run android
npm run web
```

## Guardrails
- Keep WebSocket and polling mutually exclusive when `trackAllSymbols` is on.
- Background tasks and notifications are platform sensitive; test on real devices where possible.
- Avoid breaking alert pruning or settings normalization; they protect against runaway storage growth.

## Tests
No automated test suite is present.
