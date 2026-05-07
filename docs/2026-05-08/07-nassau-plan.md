---
prompt_id: "07"
timestamp: 2026-05-08T00:00:00Z
checklist_item_ref: "Phase 7 — Nassau sweep cutover — Plan"
tags: [plan, nassau, phase-7, sweep]
status: AWAITING_CODEX_REVIEW
---

# Nassau Phase 7 Plan — aggregateRound Cutover

**Approval gate:** No — 2 files changed, no schema/dependency/public-API change.  
**Step 4 (diff-level pre-review):** will skip (no approval gate).  
**Verification mode:** Codex-verified. STOP before Develop for GM approval.

---

## Objective

Cut over `payouts.ts` `case 'nassau'` from direct `.payouts` extraction to `aggregateRound` orchestration, matching the Wolf/Skins sweep template where possible, and documenting the compound-key divergence.

---

## Approach

Three files touched: `src/lib/payouts.ts` (replace the `case 'nassau'` body), `src/lib/payouts.test.ts` (append NP1–NP10 orchestration tests). No bridge file changes — `buildNassauCfg` is already exported (confirmed NE3).

The only structural divergence from the Wolf/Skins template is the **byBet extraction path**: Nassau uses compound keys `${betId}::${matchId}` in `byBet`, so `result.byBet[game.id]` is always `undefined`. Instead, use `result.netByPlayer` — safe because `computeGamePayouts` builds a single-bet log and Nassau's net is fully captured in `netByPlayer`.

---

## Files to change

| File | Change |
|---|---|
| `src/lib/payouts.ts` | Replace `case 'nassau'` body with aggregateRound orchestration |
| `src/lib/payouts.test.ts` | Append NP1–NP10 Nassau orchestration tests |

No bridge files change. No new imports beyond what Wolf/Skins already established.

---

## Orchestration code (proposed)

```typescript
case 'nassau': {
  // Phase 7 sweep: orchestrate through aggregateRound (Nassau, Wolf/Skins pattern).
  // Bridge produces finalized events (finalizeNassauRound runs inside settleNassauBet);
  // log is assembled here; aggregateRound reduces to RunningLedger.
  // DIVERGENCE from Wolf/Skins: Nassau byBet uses compound keys (${game.id}::${matchId}).
  // byBet[game.id] is always undefined — use netByPlayer instead.
  // Single-bet log: netByPlayer == this Nassau bet's total net deltas. Zero-sum guaranteed.
  // Ref: docs/games/game_nassau.md; docs/2026-05-08/06-nassau-explore.md (NE6, NE9)
  const nassauCfg = buildNassauCfg(game)
  // Guard: buildNassauCfg must preserve game.id so event attribution is correct.
  // (GR8 — string-equality bet-id chain). If this throws, the bridge contract broke.
  if (nassauCfg.id !== game.id) {
    throw new Error(`Nassau bridge id contract violation: nassauCfg.id="${nassauCfg.id}" !== game.id="${game.id}"`)
  }
  const { events } = settleNassauBet(holes, players, game)
  const log: ScoringEventLog = { events, supersessions: {} }
  const roundCfg = buildMinimalRoundCfg(nassauCfg, 'nassau')
  const result = aggregateRound(log, roundCfg)
  // Nassau byBet keys are compound (${game.id}::${matchId}) — byBet[game.id] is undefined.
  // netByPlayer is safe: single-bet log, no cross-bet contamination.
  return payoutMapFromLedger(result.netByPlayer, game.playerIds)
}
```

**Import change:** `buildNassauCfg` must be imported from `'../bridge/nassau_bridge'` alongside the existing `settleNassauBet`. Current import line in payouts.ts:
```typescript
import { settleNassauBet } from '../bridge/nassau_bridge'
```
Updated:
```typescript
import { settleNassauBet, buildNassauCfg } from '../bridge/nassau_bridge'
```

---

## Test plan (NP1–NP10)

All tests in `src/lib/payouts.test.ts`, appended after the SP-series. Each test calls `computeAllPayouts` (the public surface) with a single Nassau game.

| ID | Scenario | Verification |
|---|---|---|
| NP1 | Front wins, back wins, overall wins → 3× stake to winner | Basic 3-leg payout shape |
| NP2 | Front ties, back wins, overall wins → 2× stake | Tied leg correctly zeroed |
| NP3 | All legs tie → zero payout all players | Full-tie zero-sum |
| NP4 | Front wins, back wins, overall tied → net = 2× stake | Overall tie with two sub-wins |
| NP5 | Press opened mid-round, press wins → press stake added to main stake | Press payout stacks correctly |
| NP6 | Press opened, press ties → press stake = 0, main unaffected | Press tie isolation |
| NP7 | GR8 guard: nassauCfg.id !== game.id → throws (manual override test) | Contract violation throws |
| NP8 | Zero payout round: all holes forfeited → all zeros, no negative | Zero-sum floor check |
| NP9 | 2-player vs 3-player attempt → 3-player returns emptyPayouts (engine guards 2-player only) | Player-count guard |
| NP10 | Regression: computeAllPayouts with Nassau + Skins multi-bet → each bet isolated | No cross-bet contamination via netByPlayer |

**NP7 note:** The GR8 guard cannot be unit-tested by calling `buildNassauCfg` with a tampered id (since the function reads `game.id`). The test will mock `buildNassauCfg` to return a cfg with a deliberately different id. If mocking is unavailable, NP7 becomes an integration comment test (documents what WOULD throw) and a separate manual test step.

**NP10 note:** This is the critical regression for the `netByPlayer` extraction path. The log passed to `aggregateRound` inside `case 'nassau'` contains ONLY Nassau events. The Wolf/Skins `case` branches each build their own log. Cross-contamination is structurally impossible — NP10 confirms via the end-to-end output.

---

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| `result.netByPlayer` includes events from other bets | None — log is built in the `case 'nassau'` scope, contains only `settleNassauBet` events | NP10 regression test |
| Double-finalization via aggregateRound finalizer | None — `finalizeNassauRound` skips `match.closed === true` (NE5) | Documented in NE5; not tested separately |
| `payoutMapFromLedger` incompatible with `netByPlayer` shape | None — `netByPlayer` is `Record<string, number>`, same shape as ledger | Same utility used by Wolf/Skins |
| Press events inflate `netByPlayer` double | None — press events are `NassauWithdrawalSettled` with their own compound key; they accumulate correctly | NP5/NP6 cover press |
| Zero-sum violation via carry/round-rounding | None — Nassau is integer-safe per bridge docs | NP3/NP4 check zero-sum |

---

## Divergences from Wolf/Skins template

| Aspect | Wolf/Skins | Nassau |
|---|---|---|
| `buildXxxCfg` already exported? | Skins: no (1-char patch) | Yes — no bridge change |
| Bridge `.ledger` in return? | Yes | No — `.payouts` (discarded) |
| byBet key shape | Simple `betId` | Compound `${betId}::${matchId}` |
| Extraction path | `result.byBet[game.id] ?? {}` | `result.netByPlayer` |
| `??{}` fallback needed? | Yes — safe zero-event fallback | No — `netByPlayer` is always defined (`{}` by init) |
| GR8 guard triggers? | Yes | Yes — same guard shape |

---

## Out of scope

- `settleNassauBet` bridge internals — not changing
- `finalizeNassauRound` — not changing  
- `nassau_bridge.test.ts` — not changing  
- Press UI or press configuration surface — not changing  
- `nassau-flow.spec.ts` E2E spec — known gap, filed separately (NA-5 Cowork)  
- Any other game type in payouts.ts

---

## Success criteria

1. `npm run test:run` — all tests pass; NP1–NP10 new tests in the count
2. `npx tsc --noEmit` — clean
3. Grep gate: `grep -rn "settleNassauBet.*\.payouts" src/lib/payouts.ts` → 0 matches
4. Codex post-review: clean or findings addressed
5. Reviewer sub-agent: APPROVED
