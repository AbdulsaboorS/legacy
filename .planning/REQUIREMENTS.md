# Requirements: Legacy — Eid Launch Sprint

## Overview

Active requirements for the Eid al-Fitr 2026 launch (March 20-21). Validated features (Phase 1+2) are already shipped. This document covers the 7 remaining capabilities needed for launch.

---

## Categories

### AI — Personalized Habit Plans

**AI-01**: For each habit, the AI generates a comprehensive 28-day action plan with: a core philosophy, 3 actionable steps, a 4-week roadmap, and 28 daily specific tasks (one per day, each with an action and a motivational tip).

**AI-02**: Users can submit a plain-language refinement request ("make it less intense", "add more Sunnah context") and receive a streamed revised plan. They approve the revision before it is saved.

**AI-03**: The active plan per habit is visible in the dashboard — showing the overall plan and today's specific daily action based on days elapsed since the plan was created.

**AI-04**: Users can regenerate a fresh plan for any habit at any time. Previous plans are archived (not deleted) and viewable as plan history.

**AI-05**: All plan generation and refinement endpoints require authentication. Unauthenticated requests return 401 before any Gemini call is made.

### CIRCLE — Accountability Circle Features

**CIRCLE-01**: User can view a dedicated circle detail page at `/halaqa/[id]` showing member board, individual member stats, and today's completion status for each member.

**CIRCLE-02**: Circle detail page displays an invite button/link so the circle owner can share access with new members.

**CIRCLE-03**: My Circles tab renders each circle as a card showing member count, X/Y members done today, and avatar previews for members.

### NOTIF — Push Notifications

**NOTIF-01**: User can opt in to push notifications and receive a daily habit reminder at a chosen time.

**NOTIF-02**: User receives a push nudge when their circle has activity (members completing habits), surfacing circle momentum.

### SHARE — Streak Milestone Sharing

**SHARE-01**: At 7, 14, and 30-day streak milestones, a polished share card is presented to the user with their streak count and habit name.

**SHARE-02**: User can share the milestone card via native share sheet (Web Share API) or download it as an image.

### JOIN — Join Page Polish

**JOIN-01**: `/join/[invite_code]` page is redesigned to match the current editorial design system (Cormorant Garamond headings, amber accent, inline styles).

**JOIN-02**: Join page shows circle name, member count, and a clear call-to-action before requiring sign-in, so the user understands what they are joining.

### PWA — Performance and PWA Hardening

**PWA-01**: App works offline — cached pages render, check-ins queue and sync when connectivity returns.

**PWA-02**: Install prompt appears at an appropriate moment (post first check-in or after 2+ sessions) rather than immediately on load.

**PWA-03**: Lighthouse PWA score reaches 90+ and performance score reaches 80+ on mobile.

### LAUNCH — Launch Readiness

**LAUNCH-01**: All pages have correct `<title>`, `<meta description>`, and Open Graph tags that produce clean previews when shared on WhatsApp and Twitter/X.

**LAUNCH-02**: Analytics are instrumented (page views, check-in events, circle creates) so post-launch behavior is observable.

**LAUNCH-03**: Error monitoring (Sentry or equivalent) is active in production, capturing unhandled exceptions and surfacing them to the developer.

### MOB — Mobile App (iOS)

**MOB-01**: App installs on real iPhone via TestFlight — the Capacitor WebView loads the Vercel production URL and the app is functional end-to-end on device.

**MOB-02**: Google OAuth sign-in completes and returns to app — the deep link (app.joinlegacy://auth-callback) fires, tokens are extracted, and the user lands on /dashboard authenticated.

**MOB-03**: All screens render correctly — no content hidden behind the iOS notch, Dynamic Island, or home bar; keyboard does not push content off-screen on refine/onboarding screens.

**MOB-04**: Session persists after backgrounding and restoring app — user is not logged out when they switch apps for 1+ minute and return to Legacy.

**MOB-05**: App Store submission accepted and app is live on the App Store — metadata, screenshots, age rating, privacy policy, and test credentials are complete; Apple review passes.

---

## Summary

| Category | Count | IDs |
|----------|-------|-----|
| CIRCLE | 3 | CIRCLE-01, CIRCLE-02, CIRCLE-03 |
| NOTIF | 2 | NOTIF-01, NOTIF-02 |
| SHARE | 2 | SHARE-01, SHARE-02 |
| JOIN | 2 | JOIN-01, JOIN-02 |
| PWA | 3 | PWA-01, PWA-02, PWA-03 |
| LAUNCH | 3 | LAUNCH-01, LAUNCH-02, LAUNCH-03 |
| MOB | 5 | MOB-01, MOB-02, MOB-03, MOB-04, MOB-05 |
| **Total** | **20** | |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AI-01 | Phase 2 | Complete |
| AI-02 | Phase 2 | Complete |
| AI-03 | Phase 2 | Complete |
| AI-04 | Phase 2 | Complete |
| AI-05 | Phase 2 | Complete (done in Phase 1 backend) |
| CIRCLE-01 | Phase 1 | Complete |
| CIRCLE-02 | Phase 1 | Complete |
| CIRCLE-03 | Phase 1 | Complete |
| NOTIF-01 | Phase 4 | Pending |
| NOTIF-02 | Phase 4 | Complete |
| SHARE-01 | Phase 3 | Pending |
| SHARE-02 | Phase 3 | Pending |
| JOIN-01 | Phase 3 | Complete |
| JOIN-02 | Phase 3 | Complete |
| PWA-01 | Phase 4 | Pending |
| PWA-02 | Phase 4 | Pending |
| PWA-03 | Phase 4 | Pending |
| LAUNCH-01 | Phase 5 | Pending |
| LAUNCH-02 | Phase 5 | Pending |
| LAUNCH-03 | Phase 5 | Pending |
| MOB-01 | Phase 6 | Complete |
| MOB-02 | Phase 6 | Complete |
| MOB-03 | Phase 6 | Complete |
| MOB-04 | Phase 6 | Complete |
| MOB-05 | Phase 6 | Complete |
