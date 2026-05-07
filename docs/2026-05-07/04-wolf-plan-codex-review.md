---
prompt_id: "04"
timestamp: 2026-05-07T00:00:00Z
checklist_item_ref: "Phase 7 — Wolf plan codex review"
tags: [codex-review, wolf, phase-7]
codex_session_id: "019e02b0-e5b8-7b23-8654-5c363b2e39db"
---

# Codex Review — Wolf Phase 7 Plan

**Target:** `docs/2026-05-07/03-wolf-plan.md` (working tree)  
**Reviewer:** `/codex:review` via codex-companion.mjs  
**Session ID:** 019e02b0-e5b8-7b23-8654-5c363b2e39db

---

## Findings

### P2 — `aggregateRound` signature mismatch in WF7-2 description

**Location:** `docs/2026-05-07/03-wolf-plan.md:52-54` and the WF7-2 slice  
**Finding (verbatim from Codex):**  
> `aggregateRound` has the signature `aggregateRound(log: ScoringEventLog, roundCfg: RoundConfig)` and only reduces an existing event log plus finalizer events; it does not accept `holes/players/games` or run the Wolf bridge/engine to create per-hole events. Following this plan for WF7-2 would either fail to compile or replace `settleWolfBet(...)` with a reducer that has no generated Wolf events, so the plan needs an event-generation/round-config bridge step before using `aggregateRound` as the app-layer payout source.

**Verified:** Confirmed. `src/games/aggregate.ts:351` signature is:
```typescript
export function aggregateRound(
  log: ScoringEventLog,
  roundCfg: RoundConfig,
): RunningLedger
```

`aggregateRound` is a **reducer** of a pre-built event log. It does NOT call `settleWolfBet` or any bridge. The per-hole events must already be in `log.events` before `aggregateRound` is called.

**Disposition:** Addressed — Plan WF7-2 section corrected (see below).

---

## Corrected WF7-2 description

The actual migration for WF7-2 is a two-step operation, not a one-step replacement:

**Current path (`src/lib/payouts.ts`):**
```
computeGamePayouts(holes, players, game)
  → case 'wolf': settleWolfBet(holes, players, game).ledger
  → case 'skins': ...
  → case 'nassau': ...
```
Each bridge call returns a `ledger: Record<string, number>` directly. The `ScoringEventLog` is never assembled; `aggregateRound` is never called.

**Target path (Phase 7 pilot):**
```
// Step 1: generate events through each bridge (existing bridge interface unchanged)
const wolfEvents = settleWolfBet(holes, players, wolfGame).events
const skinsEvents = settleSkinsBet(holes, players, skinsGame).events
// ... other active bets

// Step 2: assemble ScoringEventLog
const log: ScoringEventLog = {
  events: [...wolfEvents, ...skinsEvents, ...],
  supersessions: [],  // Phase 1 — deferred per parking-lot note in aggregate.ts
}

// Step 3: build RoundConfig from active bets (same pattern as bridge layer)
const roundCfg = buildMultiBetRoundCfg(players, activeBets)

// Step 4: reduce through aggregateRound → RunningLedger
const ledger = aggregateRound(log, roundCfg)
```

**Key insight:** The bridges (`wolf_bridge.ts`, `skins_bridge.ts`, etc.) remain unchanged. The cutover is in the **orchestration layer** (`src/lib/payouts.ts`): instead of taking the `.ledger` from each bridge directly, collect the `.events` from each bridge, assemble a `ScoringEventLog`, and feed it to `aggregateRound`.

**New file to consider:** A `buildMultiBetRoundCfg(players, activeBets)` helper may need to be created or adapted from `buildMinimalRoundCfg` in `src/bridge/shared.ts` to construct a full `RoundConfig` with all active bets — since `aggregateRound` needs `roundCfg.bets` populated to route finalizers correctly.

**Files to modify (updated):**
- `src/lib/payouts.ts` — orchestration change: collect events from bridges, assemble log, call aggregateRound
- `src/lib/perHoleDeltas.ts` — same orchestration change
- `src/bridge/shared.ts` — may need `buildMultiBetRoundCfg` helper or adapt existing `buildMinimalRoundCfg`

**No change to:** `src/games/aggregate.ts`, individual bridge files, engine files.

---

## Disposition summary

| # | Finding | Priority | Action |
|---|---|---|---|
| 1 | aggregateRound signature mismatch in WF7-2 | P2 | Addressed — WF7-2 corrected in plan and this review doc |

**session-logging SKILL.md change:** Clean — no findings.

---

## Impact on Plan

WF7-2 is more involved than initially described because:
1. A `ScoringEventLog` assembly step is required between bridge calls and `aggregateRound`
2. A multi-bet `RoundConfig` builder is needed (may be a new shared utility)
3. The `perHoleDeltas.ts` migration similarly requires assembling partial event logs per hole, not just calling `aggregateRound` at round end — this is a design question: does perHoleDeltas call `aggregateRound` after each hole (with the subset of holes so far), or does it keep the per-bet dispatch for per-hole display? **This is an open question for GM.**

**Revised WF7-2 estimate:** S → M (the assembly step adds complexity).

**GM input needed (added to Decision E):** For `perHoleDeltas.ts` specifically — should per-hole display use `aggregateRound(partialLog, roundCfg)` (unified, more correct) or keep per-bet dispatch (simpler, already working)? The cutover only strictly requires `payouts.ts` (round-end settlement); `perHoleDeltas.ts` (scorecard in-progress display) can be deferred.

---

*Codex review complete. See `03-wolf-plan.md` STOP section — GM approval required before WF7-1.*
