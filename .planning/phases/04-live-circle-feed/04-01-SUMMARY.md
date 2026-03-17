---
phase: 04-live-circle-feed
plan: "01"
subsystem: database
tags: [supabase, postgres, rpc, security-definer, typescript]

# Dependency graph
requires:
  - phase: 03-ai-plan-generation
    provides: habit_logs, habits, streaks schema — queried by get_circle_feed
  - phase: 01-circles-ui
    provides: halaqa_members, halaqa_reactions, profiles tables

provides:
  - get_circle_feed(p_halaqa_id) SECURITY DEFINER RPC returning log/milestone/joined rows
  - habit_log_id nullable FK column on halaqa_reactions
  - FeedRow and FeedReaction TypeScript interfaces
affects:
  - 04-02 (CircleFeed component calls get_circle_feed RPC)
  - any future notification or analytics phase reading feed events

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SECURITY DEFINER RPC with auth.uid() membership guard bypasses RLS safely
    - CTE UNION ALL pattern for heterogeneous feed row types
    - JSONB aggregation for embedded reaction counts (avoids N+1 on frontend)

key-files:
  created:
    - supabase/migrations/20260317_phase4_feed.sql
  modified:
    - src/lib/types.ts

key-decisions:
  - "MIN(hl.id) as habit_log_id per (user_id, date) group — representative log id for reactions, deterministic"
  - "Reactions aggregated inside RPC as JSONB — frontend gets ready-to-render counts, no extra query"
  - "habit_log_id FK is nullable ON DELETE SET NULL — preserves pre-Phase-4 reactions with no log context"
  - "SECURITY DEFINER + explicit membership check — secure cross-RLS read without exposing all habit_logs"

patterns-established:
  - "Feed RPC: SECURITY DEFINER + membership guard = safe cross-user data access pattern for circle features"
  - "CTE UNION ALL for polymorphic feed rows: each row type in its own CTE, unioned in final SELECT"

requirements-completed: [NOTIF-02]

# Metrics
duration: 2min
completed: 2026-03-17
---

# Phase 4 Plan 01: Live Circle Feed — Database Primitives Summary

**SECURITY DEFINER get_circle_feed RPC delivering 48hr log/milestone/joined feed rows with embedded JSONB reaction counts, plus habit_log_id FK on halaqa_reactions**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-17T23:07:59Z
- **Completed:** 2026-03-17T23:09:12Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created migration adding nullable habit_log_id FK to halaqa_reactions with ON DELETE SET NULL
- Implemented get_circle_feed SECURITY DEFINER RPC with four CTEs (log_rows, milestone_rows, joined_rows, reaction_counts) returning time-sorted feed
- Added FeedRow and FeedReaction TypeScript interfaces to types.ts matching RPC output exactly
- Extended HalaqaReaction interface with optional habit_log_id field

## Task Commits

Each task was committed atomically:

1. **Task 1: Write migration — habit_log_id FK + get_circle_feed RPC** - `f07aff1` (feat)
2. **Task 2: Add FeedRow and FeedReaction TypeScript interfaces** - `f6ae5cb` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified
- `supabase/migrations/20260317_phase4_feed.sql` - Migration adding habit_log_id FK + get_circle_feed RPC with GRANT EXECUTE
- `src/lib/types.ts` - Added FeedReaction, FeedRow interfaces; extended HalaqaReaction with optional habit_log_id

## Decisions Made
- MIN(hl.id) chosen as the representative habit_log_id per (user_id, date) group — deterministic and stable for reaction targeting
- Reaction counts embedded in RPC output as JSONB to avoid N+1 queries on the frontend
- habit_log_id FK is nullable so existing halaqa_reactions rows (pre-Phase-4) remain valid without backfilling

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

**Migration must be applied manually before Plan 02 can run.**

Apply `supabase/migrations/20260317_phase4_feed.sql` in the Supabase SQL Editor or via:
```bash
supabase db push
```

Verify by running in SQL Editor:
```sql
SELECT routine_name FROM information_schema.routines WHERE routine_name = 'get_circle_feed';
```

## Next Phase Readiness
- get_circle_feed RPC is ready for Plan 02 (CircleFeed component) once migration is applied
- FeedRow and FeedReaction types are exported and ready for import in frontend components
- Migration must be applied in Supabase before Plan 02 executes

---
*Phase: 04-live-circle-feed*
*Completed: 2026-03-17*
