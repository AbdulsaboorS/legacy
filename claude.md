# Legacy — Post-Ramadan Habit Tracker

## Overview
A progressive web app (PWA) helping Muslims carry their Ramadan spiritual habits into sustainable daily routines. Users set up their Ramadan habits, receive AI-powered "graceful step-down" suggestions, and track daily progress with streaks, Shawwal fasting, and Prophetic motivation.

**Launch target**: Eid al-Fitr 2026 (March 20-21)

## Tech Stack
- **Framework**: Next.js 14 (App Router, TypeScript)
- **Styling**: Tailwind CSS v4 with custom design system in `globals.css`
- **Auth + DB**: Supabase (Google OAuth + Postgres + RLS)
- **AI**: Google Gemini 2.0 Flash (personalized step-down suggestions)
- **PWA**: `@ducanh2912/next-pwa`
- **Fonts**: Inter (UI) + Amiri (Arabic)
- **Deploy**: Vercel

## Project Structure
```
src/
├── app/
│   ├── globals.css           # Design system (light/dark, glassmorphism, animations)
│   ├── layout.tsx            # Root layout, fonts, ThemeProvider, PWA meta
│   ├── page.tsx              # Landing page (hero + Google sign-in)
│   ├── onboarding/page.tsx   # 3-step wizard (select → AI suggest → confirm)
│   ├── dashboard/page.tsx    # Main daily view (habits, streaks, Shawwal, quotes)
│   ├── settings/page.tsx     # Theme, habit management, sign out
│   ├── auth/callback/route.ts   # OAuth callback (new → onboarding, returning → dashboard)
│   └── api/ai/suggest/route.ts  # Gemini API for step-down suggestions
├── components/
│   └── ThemeProvider.tsx     # Light/dark mode context, localStorage persistence
├── lib/
│   ├── types.ts              # TS types, preset habits, 30 Prophetic quotes
│   └── supabase/
│       ├── client.ts         # Browser Supabase client
│       └── server.ts         # Server Supabase client
└── middleware.ts             # Session refresh, route protection
```

## Database Schema
See `supabase/schema.sql`. Four tables:
- `habits` — user's tracked habits with Ramadan/suggested/accepted amounts
- `habit_logs` — daily check-in records (unique per habit+date)
- `shawwal_fasts` — Shawwal 6-day fasting tracker
- `streaks` — current/longest streak, total completions

All tables have RLS policies: users can only access their own data.

## Design System
Defined in `src/app/globals.css`:
- **Themes**: Light (`[data-theme="light"]`) and dark (`[data-theme="dark"]`)
- **Colors**: Deep teals (primary), warm golds (accent), soft greens (success)
- **Utilities**: `.glass`, `.glass-hover`, `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-accent`, `.streak-badge`
- **Animations**: `animate-check`, `animate-streak-fire`, `animate-slide-up`, `animate-fade-in`, `animate-bounce-in`, `animate-pulse-soft`

## Key Conventions
- All pages are client components (`"use client"`) since they use Supabase auth and state
- Supabase client: use `createClient()` from `@/lib/supabase/client` in client components
- Supabase server: use `createClient()` from `@/lib/supabase/server` in API routes/server components
- Tailwind v4 with `@theme inline` for custom tokens
- Inline styles for CSS custom properties (Tailwind v4 doesn't support arbitrary `var()` in all utilities)
- Optimistic UI updates for habit check-ins

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
```

## Running Locally
```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm run lint         # ESLint check
```

## Auth Flow
1. Landing → Google OAuth via Supabase
2. Callback checks if user has habits → new users → `/onboarding`, returning → `/dashboard`
3. Middleware protects `/dashboard`, `/onboarding`, `/settings` routes
4. Authenticated users on `/` are redirected to `/dashboard`
