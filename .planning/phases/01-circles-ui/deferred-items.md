# Deferred Items — Phase 01 Circles UI

## Pre-existing lint errors (out of scope for plan 01-01)

These errors existed before plan 01-01 execution and are unrelated to HalaqaClient changes.

### 1. DashboardClient.tsx:87 — react-hooks/set-state-in-effect
`loadData()` called synchronously inside useEffect. Pattern used across the codebase.

### 2. SettingsClient.tsx:40 — react-hooks/set-state-in-effect
`loadHabits()` called synchronously inside useEffect. Same pattern.

### 3. ThemeProvider.tsx:19 — react-hooks/set-state-in-effect
`setMounted(true)` called synchronously inside useEffect for hydration guard.

### 4. layout.tsx:65 — @next/next/no-page-custom-font
Custom fonts loaded in layout rather than `_document.js`. App Router pattern — not applicable warning.
