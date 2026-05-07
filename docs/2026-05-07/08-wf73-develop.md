---
prompt_id: "08"
timestamp: 2026-05-07T00:00:00Z
checklist_item_ref: "Phase 7 — WF7-3 multi-bet E2E spec (Wolf + Skins)"
tags: [develop, wf7-3, wolf, skins, e2e, playwright]
status: AWAITING_GM_REVIEW
---

# WF7-3 Develop Report — Wolf + Skins Multi-Bet E2E Spec

**Verification mode:** Standard (spec-only; reviewer applies per GM prompt)  
**Reviewer:** APPROVED  
**Codex review:** 1 P2 finding — addressed

---

## Step 1 — Explore findings

- `computePerHoleDeltas` in `perHoleDeltas.ts` already handles both Wolf and Skins via per-bet dispatch → `byGame[hole][gameId][playerId]` populated for both games → BetDetailsSheet shows both Wolf and Skins breakdown rows automatically in a multi-bet round.
- Results page `computeAllPayouts` uses the WF7-2 aggregateRound path for Wolf and per-bet for Skins → combined ledger displayed in Money Summary.
- Results page payout spans: `<span class="font-mono text-sm font-bold">` (Money Summary amounts) vs `<p class="font-mono text-lg">` (hero winner amount) — span-based filter correctly scopes to summary only.
- `saveHole` helper from nassau spec: waits for PUT response, not UI transition — can race hole advancement in tight loops.

## Step 2 — Plan

**Fixture:** 4 players (all scratch), Wolf + Skins both active. Hole 1: Alice lone wolf + Alice wins skin. Hole 2: Bob lone wolf + Bob wins skin. Holes 3-18: all par (WolfDecisionMissing + Skins 14-hole carry → split → $0).

**Pre-computed settlement:**
- Alice: Wolf +2000 + Skins +1000 = +3000 (+$30.00)
- Bob: Wolf +2000 + Skins +1000 = +3000 (+$30.00)
- Carol: Wolf -2000 + Skins -1000 = -3000 (-$30.00)
- Dave: Wolf -2000 + Skins -1000 = -3000 (-$30.00)
- Σ = 0 ✓

## Step 5 — Develop

### File created

`tests/playwright/wolf-skins-multibet-flow.spec.ts` — 5 sections + inline fence:

| Section | What it tests |
|---|---|
| §1 + §6 fence | Setup with Wolf + Skins; wolfTieRule 'No pts' pill (WF7-1); Match Play absent from picker |
| §2 | Hole 1 (Alice lone wolf + skins win): BetDetailsSheet shows ≥2 breakdowns for Alice; both "Wolf" and "Skins" labels present; positive delta |
| §3 | Hole 2 (Bob lone wolf + skins win): BetDetailsSheet for Alice shows ≥2 breakdowns; negative delta (loser on both) |
| §4 | Complete round: holes 3-17 with post-save guard; hole 18 finish |
| §5 | Results page: `span` filter for `+$30.00` (count=2) and `-$30.00` (count=2); algebraic zero-sum; Money Summary and winner heading visible |

### Key implementation decisions

- **Results page assertion:** Used `page.locator('span').filter({ hasText: /^\+\$30\.00$/ })` (regex anchor match on span text) instead of CSS class selector. Reason: CSS class `span.font-mono.text-sm.font-bold` matched 4 unexpectedly non-payout spans in the working tree; span text filter is unambiguous. The hero section uses `<p>` not `<span>`, so the span filter correctly isolates Money Summary entries.
- **wolfTieRule tie coverage note:** `wolfTieRule='no-points'` WolfHoleTied path is covered at unit level (payouts.test.ts WP4). Holes 3-18 in this spec use WolfDecisionMissing (no declaration clicked) which also produces $0 delta — both paths are zero-delta for different reasons, both correct.
- **Skins carry chain:** holes 3-18 all tied → 14-hole carry → `tieRuleFinalHole='split'` (bridge hardcode) → SkinCarryForfeit → $0. Fixture Math confirmed by reviewing skins rule doc §5.

## Step 6 — Codex review

**Session ID:** see background task b5qk3o4fd  
**Verdict:** 1 P2 finding — addressed.

| Finding | Priority | Disposition |
|---|---|---|
| `saveHole` loop can race hole transition (PUT fires before React advances hole state) | P2 | Addressed: added `await expect(locator('button').filter({hasText: /Save & Next Hole\|Finish Round/})).toBeVisible()` after each save in the holes 3-17 loop. Accepts either button to handle the hole-17→hole-18 transition correctly. |

**Reviewer sub-agent verdict:** APPROVED — fixture math verified: Wolf and Skins totals confirmed correct; GR3 zero-sum verified algebraically; GR7 no silent defaults (WolfDecisionMissing path explicitly noted in comments); GR2 integer-unit math trivially satisfied.

---

## Verification

| Check | Result |
|---|---|
| `tests/playwright/wolf-skins-multibet-flow.spec.ts` | 1/1 pass |
| All existing E2E specs | 5/5 pass (no regressions: nassau, skins, stroke-play, wolf, wolf-skins-multibet) |
| `npm run test:run` | 658/658 pass |
| `npx tsc --noEmit` | Clean |
| Reviewer sub-agent | APPROVED |
| Codex review | 1 finding, addressed |

---

## Notes

- `src/lib/perHoleDeltas.ts` unchanged (deferred per locked decision) — BetDetailsSheet correctly shows both Wolf and Skins via the existing per-bet dispatch in perHoleDeltas.
- WF7-3 exercises the WF7-2 aggregateRound path for Wolf end-to-end (round completion → results page shows Wolf payouts computed via aggregateRound).
- Cowork verification is WF7-4 and is the GM's call to schedule.
