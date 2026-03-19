# Roadmap: Legacy — Eid Launch + App Store

## Overview

Seven phases. Web-first: fix AI plan generation, build the live circle feed, polish web flows, then wrap for mobile. Push notifications and launch polish come last.

## Phases

- [x] **Phase 1: Circles UI** — Circle detail page and card list (highest value prop)
- [x] **Phase 2: AI + Web Flow Fixes** — Fix AI masterplan flow, finalize all web screens (completed 2026-03-16)
- [x] **Phase 3: AI Plan Generation** — Fix plan generation end-to-end so it actually works (completed 2026-03-17)
- [x] **Phase 4: Live Circle Feed** — Real-time activity feed on circle detail, reactions on feed items, notification dots (completed 2026-03-17)
- [x] **Phase 5: Web App Flow Polish** — UX polish, tab performance, streak sharing, join page, PWA basics (completed 2026-03-18)
- [ ] **Phase 6: Mobile App** — Capacitor wrap, App Store, Google Play, OAuth deep links
- [ ] **Phase 7: Push Notifications + Launch** — FCM, cron jobs, OG/SEO, analytics, error monitoring

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
**Plans**: 2 plans (complete)

Plans:
- [x] 03-01-PLAN.md — New streaming generate-stream route + fix refine prompt
- [x] 03-02-PLAN.md — Dashboard rework: streaming generation, empty state, error state, regenerate confirm

### Phase 4: Live Circle Feed
**Goal**: A real-time activity feed on `/halaqa/[id]` makes circles feel alive — users open the app and feel the pulse of their community practicing alongside them.
**Owner**: Full-stack
**Depends on**: Phase 3
**Key decisions**:
  - 30s polling on tab focus (visibilitychange) — no Supabase realtime subscriptions
  - Feed window: rolling 48 hours (covers late-night opener seeing yesterday's energy)
  - Today/Yesterday dividers anchored to Fajr time
  - Reactions move from member board → feed items (react to a specific check-in event)
  - Notification dot on circle cards: localStorage tracks last-opened timestamp per circle
  - No missed days / streak breaks in feed — mercy-first ethos
**Backend blockers (migration required before frontend)**:
  1. SECURITY DEFINER RPC `get_circle_feed(halaqa_id)` — returns merged, time-sorted feed of habit_log completions + streak milestones + new member joins for 48hr window (bypasses RLS so members can read each other's logs)
  2. `habit_log_id` FK added to `halaqa_reactions` — attach reactions to specific check-in events
  3. Streak milestone detection — frontend derives from current_streak (7/14/21/28/30) if last_completed_date is today
**Success Criteria**:
  1. User opens circle detail and sees a live feed of what their circle did in the last 48 hours
  2. Checking in causes your own activity to appear in the feed within 30 seconds
  3. Streak milestones surface as distinct celebratory items
  4. Reacting to a feed item shows aggregate counts visible to the whole circle
  5. Circle cards in My Circles show a dot when there's unseen activity
  6. Empty state never feels dead — always shows a quote or yesterday's activity
  7. No layout overflow on mobile, consistent with existing design system
**Plans**: 2 plans

Plans:
- [ ] 04-01-PLAN.md — Migration: habit_log_id FK + get_circle_feed SECURITY DEFINER RPC + FeedRow types
- [ ] 04-02-PLAN.md — CircleFeed component + wire into CircleDetailClient + notification dots in HalaqaClient

### Phase 5: Web App Flow Polish
**Goal**: Join page is redesigned to match the editorial design system, AI copy is rebranded to human-feeling language, and circles have an optional description field surfaced across the app.
**Owner**: Full-stack
**Depends on**: Phase 4
**Success Criteria**:
  1. Join page uses inline styles, Cormorant Garamond serif heading, "Join {CircleName}" CTA, and routes to /halaqa/[id] post-join.
  2. No user-facing "AI" labels on habit cards — personalized copy throughout.
  3. Circles have an optional 150-char description shown on detail page, My Circles cards, and join page.
  4. Circle owner can add/edit description inline from the detail page.
  5. npm run build passes with zero new errors.
**Plans**: 4 plans

Plans:
- [ ] 05-01-PLAN.md — Supabase migration (halaqas.description) + Halaqa TypeScript interface update
- [ ] 05-02-PLAN.md — Join page visual redesign + routing fix + generateMetadata SEO
- [ ] 05-03-PLAN.md — AI copy rebrand in DashboardClient (5 string replacements)
- [ ] 05-04-PLAN.md — Circle description surfaces: Create modal, My Circles cards, detail header + owner edit, join page

### Phase 05.1: Habit Detail Page (INSERTED)

**Goal:** Move AI plan content off the dashboard into a dedicated /habit/[id] page — dashboard becomes a pure check-in list, detail page owns all plan depth (heatmap, plan content, refine, regenerate).
**Requirements**: N/A
**Depends on:** Phase 5
**Plans:** 2/2 plans complete

Plans:
- [ ] 05.1-01-PLAN.md — Create /habit/[id] route with HabitDetailClient: heatmap, plan content, refine/regenerate UI
- [ ] 05.1-02-PLAN.md — Clean DashboardClient: remove inline plan section, wire "Your Plan ›" nav row

### Phase 6: Mobile App
**Goal**: Legacy ships on iOS App Store via Capacitor + Codemagic CI. iOS only for v1 — no Android.
**Owner**: Full-stack
**Depends on**: Phase 5 + Vercel deployment (prerequisite — blocks Capacitor WebView URL)
**Strategy**: Capacitor WebView pointing at Vercel production URL (Option A). No Next.js static export — keeps API routes, middleware, server components intact.
**Already done**:
  - @capacitor/core, @capacitor/app, @capacitor/cli installed
  - Bundle ID: `app.joinlegacy`
  - `src/lib/supabase/native.ts` — Capacitor-ready Supabase client
**Remaining**:
  - [ ] Deploy to Vercel (user does this — set env vars, connect GitHub repo)
  - [ ] `capacitor.config.ts` — point WebView at Vercel URL
  - [ ] `npx cap add ios` — generate iOS project
  - [ ] Google OAuth deep links — custom URL scheme `app.joinlegacy://` in Info.plist + `appUrlOpen` listener; register scheme in Supabase allowed redirects
  - [ ] Safe area insets — `env(safe-area-inset-*)` CSS for notch/Dynamic Island/home bar
  - [ ] `@capacitor/status-bar` — match app theme
  - [ ] `@capacitor/keyboard` — prevent keyboard from pushing content on refine/onboarding
  - [ ] Hardware back button handler (iOS swipe back — Capacitor handles via gesture, verify)
  - [ ] Supabase session persistence test — verify session survives app backgrounding
  - [ ] Codemagic `codemagic.yaml` — signing, build, upload to App Store Connect
  - [ ] Privacy policy page at `/privacy` (required for App Store submission)
  - [ ] App Store Connect listing — screenshots (iPhone 6.9"), description, keywords, age rating
  - [ ] Test credentials in review notes (Apple reviewers need login without creating account)
  - [ ] Submit for review (1–3 day Apple review window)
**Key risks**:
  - OAuth deep links are the hardest piece — test early
  - Apple provisioning (certificates, profiles) requires Apple Developer account ($99/year)
  - App Store review: budget 3 days, plan for one rejection round
  - Eid deadline (March 20-21): ship PWA for Eid, native app as staged launch shortly after
**Success Criteria**:
  1. App installs on real iPhone via TestFlight
  2. Google OAuth sign-in completes and returns to app (deep link works)
  3. All screens render correctly — no safe area overflow, keyboard issues
  4. Session persists after backgrounding and restoring app
  5. App Store submission accepted, app live on App Store
**Plans**: 6 plans

Plans:
- [ ] 06-01-PLAN.md — Capacitor config (server.url) + install status-bar/keyboard plugins
- [ ] 06-02-PLAN.md — Privacy policy page at /privacy (App Store required)
- [ ] 06-03-PLAN.md — Codemagic CI/CD pipeline YAML for iOS build + TestFlight upload
- [ ] 06-04-PLAN.md — Safe area insets CSS + viewport-fit=cover
- [ ] 06-05-PLAN.md — Google OAuth deep link handler (NativeAuthHandler + platform-aware redirectTo)
- [ ] 06-06-PLAN.md — Human checkpoint: npx cap add ios, Info.plist, Xcode device run, TestFlight

### Phase 7: Push Notifications + Launch
**Goal**: Users get daily reminders and streak alerts. App is launch-ready with correct metadata, analytics, and error monitoring.
**Owner**: Full-stack
**Depends on**: Phase 6
**Already done**:
  - device_tokens schema + push RPCs (migration applied)
  - recalculate_streak + send_halaqa_reaction RPCs applied
  - firebase-admin, @capacitor/push-notifications installed
**Remaining**: src/lib/push.ts, /api/push/register, cron routes, vercel.json, FIREBASE env vars, OG tags, analytics, error monitoring
**Success Criteria**: TBD
**Plans**: TBD

## Progress

**Execution order**: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Status | Notes |
|-------|--------|-------|
| 1. Circles UI | ✓ Complete | Both plans done, human verified |
| 2. AI + Web Flow | ✓ Complete | 2026-03-16 |
| 3. AI Plan Generation | ✓ Complete | 2026-03-17 |
| 4. Live Circle Feed | ✓ Complete | 2026-03-17 |
| 5. Web App Flow Polish | 4/4 | Complete    | 2026-03-18 | 6. Mobile App | Not started | Packages + bundle ID done |
| 7. Push Notifications + Launch | Not started | Migrations + packages done |
