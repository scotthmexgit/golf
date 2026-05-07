---
prompt_id: "11"
timestamp: 2026-05-08T00:00:00Z
checklist_item_ref: "Phase 7 — Stroke Play sweep cutover — Plan"
tags: [plan, strokePlay, phase-7, sweep]
status: AWAITING_CODEX_REVIEW
---

# Stroke Play Phase 7 Plan — aggregateRound Cutover

**Approval gate:** No — 3 files changed (bridge: 1-char export; payouts.ts: case body; test: appended). No schema, no dependency, no public API change.  
**Step 4 (diff-level pre-review):** will skip (no approval gate).  
**Verification mode:** Standard — surface to GM after codex review. STOP before Develop.

---

## Objective

Cut over `payouts.ts` `case 'strokePlay'` from direct `.ledger` extraction to `aggregateRound` orchestration, matching the Wolf/Skins template exactly. Stroke Play is the fourth and final `payouts.ts` sweep slice.

---

## Approach

Three files touched: `src/bridge/stroke_play_bridge.ts` (1-char: export `buildSpCfg`), `src/lib/payouts.ts` (replace `case 'strokePlay'` body + update import), `src/lib/payouts.test.ts` (append STP1–STP10 orchestration tests). Template is Wolf/Skins (`byBet[game.id] ?? {}` extraction). No Nassau-style `netByPlayer` needed — byBet keys are simple.

---

## Files to change

| File | Change |
|---|---|
| `src/bridge/stroke_play_bridge.ts` | 1-char: `function buildSpCfg` → `export function buildSpCfg` |
| `src/lib/payouts.ts` | Replace `case 'strokePlay'` body; add `buildSpCfg` to import |
| `src/lib/payouts.test.ts` | Append STP1–STP10 Stroke Play orchestration tests; update header comment |

---

## Orchestration code (proposed)

```typescript
case 'strokePlay': {
  // Phase 7 sweep: orchestrate through aggregateRound (Stroke Play, Wolf/Skins template).
  // Bridge produces finalized events (finalizeStrokePlayRound runs inside settleStrokePlayBet);
  // log is assembled here; aggregateRound reduces to RunningLedger;
  // Stroke Play ledger extracted from byBet[game.id].
  // NOTE: aggregateRound has a Stroke Play finalizer path (aggregate.ts:384-393) that
  // filters for StrokePlayHoleRecorded. Bridge returns only final events (not hole records),
  // so the finalizer receives [] and emits nothing. No double-finalization.
  // ?? {} fallback is intentional: FieldTooSmall path emits no monetary events.
  // Ref: docs/games/game_stroke_play.md; docs/2026-05-08/10-strokeplay-explore.md (SE3, SE5)
  const spCfg = buildSpCfg(game)
  // Guard: buildSpCfg must preserve game.id so byBet keying is correct.
  // (GR8 — string-equality bet-id chain). If this throws, the bridge contract broke.
  if (spCfg.id !== game.id) {
    throw new Error(`Stroke Play bridge id contract violation: spCfg.id="${spCfg.id}" !== game.id="${game.id}"`)
  }
  const { events } = settleStrokePlayBet(holes, players, game)
  const log: ScoringEventLog = { events, supersessions: {} }
  const roundCfg = buildMinimalRoundCfg(spCfg, 'strokePlay')
  const result = aggregateRound(log, roundCfg)
  // byBet[game.id] is undefined only when FieldTooSmall fires (no scoring players).
  const spLedger = result.byBet[game.id] ?? {}
  return payoutMapFromLedger(spLedger, game.playerIds)
}
```

**Import change:**
```typescript
// Before:
import { settleStrokePlayBet } from '../bridge/stroke_play_bridge'
// After:
import { settleStrokePlayBet, buildSpCfg } from '../bridge/stroke_play_bridge'
```

**Identical to Wolf/Skins.** Same shape, same extraction, same guard, same fallback. Only the function names and the comment change.

---

## Test plan (STP1–STP10)

All tests in `src/lib/payouts.test.ts`, appended after NP series. Prefix `STP` (Stroke Play Phase 7) to avoid collision with SP series (Skins Phase 7). Each test calls `computeAllPayouts` (public surface) with a single Stroke Play game. All config flags hardcoded via bridge; tests exercise 'winner-takes-pot' + 'split' only.

| ID | Scenario | Verification |
|---|---|---|
| STP1 | Clear winner (4 players, A lowest net) → A+300, B/C/D -100 each | Basic winner shape, Σ=0, integers |
| STP2 | Zero-sum on STP1 (GR3) | Σ delta === 0 |
| STP3 | Integer assertion on STP1 (GR2) | All deltas Number.isInteger |
| STP4 | 2-way tie, split (3 players, A+B tied) → TieFallthrough + StrokePlaySettled → A+50, B+50, C-100 | Split payout correct, Σ=0 |
| STP5 | FieldTooSmall path (all scores=0 → all IncompleteCard → no settlement) → all zero via ??{} fallback | ??{} fallback intentional and correct |
| STP6 | GR8 contract: UUID-style game.id → non-zero payouts (no silent byBet mismatch) | Mirrors WP8/SP8/NP7 |
| STP7 | 3-way tie with RoundingAdjustment (4 players, A+B+C tied, D loses) → A=34, B=33, C=33, D=-100 (absorbing player gets +1 remainder) | RoundingAdjustment accumulates to byBet[game.id] correctly, Σ=0, all integers |
| STP8 | Partial round (1 hole only) → correct winner settled by finalizeStrokePlayRound | Partial-round settlement, Σ=0 |
| STP9 | Aggregation finalizer no-op: same scenario as STP1 on 18 holes vs 1 hole → payouts identical (proves aggregateRound finalizer is truly no-op, not producing extra settlement) | Finalizer no-op property |
| STP10 | Multi-bet isolation (Stroke Play [A,B] + Skins [C,D,E]) → vary Skins outcome, SP payouts unchanged; vary SP outcome, Skins payouts unchanged | Cross-bet contamination disproved (per NP10 precedent) |

**STP7 fixture detail:** 4 players A, B, C, D. Hole 1: A=4, B=4, C=4, D=5 (all scratch). 3-way tie at net=4. D loses (net=5). loserPot=100. perWinner=33, remainder=1. absorbingPlayer='A' (lex-first). Expected: A=34, B=33, C=33, D=-100.

**STP9 fixture detail:** STP1 scenario (A always wins) run with 1 hole vs 18 holes. Both produce A+300, B/C/D -100. If aggregateRound finalizer were NOT a no-op, 18 holes would produce A+600 (double settlement). Equality of the two runs proves the finalizer adds nothing.

**STP10 fixture detail:** Parallel to NP10. Nassau uses non-overlapping player sets (SP=[A,B], Skins=[C,D,E]). Vary C-wins vs D-wins in Skins while holding A-wins in SP: assert SP[A] and SP[B] payouts identical. Then vary A-wins vs B-wins in SP while holding C-wins in Skins: assert Skins[C/D/E] payouts identical.

---

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| aggregateRound Stroke Play finalizer double-finalizes | None (bridge returns only final events, filter gets []) | SE3 verified; STP9 proves empirically |
| `??{}` fallback silences FieldTooSmall payout error | None — FieldTooSmall is the correct no-settlement signal | STP5 verifies explicitly |
| `RoundingAdjustment` not accumulated to byBet[game.id] | None — reduceEvent handles it alongside StrokePlaySettled | STP7 verifies, zero-sum check catches |
| `buildSpCfg` export breaks something downstream | None — private function, no other callers | tsc --noEmit confirms |
| STP test prefix collision with existing SP (Skins) series | None — STP ≠ SP | Header comment disambiguates |

---

## 7 Ground Rules as Develop constraints

- **GR1:** Comments reference `docs/games/game_stroke_play.md` and SE3/SE5 from explore doc. No inline rule restatement.
- **GR2:** All deltas must be integers. `stroke_play.ts` is integer-safe. STP1/STP3/STP7 assert.
- **GR3:** Σ deltas must equal 0. `aggregateRound` throws ZeroSumViolationError if violated. STP1/STP2/STP4/STP7/STP10 assert.
- **GR4:** Handicap via `strokesOnHole` only (in stroke_play.ts — not touched here).
- **GR5:** No portability violations in `src/games/*` — not touching engine files.
- **GR6:** Every monetary delta traces to `StrokePlaySettled` or `RoundingAdjustment` typed events.
- **GR7:** `FieldTooSmall` emits explicitly for zero-scorer rounds (no silent zero). STP5 verifies.
- **GR8:** GR8 guard `if (spCfg.id !== game.id) throw` + STP6 UUID test confirm id chain.

---

## Out of scope

- `settleStrokePlayBet` bridge internals — not changing
- `finalizeStrokePlayRound` engine — not changing
- `stroke_play_bridge.test.ts` — not changing
- Settlement modes other than 'winner-takes-pot' (per-stroke, places) — not in v1 bridge
- Tie rules other than 'split' (card-back, scorecard-playoff) — not in v1 bridge
- E2E spec changes
- `src/lib/perHoleDeltas.ts` — deferred
- Any other game type in payouts.ts

---

## Success criteria

1. `npm run test:run` — all tests pass; STP1–STP10 in the count
2. `npx tsc --noEmit` — clean
3. Grep gate: `grep -rn "settleStrokePlayBet.*\.ledger\|\.ledger.*settleStrokePlayBet" src/lib/payouts.ts` → 0 matches
4. Codex post-review: clean or findings addressed
5. Reviewer sub-agent: APPROVED

---

## STOP — GM must approve this Plan and Codex findings before Develop begins.

**Codex review:** [13-strokeplay-plan-codex-review-rerun.md](13-strokeplay-plan-codex-review-rerun.md) (supersedes 12 — successful scoped run)  
**Findings:** F1 (??{} silent fallback → FieldTooSmall guard) + F2 (STP9 weak equality → assert exact values). Both medium, in-scope for Develop. GM triage required.
