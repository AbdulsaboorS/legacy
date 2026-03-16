---
phase: 02-ai-web-flow-fixes
plan: "01"
subsystem: database
tags: [migration, types, habit-plans, rls, rpc]
dependency_graph:
  requires: []
  provides: [habit_plans-table, save_habit_plan-rpc, HabitPlan-type, DailyAction-type]
  affects: [02-02, 02-03]
tech_stack:
  added: []
  patterns: [SECURITY DEFINER RPC, append-only versioning, partial index, RLS]
key_files:
  created:
    - supabase/migrations/20260316_habit_plans.sql
    - .planning/phases/02-ai-web-flow-fixes/02-01-SUMMARY.md
  modified:
    - src/lib/types.ts
decisions:
  - "Append-only versioning: is_active flag archives old rows rather than DELETE, preserving full plan history"
  - "SECURITY DEFINER RPC for atomic archive+insert: prevents two active rows without relying on application-level transactions"
  - "COALESCE(MAX(version), 0) + 1 ensures version numbering starts at 1 for the first plan with no prior rows"
  - "Explicit ownership check inside SECURITY DEFINER: RLS bypassed inside definer context, so manual habits.user_id check required"
  - "HabitPlan reuses ActionableStep and WeekEntry types: avoids duplication and keeps AI plan shape consistent with existing habit fields"
metrics:
  duration: "4 minutes"
  completed_date: "2026-03-16"
  tasks_completed: 2
  files_changed: 2
---

# Phase 2 Plan 01: habit_plans Migration and TypeScript Foundation Summary

**One-liner:** Append-only habit_plans table with SECURITY DEFINER atomic-save RPC and HabitPlan/DailyAction TypeScript types.

## What Was Built

### Task 1: habit_plans migration (supabase/migrations/20260316_habit_plans.sql)

- `habit_plans` table with UUID primary key, `habit_id` and `user_id` foreign keys (CASCADE on delete), `is_active` boolean, `version` integer, `core_philosophy` text, and three JSONB columns (`actionable_steps`, `weekly_roadmap`, `daily_actions`)
- Two indexes: `idx_habit_plans_habit_active` (partial index on `is_active = true` for fast active-plan lookup) and `idx_habit_plans_habit_created` (for plan history ordered by recency)
- Three RLS policies on `habit_plans` (SELECT, INSERT, UPDATE) — no DELETE policy enforces append-only invariant
- `save_habit_plan` SECURITY DEFINER plpgsql function that atomically archives all prior active plans and inserts a new versioned active plan using `COALESCE(MAX(version), 0) + 1`

### Task 2: TypeScript types (src/lib/types.ts)

- `DailyAction` interface: `day` (1-28), `action` (string), `tip` (string)
- `HabitPlan` interface: mirrors habit_plans table row, with `daily_actions: DailyAction[]`, `actionable_steps: ActionableStep[] | null`, `weekly_roadmap: WeekEntry[] | null`, and `created_at: string` (ISO string for frontend day-N-of-28 computation)

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Append-only with is_active flag | Full plan history preserved; never lose a version |
| SECURITY DEFINER RPC for save | Atomic archive+insert in one DB transaction; no race window |
| Explicit ownership check in RPC | SECURITY DEFINER bypasses RLS — must check habits.user_id manually |
| COALESCE(MAX(version), 0) + 1 | Correctly starts at version 1 when no prior rows exist |
| HabitPlan reuses ActionableStep/WeekEntry | DRY — plan shape matches existing habit fields exactly |

## Verification

- Migration file: contains `CREATE TABLE IF NOT EXISTS habit_plans`, `save_habit_plan`, and `COALESCE(MAX(version), 0)` — PASS
- TypeScript: `npx tsc --noEmit --skipLibCheck` exits 0 with no new errors — PASS
- Both `DailyAction` and `HabitPlan` exported from `src/lib/types.ts` — PASS

## Pending (Not This Plan)

- Apply migration to Supabase: `supabase db push` or paste into SQL Editor
- After applying: verify `SELECT * FROM habit_plans LIMIT 1;` returns empty set cleanly

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Hash | Task | Description |
|------|------|-------------|
| d531e57 | Task 1 | feat(02-01): create habit_plans migration with RLS and save_habit_plan RPC |
| 627f333 | Task 2 | feat(02-01): add DailyAction and HabitPlan types to src/lib/types.ts |

## Self-Check: PASSED

- [x] supabase/migrations/20260316_habit_plans.sql — exists
- [x] src/lib/types.ts — DailyAction and HabitPlan appended
- [x] Commit d531e57 — exists
- [x] Commit 627f333 — exists
- [x] TypeScript compile — PASS
