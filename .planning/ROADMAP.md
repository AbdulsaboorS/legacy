# Roadmap: Legacy — Eid Launch + App Store

## Overview

Seven phases. Web-first: finish circles, fix AI, polish flows, wire notifications. Then harden the PWA. Then wrap for App Store via Capacitor. Backend agent (Antigravity) leads mobile infra; frontend agent leads UI and web phases.

## Phases

- [x] **Phase 1: Circles UI** — Circle detail page and card list (highest value prop)
- [ ] **Phase 2: AI + Web Flow Fixes** — Fix AI masterplan flow, finalize all web screens
- [ ] **Phase 3: Polish** — Streak sharing, join page redesign
- [ ] **Phase 4: Push Notifications** — FCM infra (backend) + opt-in UI (frontend)
- [ ] **Phase 5: PWA Hardening** — Offline support, install prompt, Lighthouse 90+
- [ ] **Phase 6: Web Launch Readiness** — SEO, OG, analytics, error monitoring
- [ ] **Phase 7: Mobile (Capacitor)** — App Store wrap, OAuth deep links, native push

## Phase Details

### Phase 1: Circles UI
**Goal**: Users can navigate into any circle and see live member progress; My Circles tab shows rich cards.
**Owner**: Frontend
**Depends on**: Nothing
**Requirements**: CIRCLE-01, CIRCLE-02, CIRCLE-03
**Success Criteria**:
  1. Tapping a circle navigates to `/halaqa/[id]` showing each member's name, avatar, today completion status.
  2. Circle detail has a working invite button (copy/share link).
  3. My Circles tab renders circle cards with member count, X/Y done today, avatar previews.
  4. Renders correctly on mobile, no layout overflow.
**Plans**: 2 plans

Plans:
- [ ] 01-01-PLAN.md — Refactor My Circles tab to circle card list + protect /halaqa in middleware
- [ ] 01-02-PLAN.md — Create /halaqa/[id] circle detail page with stats, invite, and gated member list

### Phase 2: AI + Web Flow Fixes
**Goal**: All AI functionality works end-to-end and every web screen is finalized before mobile starts.
**Owner**: Frontend + Backend (coordinate)
**Depends on**: Phase 1
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05
**Backend scope**:
- `habit_plans` table: versioned plans per habit (active + archived history)
- `/api/ai/plan/generate` (Edge, streaming): 28-day plan with daily_actions JSONB
- `/api/ai/plan/refine` (Edge, streaming): current plan + user message → streams revised plan
- `/api/ai/plan/save` (POST): upserts approved plan, archives previous version
- `/api/ai/plan/list` (GET): plan history for a habit

**Frontend scope** (separate agent):
- Onboarding step 3: call generate, stream, display
- Dashboard: today's daily action (day N of 28) + expandable full plan
- Refinement UI: message input → streaming preview → approve/discard
- Regenerate button + plan history view

**Success Criteria**:
  1. Onboarding generates a 28-day plan per habit (streaming, no timeout).
  2. Dashboard shows today's specific daily action for each habit.
  3. User can type a refinement, see streamed result, approve → saved as new active version.
  4. User can regenerate plan from dashboard — previous archived, new becomes active.
  5. Plan history accessible per habit.
  6. Full user flow clean, no console errors in production build.
**Plans**: 3 plans

Plans:
- [ ] 02-01-PLAN.md — habit_plans migration + RLS + save_habit_plan RPC + HabitPlan TypeScript types
- [ ] 02-02-PLAN.md — /api/ai/plan/generate and /api/ai/plan/refine (Edge streaming routes)
- [ ] 02-03-PLAN.md — /api/ai/plan/save and /api/ai/plan/list (Node routes, RPC + history)

### Phase 3: Polish
**Goal**: Streak milestones are shareable moments; join flow matches editorial design.
**Owner**: Frontend
**Depends on**: Phase 2
**Requirements**: SHARE-01, SHARE-02, JOIN-01, JOIN-02
**Success Criteria**:
  1. Share card appears automatically at 7, 14, 30-day milestones with streak count and habit name.
  2. User can share via native share sheet or save as image.
  3. `/join/[invite_code]` shows circle name + member count before sign-in, matches design system.
**Plans**: TBD

### Phase 4: Push Notifications
**Goal**: Users receive daily habit reminders and circle activity nudges via push.
**Owner**: Backend (FCM infra, cron routes, device_tokens) + Frontend (opt-in UI, settings)
**Depends on**: Phase 2
**Backend already done**:
  - `supabase/migrations/20260315_phase3_mobile.sql` — device_tokens table + push RPCs (schema ready)
  - `recalculate_streak` RPC — authoritative server-side streak with per-habit grace day
  - `send_halaqa_reaction` RPC — 5/day rate limit enforced server-side
  - AI endpoints secured — 401 returned for unauthenticated requests
  - Installed: firebase-admin, @capacitor/push-notifications
**Remaining backend**: src/lib/push.ts, /api/push/register, /api/cron/daily-reminder, /api/cron/streak-alert, vercel.json cron config, FIREBASE env vars
**Requirements**: NOTIF-01, NOTIF-02
**Success Criteria**:
  1. User enables push from settings and receives daily reminder at chosen time.
  2. User receives nudge when circle members complete habits.
  3. Notifications arrive on installed PWA without app being open.
**Plans**: TBD

### Phase 5: PWA Hardening
**Goal**: App loads and functions offline; install prompt fires at the right moment.
**Owner**: Frontend
**Depends on**: Phase 3
**Requirements**: PWA-01, PWA-02, PWA-03
**Success Criteria**:
  1. Dashboard and habit pages load with cached data when offline.
  2. Check-ins made offline queue and sync on reconnect.
  3. Install prompt appears after first successful check-in.
  4. Lighthouse PWA 90+, Performance 80+ on simulated mobile.
**Plans**: TBD

### Phase 6: Web Launch Readiness
**Goal**: Every page has correct social previews; user behavior is observable; errors surface immediately.
**Owner**: Frontend + Backend
**Depends on**: Phase 5
**Requirements**: LAUNCH-01, LAUNCH-02, LAUNCH-03
**Success Criteria**:
  1. Any URL shared on WhatsApp/Twitter renders correct OG title, description, image.
  2. Page views and key events (check-in, circle create, onboarding complete) appear in analytics within minutes.
  3. Production exceptions surface in monitoring within one minute.
**Plans**: TBD

### Phase 7: Mobile (Capacitor)
**Goal**: Legacy ships on iOS App Store and Google Play via Capacitor + Codemagic CI.
**Owner**: Backend (Capacitor config, deep links, native push) + Frontend (any native-specific UI adjustments)
**Depends on**: Phase 4, Phase 6 (web must be complete before wrapping)
**Backend already done**:
  - Installed: @capacitor/core, @capacitor/app, @capacitor/cli
  - Bundle ID decided: `app.joinlegacy`
  - `src/lib/supabase/native.ts` — Capacitor-ready Supabase client exists
**Remaining**:
  - capacitor.config.ts (bundle ID, URL scheme, FCM config)
  - OAuth deep link: `legacy://auth/callback` in auth/callback/route.ts + Supabase allowed URLs
  - Codemagic CI config for automated App Store + Play Store builds
  - App Store assets (screenshots, metadata)
**Requirements**: MOB-01, MOB-02, MOB-03
**Success Criteria**:
  1. App builds via Codemagic without a local Mac.
  2. Google OAuth works in the native WebView (deep link returns to app).
  3. Push notifications work natively on iOS and Android.
  4. App passes App Store review and is publicly downloadable.
**Plans**: TBD

## Progress

**Execution order**: 1 → 2 → 3+4 (can overlap) → 5 → 6 → 7

| Phase | Owner | Status | Notes |
|-------|-------|--------|-------|
| 1. Circles UI | Frontend | ✓ Complete | Both plans done, human verified |
| 2. AI + Web Flow | Both | Not started | Web finalization gate |
| 3. Polish | Frontend | Not started | |
| 4. Push Notifications | Backend + Frontend | Partially started | Migration + packages done |
| 5. PWA Hardening | Frontend | Not started | |
| 6. Web Launch | Both | Not started | |
| 7. Mobile | Backend + Frontend | Partially started | Packages + bundle ID done |
