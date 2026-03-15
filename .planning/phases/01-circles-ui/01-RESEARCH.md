# Phase 1: Circles UI - Research

**Researched:** 2026-03-15
**Domain:** Next.js 14 App Router, React client components, Supabase RLS, CSS-in-JS inline styles
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Circle Cards (My Circles tab)**
- Compact cards: circle name + X/Y members done today — no extra stats beyond that on the card
- Full-width bordered card (1.5px border, rounded corners) — consistent with lobby cards and habit cards
- Stacked row of 3–4 initials avatars (overlapping, 24px circles) on each card
- Tapping anywhere on the card navigates to `/halaqa/[id]`
- "Create Private Circle" button stays in Lobby tab only — My Circles is cards only
- Gate moves off My Circles tab — circle cards always visible; gate lives on the detail page

**Circle Detail Page (`/halaqa/[id]`)**
- Header: circle name (serif heading) + stats summary bar (member count, X/Y done today, best streak in group) + amber "Invite" pill button
- Back arrow at top-left returns to `/halaqa` — always lands on My Circles tab
- Member list: status dot + initials avatar + name + streak + reactions (keep existing reactions)
- Each member row also shows per-member habit breakdown — which specific habits they logged today
- Gate: header always visible; member list section is locked with "Complete your habits first" overlay until habits logged

**Navigation Architecture**
- Current inline member grid on `/halaqa` is removed — moves entirely to `/halaqa/[id]`
- `/halaqa` becomes: tabs (My Circles | Lobby) → My Circles shows circle cards only → tap card → `/halaqa/[id]`
- Back from detail always returns to `/halaqa` with My Circles tab active

**Avatars**
- Initials-based colored circles — no DB change, generated from member name
- Color derived from name hash → picks from palette: amber (#D97706), teal (#0D9488), slate (#64748B), rose (#E11D48)
- Same person always gets same color across sessions
- 24px circles on cards (stacked, overlapping); 36px on member rows in detail page

### Claude's Discretion
- Exact overlap offset for stacked avatars on cards
- Loading skeleton / shimmer while member data fetches
- Exact stats bar layout (inline row vs small grid)
- Animation timing for new page entry

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CIRCLE-01 | User can view a dedicated circle detail page at `/halaqa/[id]` showing member board, individual member stats, and today's completion status for each member. | New dynamic route + CircleDetailClient.tsx; existing `loadGridData` logic moves here and is augmented with per-member habit join. |
| CIRCLE-02 | Circle detail page displays an invite button/link so the circle owner can share access with new members. | `copyInviteLink()` from HalaqaClient is already implemented; move it to the detail page unchanged. |
| CIRCLE-03 | My Circles tab renders each circle as a card showing member count, X/Y members done today, and avatar previews for members. | Replace the pill selector + inline grid in the "mine" tab with a card list; requires a new summary query. |
</phase_requirements>

---

## Summary

The existing `HalaqaClient.tsx` is a single, 549-line file that mixes circle selection, member display, create/join flows, and gating logic. Phase 1 splits this into two distinct surfaces: a card-list view on the My Circles tab (CIRCLE-03) and a dedicated detail page at `/halaqa/[id]` (CIRCLE-01, CIRCLE-02).

All code patterns are already established in the project. There are no new dependencies to install, no DB schema changes needed, and no API routes to build. The work is a reorganization + augmentation of existing UI logic. The most technically complex piece is the per-member habit breakdown query on the detail page — a join of `habit_logs → habits` for each member in the circle.

The RLS recursive dependency (halaqas → halaqa_members → halaqas) means the detail page must receive the halaqa name/metadata via Next.js navigation state or re-use the already-loaded list from the parent page. It cannot safely re-fetch a newly created circle from the DB immediately after creation.

**Primary recommendation:** Build in two isolated units — (1) refactor HalaqaClient My Circles tab to card list, (2) create CircleDetailClient as a new file at `src/app/halaqa/[id]/CircleDetailClient.tsx`. Pass halaqa state via URL param only; let the detail page fetch members fresh (RLS allows this for existing circles).

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 14 | Dynamic route `[id]`, `useRouter`, `useParams` | Already in project |
| Supabase JS client | existing | DB queries, auth.getUser() | Already in project — use `createClient()` from `@/lib/supabase/client` |
| React hooks | 18 | useState, useEffect, useCallback, useRef | Already used throughout |

### No New Dependencies
This phase requires zero `npm install` commands. All needed libraries are already present.

---

## Architecture Patterns

### Recommended File Structure
```
src/app/halaqa/
├── page.tsx                      # thin shell — renders HalaqaClient (unchanged)
├── layout.tsx                    # force-dynamic (unchanged)
├── HalaqaClient.tsx              # MODIFIED: replace mine tab with card list
└── [id]/
    ├── page.tsx                  # thin shell — renders CircleDetailClient
    └── CircleDetailClient.tsx    # NEW: full detail page
```

### Pattern 1: Dynamic Route Thin Shell
**What:** `page.tsx` files in this project are always thin wrappers that render a `*Client.tsx` component.
**When to use:** Always — follows established project convention.
**Example:**
```typescript
// src/app/halaqa/[id]/page.tsx
"use client";
import CircleDetailClient from "./CircleDetailClient";
export default function CircleDetailPage() {
  return <CircleDetailClient />;
}
```

The `[id]` directory also needs a `layout.tsx` that exports `force-dynamic`, mirroring the parent:
```typescript
// src/app/halaqa/[id]/layout.tsx
export const dynamic = "force-dynamic";
export default function CircleDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

### Pattern 2: Reading Route Params in Client Components
**What:** Next.js 14 App Router client components use `useParams()` to read dynamic segments.
**When to use:** In `CircleDetailClient.tsx` to get the halaqa id.
```typescript
import { useParams, useRouter } from "next/navigation";

const params = useParams();
const halaqaId = params.id as string;
```

### Pattern 3: Navigation Back to Parent with Tab State
**What:** The back arrow must return to `/halaqa` and land on My Circles tab. Since `HalaqaClient` controls tab state internally with `useState`, the simplest approach is to navigate to `/halaqa` with a query param: `router.push("/halaqa?tab=mine")`. Then `HalaqaClient` reads `useSearchParams()` on mount to initialize the active tab.
**When to use:** Back arrow on detail page, and on tab initialization in HalaqaClient.
```typescript
// In CircleDetailClient — back arrow
router.push("/halaqa?tab=mine");

// In HalaqaClient — read initial tab from query
import { useSearchParams } from "next/navigation";
const searchParams = useSearchParams();
const [activeTab, setActiveTab] = useState<"lobby" | "mine">(
  (searchParams.get("tab") as "lobby" | "mine") ?? "mine"
);
```

### Pattern 4: Inline Styles (Project Requirement)
**What:** All layout uses `style={{}}` inline objects. No Tailwind spacing utilities.
**When to use:** Every element. CSS custom properties via `var(--token)`. This is a locked project convention.
```typescript
// Correct
<div style={{ padding: "16px", border: "1.5px solid var(--surface-border)", borderRadius: "12px" }}>

// Wrong — do NOT use Tailwind spacing:
<div className="p-4 border rounded-xl">
```

### Pattern 5: Avatar Color from Name Hash
**What:** Deterministic color assignment from member name — same person always same color.
**Algorithm:** Sum char codes, modulo 4, index into palette.
```typescript
const AVATAR_PALETTE = ["#D97706", "#0D9488", "#64748B", "#E11D48"];

function getAvatarColor(name: string): string {
  const hash = name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function getInitials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}
```

### Pattern 6: Stacked Overlapping Avatars on Cards
**What:** GitHub/Slack-style overlapping avatar row. 3–4 visible, "+N" if more.
**Overlap offset:** `-8px` margin-left (except first). Each avatar is a 24px circle with a white/dark border to show separation.
```typescript
function AvatarStack({ members }: { members: { preferred_name: string }[] }) {
  const visible = members.slice(0, 4);
  const overflow = members.length - 4;
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {visible.map((m, i) => (
        <div
          key={m.preferred_name}
          title={m.preferred_name}
          style={{
            width: "24px", height: "24px", borderRadius: "50%",
            background: getAvatarColor(m.preferred_name),
            border: "2px solid var(--surface)",
            marginLeft: i === 0 ? 0 : "-8px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.6rem", fontWeight: 700, color: "#fff",
            zIndex: visible.length - i,
            position: "relative",
          }}
        >
          {getInitials(m.preferred_name)}
        </div>
      ))}
      {overflow > 0 && (
        <div style={{
          width: "24px", height: "24px", borderRadius: "50%",
          background: "var(--surface-border)", border: "2px solid var(--surface)",
          marginLeft: "-8px", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: "0.6rem", fontWeight: 700,
          color: "var(--foreground-muted)", position: "relative",
        }}>
          +{overflow}
        </div>
      )}
    </div>
  );
}
```

### Pattern 7: Member Card in My Circles Tab
**What:** Full-width bordered card, tappable, shows name + X/Y + avatar stack.
```typescript
<button
  onClick={() => router.push(`/halaqa/${hq.id}`)}
  style={{
    width: "100%", display: "flex", alignItems: "center",
    justifyContent: "space-between", padding: "16px",
    border: "1.5px solid var(--surface-border)", borderRadius: "12px",
    background: "var(--surface)", cursor: "pointer", textAlign: "left",
    marginBottom: "12px",
  }}
>
  <div>
    <p style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "4px" }}>{hq.name}</p>
    <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)" }}>{doneCount}/{totalCount} done today</p>
  </div>
  <AvatarStack members={memberPreviews} />
</button>
```

### Pattern 8: Per-Member Habit Breakdown Query
**What:** For each member on the detail page, show which habits they logged today. This requires joining `habit_logs` to `habits`.
**Query approach:** Fetch all habit_logs for today for the circle's user IDs, then fetch the habit names for those log IDs. Map by user_id.
```typescript
// Step 1: Get all today's completed logs for members
const { data: logsWithHabits } = await supabase
  .from("habit_logs")
  .select("user_id, habit_id, habits(name, icon)")
  .in("user_id", userIds)
  .eq("date", today)
  .eq("completed", true);

// Type note: Supabase returns the joined habits as an object, not array
// logsWithHabits[i].habits = { name: string, icon: string }
```

### Pattern 9: Circle Card Summary Query
**What:** My Circles tab needs X/Y done today and avatar previews without loading full member details. Two queries needed.
```typescript
// Get member count + done count for each circle
// Query 1: all members (for avatars + count)
const { data: memberRows } = await supabase
  .from("halaqa_members")
  .select("user_id, profiles(preferred_name)")
  .eq("halaqa_id", halaqaId);

// Query 2: today's completions
const { data: doneRows } = await supabase
  .from("habit_logs")
  .select("user_id")
  .in("user_id", memberUserIds)
  .eq("date", today)
  .eq("completed", true);

// Use Set to deduplicate (multiple habits per user = multiple log rows)
const doneUserIds = new Set(doneRows?.map(r => r.user_id));
```

### Pattern 10: Loading State / Shimmer
**What:** While member data fetches on detail page, render skeleton rows. Use `animate-shimmer` keyframe already defined in globals.css.
```typescript
function SkeletonRow() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 0", borderBottom: "1px solid var(--surface-border)" }}>
      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--surface-border)" }} />
      <div style={{ flex: 1, height: "16px", borderRadius: "4px", background: "var(--background-secondary)", backgroundImage: "linear-gradient(90deg, var(--background-secondary) 25%, var(--surface-border) 50%, var(--background-secondary) 75%)", backgroundSize: "200% 100%", animation: "shimmer 2s linear infinite" }} />
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Fetching newly created circle from DB immediately:** RLS recursive dependency on `halaqa_members` prevents it. Always build the halaqa object locally after create (already done in existing code).
- **Using Tailwind spacing classes:** Use inline styles. `p-4`, `mx-2`, etc. are unreliable in Tailwind v4 dev mode.
- **Passing halaqa objects via router state:** Next.js App Router does not support passing complex objects via `router.push()`. Pass only the ID in the URL, then fetch on the detail page.
- **Nested `<button>` in a card `<button>`:** The Invite button inside a card creates invalid HTML. Use a card wrapper `<div>` with `onClick`, not `<button>`.
- **Reading `habit_logs` without a `user_id` index filter:** Always filter by `user_id` first, then date — matches the existing index `idx_habit_logs_user_date`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Avatar color | Custom color assignment | Name hash % palette (see Pattern 5) | Deterministic, consistent, no state |
| Invite share | Custom share modal | `navigator.share` + clipboard fallback (already in `copyInviteLink()`) | Web Share API handles native sheet |
| Loading shimmer | Custom loading spinner | `animate-shimmer` keyframe in globals.css | Already defined and consistent |
| Tab state from URL | Complex router state | `useSearchParams()` + `?tab=mine` | Minimal, survives hard refresh |

**Key insight:** Everything needed is already in the codebase. The risk is duplication — copy logic cleanly, don't reinvent.

---

## Common Pitfalls

### Pitfall 1: RLS Recursive Dependency After Circle Creation
**What goes wrong:** After `create_private_halaqa` RPC, reading the new halaqa via `from("halaqas").select(...)` can return empty or error because the RLS policy on `halaqas` uses a subquery into `halaqa_members`, which itself has an RLS policy referencing `halaqas` — circular.
**Why it happens:** RLS policies evaluate recursively in Postgres. The membership row is committed, but the policy evaluation can race or fail.
**How to avoid:** After creation, construct the halaqa object locally from the RPC's returned UUID and the inputs. Don't re-fetch. (Already implemented in `createPrivateGroup()` — preserve this pattern on the detail page.)
**Warning signs:** `data: null, error: null` after a successful RPC call.

### Pitfall 2: Multiple Habit Logs Per User Inflating "Done" Count
**What goes wrong:** If a user has 3 active habits and completes all 3, there will be 3 rows in `habit_logs` for today. Counting rows naively gives 3 instead of 1 "person done".
**Why it happens:** habit_logs is per-habit, not per-user-per-day.
**How to avoid:** Use `new Set(logs.map(l => l.user_id)).size` for the distinct user count. Always deduplicate by user_id before computing X/Y stats.

### Pitfall 3: Stale hasLoggedToday on Detail Page
**What goes wrong:** The detail page gate ("Complete your habits first") checks `hasLoggedToday`. If this state is fetched independently and the user just checked in from dashboard, it may read false due to eventual consistency.
**Why it happens:** Each page fetches independently.
**How to avoid:** On the detail page, perform a fresh count query on `habit_logs` as part of `loadData`. Don't rely on passed props or localStorage.

### Pitfall 4: BottomNav Active State on `/halaqa/[id]`
**What goes wrong:** BottomNav uses `pathname.startsWith(href)` — Halaqa tab is active when `pathname.startsWith("/halaqa")`. Since `/halaqa/[id]` starts with `/halaqa`, the tab will correctly highlight. No change needed. But verify this doesn't break after adding the new route.
**How to avoid:** No action needed — `startsWith` already handles nested routes correctly.
**Warning signs:** If Halaqa tab goes inactive on the detail page.

### Pitfall 5: Supabase Nested Select Returning Object vs Array
**What goes wrong:** `select("user_id, habit_id, habits(name, icon)")` returns `habits` as a single object `{ name, icon }` (since habit_id is a FK to a single habits row), not an array. Type annotation mismatch crashes at runtime.
**Why it happens:** Supabase JS returns single-record joins as objects, array joins as arrays.
**How to avoid:** Type the result as `{ user_id: string; habit_id: string; habits: { name: string; icon: string } | null }`.

### Pitfall 6: Middleware Not Protecting `/halaqa/[id]`
**What goes wrong:** Current middleware only protects `/dashboard`, `/onboarding`, `/settings`. The `/halaqa` and `/halaqa/[id]` routes are unprotected — unauthenticated users can reach them and `getUser()` returns null, crashing the page.
**Why it happens:** `/halaqa` was added after the middleware was written.
**How to avoid:** Add `/halaqa` to `protectedPaths` in `middleware.ts`:
```typescript
const protectedPaths = ["/dashboard", "/onboarding", "/settings", "/halaqa"];
```

---

## Code Examples

### Circle Card (My Circles tab)
```typescript
// Full-width tappable card consistent with lobby cards
<button
  onClick={() => router.push(`/halaqa/${hq.id}`)}
  style={{
    width: "100%", display: "flex", alignItems: "center",
    justifyContent: "space-between", padding: "16px",
    border: "1.5px solid var(--surface-border)", borderRadius: "12px",
    background: "var(--surface)", cursor: "pointer", textAlign: "left",
    marginBottom: "12px",
  }}
  className="animate-fade-in"
>
  <div>
    <p style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "4px", color: "var(--foreground)" }}>
      {hq.name}
    </p>
    <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)" }}>
      {doneCount}/{memberCount} done today
    </p>
  </div>
  <AvatarStack members={memberPreviews} />
</button>
```

### Stats Summary Bar on Detail Page
```typescript
// Inline row — left-aligned, spaced
<div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
  {[
    { label: "Members", value: memberCount },
    { label: "Done today", value: `${doneCount}/${memberCount}` },
    { label: "Best streak", value: `${bestStreak}d` },
  ].map(({ label, value }) => (
    <div key={label}>
      <p style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--foreground-muted)" }}>
        {label}
      </p>
      <p style={{ fontSize: "1rem", fontWeight: 700, color: "var(--foreground)" }}>{value}</p>
    </div>
  ))}
</div>
```

### Invite Pill Button (Amber, detail page header)
```typescript
<button
  onClick={handleInvite}
  style={{
    padding: "6px 16px", borderRadius: "999px",
    background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.3)",
    color: "var(--accent)", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600,
    flexShrink: 0,
  }}
>
  Invite
</button>
```

### Member Row with Per-Habit Breakdown
```typescript
<div style={{ display: "flex", flexDirection: "column", padding: "14px 0", borderBottom: "1px solid var(--surface-border)" }}>
  {/* Main row */}
  <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: member.todayHabits.length > 0 ? "8px" : 0 }}>
    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: member.completed_today ? "var(--success)" : "var(--surface-border)", flexShrink: 0 }} />
    {/* Initials avatar — 36px */}
    <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: getAvatarColor(member.preferred_name), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, color: "#fff", flexShrink: 0 }}>
      {getInitials(member.preferred_name)}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontWeight: 600, fontSize: "0.95rem" }}>{member.preferred_name}</p>
      <p style={{ fontSize: "0.7rem", color: "var(--foreground-muted)" }}>{member.current_streak} day streak</p>
    </div>
    {/* Reactions */}
    <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
      {["🤲", "💪", "🔥"].map((emoji) => (
        <button key={emoji} onClick={() => sendReaction(member.user_id, emoji)}
          style={{ width: "28px", height: "28px", borderRadius: "50%", background: "var(--background-secondary)", border: "1px solid var(--surface-border)", cursor: "pointer", fontSize: "0.8rem" }}>
          {emoji}
        </button>
      ))}
    </div>
  </div>
  {/* Habit chips */}
  {member.todayHabits.length > 0 && (
    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", paddingLeft: "22px" }}>
      {member.todayHabits.map(h => (
        <span key={h.habit_id} style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "999px", background: "var(--background-secondary)", border: "1px solid var(--surface-border)", color: "var(--foreground-muted)" }}>
          {h.icon} {h.name}
        </span>
      ))}
    </div>
  )}
</div>
```

### Gated Member List Section
```typescript
// Gate: header always visible, only member list is gated
{!hasLoggedToday ? (
  <div style={{ padding: "48px 24px", textAlign: "center", border: "1.5px solid var(--surface-border)", borderRadius: "16px" }} className="animate-bounce-in">
    <div style={{ fontSize: "2.5rem", marginBottom: "16px" }}>🔒</div>
    <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem", fontWeight: 400, marginBottom: "8px" }}>Complete your habits first</h2>
    <p style={{ fontSize: "0.875rem", color: "var(--foreground-muted)", marginBottom: "6px" }}>Muraqabah begins with yourself.</p>
    <button onClick={() => router.push("/dashboard")}
      style={{ width: "100%", height: "52px", background: "var(--foreground)", color: "#fff", border: "none", borderRadius: "12px", fontWeight: 700, cursor: "pointer" }}>
      Go to Today's Habits
    </button>
  </div>
) : (
  /* Member list */
  <div>...</div>
)}
```

---

## Validation Architecture

`nyquist_validation` is enabled in `.planning/config.json`.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no test config files present |
| Config file | None — Wave 0 gap |
| Quick run command | `npm run lint` (only automated check available) |
| Full suite command | `npm run build && npm run lint` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CIRCLE-01 | `/halaqa/[id]` renders member board with today's completion status | manual-only | Navigate to `/halaqa/[id]` in browser, verify member rows display | N/A |
| CIRCLE-02 | Invite button copies/shares link | manual-only | Tap Invite button, verify Web Share or clipboard | N/A |
| CIRCLE-03 | My Circles tab renders circle cards with member count, X/Y, avatars | manual-only | Navigate to `/halaqa`, verify card list renders | N/A |

**Justification for manual-only:** This is a pure UI/rendering phase with no business logic units that can be tested in isolation. The project has no test framework installed. All requirements are verifiable in < 2 minutes of browser testing.

### Sampling Rate
- **Per task commit:** `npm run lint` (catches TypeScript + ESLint errors)
- **Per wave merge:** `npm run build` (catches Next.js build errors)
- **Phase gate:** Build passes + manual browser verification on mobile viewport

### Wave 0 Gaps
- [ ] No test framework installed — `npm run lint` and `npm run build` are the only automated checks
- [ ] Manual browser test checklist in VERIFICATION.md covers all three requirements

*(A formal test framework like Playwright or Vitest could be added in a future phase; it is out of scope for Phase 1.)*

---

## Integration Points

### Files to Modify
| File | Change |
|------|--------|
| `src/app/halaqa/HalaqaClient.tsx` | Replace "mine" tab contents: remove pill selector + inline grid, add circle card list. Add `useSearchParams` for initial tab. Keep all other logic. |
| `src/middleware.ts` | Add `/halaqa` to `protectedPaths` array. |

### Files to Create
| File | Content |
|------|---------|
| `src/app/halaqa/[id]/page.tsx` | Thin shell rendering `<CircleDetailClient />` |
| `src/app/halaqa/[id]/layout.tsx` | `export const dynamic = "force-dynamic"` |
| `src/app/halaqa/[id]/CircleDetailClient.tsx` | Full detail page (header, stats, invite, gated member list with habit breakdown) |

### Logic to Migrate (not duplicate)
- `copyInviteLink()` → move into `CircleDetailClient`, reference `halaqaId` from `useParams` and look up invite code from loaded data.
- `loadGridData()` → move into `CircleDetailClient.loadData()`, augment with habit names join.
- `sendReaction()` → move into `CircleDetailClient`, update to use `halaqaId` from params.
- Gate UI (🔒 block) → move from `HalaqaClient` into `CircleDetailClient`; only gates member list section, not full page.

### State to NOT Migrate
- `activeHalaqaId` state → eliminated; id comes from URL params on detail page.
- `activeHalaqaInitialized` ref → not needed on detail page.
- `members` state in `HalaqaClient` → removed from parent, lives only in `CircleDetailClient`.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pill selector + inline grid in `/halaqa` | Card list → detail page navigation | Phase 1 | Cleaner separation, scalable to many circles |
| Gate on entire My Circles tab | Gate only on member list section within detail page | Phase 1 | Header always visible; less jarring UX |
| No avatar images | Initials + name-hash color | Phase 1 | No DB changes, consistent identity signal |

---

## Open Questions

1. **Best streak in group — which table?**
   - What we know: `streaks` table has `current_streak` and `longest_streak` per user. The stats bar shows "best streak in group."
   - What's unclear: Should this be `MAX(current_streak)` (live streaks) or `MAX(longest_streak)` (all-time best)?
   - Recommendation: Use `MAX(current_streak)` — shows current momentum, more motivating in daily context. Query alongside the existing streaks fetch.

2. **`useSearchParams` requires Suspense in Next.js 14**
   - What we know: Next.js 14 App Router requires `useSearchParams()` to be inside a `Suspense` boundary, otherwise a build warning/error is raised.
   - What's unclear: Whether the project's `"use client"` + `force-dynamic` layout already suppresses this requirement.
   - Recommendation: Wrap the part of `HalaqaClient` that calls `useSearchParams` in a `<Suspense fallback={null}>` boundary, or alternatively just default to "mine" tab and accept that the back-from-detail behavior uses the URL only while the tab defaults. A simpler alternative: store last active tab in `sessionStorage` and read it on mount — avoids Suspense entirely.

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection of `src/app/halaqa/HalaqaClient.tsx` — existing logic, patterns, state shape
- Direct code inspection of `supabase/migrations/20260315_phase2_security.sql` — RLS policies, `create_private_halaqa` RPC
- Direct code inspection of `src/app/globals.css` — available CSS tokens, animation keyframes
- Direct code inspection of `src/middleware.ts` — current protected paths
- Direct code inspection of `src/lib/types.ts` — Halaqa, HabitLog, Streak type shapes

### Secondary (MEDIUM confidence)
- Next.js 14 App Router conventions for dynamic routes and `useParams` — well established, aligns with project's existing `"use client"` patterns
- Supabase JS nested select behavior (FK joins return single object vs array) — consistent with Supabase JS v2 documentation patterns

### Tertiary (LOW confidence)
- `useSearchParams` Suspense requirement in Next.js 14 — noted as open question; sessionStorage fallback recommended if this causes issues

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all existing dependencies, no new packages
- Architecture: HIGH — patterns derived directly from existing codebase
- DB queries: HIGH — schema fully read, RLS policies understood
- Pitfalls: HIGH — RLS issue explicitly documented in STATE.md and existing code comments
- Validation: HIGH — manual-only is appropriate given no test framework installed

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable stack, no fast-moving dependencies)
