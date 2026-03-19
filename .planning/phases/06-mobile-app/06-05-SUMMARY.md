---
phase: 06-mobile-app
plan: 05
subsystem: auth
tags: [capacitor, deep-links, oauth, supabase, ios]
dependency_graph:
  requires: [06-04]
  provides: [native-oauth-deep-link-handler]
  affects: [src/components/NativeAuthHandler.tsx, src/app/page.tsx, src/app/layout.tsx]
tech_stack:
  added: []
  patterns:
    - Capacitor App.addListener('appUrlOpen') for deep link OAuth token extraction
    - Dual native detection: isNativePlatform() + userAgent.includes('Capacitor') fallback
    - setSession then refreshSession pattern for Capacitor OAuth (fires onAuthStateChange)
    - Mirror web auth/callback routing logic in native handler
key_files:
  created:
    - src/components/NativeAuthHandler.tsx
  modified:
    - src/app/page.tsx
    - src/app/layout.tsx
decisions:
  - NativeAuthHandler uses createNativeClient (localStorage-based) not createClient (cookie-based) — localStorage persists across Capacitor app kills
  - userAgent fallback for isNativePlatform() guards against known Capacitor server.url issue where platform detection can return false
  - refreshSession called after setSession — required to fire onAuthStateChange; setSession alone does not trigger listeners
  - habits count query mirrors src/app/auth/callback/route.ts exactly — new user (zero habits) to /onboarding, returning to /dashboard
  - window.location.href used for post-auth navigation (not Next.js router) — ensures full page reload with session state
metrics:
  duration: 118s
  completed_date: "2026-03-19"
  tasks: 3
  files: 3
---

# Phase 6 Plan 05: Google OAuth Deep Link Handler Summary

**One-liner:** Capacitor appUrlOpen listener that extracts OAuth tokens from custom URL scheme fragment, establishes Supabase session via setSession+refreshSession, and routes new/returning users identically to the web callback handler.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create NativeAuthHandler component | 9cc1f14 | src/components/NativeAuthHandler.tsx |
| 2 | Platform-aware OAuth redirectTo in page.tsx | 786cb2a | src/app/page.tsx |
| 3 | Mount NativeAuthHandler in layout.tsx | 7f8097b | src/app/layout.tsx |

## What Was Built

**NativeAuthHandler.tsx** — A null-rendering client component mounted at the root layout. It:
- Guards all Capacitor plugin calls with dual native detection (isNativePlatform() + userAgent fallback)
- Registers `App.addListener('appUrlOpen')` to catch the `app.joinlegacy://auth-callback#access_token=...` deep link
- Splits the URL on `#` and parses the fragment with URLSearchParams (tokens are in the fragment, not query string)
- Calls `setSession` then `refreshSession` on the localStorage-backed native Supabase client
- After session is established, queries the habits table with `.limit(1)` to decide routing: zero habits → `/onboarding`, any habits → `/dashboard`
- Cleans up the listener on unmount

**page.tsx** — `handleSignIn` now detects native platform before calling `signInWithOAuth`. On native: `redirectTo = 'app.joinlegacy://auth-callback'`. On web: `redirectTo = window.location.origin + '/auth/callback'` (with existing sessionStorage next-param logic preserved, web path only).

**layout.tsx** — `<NativeAuthHandler />` mounted as first child inside `<ThemeProvider>`, before `<ToastProvider>`. Ensures the deep link listener is active regardless of which page the user lands on.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected import name for native Supabase client**
- **Found during:** Task 1 implementation
- **Issue:** Plan code sample referenced `import { createClient } from '@/lib/supabase/native'` but the actual export in that file is `createNativeClient` (not `createClient`)
- **Fix:** Used `import { createNativeClient } from '@/lib/supabase/native'` and called `createNativeClient()` in the component
- **Files modified:** src/components/NativeAuthHandler.tsx
- **Commit:** 9cc1f14

## Verification

- `npm run build` — TypeScript compiles successfully, all 19 routes generated, no errors
- `npm run lint` — 3 pre-existing errors in unrelated files (SettingsClient.tsx, CircleFeed.tsx, ThemeProvider.tsx), none in plan-touched files; out of scope per deviation boundary rule
- `grep -c "appUrlOpen|refreshSession|isNativePlatform|onboarding" NativeAuthHandler.tsx` → returns 8 (all required patterns present)

## Human Steps Remaining (documented for plan 06-06)

The following steps cannot be automated and are documented for the 06-06 checkpoint:
1. Add URL scheme entry to `ios/App/App/Info.plist`: key `CFBundleURLTypes` with scheme `app.joinlegacy`
2. Register `app.joinlegacy://auth-callback` as allowed redirect URL in Supabase dashboard → Auth → URL Configuration

## Self-Check: PASSED

- src/components/NativeAuthHandler.tsx: FOUND
- src/app/page.tsx: FOUND (contains isNativePlatform + app.joinlegacy)
- src/app/layout.tsx: FOUND (contains NativeAuthHandler)
- Commits: 9cc1f14, 786cb2a, 7f8097b — all verified in git log
