---
prompt_id: "09"
timestamp: 2026-05-08T00:00:00Z
checklist_item_ref: "Phase 7 — Nassau sweep cutover — Develop"
tags: [develop, nassau, phase-7, sweep]
status: AWAITING_GM_REVIEW
---

# Nassau Phase 7 Develop Report — aggregateRound Cutover

**Step 4 (diff-level pre-review):** skipped — no approval gate (no schema, no new dep, no public API change)  
**Reviewer:** APPROVED  
**Codex /review:** clean — no findings  
**Codex /adversarial-review:** approve — no material findings (NP8 revised to address medium finding; see below)

---

## Step 5 — Develop

### Files modified (2 files)

| File | Change |
|---|---|
| `src/lib/payouts.ts` | `case 'nassau'` body replaced; `buildNassauCfg` added to import |
| `src/lib/payouts.test.ts` | NP1–NP10 Nassau orchestration tests appended; header comment updated |

### Import change

```typescript
// Before:
import { settleNassauBet } from '../bridge/nassau_bridge'
// After:
import { settleNassauBet, buildNassauCfg } from '../bridge/nassau_bridge'
```

### Orchestration code (final)

```typescript
case 'nassau': {
  // Phase 7 sweep: orchestrate through aggregateRound (Nassau, Wolf/Skins pattern).
  // Bridge produces finalized events (finalizeNassauRound runs inside settleNassauBet);
  // log is assembled here; aggregateRound reduces to RunningLedger.
  // DIVERGENCE from Wolf/Skins: Nassau byBet uses compound keys (${game.id}::${matchId}).
  // byBet[game.id] is always undefined — use netByPlayer instead.
  // PRECONDITION: the log assembled here contains events from this single Nassau bet only.
  // netByPlayer is correct under this precondition because aggregateRound is a pure reducer.
  // Multi-bet log usage would silently sum across bets — DO NOT change the assembly to span
  // multiple bets without revisiting this extraction.
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

**Identical shape to Wolf/Skins** except for the final extraction (`netByPlayer` vs `byBet[game.id] ?? {}`).

### Test fix during Develop — NP8 revised (Codex adversarial finding)

**Finding (Codex adversarial, medium):** Initial NP8 used `{ A: 0, B: 0 }` scores and asserted zero payout (all tied). Codex flagged that gross=0 is the app's missing-score sentinel and that Nassau should emit `NassauHoleForfeited` for missing scores, not treat them as halved holes.

**Root cause (architectural gap — pre-existing, not introduced by this cutover):** `buildHoleState` maps all absent/0 scores to `gross[pid] = 0` (not `undefined`). Nassau's forfeiture path checks `hole.gross[playerA] === undefined`, which `buildHoleState` never produces. This means missing scorecards silently tie rather than forfeit via the bridge path. This gap exists independent of the Phase 7 cutover and cannot be fixed without changing `buildHoleState` or adding a Nassau-specific HoleState builder.

**Fix:** NP8 replaced with "partial round (3 holes) → `finalizeNassauRound` settles open matches correctly". A wins holes 1-3 (A=3, B=5); back match never receives a hole (starts at hole 10). Finalization: front (A:3, B:0) → A wins (+100); back (0-0) → MatchTied (0); overall (A:3, B:0) → A wins (+100). Net: A+200, B-200.

This tests a genuine edge case (incomplete round settled by finalization) without asserting ambiguous 0-score behavior.

**Gap filed:** `buildHoleState` missing-score mapping for Nassau — tracked as a separate parking-lot item. Not in scope of Phase 7 payouts.ts sweep.

### Grep gate

```
grep -rn "settleNassauBet.*\.payouts" src/lib/payouts.ts
→ 0 matches (GATE PASSED)
```

No direct `.payouts` extraction from Nassau case in payouts.ts.

---

## Step 6 — Codex reviews

### /codex:review (line-level)
**Thread:** 019e034d-32b6-7420-b9c0-ca6ec450ec89  
**Verdict:** Clean — "The Nassau payout path remains single-bet scoped before using aggregateRound netByPlayer, and the added tests cover the main payout and isolation cases. No discrete correctness issues."

### /codex:adversarial-review (design-level) — run 1 (pre-NP8 fix)
**Thread:** 019e034e-b596-7383-be70-8d8fb729ecb2  
**Verdict:** needs-attention — one medium finding (NP8 zero-score assertion)

**Finding:** NP8 codifies zero gross scores as halved holes instead of missing-score forfeits. Recommendation: fix or replace NP8.

**Triage:** In-scope correction per autonomous fix rules (small, unambiguous, does not change orchestration code, only test revision). Fixed: NP8 replaced with partial-round test. Gap filed separately.

### /codex:adversarial-review (design-level) — run 2 (post-NP8 fix)
**Verdict:** approve — "No substantive ship-blocking finding supported from the diff. The Nassau payout path now re-reduces the bridge event log through aggregateRound and extracts netByPlayer; traced aggregate handling closes replayed Nassau matches and avoids double-finalization. TypeScript passes."

netByPlayer single-bet-log precondition specifically validated — no material findings on that load-bearing assumption.

---

## Verification

| Check | Result |
|---|---|
| `npm run test:run` | 23 files, 718 tests — all pass (677 → +41: +39 new Nassau tests; NP8 grew from 2 to 4 assertions) |
| `npx tsc --noEmit` | Clean |
| Grep gate: `"settleNassauBet.*\.payouts"` | 0 matches |
| All E2E specs | 5/5 pass — including `nassau-flow.spec.ts` (Nassau live path regression) |
| Reviewer sub-agent | APPROVED (all 7 GRs verified) |
| `/codex:review` | Clean |
| `/codex:adversarial-review` | approve (run 2) — no material findings |

---

## Divergences from Wolf/Skins template

| Aspect | Wolf/Skins | Nassau |
|---|---|---|
| `buildXxxCfg` already exported? | Skins: no (1-char patch) | Yes — no bridge change |
| Bridge return `.ledger`? | Yes | No — `.payouts` (discarded post-cutover) |
| byBet key shape | Simple `betId` | Compound `${betId}::${matchId}` |
| Extraction path | `result.byBet[game.id] ?? {}` | `result.netByPlayer` |
| `??{}` fallback needed? | Yes | No — `netByPlayer` always defined (`{}` by init) |
| GR8 guard same shape? | Yes | Yes |

---

## Architectural gaps filed (not in scope of this sweep)

**buildHoleState 0-vs-undefined for Nassau:** `buildHoleState` maps absent scores to `gross=0`, not `undefined`. Nassau engine's forfeiture path checks for `undefined`, so `NassauHoleForfeited` never fires via the bridge. This means incomplete scorecards silently tie rather than forfeit. Requires a Nassau-specific HoleState builder extension or buildHoleState update with a Nassau-aware mapping. Filed as parking-lot item; out of scope for Phase 7 payouts.ts sweep.

---

## For GM to verify

- Working tree diff: `src/lib/payouts.ts` (orchestration code + import) and `src/lib/payouts.test.ts` (NP1–NP10 + header)
- Reviewer APPROVED on all 7 GRs
- Codex adversarial run 2: approve, no material findings
- 718 tests pass; 5/5 E2E pass
- The `buildHoleState` gap is acknowledged, filed, and out of scope

**Next sweep slice: Stroke Play** — once GM approves this Nassau slice.
