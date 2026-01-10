# Trade Alert App

React Native (Expo) app that watches Bybit spot prices and sends alerts when a symbol moves by a given percentage within a time window. Alerts are stored locally, can be exported from the app, and can run in the background when enabled.

## Features
- Watch a custom list of symbols or all Bybit spot coins.
- Threshold alerts based on percent change over a rolling window.
- WebSocket streaming for realtime updates (disabled when tracking all symbols).
- Background polling via Expo background tasks.
- Local alert history with retention and max-size limits.
- Notifications with optional sound and quiet hours.

## Tech stack
- Expo + React Native + TypeScript
- React Navigation (bottom tabs)
- AsyncStorage for persistence
- Expo Notifications + Task Manager

## Project structure
- `App.tsx`: app state, data flow, navigation, and background orchestration.
- `index.ts`: Expo root registration.
- `src/screens`: Dashboard, Alerts, Settings screens.
- `src/components`: UI building blocks and panels.
- `src/services`: Bybit API + notification helpers.
- `src/background`: background task definition.
- `src/utils`: formatting and alert/price math.

## Getting started
1) Install dependencies

```bash
npm install
```

2) Start Expo

```bash
npm run start
```

Optional targets:

```bash
npm run ios
npm run android
npm run web
```

## Configuration and settings
Default settings live in `src/constants.ts` under `DEFAULT_SETTINGS`.

Key settings:
- `symbols`: list of Bybit spot symbols (e.g. `BTCUSDT`).
- `thresholdPct`, `windowMinutes`, `cooldownMinutes`.
- `pollIntervalSec` for polling mode.
- `useWebSocket` for realtime mode.
- `backgroundEnabled` to allow background polling.
- `trackAllSymbols` to fetch all tickers.
- `quietHoursStart` / `quietHoursEnd` to suppress notifications.

Settings are persisted in AsyncStorage with keys defined in `src/constants.ts`.

## Background tasks and notifications
- Background polling is implemented in `src/background/task.ts`.
- Notification channels are configured in `src/services/notifications.ts`.
- Background tasks and notifications have platform limitations; test on a real device when needed.

## Data sources
- REST polling: `https://api.bybit.com/v5/market/tickers?category=spot`
- WebSocket: `wss://stream.bybit.com/v5/public/spot`

## Testing
No automated tests are included yet.

## Notes
- When `trackAllSymbols` is enabled, WebSocket streaming is forced off.
- Alerts are pruned by retention days and max alert count.
