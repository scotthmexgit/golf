---
prompt_id: 016
date: 2026-04-29
role: documenter
checklist_item_ref: "SK-0 — Skins phase plan doc"
tags: [skins, plan-doc, sk-0, phase-open]
---

# SK-0 — Skins Phase Plan Authored

## Summary

Wrote `docs/plans/SKINS_PLAN.md` and updated `IMPLEMENTATION_CHECKLIST.md`. SK-0 is closed.

---

## Files written / modified

| File | Action | Notes |
|---|---|---|
| `docs/plans/SKINS_PLAN.md` | **Created** | Skins phase plan — SK-0 through SK-5 |
| `IMPLEMENTATION_CHECKLIST.md` | **Modified** | Active plan pointer updated; active item set to SK-1a; design timeline phase 5 closed, phase 6 (Skins) added |

---

## Plan doc structure summary

**§Scope** — Phase ends at SK-5 close (5-gate criterion including Playwright spec and Cowork pass).

**§1 Resolved Decisions** — Four decisions encoded:
- **A**: Wizard guard enforces ≥ 3 players on Skins instances (SK-3).
- **B**: Universal two-row scorecard rearchitecture — gross + total $/hole, expandable accordion — applies to all bets, Skins rides on it (SK-1a + SK-1b).
- **C**: R4 reload fix in SK-2; fix shape proposed (optional `finalHole` param or bridge completeness check); Playwright used during SK-2 development.
- **D**: Amended Candidate B gate — 5 items including Playwright spec + Cowork pass.

**§2 Park Definitions** — Wolf, Nassau, Match Play remain `disabled: true`. Junk structurally parked. `tieRuleFinalHole` picker and `appliesHandicap` toggle explicitly parked for v1 with known unpark path.

**§3 Fully Functional** — Engine surface, in-scope UI, out-of-scope items, edge cases enumerated.

**§4 Phases** — SK-0 through SK-5. SK-1 split at the documenter's judgment:
- **SK-1a**: Data-flow plumbing + two-row layout (foundation; M sizing). Stroke Play regression gate included.
- **SK-1b**: Accordion per-bet breakdown (additive on SK-1a; S sizing). Can land before or after SK-2.
- **SK-2**: Skins cutover + R4 fix (S–M). Requires SK-1a. Includes grep gate (`computeSkins → 0`) and DB check for historical Skins rounds.
- **SK-3**: Wizard player-count guard (XS). Requires SK-2 to be testable.
- **SK-4**: Playwright spec `skins-flow.spec.ts` (S). 8 assertion groups including carry, reload/R4, accordion, finish, results zero-sum, DB Complete, fence tokens.
- **SK-5**: Cowork visual verification (1 session). Phase terminal item.

**§5 Phase-End Trigger Criteria** — 5 items matching Candidate B amended.

**§6 Parking-Lot Policy** — Active-deferred and independent-deferred items tabulated.

**§7 Risk Register** — R1–R7:
- R1: legacy `computeSkins` divergence (low likelihood; DB check in SK-2).
- R2: per-hole display gap → resolved by SK-1.
- R3: player-count enforcement → resolved by SK-3.
- R4: reload mid-round → resolved in SK-2.
- R5: empty ledger when all skins forfeit → SK-2 AC includes assertion.
- R6 (new): scorecard rearch regresses Stroke Play → `stroke-play-finish-flow.spec.ts` regression gate in SK-1a.
- R7 (new): two-row layout on small viewport → SK-5 Cowork check; SK-1a engineer checks mobile in dev tools.

**§8 Decisions Deferred** — 11 items explicitly deferred post-SK-5.

---

## Documenter judgment calls

1. **SK-1 split.** The prompt invited a split at "data flow plumbing / two-row layout / accordion." I split into SK-1a (plumbing + two-row, coupled) and SK-1b (accordion, additive). This makes SK-1a the dependency for SK-2 and lets SK-1b land after Skins is live if needed.

2. **SK-1a Stroke Play behavior.** The GM proposed "$0 on in-progress holes, full delta on final hole." I encoded this as a proposed approach in the SK-1a AC, with the engineer documenting the final choice in the session log. This preserves engineering flexibility without leaving the question open.

3. **Risk R6 and R7 added.** Neither was in the research turn's risk list. Both are natural consequences of the scorecard rearchitecture being a central regression surface (R6) and the app being used on mobile (R7). Added to the register rather than leaving them implicit.

4. **SK-1b sequencing note.** Added an explicit note in SK-1b that it can land before or after SK-2. The accordion shows "Skins $0" if SK-1b lands before SK-2 (still valid display). SK-4 requires SK-1b so the Playwright spec can test accordion behavior.

---

## IMPLEMENTATION_CHECKLIST.md changes

- Line 5: "Active plan" changed from `STROKE_PLAY_PLAN.md` to `SKINS_PLAN.md`.
- Active item section: replaced "Stroke-Play-only phase COMPLETE — No active item" with Skins phase active item, SK-1a description, and archived SP closure evidence.
- Design timeline: Phase 5 marked **done**; Phase 6 (Skins, SK-0–SK-5) added as **in progress**; Phase 7 (full cutover #11) renumbered.

---

## State after this prompt

| Item | Status |
|---|---|
| SK-0 | **CLOSED 2026-04-29** |
| `docs/plans/SKINS_PLAN.md` | Written |
| `IMPLEMENTATION_CHECKLIST.md` | Active item = SK-1a |
| SK-1a | Ready for SOD dispatch |
| vitest | 358/358 (unchanged — documenter turn, no code) |
