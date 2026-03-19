---
phase: 06-mobile-app
plan: "06"
subsystem: infra
tags: [capacitor, ios, xcode, testflight, app-store, apple-developer, codemagic]

# Dependency graph
requires:
  - phase: 06-mobile-app
    provides: capacitor.config.ts, codemagic.yaml, deep link handler, safe area CSS, privacy page, NativeAuthHandler
provides:
  - Human-executed iOS project generation (npx cap add ios, npx cap sync ios)
  - Info.plist URL scheme configuration for deep links
  - Real iPhone device verification (OAuth, safe area, session persistence)
  - Codemagic CI/CD build + TestFlight upload
  - App Store Connect listing, metadata, and submission
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Human-checkpoint plan pattern: all tasks are checkpoint:human-action — documents exact steps for the human developer with no automated execution"

key-files:
  created: []
  modified:
    - ios/App/App/Info.plist (human step — add CFBundleURLTypes for app.joinlegacy scheme)

key-decisions:
  - "All tasks in this plan require Apple Developer portal, Xcode, physical iPhone, and App Store Connect — cannot be automated by Claude"
  - "Step C includes full-kill session persistence test — if it fails, escalate to Claude for localStorage-based Supabase client switch"
  - "Step D uses Codemagic for CI/CD builds — human must upload signing assets (p12, provisioning profile) and App Store Connect API key"

patterns-established:
  - "Human-checkpoint sequence: Prerequisites → iOS project gen → Device test → TestFlight → App Store"

requirements-completed:
  - MOB-01
  - MOB-02
  - MOB-03
  - MOB-04
  - MOB-05

# Metrics
duration: checkpoint
completed: 2026-03-19
---

# Phase 6 Plan 06: iOS Device Build, TestFlight, and App Store Submission Summary

**Human-executed iOS delivery: Apple Developer setup, Xcode device run, TestFlight CI build via Codemagic, and App Store submission with OAuth deep link verification**

## Performance

- **Duration:** Checkpoint (awaiting human execution)
- **Started:** 2026-03-19T07:31:54Z
- **Completed:** Pending human steps
- **Tasks:** 0/5 automated (all 5 are human-action checkpoints)
- **Files modified:** 0 (all modifications require Xcode + Apple Developer portal)

## Accomplishments

- All code changes from plans 06-01 through 06-05 are complete (capacitor.config.ts, codemagic.yaml, NativeAuthHandler, safe area CSS, privacy page)
- This plan documents the 5 human-only steps required to ship the iOS app

## Task Commits

No automated tasks — this plan is fully human-action checkpoints.

## Files Created/Modified

None — all file changes in this plan require human execution (Xcode project generation, Info.plist editing).

## Decisions Made

- All tasks (Steps A–E) require Apple Developer portal access, Xcode, a physical iPhone, and App Store Connect — they cannot be automated by Claude.
- Step C includes a critical full-app-kill session persistence test. If this fails, escalate to Claude with: "Session lost on full app kill — switch the Supabase client factory to return the native.ts localStorage client when Capacitor.isNativePlatform() is true."
- Step D uses Codemagic free tier (500 Mac M1 min/month) for CI/CD — human must upload signing assets before triggering build.

## Deviations from Plan

None — plan executed exactly as written. (No automated execution occurred; all tasks are human-action checkpoints.)

## Issues Encountered

None during plan initialization.

## User Setup Required

**All 5 steps in this plan require human execution.** The checkpoint message provides exact commands and verification steps for each:

- **Step A** — Vercel deployment confirmation, Apple Developer enrollment, App Store Connect listing creation, Supabase redirect URL registration
- **Step B** — `npx cap add ios` + `npx cap sync ios`, Info.plist CFBundleURLTypes entry, commit `ios/` to repo
- **Step C** — Xcode device run, OAuth deep link test, safe area visual check, session persistence (background + full kill)
- **Step D** — Codemagic account setup, signing assets upload, App Store Connect API key, TestFlight install + verification
- **Step E** — App Store Connect metadata, screenshots, review notes with test credentials, submission

## Next Phase Readiness

After App Store approval (Step E complete):
- Phase 6 is fully complete
- Phase 7 (Push Notifications) can begin: `src/lib/push.ts`, `/api/push/register`, cron routes, FIREBASE env vars

---
*Phase: 06-mobile-app*
*Completed: 2026-03-19 (pending human steps)*
