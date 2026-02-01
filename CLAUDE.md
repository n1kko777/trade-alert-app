# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TradePulse Alerts is an Expo React Native app that monitors Bybit spot prices and sends alerts when prices move by a specified percentage within a rolling time window.

## Commands

```bash
npm install          # Install dependencies
npm run start        # Start Expo dev server (interactive platform selection)
npm run ios          # Run on iOS simulator
npm run android      # Run on Android emulator/device
npm run web          # Run in web browser
```

No automated tests exist. Background tasks and notifications require real device testing.

## Architecture

**App.tsx** is the central hub - it owns global state, persistence, polling/WebSocket logic, background scheduling, and navigation. All screens receive state as props.

### Key Data Flow

1. **Polling mode**: `fetchTicker`/`fetchAllTickers` → update price history → compute alerts
2. **WebSocket mode**: Stream from `wss://stream.bybit.com/v5/public/spot` (disabled when `trackAllSymbols` is on)
3. **Alert logic**: `abs(changePct) >= thresholdPct` AND cooldown elapsed → fire alert
4. **Background tasks**: Mirror App.tsx polling logic in `src/background/task.ts`

### Module Locations

- **API calls**: `src/services/bybit.ts`
- **Alert math & rule resolution**: `src/utils/data.ts` (`computeChange`, `resolveSymbolRule`)
- **Formatting/parsing**: `src/utils/format.ts`
- **Background task**: `src/background/task.ts`
- **Defaults & storage keys**: `src/constants.ts`
- **Types**: `src/types.ts`

## Settings Changes Checklist

When adding or modifying a setting, update ALL of these:
1. `src/types.ts` - Settings interface
2. `src/constants.ts` - DEFAULT_SETTINGS
3. `src/utils/data.ts` - `normalizeSettings()` function
4. `App.tsx` - state and persistence logic
5. `src/components/SettingsPanel.tsx` - form inputs

If the setting affects background behavior, also update `src/background/task.ts`.

## Critical Constraints

- **WebSocket/polling exclusion**: WebSocket is force-disabled when `trackAllSymbols` is enabled
- **Pruning**: Never break `pruneAlertsList` or `pruneHistoryMap` - they prevent unbounded storage growth
- **Settings normalization**: Always use `normalizeSettings()` when loading from AsyncStorage to guard against malformed data
- **Per-symbol overrides**: `resolveSymbolRule(settings, symbol)` merges symbol-specific rules with global defaults
- **Theme system**: `src/theme.ts` defines light/dark themes; `themeMode` setting controls appearance
