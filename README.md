# Legacy — Post-Ramadan Habit Tracker (Web)

**Live at**: [legacy-bice.vercel.app](https://legacy-bice.vercel.app)

---

## What This Is

Legacy started as a progressive web app (PWA) helping Muslims carry their Ramadan spiritual habits into sustainable daily routines after Eid. Users set up their habits, receive AI-powered personalized step-down plans, track daily progress with streaks, and stay accountable through private circles (Halaqas).

The web app is fully built and deployed. It includes:
- Google OAuth sign-in via Supabase
- 4-step onboarding with background AI plan generation (Gemini 2.0 Flash)
- Daily habit check-in with streak tracking and grace day system
- AI-powered 28-day personalized habit plans with streaming refinement
- Private accountability circles with live activity feed, reactions, and invite links
- Habit detail page with plan history and regeneration
- PWA installable, Capacitor iOS wrap built

---

## Where We're Headed

After building out the full web experience, the product direction has evolved. **Active development has moved to a native iOS app** — a deeper, more social take on Islamic accountability built natively in Swift/SwiftUI.

The web app remains live as a **marketing site and PWA fallback**. No new features are being added here.

For active development, see: [circles-ios](https://github.com/AbdulsaboorS/circles-ios)

---

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Styling**: Tailwind CSS v4 + inline styles
- **Auth + DB**: Supabase (Google OAuth + Postgres + RLS)
- **AI**: Google Gemini 2.0 Flash
- **Deploy**: Vercel


---

## Status: Frozen

All 6 phases of web development complete. Stable and deployed. Future product work lives in the native iOS app.

| Phase | Status |
|-------|--------|
| 1. Circles UI | ✓ Complete |
| 2. AI + Web Flow Fixes | ✓ Complete |
| 3. AI Plan Generation | ✓ Complete |
| 4. Live Circle Feed | ✓ Complete |
| 5. Web App Flow Polish | ✓ Complete |
| 6. Mobile (Capacitor wrap) | ✓ Complete |
| 7. Push Notifications | Deferred to native app |
