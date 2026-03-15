# Roadmap: Legacy — Eid Launch Sprint

## Overview

Five focused phases to ship Legacy by Eid al-Fitr 2026 (March 20-21). The highest-value work — circle detail and cards — ships first. Notifications follow. Polish (sharing, join page) comes next. PWA hardening and launch instrumentation close the sprint.

## Phases

- [ ] **Phase 1: Circles UI** - Circle detail page and card list — the core social value prop
- [ ] **Phase 2: Push Notifications** - Daily habit reminders and circle activity nudges
- [ ] **Phase 3: Polish** - Streak milestone sharing and join page redesign
- [ ] **Phase 4: PWA Hardening** - Offline support, install prompt, Lighthouse score
- [ ] **Phase 5: Launch Readiness** - SEO, analytics, error monitoring

## Phase Details

### Phase 1: Circles UI
**Goal**: Users can navigate into any circle and see live member progress, and the My Circles tab shows rich cards instead of a bare list.
**Depends on**: Nothing (builds on existing Halaqa data already in DB)
**Requirements**: CIRCLE-01, CIRCLE-02, CIRCLE-03
**Success Criteria** (what must be TRUE):
  1. User can tap a circle in My Circles tab and land on `/halaqa/[id]` showing each member's name, avatar, and whether they completed habits today.
  2. Circle detail page has a working invite button that copies or shares the invite link.
  3. My Circles tab shows each circle as a card with member count, X/Y done today count, and at least two member avatar previews.
  4. Circle detail page renders correctly on mobile with no layout overflow.
**Plans**: TBD

### Phase 2: Push Notifications
**Goal**: Users receive timely reminders to log habits and feel the pull of their circle's momentum through push notifications.
**Depends on**: Phase 1
**Requirements**: NOTIF-01, NOTIF-02
**Success Criteria** (what must be TRUE):
  1. User can enable push notifications from settings and receives a daily reminder at their chosen time.
  2. User receives a push notification when one or more circle members complete their habits.
  3. Notifications arrive on a device that has the PWA installed, without requiring the app to be open.
**Plans**: TBD

### Phase 3: Polish
**Goal**: Streak milestones become shareable moments and the join flow matches the app's editorial design, so both retention and growth loops are complete.
**Depends on**: Phase 1
**Requirements**: SHARE-01, SHARE-02, JOIN-01, JOIN-02
**Success Criteria** (what must be TRUE):
  1. At 7, 14, and 30-day milestones a share card appears automatically with the streak count and habit name styled to the design system.
  2. User can share the milestone card via the native share sheet or save it as an image.
  3. `/join/[invite_code]` displays the circle name and member count before asking the user to sign in, matching the editorial design (Cormorant headings, amber accent, inline styles).
**Plans**: TBD

### Phase 4: PWA Hardening
**Goal**: The app loads and functions without internet after the first visit, and users on mobile are prompted to install at the right moment.
**Depends on**: Phase 3
**Requirements**: PWA-01, PWA-02, PWA-03
**Success Criteria** (what must be TRUE):
  1. Dashboard and habit check-in pages load and display cached data when the device is offline.
  2. Habit check-ins made offline are queued and sync to Supabase when connectivity returns.
  3. Install prompt appears after a user's first successful habit check-in, not on first page load.
  4. Lighthouse PWA audit scores 90+ and performance scores 80+ on a simulated mobile device.
**Plans**: TBD

### Phase 5: Launch Readiness
**Goal**: Every page produces a clean social preview, user behavior is observable post-launch, and production errors surface immediately.
**Depends on**: Phase 4
**Requirements**: LAUNCH-01, LAUNCH-02, LAUNCH-03
**Success Criteria** (what must be TRUE):
  1. Sharing any app URL on WhatsApp or Twitter/X renders the correct title, description, and OG image.
  2. Page views and key events (check-in, circle create, onboarding complete) appear in the analytics dashboard within minutes of occurring.
  3. An unhandled exception in production creates an alert in the error monitoring tool within one minute.
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Circles UI | 0/TBD | Not started | - |
| 2. Push Notifications | 0/TBD | Not started | - |
| 3. Polish | 0/TBD | Not started | - |
| 4. PWA Hardening | 0/TBD | Not started | - |
| 5. Launch Readiness | 0/TBD | Not started | - |
