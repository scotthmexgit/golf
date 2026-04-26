---
prompt_id: SKINS_BRIDGE_EXTRACTION
timestamp: 2026-04-25T20:31:00Z
checklist_item_ref: "Skins unpark — shared.ts extraction + skins_bridge.ts"
tags: [skins, bridge, extraction, shared, engineer]
---

## Pre-Read Findings (R1–R4)

### R1 — stroke_play_bridge.ts contents confirmed

All 6 memo-classified items present:
- `buildStrokePlayHoleState` (line 29, exported) — Generic
- `EMPTY_JUNK` (line 72, unexported constant) — Generic
- `buildSpCfg` (line 91, unexported) — Stroke-Play-specific
- `buildMinimalRoundCfg` (line 115, unexported) — Generic-with-bet-context
- `settleStrokePlayBet` (line 151, exported) — Stroke-Play-specific
- `payoutMapFromLedger` (line 189, exported) — Generic

No discrepancies from memo. ✓

### R2 — Skins engine signatures and money-bearing events

- `settleSkinsHole(hole: HoleState, config: SkinsCfg, roundCfg: RoundConfig): ScoringEvent[]` (line 125) ✓
- `finalizeSkinsRound(events: ScoringEvent[], config: SkinsCfg): ScoringEvent[]` (line 206) ✓
- Money-bearing events: **`SkinWon` only** (lines 168, 339 — has `points` field)
- Non-money events: `SkinCarryForfeit` carries `carryPoints` (not `points`), no money movement. `SkinCarried` is informational.
- `RoundingAdjustment`: in `SKINS_EVENT_KINDS` set but never emitted by Skins (integer-safe finalization — `potPerOpponent × loserCount` is always integer per rule doc §11 and §6). Confirmed by grepping — no `RoundingAdjustment` emit sites in `skins.ts`.

Ledger reduction for Skins bridge: filter on `e.kind === 'SkinWon' && 'points' in e`.

### R3 — SkinsCfg fields confirmed

`types.ts:33–42`: `id, stake, escalating, tieRuleFinalHole, appliesHandicap, playerIds, junkItems, junkMultiplier` — all 8 fields match memo §3. ✓

Additional finding: `GameInstance.escalating?: boolean` exists at `src/types/index.ts:68`. `buildSkinsCfg` reads `game.escalating ?? true` rather than hardcoding it.

### R4 — payouts.ts import confirmed

`payouts.ts:5`: `import { settleStrokePlayBet, payoutMapFromLedger } from '../bridge/stroke_play_bridge'` ✓

---

## Extraction Phase

### Files created/modified

**Created: `src/bridge/shared.ts`** (4 exports)

| Export | Type | Lines |
|---|---|---|
| `buildHoleState(holeData, players): HoleState` | Renamed from `buildStrokePlayHoleState`; bet-agnostic | ~45 |
| `EMPTY_JUNK: JunkRoundConfig` | Constant, moved verbatim | ~13 |
| `buildMinimalRoundCfg(cfg: AnyBetCfg, betType: BetType): RoundConfig` | Generalized; takes any `AnyBetCfg` + discriminator | ~17 |
| `payoutMapFromLedger(ledger, playerIds): PayoutMap` | Moved verbatim | ~7 |

`buildMinimalRoundCfg` generalization: typed `cfg: AnyBetCfg` (union of all 5 bet configs). All members share `id, stake, playerIds, junkItems, junkMultiplier` — TypeScript exposes these on the union type. `config: cfg` in BetSelection is typed as `AnyBetCfg` — compatible.

**Modified: `src/bridge/stroke_play_bridge.ts`**
- Removed 4 extracted items (buildStrokePlayHoleState, EMPTY_JUNK, buildMinimalRoundCfg, payoutMapFromLedger)
- Added import: `import { buildHoleState, buildMinimalRoundCfg } from './shared'`
- Updated `settleStrokePlayBet`: `buildStrokePlayHoleState` → `buildHoleState`, `buildMinimalRoundCfg(cfg)` → `buildMinimalRoundCfg(cfg, 'strokePlay')`
- Updated file header comment to note shared.ts
- Kept: `buildSpCfg`, `settleStrokePlayBet` (SP-specific)
- Note: `payoutMapFromLedger` no longer imported/re-exported from stroke_play_bridge.ts

**Modified: `src/lib/payouts.ts`**
```diff
-import { settleStrokePlayBet, payoutMapFromLedger } from '../bridge/stroke_play_bridge'
+import { settleStrokePlayBet } from '../bridge/stroke_play_bridge'
+import { payoutMapFromLedger } from '../bridge/shared'
```

**Modified: `src/bridge/stroke_play_bridge.test.ts`**
- Import line: added `import { buildHoleState } from './shared'`; split payoutMapFromLedger import to `import { payoutMapFromLedger } from './shared'`
- 4 call sites renamed: `buildStrokePlayHoleState` → `buildHoleState` (lines 52, 81, 101, 119)
- Test 4 description unchanged (didn't reference function name)

**Post-extraction test gate: 326/326 ✓**

---

## Skins Bridge Phase

### `src/bridge/skins_bridge.ts`

**buildSkinsCfg hardcodes:**

| Field | Source | Rationale |
|---|---|---|
| `escalating` | `game.escalating ?? true` | GameInstance carries escalating (optional); default true per game_skins.md §4. Not a hardcode — reads from GameInstance when set. |
| `tieRuleFinalHole` | Hardcoded `'split'` | Not on GameInstance; 'split' is engine default per game_skins.md §4 and keeps round zero-sum. |
| `appliesHandicap` | Hardcoded `true` | Not on GameInstance; v1 Skins always applies handicap. |
| `junkItems` | `[]` | Junk out of scope for v1 Skins. |
| `junkMultiplier` | `1` | GameInstance has no junkMultiplier. |

Deviation from SP bridge: `escalating` is read from `game.escalating` (not hardcoded) because it exists on `GameInstance`. This is a better design than the SP bridge's hardcodes since the data is available.

**Ledger reduction:** `SkinWon` events only. `SkinCarryForfeit` excluded (no `points` field). `RoundingAdjustment` excluded (never emitted by Skins engine).

### `src/bridge/skins_bridge.test.ts` — 5 test suites, 22 `it` blocks

| Test | Players | Scenario | Key assertions |
|---|---|---|---|
| S1 | 3 | 2 holes, no carry; buildHoleState reuse validated | zero-sum; A+10, B+10, C-20 |
| S2 | 3 | 3 holes, 1 carry (escalating=true) | carry scales SkinWon; A+15, B0, C-15; SkinCarried emitted |
| S3 | 3 | C missing hole 1 (FieldTooSmall avoided; 2-player sub-field) | A+10, B-15, C+5 |
| S4 | 4 | 4-player variant; A and B win one skin each | A+10, B+10, C-10, D-10 |
| S5 | 3 | payoutMapFromLedger from shared.ts produces complete PayoutMap | all playerIds present; values match ledger |

Tests S1 and S5 explicitly import `buildHoleState` and `payoutMapFromLedger` from `./shared`, validating that the extracted generics are reusable from the Skins bridge test context.

**Final test gate: 326 → 348 (+22) ✓**

**tsc: 2 pre-existing `.next/types/validator.ts` errors (dev server running). Zero new source errors. ✓**

---

## No code logic modified

- `skins.ts` engine: untouched
- `stroke_play_bridge.ts`: extraction only (same function bodies, just moved to shared.ts)
- `payouts.ts`: one import path change only

---

## Noticed but out of scope

- `skins.ts` header (line 8) references `/tmp/execution-notes.md` — same pattern as SP bridge. Stale dev artifact, not addressed.
- `src/lib/payouts.ts` `computeSkins` legacy function still calls `strokesOnHole` from `./handicap`. Untouched — Skins cutover in `computeGamePayouts` is a future prompt.
- `GAME_DEFS` `skins` entry still has `disabled: true`. Unpark is a subsequent prompt.

## Result

- **Files created:** `src/bridge/shared.ts`, `src/bridge/skins_bridge.ts`, `src/bridge/skins_bridge.test.ts`
- **Files modified:** `src/bridge/stroke_play_bridge.ts`, `src/bridge/stroke_play_bridge.test.ts`, `src/lib/payouts.ts`
- **Tests:** 326 → 348 (22 new Skins bridge its)
- **tsc:** 2 pre-existing errors only; 0 new source errors
