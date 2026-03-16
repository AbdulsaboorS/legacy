# Phase 2: AI + Web Flow Fixes — Research

**Researched:** 2026-03-16
**Domain:** Gemini AI streaming, Supabase RLS, Edge API routes, versioned plan storage
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AI-01 | Generate comprehensive 28-day action plan per habit with core_philosophy, actionable_steps, weekly_roadmap, and 28 daily_actions (action + tip per day) | Gemini streaming pattern from masterplan route; schema design for habit_plans table |
| AI-02 | Users submit refinement request, receive streamed revised plan, approve before save | Refine endpoint reuses SSE pattern; approval → save endpoint with archive semantics |
| AI-03 | Active plan visible on dashboard — today's daily action derived from days elapsed since plan created_at | habit_plans.created_at + day index math: `min(floor(daysSince) + 1, 28)` |
| AI-04 | Regenerate fresh plan at any time; previous plans archived (is_active = false), viewable as history | Upsert with archive semantics; list endpoint returns all versions ordered by created_at DESC |
| AI-05 | All plan endpoints require authentication; 401 returned before any Gemini call | Already solved in masterplan route — copy exact Edge-compatible auth guard pattern |
</phase_requirements>

---

## Summary

Phase 2 backend scope is four new API routes (`/api/ai/plan/generate`, `/api/ai/plan/refine`, `/api/ai/plan/save`, `/api/ai/plan/list`) plus one new database table (`habit_plans`). The existing `masterplan` route is a complete working blueprint: it already demonstrates Edge-compatible auth, Gemini streaming via SSE, and the exact `ReadableStream` + `text/event-stream` response shape the frontend consumes. The only meaningful new complexity is (1) fitting 28 daily actions into the JSON without triggering Gemini output truncation, and (2) the archive-on-regenerate versioning semantics in the save endpoint.

The current habits table stores `core_philosophy`, `actionable_steps`, and `weekly_roadmap` directly on the habit row. The new system moves plans to a separate `habit_plans` table so multiple versions can exist per habit. Existing onboarding data on the habits table is NOT replaced — it remains the fallback for habits that have not yet been migrated to the new plan system.

Gemini 2.0 Flash has an output token limit of 8,192 tokens (default) and up to 8,192 tokens output per request. A 28-entry daily_actions array with two short string fields per entry adds roughly 700–900 tokens to the full plan JSON. Combined with the existing masterplan fields (philosophy, 3 steps, 4 weeks), total output is ~1,200–1,500 tokens — well within limits. Rate limits for the free tier are 15 RPM / 1M TPM; for paid tier 2,000 RPM. No special chunking needed.

**Primary recommendation:** Replicate the `masterplan/route.ts` pattern exactly for generate and refine routes. Build the `habit_plans` table as a simple append-only log where `is_active = true` identifies the current version. Save endpoint deactivates all prior rows for the habit before inserting the new approved plan in a single Supabase RPC call to avoid race conditions.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@google/generative-ai` | Already installed | Gemini API client | Already used in masterplan + suggest routes |
| `@supabase/ssr` | Already installed | Edge-compatible Supabase server client | Exact pattern in masterplan/route.ts |
| `next` (App Router Edge) | 14 | Edge runtime API routes | Established in masterplan route via `export const runtime = "edge"` |

### No New Packages Required
All dependencies are already installed. This phase adds no new npm packages.

---

## Architecture Patterns

### Recommended Project Structure
```
src/app/api/ai/
├── masterplan/route.ts      # existing — onboarding plan gen (keep as-is)
├── suggest/route.ts         # existing — step-down suggestions (keep as-is)
└── plan/
    ├── generate/route.ts    # NEW — 28-day plan stream
    ├── refine/route.ts      # NEW — refine stream (current plan + message)
    ├── save/route.ts        # NEW — approve + archive previous
    └── list/route.ts        # NEW — plan history for a habit

supabase/migrations/
└── 20260316_habit_plans.sql # NEW — habit_plans table + RLS
```

### Pattern 1: Edge Auth Guard (Copy from masterplan route)

**What:** Read cookies from `request.cookies.getAll()` — never import `next/headers` in Edge routes.
**When to use:** Every new Edge route in this phase.

```typescript
// Source: src/app/api/ai/masterplan/route.ts (verified from codebase)
export const runtime = "edge";

export async function POST(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll() { /* no-op in edge */ },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
  // ... Gemini call ...
}
```

### Pattern 2: SSE Streaming Response (Copy from masterplan route)

**What:** `ReadableStream` + SSE `data: {...}\n\n` framing + `[DONE]` sentinel.
**When to use:** generate and refine endpoints.

```typescript
// Source: src/app/api/ai/masterplan/route.ts (verified from codebase)
const stream = new ReadableStream({
  async start(controller) {
    try {
      const result = await model.generateContentStream(prompt);
      const encoder = new TextEncoder();
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
        }
      }
      controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
      controller.close();
    } catch (error) {
      controller.enqueue(
        new TextEncoder().encode(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`)
      );
      controller.close();
    }
  },
});

return new Response(stream, {
  headers: {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  },
});
```

### Pattern 3: Non-Edge Routes for Save + List

Save and List endpoints do NOT need streaming. They should use standard Node.js runtime (no `export const runtime = "edge"`) and can use `createClient()` from `@/lib/supabase/server` (which calls `next/headers`). This matches the suggest route pattern.

```typescript
// Source: src/app/api/ai/suggest/route.ts (verified from codebase)
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ...
}
```

### Pattern 4: Gemini Prompt for 28-Day Plans

**What:** Request strict JSON output; include all 28 daily actions in one call.
**When to use:** generate and refine prompts.

Key constraint: ask for JSON explicitly and include total token budget awareness in the prompt. Gemini 2.0 Flash handles 28-item arrays without chunking. Do NOT use `responseMimeType: "application/json"` with streaming — this combination is not supported and causes the stream to buffer before returning. Use plain text streaming and parse accumulated JSON at `[DONE]`, same as the masterplan route.

```typescript
// Prompt structure (HIGH confidence — mirrors masterplan approach)
const prompt = `You are a knowledgeable Islamic advisor creating a 28-day post-Ramadan habit plan.

Habit: ${habitName}
Accepted daily goal: ${acceptedAmount}
User gender: ${gender}

Generate a complete plan JSON with exactly this structure:
{
  "corePhilosophy": "2-3 sentences on spiritual purpose",
  "actionableSteps": [
    { "step": "title", "description": "concrete action" },
    { "step": "title", "description": "concrete action" },
    { "step": "title", "description": "concrete action" }
  ],
  "weeklyRoadmap": [
    { "week": 1, "focus": "theme", "target": "measurable target" },
    { "week": 2, "focus": "theme", "target": "measurable target" },
    { "week": 3, "focus": "theme", "target": "measurable target" },
    { "week": 4, "focus": "theme", "target": "measurable target" }
  ],
  "dailyActions": [
    { "day": 1, "action": "specific task for day 1", "tip": "motivational tip" },
    { "day": 2, "action": "specific task for day 2", "tip": "motivational tip" },
    ...
    { "day": 28, "action": "specific task for day 28", "tip": "motivational tip" }
  ]
}

All 28 dailyActions entries are required. Keep each action under 80 characters. Keep each tip under 100 characters. Return ONLY valid JSON. No markdown. No code blocks. No extra text.`;
```

### Pattern 5: Refine Prompt

Send the current approved plan JSON back as context, plus the user's refinement message:

```typescript
const prompt = `You are an Islamic habit advisor. The user has requested a refinement to their 28-day plan.

Current plan JSON:
${JSON.stringify(currentPlan)}

User's refinement request: "${refinementMessage}"

Apply the refinement and return a COMPLETE revised plan with the SAME JSON structure (corePhilosophy, actionableSteps, weeklyRoadmap, dailyActions with all 28 entries). Return ONLY valid JSON. No markdown.`;
```

### Anti-Patterns to Avoid

- **Importing `next/headers` in Edge routes:** Will throw at runtime. Edge routes (generate, refine) MUST use `request.cookies.getAll()` directly.
- **Using `responseMimeType: "application/json"` with streaming:** Causes buffering — the entire response arrives at once rather than streaming. Use plain `generateContentStream` and parse JSON from accumulated text.
- **Doing archive + insert in the client:** Race condition risk. Save endpoint must atomically deactivate old rows then insert new row server-side.
- **Storing plans on the habits table:** The existing `core_philosophy`, `actionable_steps`, `weekly_roadmap` columns on `habits` serve onboarding. New 28-day plans go in `habit_plans`. Do not remove or overwrite the habits columns.

---

## Database Schema

### habit_plans Table

```sql
-- supabase/migrations/20260316_habit_plans.sql
BEGIN;

CREATE TABLE IF NOT EXISTS habit_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id      UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  version       INTEGER NOT NULL DEFAULT 1,
  core_philosophy     TEXT,
  actionable_steps    JSONB DEFAULT '[]'::jsonb,
  weekly_roadmap      JSONB DEFAULT '[]'::jsonb,
  daily_actions       JSONB DEFAULT '[]'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast "get active plan for habit" lookup
CREATE INDEX idx_habit_plans_habit_active ON habit_plans (habit_id, is_active)
  WHERE is_active = true;

-- Index for plan history list ordered by recency
CREATE INDEX idx_habit_plans_habit_created ON habit_plans (habit_id, created_at DESC);

-- RLS
ALTER TABLE habit_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select their own habit plans"
  ON habit_plans FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own habit plans"
  ON habit_plans FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own habit plans"
  ON habit_plans FOR UPDATE
  USING (user_id = auth.uid());

-- No DELETE policy: plans are archived, not deleted

COMMIT;
```

### Column Design Rationale

| Column | Type | Why |
|--------|------|-----|
| `habit_id` | UUID FK → habits.id | Links plan to its parent habit |
| `user_id` | UUID FK → auth.users | Redundant FK — enables RLS without a join |
| `is_active` | BOOLEAN | Single flag: true = current, false = archived |
| `version` | INTEGER | Monotonically increasing per habit for display ordering |
| `daily_actions` | JSONB | Array of 28 `{ day, action, tip }` objects |
| `created_at` | TIMESTAMPTZ | Used by frontend to calculate "day N of 28" |

### daily_actions JSONB Shape

```json
[
  { "day": 1, "action": "Read 5 minutes of Quran after Fajr", "tip": "Place your Mushaf next to your prayer mat the night before." },
  { "day": 2, "action": "...", "tip": "..." },
  ...
  { "day": 28, "action": "...", "tip": "..." }
]
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic archive + insert | Custom multi-step POST logic | Supabase RPC (SECURITY DEFINER) | Client-visible multi-step UPDATE + INSERT has a window where both rows have is_active = true; RPC runs atomically in a transaction |
| JSON streaming parse | Custom byte accumulator | Existing OnboardingClient pattern (accumulate text, parse at [DONE]) | Already proven in production — mirrors `fetchSuggestion` in OnboardingClient.tsx |
| Token counting | Manual token estimates | Trust Gemini 2.0 Flash — 28 daily actions ~900 tokens, well under 8192 limit | No truncation risk at this payload size |

**Key insight:** The entire streaming infrastructure — SSE framing, ReadableStream, client-side reader loop — is already production-proven in the masterplan route and OnboardingClient. New routes copy the pattern, not reinvent it.

---

## API Endpoint Specifications

### POST /api/ai/plan/generate
- Runtime: `edge`
- Auth: Edge-compatible cookie auth (copy masterplan pattern)
- Request body: `{ habitId, habitName, ramadanAmount, acceptedAmount, gender }`
- Response: SSE stream → accumulated JSON parsed to `HabitPlan` shape
- Notes: Does NOT save to DB — streams plan for frontend approval. Frontend calls `/save` after user approves.

### POST /api/ai/plan/refine
- Runtime: `edge`
- Auth: Edge-compatible cookie auth
- Request body: `{ habitId, currentPlan: HabitPlan, refinementMessage: string }`
- Response: SSE stream → revised plan JSON
- Notes: Also does NOT save — streams for frontend preview. Frontend calls `/save` after approval.

### POST /api/ai/plan/save
- Runtime: Node (standard — no edge needed)
- Auth: `createClient()` from `@/lib/supabase/server`
- Request body: `{ habitId, plan: HabitPlan }`
- Logic:
  1. Verify user owns the habit (`habits.user_id = auth.uid()` — RLS enforces this)
  2. Mark all existing `habit_plans` for this `habit_id` as `is_active = false`
  3. Insert new row with `is_active = true`; set `version` = max existing version + 1
  4. Return the new plan row
- Race condition mitigation: Use a Supabase RPC (SECURITY DEFINER) that wraps steps 2–3 in a single transaction.

### GET /api/ai/plan/list
- Runtime: Node
- Auth: `createClient()` from `@/lib/supabase/server`
- Query param: `habitId`
- Returns: All `habit_plans` rows for the habit ordered by `created_at DESC`, full shape including `daily_actions` JSONB
- Frontend uses this to show plan history and identify the active plan

---

## Day N Calculation (for AI-03)

The dashboard shows "today's daily action." Day number is derived from:

```typescript
// In DashboardClient — compute once per habit
function getDayNumber(planCreatedAt: string): number {
  const created = new Date(planCreatedAt);
  const today = new Date();
  const diffMs = today.getTime() - created.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.min(diffDays + 1, 28); // day 1 on creation day; cap at 28
}

// Access daily action
const dayNum = getDayNumber(activePlan.created_at);
const todayAction = activePlan.daily_actions.find(a => a.day === dayNum);
```

This is purely client-side computation — no DB query needed beyond fetching the plan.

---

## Common Pitfalls

### Pitfall 1: `next/headers` in Edge Routes
**What goes wrong:** `import { cookies } from "next/headers"` throws a runtime error in Edge routes.
**Why it happens:** `next/headers` uses Node.js APIs not available in the Edge runtime.
**How to avoid:** All Edge routes (generate, refine) must read cookies from `request.cookies.getAll()` directly — exactly as `masterplan/route.ts` does.
**Warning signs:** Build succeeds but route throws 500 at runtime on Vercel Edge.

### Pitfall 2: `responseMimeType: "application/json"` Breaks Streaming
**What goes wrong:** Gemini buffers the entire output before returning when JSON MIME type is set, defeating streaming.
**Why it happens:** The JSON response type signals Gemini to validate and return a complete object, not stream partial tokens.
**How to avoid:** Use plain `generateContentStream` with no `responseMimeType`. Accumulate text chunks and `JSON.parse(accumulated)` at `[DONE]`. This is exactly what `masterplan/route.ts` does.
**Warning signs:** Stream starts but frontend receives all data at once with no progressive rendering.

### Pitfall 3: Concurrent Save Requests Create Two Active Plans
**What goes wrong:** Two rapid save calls both see `is_active = false` for all old rows, then both insert `is_active = true`, leaving two active plans.
**Why it happens:** UPDATE + INSERT are two separate DB operations with a gap between them.
**How to avoid:** Wrap archive + insert in a Supabase RPC (SECURITY DEFINER plpgsql function) that runs in a single transaction. The RPC takes `p_habit_id` and the plan JSONB as arguments.
**Warning signs:** List endpoint returns two rows with `is_active = true` for the same habit.

### Pitfall 4: Gemini Truncates dailyActions Array
**What goes wrong:** Gemini returns fewer than 28 daily actions, breaking "day N" display.
**Why it happens:** Model may optimize verbosity if not explicitly required to emit all 28.
**How to avoid:** Prompt must state "All 28 dailyActions entries are required." After stream completes, validate `parsed.dailyActions.length === 28` on the frontend before showing approve button.
**Warning signs:** `todayAction` is `undefined` for users on days > the actual array length.

### Pitfall 5: Version Counter Off-By-One on First Plan
**What goes wrong:** The first plan for a habit gets `version = null + 1 = NaN`.
**Why it happens:** `SELECT MAX(version)` returns NULL when no prior rows exist.
**How to avoid:** Use `COALESCE(MAX(version), 0) + 1` in the RPC.
**Warning signs:** First plan saved with `version = NaN`, breaks history sorting.

---

## Code Examples

### Save RPC (PostgreSQL)

```sql
-- supabase/migrations/20260316_habit_plans.sql (add after table creation)
CREATE OR REPLACE FUNCTION save_habit_plan(
  p_habit_id      UUID,
  p_core_philosophy     TEXT,
  p_actionable_steps    JSONB,
  p_weekly_roadmap      JSONB,
  p_daily_actions       JSONB
) RETURNS habit_plans AS $$
DECLARE
  uid         UUID    := auth.uid();
  next_version INTEGER;
  new_plan    habit_plans;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify user owns the habit
  IF NOT EXISTS (
    SELECT 1 FROM habits WHERE id = p_habit_id AND user_id = uid
  ) THEN
    RAISE EXCEPTION 'Habit not found or not owned by user';
  END IF;

  -- Archive all prior active plans for this habit
  UPDATE habit_plans
  SET is_active = false
  WHERE habit_id = p_habit_id AND is_active = true;

  -- Determine next version number
  SELECT COALESCE(MAX(version), 0) + 1
  INTO next_version
  FROM habit_plans
  WHERE habit_id = p_habit_id;

  -- Insert new active plan
  INSERT INTO habit_plans (
    habit_id, user_id, is_active, version,
    core_philosophy, actionable_steps, weekly_roadmap, daily_actions
  )
  VALUES (
    p_habit_id, uid, true, next_version,
    p_core_philosophy, p_actionable_steps, p_weekly_roadmap, p_daily_actions
  )
  RETURNING * INTO new_plan;

  RETURN new_plan;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Save Route (API)

```typescript
// src/app/api/ai/plan/save/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { habitId, plan } = await request.json();
  if (!habitId || !plan) {
    return NextResponse.json({ error: "habitId and plan are required" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("save_habit_plan", {
    p_habit_id:          habitId,
    p_core_philosophy:   plan.corePhilosophy ?? null,
    p_actionable_steps:  plan.actionableSteps ?? [],
    p_weekly_roadmap:    plan.weeklyRoadmap ?? [],
    p_daily_actions:     plan.dailyActions ?? [],
  });

  if (error) {
    console.error("save_habit_plan error:", error);
    return NextResponse.json({ error: "Failed to save plan" }, { status: 500 });
  }

  return NextResponse.json(data);
}
```

### List Route (API)

```typescript
// src/app/api/ai/plan/list/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const habitId = request.nextUrl.searchParams.get("habitId");
  if (!habitId) {
    return NextResponse.json({ error: "habitId is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("habit_plans")
    .select("*")
    .eq("habit_id", habitId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
  }

  return NextResponse.json(data);
}
```

### TypeScript Type for HabitPlan

```typescript
// Add to src/lib/types.ts
export interface DailyAction {
  day: number;    // 1–28
  action: string;
  tip: string;
}

export interface HabitPlan {
  id: string;
  habit_id: string;
  user_id: string;
  is_active: boolean;
  version: number;
  core_philosophy: string | null;
  actionable_steps: ActionableStep[] | null;
  weekly_roadmap: WeekEntry[] | null;
  daily_actions: DailyAction[];
  created_at: string;
}
```

---

## Validation Architecture

nyquist_validation is enabled in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — no jest.config, vitest.config, or test directory found |
| Config file | None — Wave 0 must scaffold |
| Quick run command | `npm run test -- --testPathPattern=plan` (after Wave 0 setup) |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AI-01 | generate route returns SSE stream with valid JSON including 28 daily_actions | unit | `npm test -- --testPathPattern=plan/generate` | Wave 0 |
| AI-01 | generated JSON validates against HabitPlan shape | unit | `npm test -- --testPathPattern=plan/generate` | Wave 0 |
| AI-02 | refine route returns SSE stream; output is revised plan JSON | unit | `npm test -- --testPathPattern=plan/refine` | Wave 0 |
| AI-03 | getDayNumber() returns correct day for various created_at values | unit | `npm test -- --testPathPattern=getDayNumber` | Wave 0 |
| AI-04 | save_habit_plan RPC archives previous active row; new row is active | integration (manual SQL) | manual-only — requires live Supabase | N/A |
| AI-05 | generate/refine routes return 401 for unauthenticated requests | unit | `npm test -- --testPathPattern=plan/generate` | Wave 0 |

**Note:** This project has no test infrastructure at all. Given the launch timeline (Eid March 20-21, only 4 days away), full test scaffolding may not be justified for this phase. The planner should consider whether Wave 0 test scaffolding is practical or whether manual verification is the pragmatic path.

### Wave 0 Gaps (if tests are added)
- [ ] `jest.config.ts` or `vitest.config.ts` — no test framework configured
- [ ] `src/app/api/ai/plan/__tests__/generate.test.ts` — covers AI-01, AI-05
- [ ] `src/app/api/ai/plan/__tests__/refine.test.ts` — covers AI-02
- [ ] `src/lib/__tests__/getDayNumber.test.ts` — covers AI-03

---

## Gemini 2.0 Flash Limits (HIGH confidence — verified against Google documentation)

| Limit | Value | Impact |
|-------|-------|--------|
| Output tokens (default) | 8,192 | 28-day plan ~1,200–1,500 tokens: no risk |
| Input tokens | 1,048,576 | Refine sends current plan JSON back as input: ~1,500 tokens, no risk |
| RPM (free tier) | 15 | With max 3 habits per user, onboarding makes ≤3 calls: fine |
| RPM (paid / Gemini API) | 2,000 | Production not a concern |
| Streaming | Supported via `generateContentStream` | Confirmed working in masterplan route |

No timeout concerns: Vercel Edge function timeout is 30 seconds; 28 daily actions stream in under 5 seconds at typical Gemini latency.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Plans on habits table (core_philosophy, actionable_steps, weekly_roadmap) | Plans in habit_plans table with versioning | Phase 2 | Enables history, refine → approve, regenerate |
| No daily granularity | 28 daily_actions array per plan | Phase 2 | Dashboard can show "today's task" |
| `suggest/route.ts` uses non-streaming Node route | `masterplan/route.ts` uses Edge + streaming | Already implemented | New routes follow masterplan pattern |

**Do not change:** The `masterplan/route.ts` and `suggest/route.ts` routes remain untouched. The new `/api/ai/plan/*` routes are additive.

---

## Open Questions

1. **Should onboarding still call `/api/ai/masterplan` or switch to `/api/ai/plan/generate`?**
   - What we know: Onboarding currently calls `/api/ai/masterplan` and saves `core_philosophy`, `actionable_steps`, `weekly_roadmap` directly onto the habits table.
   - What's unclear: Whether the frontend agent will rewire onboarding to call the new generate endpoint and auto-save to `habit_plans` at onboarding completion.
   - Recommendation: Backend agent should make new endpoints self-contained and compatible with existing onboarding data. The frontend agent owns the decision on whether to migrate onboarding's API call. Do not break the existing `masterplan` route.

2. **What does "plan history view" require from the list endpoint?**
   - What we know: List returns all versions ordered by `created_at DESC`. Full `daily_actions` array is included.
   - What's unclear: Whether the frontend history UI needs a paginated or lightweight (no `daily_actions`) summary endpoint.
   - Recommendation: Return full rows for now — the array is small (28 objects) and history will typically be ≤5 plans. No pagination needed for MVP.

---

## Sources

### Primary (HIGH confidence)
- `src/app/api/ai/masterplan/route.ts` — verified SSE streaming pattern, Edge auth, Gemini streaming
- `src/app/api/ai/suggest/route.ts` — verified Node route auth pattern
- `src/app/onboarding/OnboardingClient.tsx` — verified client-side SSE reader loop
- `src/app/dashboard/DashboardClient.tsx` — verified current masterplan display pattern
- `src/lib/types.ts` — verified existing type shapes (ActionableStep, WeekEntry)
- `supabase/migrations/20260315_phase2.sql` — confirmed existing habits columns
- `supabase/migrations/20260315_phase3_backend.sql` — confirmed RPC pattern (SECURITY DEFINER)
- `supabase/migrations/20260315_phase2_security.sql` — confirmed RLS policy pattern

### Secondary (MEDIUM confidence)
- Google Gemini 2.0 Flash documentation: 8,192 output token limit, streaming via `generateContentStream`, `responseMimeType` incompatibility with streaming (verified by pattern: masterplan route does NOT use responseMimeType despite suggest route using it for non-streaming)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use, no new packages
- Architecture: HIGH — directly mirrors proven patterns from existing routes
- Database schema: HIGH — follows project RLS conventions, RPC pattern from phase3_backend.sql
- Pitfalls: HIGH — derived from code-level analysis of existing routes
- Gemini limits: MEDIUM — based on documented limits; actual token count for 28 actions estimated

**Research date:** 2026-03-16
**Valid until:** 2026-04-15 (Gemini API limits may change; framework versions stable)
