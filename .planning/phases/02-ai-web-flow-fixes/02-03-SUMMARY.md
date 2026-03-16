---
phase: 02-ai-web-flow-fixes
plan: "03"
subsystem: api
tags: [habit-plans, supabase-rpc, next-api-routes, node-runtime]
dependency_graph:
  requires: [02-01]
  provides: [save-habit-plan-api, list-habit-plans-api]
  affects: [frontend-plan-approval-flow, dashboard-plan-display]
tech_stack:
  added: []
  patterns: [supabase-rpc-call, node-api-route, created_at-desc-ordering]
key_files:
  created:
    - src/app/api/ai/plan/save/route.ts
    - src/app/api/ai/plan/list/route.ts
  modified: []
decisions:
  - "Save route calls save_habit_plan RPC (not multi-step UPDATE+INSERT) for atomic archival"
  - "List route relies on RLS for user isolation — no explicit user_id filter needed"
  - "Both routes use Node runtime (createClient from @/lib/supabase/server, uses next/headers)"
metrics:
  duration: "2min"
  completed_date: "2026-03-16"
  tasks_completed: 2
  files_created: 2
---

# Phase 02 Plan 03: AI Plan Save and List Routes Summary

**One-liner:** Two Node.js API routes — POST /api/ai/plan/save (atomic RPC-based plan versioning) and GET /api/ai/plan/list (plan history ordered newest-first).

## What Was Built

### Task 1: POST /api/ai/plan/save
- `src/app/api/ai/plan/save/route.ts` — Node runtime, 401 auth guard before any DB access
- Validates `habitId` and `plan` body (400 if missing)
- Calls `supabase.rpc("save_habit_plan", {...})` with camelCase-to-snake_case field mapping
- Nullish coalescing (`?? null`, `?? []`) for all optional plan fields
- Returns the saved `habit_plans` row on success; 500 JSON on RPC error

### Task 2: GET /api/ai/plan/list
- `src/app/api/ai/plan/list/route.ts` — Node runtime, 401 auth guard before any DB access
- Validates `habitId` query param (400 if missing)
- Queries `habit_plans` table with `.select("*").eq("habit_id", habitId).order("created_at", { ascending: false })`
- RLS on `habit_plans` ensures users see only their own rows
- Returns full rows including `daily_actions` JSONB so frontend can compute day N of 28

## Verification

- `ls src/app/api/ai/plan/` — four directories: generate/, refine/, save/, list/
- `npx tsc --noEmit --skipLibCheck` — exits 0 (no errors)
- `npm run build` — exits 0; all four `/api/ai/plan/*` routes visible in output

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1    | 263e2bb | feat(02-03): create /api/ai/plan/save Node route |
| 2    | 69b3769 | feat(02-03): create /api/ai/plan/list Node route |

## Self-Check: PASSED

- [x] `src/app/api/ai/plan/save/route.ts` — exists, verified
- [x] `src/app/api/ai/plan/list/route.ts` — exists, verified
- [x] Commit 263e2bb — exists
- [x] Commit 69b3769 — exists
- [x] Build passes cleanly
