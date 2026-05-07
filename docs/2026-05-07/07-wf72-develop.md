---
prompt_id: "07"
timestamp: 2026-05-07T00:00:00Z
checklist_item_ref: "Phase 7 — WF7-2 aggregateRound cutover (Wolf-pilot)"
tags: [develop, wf7-2, wolf, orchestration]
status: AWAITING_GM_REVIEW
---

# WF7-2 Develop Report — Wolf aggregateRound Cutover

**Verification mode:** Standard (design-level orchestration change; both codex reviews required)  
**Reviewer:** APPROVED  
**Codex review:** clean — no findings  
**Codex adversarial review:** 1 high finding — addressed

---

## Step 1 — Explore findings

- `payouts.ts` wolf case: `settleWolfBet(...).ledger` → direct bridge dispatch, no aggregateRound involvement
- `aggregateRound(log, roundCfg) → RunningLedger`: takes `ScoringEventLog` (pre-built), returns `{netByPlayer, byBet}` — a reducer, not a generator
- `settleWolfBet(holes, players, game)` returns both `.events` AND `.ledger`. Events are already finalized (carry-scaled by finalizeWolfRound inside the bridge)
- `buildMinimalRoundCfg(cfg, betType)` already in `shared.ts` — creates minimal `RoundConfig` with `bets: [{id: cfg.id, type: betType, ...}]`. Players left as `[]` (sufficient — wolf finalizer is invoked inside the bridge, not in aggregateRound)
- `byBet` keying: aggregateRound uses `event.declaringBet` as key, which is set to `cfg.id = game.id` via `findBetId` in wolf engine
- No new helper needed — existing `buildMinimalRoundCfg` is the right tool

## Step 2 — Plan

**Orchestration change in `payouts.ts` wolf case:**

```
OLD: settleWolfBet(...).ledger → payoutMapFromLedger
NEW: settleWolfBet(...).events
     → ScoringEventLog { events, supersessions: {} }
     → buildWolfCfg(game) + buildMinimalRoundCfg(wolfCfg, 'wolf')
     → aggregateRound(log, roundCfg)
     → result.byBet[game.id] ?? {}
     → payoutMapFromLedger
```

**No new helper function needed.** `buildMinimalRoundCfg` handles the single-bet RoundConfig construction.

## Step 4 — Diff-level pre-review

Skipped — schema gate is not applicable to this slice.

## Step 5 — Develop

### Files modified

| File | Change |
|---|---|
| `src/lib/payouts.ts` | Wolf case in `computeGamePayouts`: 1-line → 10-line orchestration; added imports for `buildWolfCfg`, `buildMinimalRoundCfg`, `aggregateRound`, `ScoringEventLog` |
| `src/lib/payouts.test.ts` | New file — 8 Wolf orchestration test describes (WP1–WP8): partner, lone wolf, blind lone, tied no-points, tied carryover, missing decision, opponent wins, UUID-style id (GR8 contract) |

### Orchestration code (final)

```typescript
case 'wolf': {
  const wolfCfg = buildWolfCfg(game)
  // Guard: buildWolfCfg must preserve game.id for byBet keying (GR8)
  if (wolfCfg.id !== game.id) {
    throw new Error(`Wolf bridge id contract violation: wolfCfg.id="${wolfCfg.id}" !== game.id="${game.id}"`)
  }
  const { events } = settleWolfBet(holes, players, game)
  const log: ScoringEventLog = { events, supersessions: {} }
  const roundCfg = buildMinimalRoundCfg(wolfCfg, 'wolf')
  const result = aggregateRound(log, roundCfg)
  // byBet[game.id] is undefined only when no monetary events fired (all WolfDecisionMissing).
  const wolfLedger = result.byBet[game.id] ?? {}
  return payoutMapFromLedger(wolfLedger, game.playerIds)
}
```

### Helper choice rationale

Used existing `buildMinimalRoundCfg` from `src/bridge/shared.ts`. No new helper was needed because:
1. `buildMinimalRoundCfg` already creates a `RoundConfig` with `bets: [{id: cfg.id, type: 'wolf', ...}]`
2. `players: []` in the minimal config is sufficient — Wolf's `finalizeWolfRound` runs inside `settleWolfBet` (the bridge), not inside `aggregateRound`
3. `aggregateRound` only needs `roundCfg.bets` to route finalizers (Nassau/MatchPlay need players for their finalizers; Wolf does not)

**The `buildMultiBetRoundCfg` helper proposed in the plan doc (03-wolf-plan.md) was not needed** — that was based on the incorrect understanding of aggregateRound as a generator. Since aggregateRound is a reducer, the single-bet minimal config is sufficient.

## Step 6 — Codex reviews

### /codex:review (line-level)
**Session ID:** 019e02cf-3702-7bd3-8e90-3f36cc3b31d3  
**Verdict:** Clean — no findings.

### /codex:adversarial-review (design-level)
**Session ID:** 019e02d1-4dac-7873-bf35-c7b46abacdc8  
**Verdict:** needs-attention — 1 high finding.

| Finding | Priority | Disposition |
|---|---|---|
| `?? {}` fallback silently zeros payouts on id mismatch | High | Addressed: added explicit `wolfCfg.id !== game.id` guard that throws before reduction; added WP8 test with non-default UUID-style id to prove the chain |

**Autonomous fix justification:** In-scope (payouts.ts is the WF7-2 target file), no schema/dep/security change, unambiguous recommendation, single guard expression, high confidence.

**Reviewer sub-agent verdict:** APPROVED (all 7 ground rules satisfied, reviewed before adversarial finding; fix is additive)

---

## Verification

| Check | Result |
|---|---|
| `npm run test:run` | 23 files, 658 tests — all pass |
| `npx tsc --noEmit` | Clean |
| `tests/playwright/wolf-flow.spec.ts` | 1/1 pass (PM2 at localhost:3000/golf) |
| Reviewer sub-agent | APPROVED |
| `/codex:review` | Clean |
| `/codex:adversarial-review` | 1 finding, addressed |

---

## For GM review

The orchestration code (new wolf case) is quoted above.  
Helper choice: `buildMinimalRoundCfg` (existing), not a new helper — rationale above.  
Reviewer: APPROVED.  
Both codex reviews: complete, findings addressed.  
658/658 Vitest + 1/1 Playwright + tsc clean.

## For Cowork to verify

Batched to WF7-4 (end of Wolf pilot). No UI changes in WF7-2.

---

## Notes

- `src/lib/perHoleDeltas.ts` explicitly NOT modified per locked decision (deferred).
- Skins, Nassau, Stroke Play cases in `computeGamePayouts` explicitly NOT modified.
- `aggregateRound` in `src/games/aggregate.ts` explicitly NOT modified.
- `src/bridge/wolf_bridge.ts` explicitly NOT modified (bridge interface unchanged).
