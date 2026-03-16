---
phase: 01-circles-ui
plan: 01
subsystem: ui
tags: [react, supabase, next.js, halaqa, circles, avatar]

# Dependency graph
requires: []
provides:
  - Circle card list UI in My Circles tab (name, X/Y done today, AvatarStack)
  - AvatarStack component with 4-color palette, overlap layout, overflow badge
  - loadCircleCardData querying halaqa_members + habit_logs for per-card stats
  - sessionStorage-based tab initialization for back-navigation from detail page
  - /halaqa route protection in middleware (covers /halaqa/[id] via startsWith)
  - createPrivateGroup and joinLobby navigate directly to /halaqa/[id] on success
affects:
  - 01-02 (detail page — receives navigation from these cards, sets sessionStorage on back)
  - 01-03 (join flow — same navigation pattern)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - sessionStorage one-shot tab init — set by detail page before router.push, consumed and deleted on HalaqaClient mount
    - RLS propagation fallback — for newly created circles, memberCount defaults to 1/0 since halaqa_members row may not be readable immediately
    - AvatarStack overlap — marginLeft: -8px + zIndex: visible.length - i + position: relative for correct stacking order

key-files:
  created: []
  modified:
    - src/app/halaqa/HalaqaClient.tsx
    - src/middleware.ts

key-decisions:
  - "sessionStorage over useSearchParams for tab init — avoids Suspense boundary requirement in Next.js App Router client components"
  - "loadCircleCardData runs per-halaqa in parallel via Promise.all — acceptable N+1 for small circle counts (max 8 members, max ~10 circles per user)"
  - "Removed hasLoggedToday gate entirely from HalaqaClient — gate moves to detail page in plan 01-02"
  - "AvatarStack built as module-level component (not inside export default) — avoids React reconciliation issues with inline component definitions"

patterns-established:
  - "sessionStorage one-shot pattern: detail page sets key, list page consumes + deletes on mount"
  - "RLS propagation delay: newly created rows may not be readable immediately; construct object locally and use safe defaults in subsequent queries"

requirements-completed:
  - CIRCLE-03

# Metrics
duration: 6min
completed: 2026-03-16
---

# Phase 1 Plan 01: Circles UI — Circle Card List Summary

**My Circles tab refactored from pill selector + member grid + gate to a vertical circle card list with name, X/Y done today, and stacked avatars; /halaqa route protected in middleware**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-15T23:51:33Z
- **Completed:** 2026-03-16T04:37:14Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Replaced pill selector + inline member grid + habit-gate with a clean vertical circle card list in the My Circles tab
- Added AvatarStack component with deterministic color palette, overlap layout (marginLeft -8px), and +N overflow badge
- Added loadCircleCardData that queries halaqa_members and habit_logs per circle and builds card summary data, with graceful fallback for RLS propagation delay on newly created circles
- Wired createPrivateGroup and joinLobby to navigate directly to the detail page on success
- Added sessionStorage-based tab initialization so the detail page (plan 01-02) can restore My Circles tab on back navigation
- Added /halaqa to middleware protectedPaths, protecting both /halaqa and /halaqa/[id] via startsWith

## Task Commits

1. **Task 1: Add AvatarStack + CircleCardData + loadCircleCardData** - `8ef9c69` (feat)
2. **Task 2: Replace Mine tab UI + protect /halaqa in middleware** - `ac3dfb1` (feat)

## Files Created/Modified

- `src/app/halaqa/HalaqaClient.tsx` — Refactored: removed pill selector, gate, member list, invite banner, sendReaction, copyInviteLink, activeHalaqaId, members, hasLoggedToday; added AvatarStack, CircleCardData, circleCards state, loadCircleCardData, circle card list UI, sessionStorage tab init
- `src/middleware.ts` — Added "/halaqa" to protectedPaths array

## Decisions Made

- **sessionStorage over useSearchParams** for tab init — useSearchParams requires a Suspense boundary in Next.js App Router; sessionStorage is simpler and avoids that requirement entirely
- **Removed hasLoggedToday gate from HalaqaClient** — the gate (complete your habits first) moves to the detail page in plan 01-02 where it belongs contextually
- **AvatarStack as module-level component** — defined above the default export to avoid React reconciling it as a new component type on each render
- **Promise.all for loadCircleCardData** — queries all circles in parallel; acceptable for typical circle counts (max ~10 per user)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused MemberWithStreak interface and useTheme import**
- **Found during:** Task 1 lint verification
- **Issue:** MemberWithStreak interface was carried over from old code but no longer used after member list removal; useTheme was imported but theme was only referenced in the old sendReaction button styling (now removed)
- **Fix:** Deleted MemberWithStreak interface and removed useTheme import + usage
- **Files modified:** src/app/halaqa/HalaqaClient.tsx
- **Verification:** `npx eslint src/app/halaqa/HalaqaClient.tsx` returns no output (clean)
- **Committed in:** 8ef9c69 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - unused code cleanup)
**Impact on plan:** Necessary correctness fix. No scope creep.

## Issues Encountered

- Pre-existing lint errors in DashboardClient.tsx, SettingsClient.tsx, ThemeProvider.tsx (react-hooks/set-state-in-effect) — these are out of scope for this plan. Logged to `.planning/phases/01-circles-ui/deferred-items.md`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- My Circles tab ships circle cards; tapping a card routes to /halaqa/[id] (returns 404 until plan 01-02)
- Detail page (plan 01-02) must: set sessionStorage("halaqaTab", "mine") before router.push("/halaqa") on back; implement the habit-gate that was removed from HalaqaClient; show member list and invite banner
- /halaqa middleware protection is in place and verified via build

---
*Phase: 01-circles-ui*
*Completed: 2026-03-16*
