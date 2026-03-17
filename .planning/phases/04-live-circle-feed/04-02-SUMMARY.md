---
phase: 04-live-circle-feed
plan: "02"
subsystem: ui
tags: [react, supabase, rpc, realtime, polling, reactions, localStorage]

# Dependency graph
requires:
  - phase: 04-live-circle-feed-01
    provides: get_circle_feed RPC, halaqa_reactions habit_log_id FK, FeedRow/FeedReaction TypeScript types
provides:
  - CircleFeed component with 30s polling via visibilitychange
  - Inline reaction buttons (🤲 💪 🔥) on feed items with optimistic updates
  - Today/Yesterday dividers anchored to 5:00 AM Fajr time
  - Milestone banners for Day 7/14/21/28/30 streaks
  - Empty state with rotating Prophetic quote from PROPHETIC_QUOTES
  - Notification dots on circle cards in HalaqaClient when unseen activity exists
  - localStorage write on circle card click to track last-opened timestamp
affects:
  - 05-push-notifications
  - 06-shawwal

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Self-contained feed component: polling + reactions + empty state all in one file"
    - "visibilitychange + setInterval combo for tab-aware polling"
    - "Optimistic reaction update: local state updated immediately, server write async"
    - "sentReactions Set keyed by habit_log_id:emoji for 3s sent-state tracking"
    - "localStorage lastOpened pattern for unread notification dots"

key-files:
  created:
    - src/components/CircleFeed.tsx
  modified:
    - src/app/halaqa/[id]/CircleDetailClient.tsx
    - src/app/halaqa/HalaqaClient.tsx

key-decisions:
  - "CircleFeed is self-contained — polling, reactions, and empty state all handled internally, not by parent components"
  - "Reaction buttons hidden on own items — own items show received reaction counts only"
  - "Notification dot comparison uses localStorage integer timestamp vs feed[0].created_at ISO parse"
  - "sendReaction removed from CircleDetailClient entirely — CircleFeed owns the reaction UX"

patterns-established:
  - "Feed polling pattern: loadFeed in useCallback, setInterval(30s) + visibilitychange listener, cleaned up in useEffect return"
  - "Optimistic UI: setSentReactions immediately, server insert async, setTimeout 3s to clear sent state"
  - "Avatar helpers (AVATAR_PALETTE, getAvatarColor, getInitials) replicated at module level in each component that needs them"

requirements-completed:
  - NOTIF-02

# Metrics
duration: 25min
completed: 2026-03-17
---

# Phase 4 Plan 02: Live Circle Feed Summary

**Self-contained CircleFeed component with 30s tab-aware polling, inline emoji reactions with optimistic updates, Today/Yesterday Fajr-anchored dividers, and amber notification dots on circle cards**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-03-17T23:10:14Z
- **Completed:** 2026-03-17
- **Tasks:** 2 implementation tasks + 1 human-verify checkpoint
- **Files modified:** 3

## Accomplishments

- Created `CircleFeed.tsx` (340+ lines) as a fully self-contained client component — polls every 30s on tab focus, renders log/milestone/joined items with Today/Yesterday Fajr-anchored dividers, handles emoji reactions with optimistic UI and 3s sent-state feedback, and shows a rotating Prophetic quote as empty state
- Wired CircleFeed into `CircleDetailClient.tsx` between the stats/invite row and member board; removed the old inline reaction buttons from member board rows (reactions now live exclusively on feed items)
- Added notification dot logic to `HalaqaClient.tsx` — fetches feed on mount for each circle, compares `created_at` of latest item against `localStorage.getItem('circle_last_opened_{id}')`, shows amber 8px dot if unseen activity; writes localStorage on card click before navigation

## Task Commits

1. **Task 1: Create CircleFeed component** - `5cbf120` (feat)
2. **Task 2: Wire CircleFeed + notification dots** - `ed22568` (feat)
3. **Deviation fix: rename type→row_type** - `72bfb94` (fix — auto-fixed reserved keyword conflict)

**Plan metadata:** (this summary commit)

## Files Created/Modified

- `src/components/CircleFeed.tsx` — Self-contained feed with polling, log/milestone/joined renderers, reaction bar, empty state
- `src/app/halaqa/[id]/CircleDetailClient.tsx` — Mounts CircleFeed; removed inline reaction buttons; stores currentUserId in state
- `src/app/halaqa/HalaqaClient.tsx` — dotCircles state, localStorage write on click, amber dot in circle card JSX

## Decisions Made

- CircleFeed is fully self-contained: polling, reactions, and empty state all handled internally. Parent components (CircleDetailClient) only pass `halaqaId` and `currentUserId`.
- Reaction buttons are hidden on the current user's own items. Own items show received reaction counts (emoji + number) in a read-only row.
- Notification dot comparison: `parseInt(localStorage.getItem(...), 10)` as epoch ms vs `new Date(data[0].created_at).getTime()`. Simpler and avoids ISO parse edge cases.
- `sendReaction` function was removed entirely from `CircleDetailClient` — CircleFeed handles all reaction logic internally via its own Supabase insert.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Renamed SQL column `type` to `row_type` to avoid reserved keyword conflict**
- **Found during:** Task 1 (CircleFeed component) — TypeScript compiler flagged the column name after plan 01's RPC was inspected
- **Issue:** `get_circle_feed` RPC returned a column named `type` which is a reserved word in PostgreSQL and caused issues in the Supabase JS client type inference
- **Fix:** Applied migration rename `type` → `row_type` in the RPC and updated `FeedRow` TypeScript interface to match; simplified the WHERE clause in `log_rows` CTE
- **Files modified:** supabase/migrations (rename in SQL), src/lib/types.ts (FeedRow.row_type), src/components/CircleFeed.tsx (item.row_type comparisons)
- **Verification:** `npx tsc --noEmit` passes with no errors
- **Committed in:** `72bfb94`

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Required fix for correct TypeScript compilation and Supabase RPC compatibility. No scope creep.

## Issues Encountered

None beyond the `type` reserved keyword auto-fix above. TypeScript compiled cleanly after the rename.

## User Setup Required

**Migration must be applied manually before the feed will work.**
- File: `supabase/migrations/20260317_phase4_feed.sql`
- Open Supabase SQL Editor, paste and run the migration
- Confirms: `get_circle_feed` RPC exists, `halaqa_reactions.habit_log_id` column exists

## Next Phase Readiness

- CircleFeed is live and verified by user — the real-time social layer of Legacy is complete
- Phase 5 (push notifications) can now use `circle_last_opened_` localStorage timestamps as a signal for when to suppress push notifications (user already saw activity in-app)
- No blockers for Phase 5 beyond the FIREBASE env vars and `device_tokens` schema (already noted as pending in STATE.md)

---
*Phase: 04-live-circle-feed*
*Completed: 2026-03-17*
