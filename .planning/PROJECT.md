# Legacy — Post-Ramadan Habit Tracker

## What This Is

Legacy is a progressive web app (PWA) helping Muslims sustain their Ramadan spiritual habits year-round. Users set up their core habits, receive AI-powered "graceful step-down" suggestions, track daily progress with streaks, and hold each other accountable through private accountability circles (Halaqas). Launch target: Eid al-Fitr 2026 (March 20-21).

## Core Value

A Muslim who opens Legacy every day logs their habits, sees their circle doing the same, and feels the momentum of a community keeping Ramadan alive — that daily return is the product.

## Requirements

### Validated

- ✓ Google OAuth via Supabase — existing
- ✓ 3-step onboarding wizard (habits → AI suggestions → confirm) — existing
- ✓ Daily habit check-in with streak tracking — existing
- ✓ Shawwal fasting tracker (6 days) — existing
- ✓ AI masterplan per habit (Gemini 2.0 Flash) — existing
- ✓ Halaqa circles (create, join public lobby, invite via link) — existing
- ✓ Grace day system (streak protection) — existing
- ✓ Light/dark theme with Cormorant Garamond editorial design — existing
- ✓ PWA installable — existing
- ✓ OG image sharing — existing

### Active

- [ ] Circle detail page — dedicated `/halaqa/[id]` view with member board, stats, invite
- [ ] Circle card list — My Circles tab shows cards with member count, X/Y done today, avatar previews
- [ ] Push notifications — daily habit reminder, circle activity nudges
- [ ] Streak milestone sharing — polished share card at 7/14/30 day milestones
- [ ] Join page polish — `/join/[invite_code]` redesigned to match new design system
- [ ] Performance & PWA hardening — offline support, install prompt, Lighthouse score
- [ ] Launch readiness — SEO, meta tags, analytics, error monitoring

### Out of Scope

- Real-time circle chat — high complexity, not core to accountability value
- Native mobile app — PWA-first, native later
- Payments/subscriptions — free for Eid launch
- Admin dashboard — not needed for v1 launch
- Circle leaderboards — could gamify negatively, defer

## Context

- **Tech stack**: Next.js 16 App Router, TypeScript, Tailwind CSS v4, Supabase (Postgres + RLS + Google OAuth), Gemini 2.0 Flash, `@ducanh2912/next-pwa`, Vercel
- **Design system**: Editorial/minimal — white #FAFAFA, near-black #0D0D0D, amber #D97706 accent, Cormorant Garamond serif headings, all inline styles (Tailwind v4 + no-turbopack workaround)
- **Known issue**: Tailwind v4 spacing classes don't apply reliably in dev — all layout uses inline `style={}` props
- **RLS note**: `halaqa_members` policy has recursive dependency through `halaqas` — frontend must not rely on reading newly created circles from DB immediately after creation
- **Two-agent history**: Frontend (this agent) and Antigravity (backend agent) previously worked on same `main` branch — all conflicts resolved, codebase now clean

## Constraints

- **Tech stack**: Next.js + Supabase + Gemini — locked, no migrations
- **Timeline**: Must launch by Eid al-Fitr 2026 (March 20-21) — ~5 days from now
- **Deploy**: Vercel — edge runtime for OG images
- **Inline styles**: All spacing/layout must use inline `style={}` — no Tailwind for spacing

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Inline styles over Tailwind for layout | Tailwind v4 + no-turbopack doesn't reliably apply spacing classes | ✓ Good |
| Amber (#D97706) as sole accent | Editorial design — one accent color, no green | ✓ Good |
| Optimistic circle state after creation | RLS recursive dependency prevents immediate DB read | ✓ Good |
| PWA over native app | Speed to launch, Eid deadline | — Pending |

---
*Last updated: 2026-03-15 after project initialization*
