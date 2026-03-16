---
phase: 02-ai-web-flow-fixes
plan: "02"
subsystem: ai-api
tags: [edge-runtime, streaming, gemini, sse, habit-plan]
dependency_graph:
  requires: [02-01]
  provides: [generate-route, refine-route]
  affects: [frontend-plan-flow]
tech_stack:
  added: []
  patterns: [Edge-SSE-streaming, generateContentStream, SSE-DONE-sentinel]
key_files:
  created:
    - src/app/api/ai/plan/generate/route.ts
    - src/app/api/ai/plan/refine/route.ts
  modified: []
decisions:
  - "No responseMimeType application/json — breaks streaming; plain text prompt output instead"
  - "habitId passed through generate route but not used in prompt — frontend needs it for /save call"
  - "Both routes stream-only, no DB writes — frontend calls /save after user approval"
metrics:
  duration: "~2 min"
  completed_date: "2026-03-16"
  tasks_completed: 2
  files_created: 2
---

# Phase 02 Plan 02: AI Plan Generate + Refine Streaming Routes Summary

**One-liner:** Two Edge SSE routes streaming 28-day Islamic habit plans via gemini-2.0-flash with 401 auth guards and [DONE] sentinel framing.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create /api/ai/plan/generate streaming Edge route | 86076c1 | src/app/api/ai/plan/generate/route.ts |
| 2 | Create /api/ai/plan/refine streaming Edge route | 1f11991 | src/app/api/ai/plan/refine/route.ts |

## What Was Built

### generate route (`src/app/api/ai/plan/generate/route.ts`)
- Edge runtime with `request.cookies.getAll()` auth (no `next/headers` import)
- Returns 401 JSON before any Gemini call for unauthenticated requests
- Accepts `{ habitId, habitName, ramadanAmount, acceptedAmount, gender }` in body
- 400 validation: `habitId` and `habitName` required; `habitId` passed through for frontend `/save` call
- Prompt explicitly requires all 28 `dailyActions` entries with ≤80 char actions and ≤100 char tips
- Streams via `model.generateContentStream` with SSE `data: {...}\n\n` framing
- Ends with `data: [DONE]\n\n` sentinel

### refine route (`src/app/api/ai/plan/refine/route.ts`)
- Same Edge runtime + auth pattern as generate route
- Accepts `{ habitId, currentPlan, refinementMessage }` in body
- 400 validation: all three fields required
- Includes full `currentPlan` JSON in Gemini prompt as context
- Prompt requires all 28 `dailyActions` entries in revised output
- Same SSE framing and [DONE] sentinel

## Decisions Made

1. No `responseMimeType: "application/json"` — this flag breaks streaming with `generateContentStream`. Output format enforced via prompt instruction only.
2. `habitId` is accepted by generate route but not used in the Gemini prompt — it's passed through so the frontend can associate the generated plan with the correct habit when calling `/save`.
3. Both routes are stream-only — no DB writes occur here. The frontend collects the streamed JSON and calls a separate `/save` endpoint after user approves the plan.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `src/app/api/ai/plan/generate/route.ts` exists
- [x] `src/app/api/ai/plan/refine/route.ts` exists
- [x] Both export `runtime = "edge"` and `POST`
- [x] Neither imports from `next/headers`
- [x] Both use `model.generateContentStream`
- [x] SSE response has `Content-Type: text/event-stream`
- [x] Stream ends with `data: [DONE]\n\n`
- [x] TypeScript compiles cleanly (`npx tsc --noEmit --skipLibCheck`)
- [x] Task commits exist: 86076c1, 1f11991
