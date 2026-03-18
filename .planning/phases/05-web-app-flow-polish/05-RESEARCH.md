# Phase 5: Web App Flow Polish - Research

**Researched:** 2026-03-18
**Domain:** Next.js UI polish, Supabase schema migration, copy rebranding
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Join page visual upgrade
- Visual upgrade only — same info and flow, more premium feel
- Better typography: Cormorant Garamond serif heading for circle name, larger + more editorial
- Amber accent divider line under circle name (already exists — make more prominent)
- Member count pill stays (amber styled)
- CTA: "Join {CircleName}" — warm and personalized with the actual circle name in the button
- Unauthenticated flow: keep redirect to `/` with sessionStorage save, restore after OAuth → back to `/join/[code]`
- Post-join redirect: land on `/halaqa/[id]` (the circle detail page), not `/halaqa`
- Inline styles only (no Tailwind spacing) — matches existing pattern

#### AI copy rebrand (user-facing only — no route or variable renames)
- "Generate AI Plan" → "Want a personalized plan?" (empty state button/prompt on habit card)
- "AI Plan" label → "Your Plan"
- "Regenerate AI Plan" / "Regenerate Plan" → "Refresh plan" with confirmation: "This will replace your current plan. Continue?"
- Refine button label → "Refine your plan"
- Refine input placeholder → "Tell me how to adjust it..."
- No changes to internal API routes, variable names, or code comments

#### Circle description
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

### Deferred Ideas (OUT OF SCOPE)
- Circle overview with full identity page (goals, member roles, rules) — future social phase
- Islamic BeReal concept — future phase
- Group/duo streaks like Snapchat — future social accountability phase
- BSF lists (best friend accountability pairs) — future social graph phase
- AI plan full redesign (dedicated plan detail page with metrics, refine-before-confirm flow) — Phase 5.x or post-launch
- Streak milestone share card (polished canvas card at 7/14/30 days) — Phase 7
- PWA install prompt (post first check-in) — Phase 7
- Push notifications — Phase 7
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| JOIN-01 | `/join/[invite_code]` page is redesigned to match the current editorial design system (Cormorant Garamond headings, amber accent, inline styles) | JoinClient.tsx audit complete — currently uses Tailwind class layout, must be converted to full inline-style pattern. Cormorant heading for circle name is new. |
| JOIN-02 | Join page shows circle name, member count, and a clear call-to-action before requiring sign-in | Already satisfied structurally; CTA copy change to "Join {CircleName}" and post-join redirect fix are the concrete changes. |
| LAUNCH-01 (partial) | All pages have correct `<title>`, `<meta description>`, and Open Graph tags — join page SEO only for this phase | `src/app/join/[invite_code]/page.tsx` is a server component — can add `generateMetadata()` export that fetches circle name from Supabase server client. |
</phase_requirements>

---

## Summary

Phase 5 is a pure polish pass with three independent tracks that can be planned and executed in parallel: (1) Join page visual and routing upgrade, (2) AI copy rebrand on DashboardClient, (3) Circle description — Supabase migration + surface in four UI locations.

The work is entirely within existing files. No new routes, no new API endpoints, no new components beyond what is needed for the circle description edit state. The heaviest single task is the Supabase schema migration (`halaqas.description`) and propagating the new field through four code surfaces. The lightest is the AI copy rebrand — a pure find-and-replace of string literals in DashboardClient.

**Primary recommendation:** Plan in three sequential waves — migration first (unblocks all description work), then join page polish and AI copy in parallel, then final integration pass on circle cards + detail page description display.

---

## Current State Audit

### JoinClient.tsx (`src/app/join/[invite_code]/JoinClient.tsx`)

**What exists:**
- Glass card layout with amber divider and member count pill — the right structure, wrong aesthetic
- `halaqaInfo` state shape: `{ id, name, member_count, max_members }` — does NOT yet include `description`
- Supabase query: `.select("id, name, max_members, halaqa_members(count)")` — needs `description` added
- CTA button text: `"Accept Invite 🤝"` — must become `"Join {halaqaInfo.name}"`
- Post-join redirect: `router.push("/halaqa")` (line 70) — must become `router.push(\`/halaqa/${halaqaInfo.id}\`)`
- **Pattern mismatch:** JoinClient uses Tailwind class layout (`className="min-h-dvh flex flex-col..."`), `btn btn-accent`, `text-2xl font-bold` — the rest of the app uses 100% inline styles. This is the main design debt to fix.
- Error and loading states use glass card + Tailwind — both need inline style conversion

**What to keep:** Glass card shape, amber divider, member count pill (amber), error/full-circle states logic.

**What to change:** Convert all className layout to inline `style={}`, upgrade circle name to `var(--font-serif)` at ~2.2–2.8rem, make divider more prominent (2px height, 48–64px wide), personalize CTA button, fix post-join redirect, add `description` render between circle name and member count pill.

### DashboardClient.tsx (`src/app/dashboard/DashboardClient.tsx`)

**Exact strings to change (confirmed by reading source):**

| Line | Current | New |
|------|---------|-----|
| 524 | `✨ Generate AI Plan` (button text) | `✨ Want a personalized plan?` |
| 537 | `✨ AI Masterplan` (toggle label) | `✨ Your Plan` |
| 628 | `✏️ Refine Plan` (button text) | `✏️ Refine your plan` |
| 635 | `🔄 Regenerate` (button text) | `🔄 Refresh plan` |
| 645 | `This will replace your current plan. Continue?` | Already correct — keep as-is |
| 664 | `e.g. make it less intense, add more Sunnah context...` (textarea placeholder) | `Tell me how to adjust it...` |

Note: The regenerate confirmation text ("This will replace your current plan. Continue?") already matches the spec — no change needed there.

### HalaqaClient.tsx (`src/app/halaqa/HalaqaClient.tsx`)

**Create Circle modal:** Currently has one input (`newCircleName`). Needs a second optional textarea for `description` with a char counter. The `createPrivateGroup` function constructs a `Halaqa` object locally (RLS workaround) — the local `newHalaqa` object must include `description: newCircleDescription || null`.

**Circle cards (My Circles tab):** Each card currently renders `{card.halaqa.name}` and `{card.doneCount}/{card.memberCount} done today`. A description blurb row must be added below the name — one line, `overflow: hidden`, `textOverflow: "ellipsis"`, `whiteSpace: "nowrap"`.

**`Halaqa` type:** Currently has no `description` field. Must add `description?: string | null` to the interface in `src/lib/types.ts`.

**`loadData()` query:** Currently `.select("*")` on halaqas — `*` will automatically include the new `description` column once it's added. No query change needed here, but the `pendingHalaqa` session storage shape must include `description`.

### CircleDetailClient.tsx (`src/app/halaqa/[id]/CircleDetailClient.tsx`)

**Header section:** Currently renders the circle name `<h1>` immediately followed by the stats+invite row. Description must be inserted between `<h1>` and the stats row — italic, `var(--foreground-muted)`, small font size (~0.9rem).

**Edit state (owner only):** The component already tracks `currentUserId`. `halaqa.created_by` is available (type has `created_by: string | null`). Owner detection: `currentUserId === halaqa?.created_by`. Edit state is a local `useState<boolean>` toggle — inline edit under the description text, not a modal. Show "Add a vibe" CTA for owners when description is empty.

**Fetch query:** Currently `.select("*")` — `description` comes through automatically after migration.

**Save:** A simple `.update({ description: newDescription }).eq("id", halaqaId)` direct Supabase call from the client component. No RPC needed — this is the owner updating their own circle, RLS owner-write policy already covers it.

---

## Standard Stack

### Core (all already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js 14 App Router | 14.x | Server components for SEO metadata | `generateMetadata()` is built-in pattern |
| Supabase JS | 2.x | DB migration via SQL editor, RLS-aware client queries | Existing pattern throughout codebase |
| React | 18.x | useState for edit state, optimistic UI | Existing pattern |

### No new dependencies needed
This phase installs nothing new. All primitives are already in the codebase.

---

## Architecture Patterns

### Recommended File Structure (changes only)

```
src/
├── app/
│   ├── join/[invite_code]/
│   │   ├── page.tsx              # Add generateMetadata() for LAUNCH-01 SEO
│   │   └── JoinClient.tsx        # Visual upgrade + routing fix + description
│   ├── dashboard/
│   │   └── DashboardClient.tsx   # AI copy rebrand (string replacements only)
│   └── halaqa/
│       ├── HalaqaClient.tsx      # Create modal + circle card description
│       └── [id]/
│           └── CircleDetailClient.tsx  # Description display + owner edit
├── lib/
│   └── types.ts                  # Add description?: string | null to Halaqa
supabase/
└── migrations/
    └── 20260318_phase5_description.sql  # ADD COLUMN halaqas.description
```

### Pattern 1: Supabase `generateMetadata()` for Join Page SEO

The join page's `page.tsx` is a Next.js server component — it can export `generateMetadata` which runs at request time on the server. This fetches the circle name from Supabase using the server client and injects it into `<title>` and OG tags.

```typescript
// src/app/join/[invite_code]/page.tsx
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export async function generateMetadata(
  props: { params: Promise<{ invite_code: string }> }
): Promise<Metadata> {
  const { invite_code } = await props.params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("halaqas")
    .select("name")
    .eq("invite_code", invite_code.toUpperCase())
    .single();
  const circleName = data?.name ?? "Legacy Circle";
  return {
    title: `Join ${circleName} on Legacy`,
    description: `You've been invited to join ${circleName} — an accountability circle for sustaining Ramadan habits.`,
    openGraph: {
      title: `Join ${circleName} on Legacy`,
      description: `You've been invited to join ${circleName}.`,
    },
  };
}
```

**Source:** Next.js 14 App Router official docs — `generateMetadata` is the standard server-side metadata pattern. Confidence: HIGH.

### Pattern 2: Inline Owner Edit State (CircleDetailClient)

Use a single `editingDescription` boolean state plus a `draftDescription` string state. No modal needed — an inline `<textarea>` replaces the display text when editing.

```typescript
const [editingDescription, setEditingDescription] = useState(false);
const [draftDescription, setDraftDescription] = useState("");

const isOwner = currentUserId !== "" && currentUserId === halaqa?.created_by;

// Save handler
const saveDescription = async () => {
  if (!halaqa) return;
  const supabase = createClient();
  await supabase
    .from("halaqas")
    .update({ description: draftDescription.trim() || null })
    .eq("id", halaqa.id);
  setHalaqa((prev) => prev ? { ...prev, description: draftDescription.trim() || null } : prev);
  setEditingDescription(false);
};
```

**Anti-pattern to avoid:** Refetching the whole halaqa after save. The local optimistic update above is correct and matches the established pattern in HalaqaClient for habit toggles.

### Pattern 3: Char Counter Below Textarea

```typescript
// Shown below description textarea, right-aligned
const remaining = 150 - draftDescription.length;
// Color: normal until < 20 chars remain, then amber, then red
const counterColor =
  remaining < 0 ? "#EF4444" : remaining < 20 ? "var(--accent)" : "var(--foreground-muted)";
```

Right-align the counter, use `fontSize: "0.7rem"`. Disable the save button when `remaining < 0`.

### Pattern 4: `create_private_halaqa` RPC — Description Passthrough

The RPC currently accepts `p_name`, `p_gender`, `p_invite_code`. It does NOT accept a description parameter. Two valid approaches:

**Option A (recommended):** Pass `description` as a separate `.update()` call after the RPC returns the new `halaqa_id`. This avoids modifying the SECURITY DEFINER RPC.

```typescript
const { data: newHalaqaId } = await supabase.rpc("create_private_halaqa", { ... });
if (newCircleDescription.trim()) {
  await supabase
    .from("halaqas")
    .update({ description: newCircleDescription.trim() })
    .eq("id", newHalaqaId);
}
```

**Option B:** Add `p_description TEXT DEFAULT NULL` parameter to the RPC. Requires a new migration but is cleaner. Given the RLS recursive dependency concern, and that the creator is the `created_by` user who should have write access via owner policy, Option A is safer — it uses a regular client call which goes through RLS.

**The local `newHalaqa` object** must also include `description: newCircleDescription.trim() || null` since it's written to sessionStorage and used for optimistic rendering before the DB propagates.

### Anti-Patterns to Avoid

- **Using Tailwind classes for layout:** JoinClient currently violates the project convention. The fix is to convert all `className` layout to inline `style={}`. The `btn btn-accent` class and `glass` class can stay (they are component-level utility classes, not spacing utilities).
- **Fetching after optimistic update:** After saving a description in CircleDetailClient, update local state directly — do not refetch.
- **Showing description placeholder to non-owners:** Per spec, non-owners should see nothing when description is absent. Owners see the "Add a vibe" CTA.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Server-side metadata | Custom head injection | `generateMetadata()` export in page.tsx | Built into Next.js 14, zero overhead |
| Description character limit | Custom validation hook | Standard `maxLength`-like pattern with `value.slice(0, 150)` or disabled submit | Simple enough to inline |
| Supabase owner check | Custom RPC | `currentUserId === halaqa?.created_by` client-side + RLS write policy | Owner identity already in state |

---

## Common Pitfalls

### Pitfall 1: JoinClient Still Uses Tailwind Layout Classes
**What goes wrong:** The existing `JoinClient.tsx` uses `className="min-h-dvh flex flex-col items-center justify-center"` extensively. In the Tailwind v4 + dev environment, these spacing classes are unreliable. The rest of the app has already migrated to inline styles.
**Why it happens:** The join page was built before the inline-styles decision was established.
**How to avoid:** Convert every layout `className` to inline `style={}`. Safe to keep: `className="glass"`, `className="btn btn-accent"`, `className="animate-bounce-in"` — these are design-system classes, not spacing utilities.
**Warning signs:** If the visual redesign doesn't render correctly in dev, Tailwind spacing classes are likely the cause.

### Pitfall 2: `halaqaInfo` State Missing `description` on JoinClient
**What goes wrong:** The `halaqaInfo` state object is typed inline with `{ id, name, member_count, max_members }`. Adding `description` requires updating both the state type annotation and the `setHalaqaInfo` call after the Supabase fetch.
**How to avoid:** Update the inline type, extend the `.select()` query to include `description`, and populate `description: halaqa.description` in `setHalaqaInfo`.

### Pitfall 3: Post-Join Redirect Goes to `/halaqa` Not `/halaqa/[id]`
**What goes wrong:** Current code at line 70 of JoinClient: `router.push("/halaqa")` — sends the user to the My Circles tab root, not the specific circle. The user joined a circle and then doesn't see it.
**How to avoid:** Change to `router.push(\`/halaqa/${halaqaInfo.id}\`)`. The `halaqaInfo.id` is already in state when `handleJoin` runs.

### Pitfall 4: `create_private_halaqa` RPC Doesn't Accept Description
**What goes wrong:** The RPC signature is `(p_name, p_gender, p_invite_code)` — passing a `p_description` argument would throw a Postgres error. Also, the optimistically-constructed `newHalaqa` local object would not include description, causing a flash of missing content before the page reloads.
**How to avoid:** Use Option A above — a separate `.update()` call after the RPC. Ensure the local `newHalaqa` object also includes `description`.

### Pitfall 5: Owner Edit Triggers RLS Error
**What goes wrong:** The RLS write policy on `halaqas` allows the owner (created_by) to update their own rows. If the policy only covers INSERT (not UPDATE), the `description` update will silently fail or throw 403.
**How to avoid:** Verify the existing RLS policy covers UPDATE for the creator. Check `20260315_phase2_security.sql`. If not covered, add to the migration: `CREATE POLICY "Owner can update halaqa" ON halaqas FOR UPDATE USING (created_by = auth.uid())`.

---

## Code Examples

### Supabase Migration

```sql
-- supabase/migrations/20260318_phase5_description.sql
BEGIN;

ALTER TABLE halaqas
  ADD COLUMN IF NOT EXISTS description TEXT
  CHECK (description IS NULL OR char_length(description) <= 150);

-- RLS: allow circle owner to update (covers description edits)
-- Only add if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'halaqas' AND policyname = 'Owner can update halaqa'
  ) THEN
    CREATE POLICY "Owner can update halaqa"
      ON halaqas FOR UPDATE
      USING (created_by = auth.uid());
  END IF;
END$$;

COMMIT;
```

### Updated `Halaqa` Type

```typescript
// src/lib/types.ts — add description field
export interface Halaqa {
  id: string;
  name: string;
  created_by: string | null;
  invite_code: string;
  gender: "Brother" | "Sister";
  is_public: boolean;
  max_members: number;
  created_at: string;
  description?: string | null;   // NEW — Phase 5
}
```

### Join Page CTA Button (inline style pattern)

```typescript
// Personalized CTA — inline styles matching project convention
<button
  onClick={handleJoin}
  disabled={joining}
  style={{
    width: "100%",
    height: "52px",
    background: "var(--accent)",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontWeight: 700,
    fontSize: "1rem",
    cursor: joining ? "not-allowed" : "pointer",
    opacity: joining ? 0.6 : 1,
    marginBottom: "12px",
  }}
>
  {joining ? "Joining..." : `Join ${halaqaInfo?.name}`}
</button>
```

### Circle Name Heading on Join Page (editorial upgrade)

```typescript
<h1
  style={{
    fontFamily: "var(--font-serif)",
    fontWeight: 400,
    fontSize: "2.4rem",
    lineHeight: 1.1,
    color: "var(--foreground)",
    marginBottom: "12px",
  }}
>
  {halaqaInfo?.name}
</h1>

{/* Amber divider — more prominent */}
<div
  style={{
    height: "2px",
    width: "56px",
    margin: "0 auto 20px",
    background: "var(--accent)",
    borderRadius: "2px",
  }}
/>
```

### Description Display in CircleDetailClient (between h1 and stats row)

```typescript
{/* Description — shown below circle name when present */}
{halaqa?.description && !editingDescription && (
  <p
    style={{
      fontStyle: "italic",
      color: "var(--foreground-muted)",
      fontSize: "0.9rem",
      marginBottom: "16px",
      lineHeight: 1.55,
    }}
  >
    {halaqa.description}
  </p>
)}

{/* Owner "Add a vibe" CTA — only when description is absent */}
{!halaqa?.description && isOwner && !editingDescription && (
  <button
    onClick={() => { setDraftDescription(""); setEditingDescription(true); }}
    style={{
      background: "none",
      border: "none",
      cursor: "pointer",
      fontSize: "0.75rem",
      color: "var(--foreground-muted)",
      textDecoration: "underline",
      marginBottom: "16px",
      padding: 0,
    }}
  >
    + Add a vibe
  </button>
)}
```

### Description Blurb on My Circles Card (HalaqaClient)

```typescript
{/* Description blurb — 1 line, ellipsis */}
{card.halaqa.description && (
  <p
    style={{
      fontSize: "0.75rem",
      color: "var(--foreground-muted)",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      marginTop: "2px",
    }}
  >
    {card.halaqa.description}
  </p>
)}
```

---

## Integration Map

All surfaces that need `description` after the migration:

| Surface | File | Change Type | Query update needed? |
|---------|------|------------|---------------------|
| DB | `20260318_phase5_description.sql` | ADD COLUMN | — |
| Type | `src/lib/types.ts` | Add field to `Halaqa` interface | — |
| Join page data fetch | `JoinClient.tsx` | Add `description` to `.select()` string | Yes — explicit select |
| Join page render | `JoinClient.tsx` | Show description between name and member pill | — |
| Circle detail header | `CircleDetailClient.tsx` | Render + owner edit UI | No — uses `*` |
| My Circles cards | `HalaqaClient.tsx` | Render blurb on card | No — uses `*` |
| Create modal | `HalaqaClient.tsx` | Add textarea input + char counter | — |
| Local optimistic object | `HalaqaClient.tsx` | Include `description` in `newHalaqa` | — |

---

## Open Questions

1. **RLS UPDATE policy on halaqas**
   - What we know: The initial migration (`20260312_add_halaqas.sql`) has a comment "strict RLS policies would be added here" — they may not be fully present. The security migration (`20260315_phase2_security.sql`) added SELECT/INSERT via the `create_private_halaqa` SECURITY DEFINER RPC but may not include an explicit UPDATE policy.
   - What's unclear: Whether a blanket UPDATE policy for owners exists.
   - Recommendation: Include a conditional `CREATE POLICY` for owner UPDATE in the Phase 5 migration (shown in code examples above). If it already exists, the conditional DO block will skip silently.

2. **`create_private_halaqa` RPC — description passthrough approach**
   - What we know: Option A (separate `.update()` after RPC) vs Option B (add `p_description` param to RPC).
   - What's unclear: Whether the creator will have an UPDATE RLS policy at the time of the separate call.
   - Recommendation: Use Option A + ensure the UPDATE RLS policy is in the migration. This avoids touching the SECURITY DEFINER RPC.

---

## Sources

### Primary (HIGH confidence)
- Direct source code audit — `JoinClient.tsx`, `DashboardClient.tsx`, `HalaqaClient.tsx`, `CircleDetailClient.tsx`, `src/lib/types.ts`, all migration SQL files
- Next.js 14 `generateMetadata` pattern — built-in App Router API, stable since Next.js 13.4

### Secondary (MEDIUM confidence)
- Supabase `CHECK` constraint syntax for character limits — standard PostgreSQL, no version concerns
- Conditional `DO $$ IF NOT EXISTS` for idempotent policy creation — standard PostgreSQL

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, all existing patterns
- Architecture: HIGH — based on direct source code reading, not inference
- Pitfalls: HIGH — identified by reading actual code (Tailwind class usage in JoinClient, incorrect redirect, missing RLS policy coverage)
- Open questions: LOW risk — both are resolved in the migration plan

**Research date:** 2026-03-18
**Valid until:** 2026-03-25 (stable codebase, no external dependencies changing)
