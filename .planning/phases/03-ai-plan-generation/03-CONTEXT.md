# Phase 3: AI Plan Generation - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix AI plan generation end-to-end — plans are generated, saved, displayed, and refineable without errors or silent failures. Scope: generation flow, dashboard display, error/loading states, refine and regenerate. New habit features or onboarding changes are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Root cause & fix approach
- Plans time out because `generate-and-save` runs synchronously — the 60s client-side polling window expires before Gemini responds
- Fix: switch to **streaming generation** directly from the dashboard. Plan streams in real time, saves to DB when the stream completes. No fire-and-forget, no polling window to expire.
- Onboarding still triggers plan generation (fires when user completes Step 2), but the dashboard should handle the actual streaming display rather than blind polling
- Running locally (npm run dev) — no server-side timeout to worry about

### Dashboard plan display
- Habit card shows **current week focus + target** (e.g. "Week 2: Consistency — Pray Fajr 5/7 days")
- Small "Day N of 28" counter displayed subtly near the week focus
- Tapping the card or a "View plan" button **expands inline** to show full plan: core philosophy, all 4 weekly roadmap entries, actionable steps
- When **no plan exists**: show a "Generate AI Plan" button on the habit card. User taps to trigger generation explicitly.

### Loading state (during generation)
- Streaming text is **visible in real time** as Gemini writes it — user watches the plan being written
- No spinner-only state — streaming text is the loading indicator

### Error state
- If generation fails: show "Plan generation failed" message + **Retry button** on the habit card
- Retry re-triggers the same generation flow

### Refine flow
- In scope for this phase — fix the existing refine flow alongside generation
- Fix: remove `dailyActions` from the refine prompt (matches the current plan structure — no dailyActions)
- Refine lives **inline on the dashboard** below the habit card — text input, streaming preview, then Approve / Discard buttons
- User types refinement message → sees streamed revised plan → approves to save (archived previous), or discards

### Regenerate flow
- In scope for this phase
- Confirmation required before wiping: "This will replace your current plan. Continue?"
- On confirm: streams a new plan, saves it (archives current), displays the new plan

### Claude's Discretion
- Exact streaming UI styling (how the text appears as it streams)
- Whether to show a subtle animation on the streaming text
- How the expand/collapse transition looks on the habit card
- Exact wording of confirmation dialog for Regenerate

</decisions>

<specifics>
## Specific Ideas

- User wants to see plans start generating from onboarding and show up by the time they land on the dashboard — streaming handles this naturally since it's fast and visible
- "Generate AI Plan" button as the empty state keeps it explicit rather than auto-triggering

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `/api/ai/plan/generate-and-save/route.ts` — exists but needs to become a streaming route (or be replaced by a dedicated streaming generation endpoint)
- `/api/ai/plan/refine/route.ts` — exists, streams correctly, just needs prompt fix (remove dailyActions)
- `/api/ai/plan/save/route.ts` — keep as-is for saving refined plans after stream completes
- `/api/ai/plan/list/route.ts` — keep as-is, used by dashboard on load
- `DashboardClient.tsx` — has polling logic, refine state, expandedMasterplan state — all reusable, needs rework for streaming approach
- `save_habit_plan` RPC — takes `p_daily_actions` as an empty array now, structure is stable

### Established Patterns
- Streaming routes use `ReadableStream` + SSE (`data: {...}\n\n` format) — refine route is the reference
- Edge runtime for streaming routes: `export const runtime = "edge"` + `createServerClient` with `request.cookies.getAll()`
- Node runtime for DB-write routes: `createClient()` from `@/lib/supabase/server`
- All layout via inline `style={}` — no Tailwind spacing classes
- Amber `#D97706` / `var(--accent)` as the sole accent color

### Integration Points
- DashboardClient.tsx is where generation, display, refine, and regenerate all connect
- `HabitPlan` type in `src/lib/types.ts` — no `dailyActions` field (correct, keep as-is)
- Onboarding `OnboardingClient.tsx` line ~151: fires background generate-and-save calls — may need to be updated or removed once dashboard handles streaming directly

</code_context>

<deferred>
## Deferred Ideas

- Plan history view (viewing archived plan versions) — Phase 4 or later
- Per-habit intensity/time-available settings that feed into plan generation — future phase

</deferred>

---

*Phase: 03-ai-plan-generation*
*Context gathered: 2026-03-16*
