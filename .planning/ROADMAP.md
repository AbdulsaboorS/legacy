# Roadmap: Legacy — Eid Launch + App Store

## Overview

Six phases. Web-first: fix AI plan generation, polish web flows, then wrap for mobile. Push notifications and launch polish come last.

## Phases

- [x] **Phase 1: Circles UI** — Circle detail page and card list (highest value prop)
- [x] **Phase 2: AI + Web Flow Fixes** — Fix AI masterplan flow, finalize all web screens (completed 2026-03-16)
- [ ] **Phase 3: AI Plan Generation** — Fix plan generation end-to-end so it actually works
- [ ] **Phase 4: Web App Flow Polish** — UX polish, tab performance, streak sharing, join page, PWA basics
- [ ] **Phase 5: Mobile App** — Capacitor wrap, App Store, Google Play, OAuth deep links
- [ ] **Phase 6: Push Notifications + Launch** — FCM, cron jobs, OG/SEO, analytics, error monitoring

## Phase Details

### Phase 1: Circles UI
**Goal**: Users can navigate into any circle and see live member progress; My Circles tab shows rich cards.
**Owner**: Full-stack
**Depends on**: Nothing
**Success Criteria**:
  1. Tapping a circle navigates to `/halaqa/[id]` showing each member's name, avatar, today completion status.
  2. Circle detail has a working invite button (copy/share link).
  3. My Circles tab renders circle cards with member count, X/Y done today, avatar previews.
  4. Renders correctly on mobile, no layout overflow.
**Plans**: 2 plans (complete)

### Phase 2: AI + Web Flow Fixes
**Goal**: All AI infrastructure in place and every web screen finalized before moving forward.
**Owner**: Full-stack
**Depends on**: Phase 1
**Success Criteria**:
  1. habit_plans table, RLS, and save_habit_plan RPC in place.
  2. /api/ai/plan/generate and /api/ai/plan/refine stream correctly.
  3. /api/ai/plan/save and /api/ai/plan/list work end-to-end.
  4. Onboarding 4-step flow complete with background plan generation.
  5. Dashboard polls for plans and shows Day N of 28.
**Plans**: 3 plans (complete)

### Phase 3: AI Plan Generation
**Goal**: AI plan generation works correctly end-to-end — plans are generated, saved, displayed, and refineable without errors.
**Owner**: Full-stack
**Depends on**: Phase 2
**Success Criteria**:
  1. Tapping "Generate AI Plan" streams plan text in real time — no polling, no timeout.
  2. Completed plan shows Week N focus + target and "Day N of 28" counter on the habit card.
  3. Refine flow works: inline text input, streaming preview, Approve saves, Discard discards.
  4. Regenerate requires confirmation before replacing the current plan.
  5. Plan generation failure shows "Plan generation failed" + Retry button.
**Plans**: 2 plans

Plans:
- [ ] 03-01-PLAN.md — New streaming generate-stream route + fix refine prompt
- [ ] 03-02-PLAN.md — Dashboard rework: streaming generation, empty state, error state, regenerate confirm

### Phase 4: Web App Flow Polish
**Goal**: Every web screen is complete and feels production-ready. Tab navigation is fast. Streak sharing and join page are finalized.
**Owner**: Full-stack
**Depends on**: Phase 3
**Success Criteria**: TBD
**Plans**: TBD

### Phase 5: Mobile App
**Goal**: Legacy ships on iOS App Store and Google Play via Capacitor + Codemagic CI.
**Owner**: Full-stack
**Depends on**: Phase 4
**Already done**:
  - @capacitor/core, @capacitor/app, @capacitor/cli installed
  - Bundle ID: `app.joinlegacy`
  - `src/lib/supabase/native.ts` — Capacitor-ready Supabase client
**Remaining**: capacitor.config.ts, OAuth deep link, Codemagic CI, App Store assets
**Success Criteria**: TBD
**Plans**: TBD

### Phase 6: Push Notifications + Launch
**Goal**: Users get daily reminders and streak alerts. App is launch-ready with correct metadata, analytics, and error monitoring.
**Owner**: Full-stack
**Depends on**: Phase 5
**Already done**:
  - device_tokens schema + push RPCs (migration applied)
  - recalculate_streak + send_halaqa_reaction RPCs applied
  - firebase-admin, @capacitor/push-notifications installed
**Remaining**: src/lib/push.ts, /api/push/register, cron routes, vercel.json, FIREBASE env vars, OG tags, analytics, error monitoring
**Success Criteria**: TBD
**Plans**: TBD

## Progress

**Execution order**: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Status | Notes |
|-------|--------|-------|
| 1. Circles UI | ✓ Complete | Both plans done, human verified |
| 2. AI + Web Flow | ✓ Complete | 2026-03-16 |
| 3. AI Plan Generation | Not started | Next up |
| 4. Web App Flow Polish | Not started | |
| 5. Mobile App | Not started | Packages + bundle ID done |
| 6. Push Notifications + Launch | Not started | Migrations + packages done |
