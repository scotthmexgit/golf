---
prompt_id: 04
timestamp: 2026-05-01
checklist_item_ref: "Nassau phase — NASSAU_PLAN.md amendment"
tags: [nassau, planning, amendment]
---

## Prompt

Amend `docs/plans/NASSAU_PLAN.md` to lock decisions A/B and sequencing Option A, add NA-pre-1 (RoundingAdjustment emission) as a pre-NA-1 item, and embed audit-derived gates F3/F6/F7/F8/F10 into the plan. Update IMPLEMENTATION_CHECKLIST.md with NA-pre-1 as active item and PL-1–4 parking-lot entries.

## Action

### Explore

Re-read NASSAU_PLAN.md (631 lines) and architecture audit `docs/2026-05-01/03-architecture-audit.md` §3–§5 to confirm amendment surface area. Key sections requiring changes:
- §Status header — PROPOSED → APPROVED
- §1 Decisions — pending → LOCKED
- §2 Assessments header — GM-required → retained for reference
- §5 Sequencing — recommended → LOCKED
- §6 Phases — NA-0 status, add NA-pre-1, update NA-1/2/3
- §9 Risk register — add R7

### Develop

10 targeted Edit calls to NASSAU_PLAN.md:
1. Status header — APPROVED, decisions + sequencing locked
2. §1 Decision A — LOCKED: YES
3. §1 Decision B — LOCKED: Option (a)
4. §2 header — "Assessments (Locked — retained for reference)"
5. Assessment A/B conclusion lines — Decision: LOCKED
6. §5 Sequencing header + Option A label — LOCKED; B/C marked "not chosen"
7. NA-0 status — CLOSED
8. Added NA-pre-1 full item (Purpose, In scope, Out of scope, 10 ACs, Phase plan)
9. NA-1 Dependencies updated; two new ACs (F6 buildMatchStates gate, F7 atomic-commit)
10. NA-2 F10 gate added; NA-3 F3 gate + `setPressConfirmation` requirement added
11. §9 R7 (NA-pre-1 prerequisite) added

4 Edit calls to IMPLEMENTATION_CHECKLIST.md:
- Active phase header — APPROVED, NA-pre-1 active item
- NA-pre-1 evidence block added
- PL-1 through PL-4 parking-lot entries (PL-2/3/4 marked ABSORBED; PL-1 active via NA-3)

### Codex probe

Attempt 1: `codex-companion.mjs review ""` — Turn failed. Error: `unexpected status 401`.
Attempt 2: same — 401 Unauthorized, cf-ray: `9f501190ccf19173-SEA`.

Both attempts 401. Stale broker issue (broker started before current login). GM authorized fallback — proceeding without Codex gate.

### Verify

- `npm run test:run`: 441/441 (no source changes)
- `tsc --noEmit`: clean (no source changes)
- Commit: `4e95a62`

## Result

- **Files changed:**
  - `docs/plans/NASSAU_PLAN.md` — amended: decisions locked, sequencing locked, NA-pre-1 added, NA-1/2/3 gates added, R7 added
  - `IMPLEMENTATION_CHECKLIST.md` — NA-pre-1 added as active item; PL-1–4 parking-lot entries

## Open questions

- None from plan perspective. GM has all decisions locked. Engineering can begin at NA-pre-1.

## Parking lot additions

- none

---

**Codex probe failed (401). Skipping Prompt 5. Awaiting GM go-ahead for NA-pre-1 engineering.**
