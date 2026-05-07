---
prompt_id: "02"
timestamp: 2026-05-08T00:00:00Z
checklist_item_ref: "Phase 7 — Skins sweep cutover — Explore"
tags: [explore, skins, phase-7, sweep]
---

# Skins Phase 7 Explore — aggregateRound cutover

**Phase:** Phase 7 sweep — Skins (second bet after Wolf pilot)  
**Scope:** Explore only. No implementation this document.  
**Reference pattern:** WF7-2 Wolf-pilot (`docs/2026-05-07/07-wf72-develop.md`)

---

## Verification item 1 — Current 'skins' case in payouts.ts

**Location:** `src/lib/payouts.ts:121–124`

```typescript
case 'skins': return payoutMapFromLedger(
  settleSkinsBet(holes, players, game).ledger,
  game.playerIds,
)
```

**Dispatch shape:** Calls `settleSkinsBet(...).ledger` directly and passes it to `payoutMapFromLedger`. This is the old per-bet bridge dispatch — identical shape to the Wolf case before WF7-2. The target is to replace `.ledger` access with the aggregateRound orchestration.

---

## Verification item 2 — settleSkinsBet return shape

**Location:** `src/bridge/skins_bridge.ts:62–100`

`settleSkinsBet` returns `{ events: ScoringEvent[]; ledger: Record<string, number> }` — **identical to `settleWolfBet`**. Both `.events` and `.ledger` are available; the cutover uses `.events` (same as WF7-2).

---

## Verification item 3 — Skins finalizer location

**Confirmed:** `finalizeSkinsRound` is called **inside `settleSkinsBet`** (at line ~78 in skins_bridge.ts). The returned `.events` are already finalized — carry-scaled `SkinWon` events, `SkinCarried` events, `SkinVoid`, `SkinCarryForfeit`. No Skins finalizer exists in `aggregateRound`'s finalizer loop (which only handles Nassau, Match Play, Stroke Play). This is the same pattern as Wolf (where `finalizeWolfRound` runs inside `settleWolfBet`).

**Implication:** The orchestration receives fully-finalized events. `aggregateRound` reduces them as-is — no double-finalization risk.

---

## Verification item 4 — Skins event types: monetary vs informational

| Event | `points` field | `carryPoints` field | Monetary? | aggregateRound treatment |
|---|---|---|---|---|
| `SkinWon` | ✓ (stake-scaled per-player map) | — | **Yes** | `case 'SkinWon':` → `accumulate(netByPlayer, byBet, event.declaringBet, event.points)` |
| `SkinCarried` | ✗ | ✓ (`carryPoints: number`) | No | `default: break` |
| `SkinVoid` | ✗ | — | No | `default: break` |
| `SkinCarryForfeit` | ✗ | ✓ (`carryPoints: number`) | No | `default: break` |
| `FieldTooSmall` | ✗ | — | No | `default: break` |

**Key invariant:** Only `SkinWon` has a `points` field and a `declaringBet` field. All carry/forfeit/void events carry `carryPoints` (informational) or nothing. The aggregateRound reducer correctly handles this — `SkinCarried`, `SkinVoid`, `SkinCarryForfeit`, `FieldTooSmall` all fall through `default: break` without contributing to the ledger.

---

## Verification item 5 — aggregate.ts:reduceEvent — no double-counting

**Location:** `src/games/aggregate.ts:132–142`

```typescript
// Comment in aggregate.ts:
// SkinWon, WolfHoleResolved, LoneWolfResolved, BlindLoneResolved,
// ExtraHoleResolved, StrokePlaySettled, RoundingAdjustment,
// FinalAdjustmentApplied.

case 'SkinWon':
case 'WolfHoleResolved':
// ...
  accumulate(netByPlayer, byBet, (event as { declaringBet: BetId }).declaringBet, event.points)
  break
```

**Confirmed:** `SkinWon` is the only Skins event that hits the `accumulate` branch. `SkinCarried` (which has `carryPoints`, not `points`) does NOT match the `SkinWon` case and falls through to `default: break`. `SkinCarryForfeit` similarly. No double-counting.

The `finalizeSkinsRound` carry scaling happens BEFORE events reach `aggregateRound` (inside `settleSkinsBet`), so `SkinWon` events already carry the carry-multiplied `points` value when they enter the log. `aggregateRound` simply sums them.

---

## Verification item 6 — GR8 id chain

**Chain for Skins:**

```
game.id
  → buildSkinsCfg(game).id = game.id          [skins_bridge.ts:24: id: game.id]
  → buildMinimalRoundCfg(cfg, 'skins').bets[0].id = cfg.id = game.id   [shared.ts]
  → findBetId(cfg, roundCfg) → bet.id = game.id   [skins.ts:103-107]
  → SkinWon.declaringBet = game.id             [skins.ts:133]
  → byBet[game.id]  ✓
```

**Chain is correct and identical to Wolf.** The `byBet[game.id]` extraction will find the Skins monetary events.

**GR8 guard implementation — DIVERGENCE FROM WOLF:**

For Wolf, `buildWolfCfg(game)` is **exported** from `wolf_bridge.ts` (it's needed by the `getWolfCaptain` UI helper). This allows payouts.ts to call `buildWolfCfg(game)` directly and check `wolfCfg.id !== game.id`.

For Skins, `buildSkinsCfg(game)` is **private** (not exported from `skins_bridge.ts`). There is no UI component that needs the Skins config builder directly. This means payouts.ts **cannot call `buildSkinsCfg` directly** without a skins_bridge.ts change.

**Options for the GR8 guard (raised as Plan decision — see Plan doc):**
- **Option A (recommended):** Export `buildSkinsCfg` from `skins_bridge.ts` (1-line change: `function` → `export function`). Enables identical Wolf guard pattern.
- **Option B:** Post-event check — after `settleSkinsBet(...).events`, verify any event with `declaringBet` has `declaringBet === game.id`. Works but only fires when SkinWon events exist; no-skin-won rounds (all tied/forfeited) are unchecked.
- **Option C:** Skip explicit GR8 guard; rely on documented chain and unit tests (GR8 contract test covers it implicitly via WP8-style UUID test).

---

## Verification item 7 — Skins-specific surprises vs Wolf pattern

**No architectural surprises.** The Skins pattern is structurally identical to Wolf:

| Aspect | Wolf (WF7-2) | Skins (this sweep) |
|---|---|---|
| Bridge return shape | `{ events, ledger }` | `{ events, ledger }` |
| Finalizer location | Inside `settleWolfBet` | Inside `settleSkinsBet` |
| Monetary event | `WolfHoleResolved`, `LoneWolfResolved`, `BlindLoneResolved` | `SkinWon` |
| Informational events | `WolfHoleTied`, `WolfCarryApplied`, `WolfDecisionMissing` | `SkinCarried`, `SkinVoid`, `SkinCarryForfeit`, `FieldTooSmall` |
| aggregateRound finalizer | Not called (done inside bridge) | Not called (done inside bridge) |
| `buildMinimalRoundCfg` sufficiency | ✓ | ✓ |
| Config builder exported? | ✓ (`buildWolfCfg` exported) | ✗ (`buildSkinsCfg` private) |

**Only divergence:** `buildSkinsCfg` not exported. See Plan decision.

---

## SCORECARD-DECISIONS-WIRING verification (item 1 from SOD)

**Status: CONFIRMED CLOSED.**

`src/app/scorecard/[roundId]/page.tsx:166-169`:
```typescript
const decisionsBlob = buildHoleDecisions(latestHoleData, gameTypes)
...
if (decisionsBlob !== null) body.decisions = decisionsBlob
```

`buildHoleDecisions` in `src/lib/holeDecisions.ts` includes `wolfPick` and `presses` (and other decision fields). The PUT body includes `decisions` when non-null. This closes the SCORECARD-DECISIONS-WIRING parking-lot item — the wiring was implemented as part of NA-3.

**Action:** Mark item closed in IMPLEMENTATION_CHECKLIST.md (see commit with this session).

---

**Explore complete. See `03-skins-plan.md` for slicing proposal.**
