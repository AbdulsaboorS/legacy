---
phase: 06-mobile-app
plan: 01
subsystem: infra
tags: [capacitor, ios, mobile, native-plugins, webview]

# Dependency graph
requires: []
provides:
  - capacitor.config.ts with server.url WebView strategy pointing at Vercel
  - "@capacitor/status-bar installed (^8.0.1)"
  - "@capacitor/keyboard installed (^8.0.1)"
  - project ready for `npx cap add ios`
affects: [06-02, 06-03, 06-04, 06-05, 06-06]

# Tech tracking
tech-stack:
  added:
    - "@capacitor/status-bar ^8.0.1"
    - "@capacitor/keyboard ^8.0.1"
  patterns:
    - "server.url WebView strategy — Capacitor points at Vercel production URL, keeps all Next.js API routes/middleware/SSR intact"
    - "webDir: public — capacitor.config.ts webDir must reference an existing directory even when server.url overrides at runtime"

key-files:
  created:
    - capacitor.config.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "webDir: public — not 'out'; public/ already exists and Capacitor CLI requires this directory even when server.url overrides at runtime"
  - "server.url: https://legacy-bice.vercel.app with cleartext: false — Vercel is HTTPS, cleartext is only for local dev"
  - "Keyboard resize: none — prevents WebView being pushed up by keyboard on onboarding/refine screens"
  - "StatusBar overlaysWebView: false — status bar sits above app, not over it"
  - "StatusBar style: DEFAULT — auto-matches device light/dark mode"

patterns-established:
  - "Capacitor server.url: point at Vercel production URL to preserve Next.js SSR/middleware/API routes"

requirements-completed:
  - MOB-01
  - MOB-03

# Metrics
duration: 56s
completed: 2026-03-19
---

# Phase 6 Plan 01: Capacitor Config + Native Plugins Summary

**Capacitor server.url WebView config targeting Vercel production, with status bar and keyboard native plugins installed — project ready for `npx cap add ios`**

## Performance

- **Duration:** 56 seconds
- **Started:** 2026-03-19T07:09:57Z
- **Completed:** 2026-03-19T07:10:53Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Installed @capacitor/status-bar and @capacitor/keyboard (both ^8.0.1) into project dependencies
- Created capacitor.config.ts with appId `app.joinlegacy`, webDir `public`, server.url pointing at Vercel, and full plugin configuration block for StatusBar and Keyboard
- Project is now ready for `npx cap add ios` to initialize the iOS native project

## Task Commits

Each task was committed atomically:

1. **Task 1: Install @capacitor/status-bar and @capacitor/keyboard** - `9a9bc2d` (chore)
2. **Task 2: Create capacitor.config.ts** - `3dc99a6` (chore)

## Files Created/Modified
- `capacitor.config.ts` - Root Capacitor config: appId, webDir, server.url WebView strategy, StatusBar + Keyboard plugin settings
- `package.json` - Added @capacitor/status-bar and @capacitor/keyboard to dependencies
- `package-lock.json` - Updated lockfile

## Decisions Made
- webDir set to `public` (not `out`) because static export is not used and Capacitor CLI requires an existing directory even when server.url overrides it at runtime
- cleartext: false enforced — Vercel production is HTTPS only
- Keyboard resize: none prevents WebView from being pushed up by the software keyboard on iOS (critical for onboarding and refine screens)
- StatusBar overlaysWebView: false ensures status bar sits above the app content, not over it
- StatusBar style: DEFAULT lets iOS auto-match device appearance (light/dark)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Lint run surfaced 3 pre-existing errors in SettingsClient.tsx, CircleFeed.tsx, and ThemeProvider.tsx (useEffect setState pattern, Math.random in render). These are pre-existing issues unrelated to this plan's changes and were not introduced by capacitor.config.ts or plugin installation. Logged as out-of-scope per deviation rules.

## User Setup Required

None - no external service configuration required for this plan. The next human step is running `npx cap add ios` (in plan 06-02) which requires Xcode to be installed.

## Next Phase Readiness
- capacitor.config.ts is valid and imports cleanly via tsx
- Both native plugins are in node_modules
- Ready for 06-02: `npx cap add ios` + Info.plist setup + Google OAuth deep link URL scheme

---
*Phase: 06-mobile-app*
*Completed: 2026-03-19*

## Self-Check: PASSED

- FOUND: /Users/abdulsaboorshaikh/legacy/capacitor.config.ts
- FOUND: commit 9a9bc2d (Task 1)
- FOUND: commit 3dc99a6 (Task 2)
