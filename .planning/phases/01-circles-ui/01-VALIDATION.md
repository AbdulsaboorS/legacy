---
phase: 1
slug: circles-ui
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no test framework installed in project |
| **Config file** | none |
| **Quick run command** | `npm run lint` |
| **Full suite command** | `npm run build && npm run lint` |
| **Estimated runtime** | ~30 seconds (lint) / ~90 seconds (build) |

---

## Sampling Rate

- **After every task commit:** Run `npm run lint`
- **After every plan wave:** Run `npm run build && npm run lint`
- **Before `/gsd:verify-work`:** Full suite must be green + manual browser check
- **Max feedback latency:** ~90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | CIRCLE-03 | lint+build | `npm run build && npm run lint` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | CIRCLE-03 | manual | Open `/halaqa`, verify circle cards render | N/A | ⬜ pending |
| 1-02-01 | 02 | 1 | CIRCLE-01 | lint+build | `npm run build && npm run lint` | ❌ W0 | ⬜ pending |
| 1-02-02 | 02 | 2 | CIRCLE-01 | manual | Open `/halaqa/[id]`, verify member board + stats bar | N/A | ⬜ pending |
| 1-02-03 | 02 | 2 | CIRCLE-02 | manual | Tap Invite button, verify share sheet or clipboard copy | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- No test framework to install — `npm run lint` and `npm run build` are the only automated checks available
- Manual browser verification covers all three requirements end-to-end

*Existing CI (lint + build) covers TypeScript and Next.js correctness. All UI behaviors are verified manually.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Circle cards render with name, X/Y done, avatar row | CIRCLE-03 | Pure UI render — no test framework | Navigate `/halaqa` → My Circles tab, verify cards show for each circle |
| Member board shows name, avatar, today status, habit breakdown | CIRCLE-01 | Pure UI render — no test framework | Tap a circle card → navigate to `/halaqa/[id]`, verify member rows |
| Invite button copies/shares link | CIRCLE-02 | Web Share API requires real browser interaction | Tap Invite on detail page, verify share sheet opens (mobile) or clipboard copy (desktop) |
| Gate works: member list locked until habits logged | CIRCLE-01 | State-dependent UI — requires real auth + DB state | Log 0 habits → visit `/halaqa/[id]`, verify member list is locked |
| Back arrow returns to My Circles tab | CIRCLE-01 | Navigation behavior — requires browser | From detail page, tap back → verify `/halaqa` lands on My Circles tab |
| Renders correctly on mobile, no overflow | All | Viewport-dependent — requires DevTools | Chrome DevTools → iPhone 12 Pro viewport, verify no horizontal scroll |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or are documented as manual-only above
- [ ] Sampling continuity: lint runs after every code commit
- [ ] Wave 0: N/A — no test framework stubs needed
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter when all manual checks pass

**Approval:** pending
