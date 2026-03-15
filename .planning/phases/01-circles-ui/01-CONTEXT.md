# Phase 1: Circles UI - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the circle cards view on My Circles tab and the dedicated circle detail page at `/halaqa/[id]`. The current inline member grid moves to the detail page. My Circles tab becomes a card list. CIRCLE-01, CIRCLE-02, CIRCLE-03 only — no new capabilities.

</domain>

<decisions>
## Implementation Decisions

### Circle Cards (My Circles tab)
- Compact cards: circle name + X/Y members done today — no extra stats beyond that on the card
- Full-width bordered card (1.5px border, rounded corners) — consistent with lobby cards and habit cards
- Stacked row of 3–4 initials avatars (overlapping, 24px circles) on each card
- Tapping anywhere on the card navigates to `/halaqa/[id]`
- "Create Private Circle" button stays in Lobby tab only — My Circles is cards only
- Gate moves off My Circles tab — circle cards always visible; gate lives on the detail page

### Circle Detail Page (`/halaqa/[id]`)
- Header: circle name (serif heading) + stats summary bar (member count, X/Y done today, best streak in group) + amber "Invite" pill button
- Back arrow at top-left returns to `/halaqa` — always lands on My Circles tab
- Member list: status dot + initials avatar + name + streak + 🤲💪🔥 reactions (keep existing reactions)
- Each member row also shows per-member habit breakdown — which specific habits they logged today
- Gate: header always visible; member list section is locked with "Complete your habits first" overlay until habits logged

### Navigation Architecture
- Current inline member grid on `/halaqa` is removed — moves entirely to `/halaqa/[id]`
- `/halaqa` becomes: tabs (My Circles | Lobby) → My Circles shows circle cards only → tap card → `/halaqa/[id]`
- Back from detail always returns to `/halaqa` with My Circles tab active

### Avatars
- Initials-based colored circles — no DB change, generated from member name
- Color derived from name hash → picks from palette: amber (#D97706), teal (#0D9488), slate (#64748B), rose (#E11D48)
- Same person always gets same color across sessions
- 24px circles on cards (stacked, overlapping); 36px on member rows in detail page

### Claude's Discretion
- Exact overlap offset for stacked avatars on cards
- Loading skeleton / shimmer while member data fetches
- Exact stats bar layout (inline row vs small grid)
- Animation timing for new page entry

</decisions>

<specifics>
## Specific Ideas

- Avatar stacking should feel like GitHub collaborators or Slack channel members — 3–4 overlapping circles, "+N" badge if more
- The gate on the detail page: header (name, stats, invite) is always visible — only the member list section is blocked. Avoids the jarring full-screen lock.
- Per-member habit breakdown on the detail page adds depth — users want to see *what* their circle mates are working on, not just whether they checked in

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `HalaqaClient.tsx`: Member list render logic (status dot, name, streak, reactions) is reusable — extract to detail page as-is, then augment with habit breakdown
- `HalaqaClient.tsx` `copyInviteLink()`: Invite share logic (Web Share API + clipboard fallback) is already implemented — reuse on detail page
- `HalaqaClient.tsx` `loadGridData()`: Member fetch logic (halaqa_members → profiles + streaks + habit_logs) is fully working — move to detail page
- `useToast` from `Toast.tsx`: Use for reactions feedback and invite copy confirmation
- `useTheme` from `ThemeProvider.tsx`: For theme-aware avatar colors

### Established Patterns
- All layout via inline `style={}` — no Tailwind spacing utilities
- Amber `#D97706` as sole accent color
- `animate-fade-in`, `animate-slide-up`, `animate-bounce-in` CSS animations available
- `var(--surface-border)`, `var(--foreground)`, `var(--foreground-muted)`, `var(--accent)`, `var(--success)` CSS custom properties
- Cormorant Garamond `var(--font-serif)` for headings, Inter `var(--font-sans)` for body

### Integration Points
- New route: `src/app/halaqa/[id]/page.tsx` + `src/app/halaqa/[id]/CircleDetailClient.tsx`
- `HalaqaClient.tsx` My Circles section: replace pill selector + inline grid with circle card list
- `BottomNav.tsx`: No changes needed — Halaqa tab already points to `/halaqa`
- RLS constraint: Do not re-fetch a newly created circle from DB immediately — use passed state or wait for propagation
- New DB query needed for detail page: per-member habit logs with habit names (join `habit_logs` → `habits` for each member)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-circles-ui*
*Context gathered: 2026-03-15*
