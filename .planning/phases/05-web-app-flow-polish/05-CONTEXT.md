# Phase 5: Web App Flow Polish - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Three focused deliverables for launch readiness:
1. **Join page visual upgrade** — editorial redesign, warm personalized CTA, correct post-join routing
2. **AI copy rebrand** — remove "AI" from all user-facing labels; replace with human/personalized language
3. **Circle description** — add a 150-char vibe/tagline to circles, shown on detail page header, My Circles cards, and join page

No streak share cards, no PWA install prompt, no offline caching — those are deferred to Phase 7.

</domain>

<decisions>
## Implementation Decisions

### Join page visual upgrade
- Visual upgrade only — same info and flow, more premium feel
- Better typography: Cormorant Garamond serif heading for circle name, larger + more editorial
- Amber accent divider line under circle name (already exists — make more prominent)
- Member count pill stays (amber styled)
- CTA: "Join {CircleName}" — warm and personalized with the actual circle name in the button
- Unauthenticated flow: keep redirect to `/` with sessionStorage save, restore after OAuth → back to `/join/[code]`
- Post-join redirect: land on `/halaqa/[id]` (the circle detail page), not `/halaqa`
- Inline styles only (no Tailwind spacing) — matches existing pattern

### AI copy rebrand (user-facing only — no route or variable renames)
- "Generate AI Plan" → "Want a personalized plan?" (empty state button/prompt on habit card)
- "AI Plan" label → "Your Plan"
- "Regenerate AI Plan" / "Regenerate Plan" → "Refresh plan" with confirmation: "This will replace your current plan. Continue?"
- Refine button label → "Refine your plan"
- Refine input placeholder → "Tell me how to adjust it..."
- No changes to internal API routes, variable names, or code comments

### Circle description
- New optional `description` field on `halaqas` table (TEXT, max 150 chars)
- Input appears in the Create Circle modal as an optional field ("Circle vibe or purpose — 1-2 sentences")
- Editable later from the circle detail page (owner-only edit state)
- Displayed in 3 places:
  1. Circle detail page header — below circle name, above stats bar, italic/muted style
  2. My Circles card — short truncated blurb (1 line, ellipsis if longer)
  3. Join page — shown between circle name and member count pill
- 150 character limit enforced in UI (char counter shown while typing)
- Optional — circles without a description show nothing (no "Add description" prompt visible to non-owners, owners see a subtle "Add a vibe" CTA)

### Claude's Discretion
- Exact typography sizing for the join page redesign
- Animation/transition for the circle detail edit state (inline vs modal)
- How the char counter appears (below input, right-aligned, changes color near limit)
- Error states for the join page (full circle, invalid code — already exist, just needs styling pass)

</decisions>

<specifics>
## Specific Ideas

- Join page CTA should feel warm: "Join {CircleName}" not just "Join Circle"
- Circle description should feel like a vibe/tagline — example from discussion: "The morning warriors. Fajr, Quran, and dhikr every day."
- Deferred: circle overview/description is the start of giving circles an identity — future phases could add circle goals, rules, member roles

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `JoinClient.tsx`: Full join page already exists with glass card, btn-accent, error/loading states — needs visual upgrade only, not a rewrite
- `HalaqaClient.tsx` Create Circle modal: existing form to add description field to
- `CircleDetailClient.tsx`: Detail page header already has circle name + stats — add description below name
- `HalaqaClient.tsx` circle cards: already render name + member count + avatar stack — add description blurb row

### Established Patterns
- Inline `style={}` for all layout — no Tailwind spacing utilities
- Amber `var(--accent)` / `#D97706` sole accent
- `var(--font-serif)` Cormorant Garamond for headings
- `var(--foreground-muted)` for secondary/italic text
- `glass` + `btn btn-accent` component classes available

### Integration Points
- Supabase migration needed: `ALTER TABLE halaqas ADD COLUMN description TEXT CHECK (char_length(description) <= 150)`
- `JoinClient.tsx`: fetch already loads `halaqas` row — add `description` to select
- `HalaqaClient.tsx`: `myHalaqas` state and `loadData()` need to include `description` in select
- `CircleDetailClient.tsx`: header section — add description render below circle name
- Dashboard `DashboardClient.tsx`: grep for "Generate AI Plan", "AI Plan", "Regenerate" — update copy in place

</code_context>

<deferred>
## Deferred Ideas

- Circle overview with full identity page (goals, member roles, rules) — future social phase
- Islamic BeReal concept (document habits as visual evidence, build confidence over time) — future phase
- Group/duo streaks like Snapchat — future social accountability phase
- BSF lists (best friend accountability pairs) — future social graph phase
- AI plan full redesign (dedicated plan detail page with metrics, refine-before-confirm flow) — Phase 5.x or post-launch
- Streak milestone share card (polished canvas card at 7/14/30 days) — Phase 7
- PWA install prompt (post first check-in) — Phase 7
- Push notifications — Phase 7

</deferred>

---

*Phase: 05-web-app-flow-polish*
*Context gathered: 2026-03-18*
