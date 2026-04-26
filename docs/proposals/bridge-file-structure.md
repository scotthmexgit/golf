# Bridge File Structure — Architectural Recommendation

**Date:** 2026-04-25  
**Status:** Proposed  
**Scope:** Whether to extend `src/bridge/stroke_play_bridge.ts` or create a sibling `src/bridge/skins_bridge.ts`, and what the long-term bridge structure should look like across all five bets.

---

## 1. Inventory of `src/bridge/stroke_play_bridge.ts`

| Item | Location | Classification |
|---|---|---|
| `buildStrokePlayHoleState(holeData, players): HoleState` | line 29 — **exported** | **Generic**: populates the 5 live HoleState fields (hole, par, holeIndex, timestamp, gross, strokes) and stubs all others with empty defaults. The 5-field surface is confirmed identical for Skins. Name contains "StrokePlay" but logic is bet-agnostic for any bet that reads only these 5 fields. |
| `EMPTY_JUNK: JunkRoundConfig` | line 72 — **unexported constant** | **Generic**: needed by any bet whose v1 configuration has no junk items. All five bets declare `junkItems: []` at v1. |
| `buildSpCfg(game: GameInstance): StrokePlayCfg` | line 91 — **unexported helper** | **Stroke-Play-specific**: fills in SP-specific config fields (`settlementMode`, `tieRule`, `cardBackOrder`, etc.). Skins needs its own `buildSkinsCfg` that fills `escalating`, `tieRuleFinalHole`, `appliesHandicap`. Not reusable. |
| `buildMinimalRoundCfg(cfg: StrokePlayCfg): RoundConfig` | line 115 — **unexported helper** | **Generic-with-bet-context**: constructs a minimal `RoundConfig` from any bet's config. The structure is identical across bets (only `type` in `BetSelection` and the cfg reference differ). Could be generalized to accept any `AnyBetCfg`. Current coupling to `StrokePlayCfg` is an artifact of the SP-first implementation, not a structural requirement. |
| `settleStrokePlayBet(holes, players, game): { events, ledger }` | line 151 — **exported** | **Stroke-Play-specific**: calls `settleStrokePlayHole` + `finalizeStrokePlayRound` + reduces `StrokePlaySettled/RoundingAdjustment` events to ledger. Event kinds and engine calls are all SP-specific. |
| `payoutMapFromLedger(ledger, playerIds): PayoutMap` | line 189 — **exported** | **Generic**: 7-line projection of any `Record<string, number>` ledger to `PayoutMap` with all playerIds present. No bet-specific logic. Currently imported by `src/lib/payouts.ts`. |

**Summary:** Two of the six items are Stroke-Play-specific (`buildSpCfg`, `settleStrokePlayBet`). Three are genuinely generic and would be duplicated without extraction (`buildStrokePlayHoleState`, `EMPTY_JUNK`, `payoutMapFromLedger`). One is generic-with-bet-context and could be generalized (`buildMinimalRoundCfg`).

---

## 2. Test file organization (`src/bridge/stroke_play_bridge.test.ts`)

Tests import directly from `./stroke_play_bridge` — no shared fixture file. The test file defines its own `makePlayer`, `makeHoleData`, `makeGame` helper functions inline. Tests are organized in four `describe` groups:

- Tests 1–4: unit tests on `buildStrokePlayHoleState` (field mapping, stubs)
- Tests 5–7: integration tests on `settleStrokePlayBet` + `payoutMapFromLedger` (full paths: outright win, zero-hcp, IncompleteCard)

**Implication:** Each bridge file has built its own test fixtures from scratch. There's no shared fixture infrastructure to inherit. Per-bet test files are self-contained; if bridge functions move to a shared file, the test fixtures move too (or stay in a shared test utility file alongside `shared.ts`).

---

## 3. Skins engine survey

**Settle signature** (`skins.ts:125–193`):  
`settleSkinsHole(hole: HoleState, config: SkinsCfg, roundCfg: RoundConfig): ScoringEvent[]`

Same three-argument shape as `settleStrokePlayHole`. Returns `ScoringEvent[]`.

**Finalization** (`skins.ts:206–234`):  
`finalizeSkinsRound(events: ScoringEvent[], config: SkinsCfg): ScoringEvent[]`

Same two-argument shape as `finalizeStrokePlayRound` — takes accumulated events plus config, returns new settlement events. No external state threading required (carry state is accumulated internally from `SkinCarried` events in the stream).

**SkinsCfg vs StrokePlayCfg** (`types.ts:33–42`):

| Field | StrokePlayCfg | SkinsCfg |
|---|---|---|
| `id`, `stake`, `playerIds`, `junkItems`, `junkMultiplier` | ✓ | ✓ (identical) |
| `settlementMode`, `tieRule`, `cardBackOrder`, `stakePerStroke`, `placesPayout` | ✓ | ✗ |
| `appliesHandicap` | ✓ | ✓ |
| `escalating`, `tieRuleFinalHole` | ✗ | ✓ |

The shared fields (`id`, `stake`, `playerIds`, `junkItems`, `junkMultiplier`) are enough to build a `BetSelection` and a minimal `RoundConfig` in `buildMinimalRoundCfg` — so that function is generic if it takes any config with those fields.

**HoleState fields read by Skins** (`skins.ts:117–120`, `142`, `133–137`):

- `hole.gross[pid]` — contender filter + net computation
- `hole.strokes[pid]` — net computation (when `appliesHandicap`)
- `hole.holeIndex` — `strokesOnHole(strokes, holeIndex)`
- `hole.hole` — event payload
- `hole.timestamp` — event payload

**Identical to Stroke Play's 5-field surface.** Confirmed: `buildStrokePlayHoleState` is directly reusable for Skins without modification.

**Ledger reduction for Skins bridge:** Skins' monetary event is `SkinWon` (with a `points` field). The ledger reduction loop in `settleStrokePlayBet` checks `e.kind === 'StrokePlaySettled' || e.kind === 'RoundingAdjustment'`. Skins would check `e.kind === 'SkinWon'` (plus `RoundingAdjustment` if applicable). The reduction pattern is identical; only the event kind set differs.

---

## 4. What Stroke Play has that Skins needs vs what Skins needs differently

| Need | Stroke Play has it? | Skins needs it? | Shared as-is? |
|---|---|---|---|
| `buildHoleState(holeData, players): HoleState` | Yes (as `buildStrokePlayHoleState`) | Yes, identical | Yes — rename and share |
| `EMPTY_JUNK` constant | Yes | Yes | Yes — share |
| `payoutMapFromLedger` | Yes | Yes | Yes — share |
| `buildMinimalRoundCfg` | Yes (generic internally) | Yes, identical structure | Yes — generalize signature |
| Config builder (`buildSpCfg` / `buildSkinsCfg`) | SP version only | Skins needs own | No — per-bet |
| Per-hole engine call | `settleStrokePlayHole` | `settleSkinsHole` | No — per-bet |
| Finalization call | `finalizeStrokePlayRound` | `finalizeSkinsRound` | No — per-bet |
| Ledger reduction | `StrokePlaySettled \| RoundingAdjustment` | `SkinWon` | No — event kinds differ |
| State threading across holes | None needed | None needed | Both stateless — same pattern |

**Asymmetry:** 3 items are directly shared (buildHoleState, EMPTY_JUNK, payoutMapFromLedger). 4 items are bet-specific. Skins and Stroke Play have the same per-hole/finalization architectural pattern, but the functions are distinct.

---

## 5. Survey of remaining engine signatures and shape

### Wolf (`wolf.ts`)
- `settleWolfHole(hole, config, roundCfg): ScoringEvent[]` — same stateless 3-argument shape
- `finalizeWolfRound(events, config): ScoringEvent[]` — same 2-argument finalization shape
- Wolf likely reads `hole.gross`, `hole.strokes`, `hole.holeIndex`, `hole.hole`, `hole.timestamp` — possibly also Wolf-specific state passed via `wolfCaptainRotation`, but that is separate from per-hole HoleState. No new HoleState fields beyond the 5 expected.
- **Pattern:** same as Stroke Play + Skins (stateless per hole, finalization owns carry/resolution). Bridge will follow the same template.

### Match Play (`match_play.ts`)
- `settleMatchPlayHole(hole, cfg, roundCfg): { events: ScoringEvent[]; match: MatchState }` — **returns MatchState alongside events**. The bridge must thread MatchState across holes.
- `finalizeMatchPlayRound(cfg, roundCfg, match): { events: ScoringEvent[]; match: MatchState }` — needs MatchState input.
- Match Play reads `hole.pickedUp`, `hole.conceded`, `hole.withdrew` for per-hole forfeit/concession/withdrawal handling (`settleMatchPlayHole` lines 255–412). These fields are **not** populated in the current `buildStrokePlayHoleState` stubs (they're set to `[]`).
- **Pattern:** fundamentally different. The Match Play bridge must: (a) maintain MatchState across holes, (b) populate `pickedUp`/`conceded`/`withdrew` from HoleData (HoleData does not currently have these fields), (c) handle the `{ events, match }` return shape. This is a structurally distinct bridge.

### Nassau (`nassau.ts`)
- `settleNassauHole(hole, config, roundCfg, matches: MatchState[]): ...` — **passes MatchState[] per hole**. Nassau tracks multiple simultaneous matches (front/back/overall + presses).
- `finalizeNassauRound(config, roundCfg, matches): ScoringEvent[]` — needs the final MatchState[].
- **Pattern:** same structural complexity as Match Play. The Nassau bridge must maintain and thread multiple MatchState objects across 18 holes. May also need withdrawal/withdrawal fields in HoleState.

### Summary of engine pattern taxonomy

| Bet | Per-hole return | State threading | HoleState extras |
|---|---|---|---|
| Stroke Play | `ScoringEvent[]` | None | None |
| Skins | `ScoringEvent[]` | None (carry in events) | None |
| Wolf | `ScoringEvent[]` | None (carry in events) | Possibly none |
| Match Play | `{ events, match }` | MatchState per hole | `pickedUp`, `conceded`, `withdrew` |
| Nassau | `ScoringEvent[]` | `MatchState[]` per hole | Possibly `withdrew` |

Match Play and Nassau are structurally distinct from the SP/Skins/Wolf group. Their bridges will look different regardless of the file structure choice.

---

## 6. Architectural options

### Option 1: One bridge file per bet

**Structure:**
```
src/bridge/
  shared.ts                  ← extracted generics: buildHoleState, EMPTY_JUNK, payoutMapFromLedger
  stroke_play_bridge.ts      ← imports from shared; keeps buildSpCfg, buildMinimalRoundCfg, settleStrokePlayBet
  skins_bridge.ts            ← new; imports from shared; has buildSkinsCfg, settleSkinsBet
  wolf_bridge.ts             ← eventually
  match_play_bridge.ts       ← eventually; structurally distinct (MatchState threading)
  nassau_bridge.ts           ← eventually; structurally distinct
```

**For Skins specifically:** Extract 3 items to `shared.ts`, update `stroke_play_bridge.ts` imports, update `payouts.ts` import for `payoutMapFromLedger` (or re-export it from `stroke_play_bridge.ts`), create `skins_bridge.ts`.

**What gets duplicated vs shared:** Nothing duplicated. Each bet-specific file imports the generics from `shared.ts`.

**Refactor cost at bet 3 (Wolf):** Zero. Create `wolf_bridge.ts`, import from `shared.ts`. Pattern is established.

**Refactor cost at bet 4 (Match Play):** Non-trivial regardless of bridge structure — Match Play bridge is architecturally different. Not influenced by this choice.

**Test file organization:** `shared.test.ts` for the generic utilities; `skins_bridge.test.ts` for Skins-specific orchestration. Each test file imports from its own bridge file + `shared.ts`.

**tsc/vitest concerns:** vitest include pattern (`src/bridge/**/*.test.ts`) already covers new test files. No config changes needed.

---

### Option 2: One growing shared file (extend stroke_play_bridge.ts)

**Structure:**
```
src/bridge/
  stroke_play_bridge.ts      ← SP code + Skins code together (or rename to bridge.ts / index.ts)
```

**For Skins specifically:** Add `buildSkinsCfg`, `settleSkinsBet` functions to the existing file. No extraction. File grows from ~200 to ~300 lines. `payoutMapFromLedger` is already there and shared.

**Problem with the name:** Adding Skins functions to `stroke_play_bridge.ts` creates a misleadingly-named file. Renaming to `bridge.ts` requires updating the import in `src/lib/payouts.ts` — that's a one-line change but a refactor of a live file.

**What gets duplicated vs shared:** Nothing duplicated — same file.

**Refactor cost at bet 3 (Wolf):** Add to the same file again. By bet 5 (Nassau) the file is ~600–800 lines with five bets' worth of orchestration code. Still works, but navigating it becomes harder.

**Refactor cost at Match Play:** Match Play code is architecturally distinct (MatchState threading). Putting it in the same file as SP/Skins requires readers to mentally track two different patterns in one file.

**Test file organization:** All bridge tests in `stroke_play_bridge.test.ts` or in a renamed test file. The test file grows proportionally. Setup functions from different bets share the same file — potential for name collisions (`makeGame` for SP vs `makeGame` for Skins) unless namespaced.

**tsc/vitest concerns:** None if file is not renamed. One import update if renamed.

---

### Option 3 (hybrid identified during analysis): Per-bet files + shared.ts

This is Option 1. Named here explicitly to confirm there is no third architectural pattern — the only real choice is whether to have per-bet files (with or without a shared utility file) or a single growing file.

One sub-variant worth noting: **Option 2a** (keep the filename as `stroke_play_bridge.ts`, just add Skins functions to it) avoids the rename refactor but locks in a permanently misleading filename. Option 2b (rename to `bridge.ts`) costs one import update in `payouts.ts` but cleans up the naming.

---

## 7. Recommendation: Option 1 (per-bet files + shared.ts extraction)

**Extract now, before Skins lands.** Three items in `stroke_play_bridge.ts` are demonstrably generic and will be needed by every bet:

- `buildHoleState` (rename from `buildStrokePlayHoleState`) — Skins reads identical 5 fields, confirmed in §3 above. Wolf is expected to also read the same 5. The extraction cost today is minimal (move ~37 lines, update one caller in `settleStrokePlayBet`, update `payouts.ts` if `payoutMapFromLedger` moves with it).
- `EMPTY_JUNK` — any v1 bet with no junk needs this. 12 lines.
- `payoutMapFromLedger` — bet-agnostic 7-line projection. Already imported by `payouts.ts`; its import path changes from `stroke_play_bridge` to `shared` (or `stroke_play_bridge` re-exports from `shared`; either is fine).

**The compounding cost of not extracting now:** If Skins, Wolf, and (eventually) Nassau bridges each duplicate these three items, we end up with 3–4 copies of each. Any change to the stub set or the `payoutMapFromLedger` projection requires N parallel edits. That's a maintenance liability that extraction today eliminates at low cost.

**Why not Option 2 (single file)?** The file name problem is not cosmetic — `stroke_play_bridge.ts` containing Skins functions actively misleads. The rename required to fix it (`bridge.ts`) is a refactor of a live import; doing it at Skins-time costs roughly the same as doing the shared extraction now, but yields a less structured result (one growing file rather than small focused files). As Match Play and Nassau land, their structurally different bridge patterns would compound the confusion in a single file.

**Why Option 1 is smallest-change-that-works:** It requires one small refactor of `stroke_play_bridge.ts` (extract 3 items → import from `shared.ts`), one line update in `payouts.ts`, and a new `skins_bridge.ts`. The Skins bridge itself is a small file (~60–80 lines) by analogy with the SP bridge. The test files stay per-bet. The vitest config already covers `src/bridge/**/*.test.ts`. No architectural debt is introduced.

**Match Play and Nassau:** These bets will need their own structurally distinct bridges regardless of Option 1 vs 2. They are not a factor in the Skins decision — they just confirm that a monolithic single bridge file will contain two distinct patterns (stateless + stateful), which is another argument for per-bet files.

---

## Operator decisions needed

1. **`buildMinimalRoundCfg` generalization:** Should this become a generic utility in `shared.ts` (accepting any config with `id`, `stake`, `playerIds`, `junkItems`, `junkMultiplier`) or stay bet-scoped? The current function is internally generic but typed to `StrokePlayCfg`. The engineer implementing the Skins bridge will duplicate it if it's not extracted; operator decides whether to extract now or accept the duplication.

2. **`payoutMapFromLedger` import path:** After extraction to `shared.ts`, should `payouts.ts` import from `shared` directly, or should `stroke_play_bridge.ts` re-export it from `shared` so the `payouts.ts` import line doesn't change? Either works; it's an internal convention choice.

3. **`buildHoleState` rename:** Renaming `buildStrokePlayHoleState` to `buildHoleState` makes the shared intent clearer, but it requires updating the existing test file (Tests 1–4 import it by name). Alternatively, `shared.ts` exports it as `buildHoleState` and `stroke_play_bridge.ts` re-exports as `buildStrokePlayHoleState` for backward compat during any transition period. Operator chooses.

4. **Match Play and Nassau bridge timing:** When those bets unpark, their bridges will need to populate `pickedUp`/`conceded`/`withdrew` from `HoleData`. `HoleData` currently lacks these fields. This is an architectural gap that will require a `HoleData` extension (or a workaround) at that time. Flag here so it doesn't surprise the engineer prompt for Match Play unpark.

---

## Noticed but out of scope

- `src/bridge/stroke_play_bridge.ts` file header comment references SP-2 and SP-3 as the origin points. If the file's content is split into `shared.ts` + `stroke_play_bridge.ts`, the header comment will need updating. Not addressed here.
- The `tsconfig.json` includes `.next/types/**/*.ts` which produced pre-existing tsc errors when the dev server was running. Unrelated to bridge structure.
- `src/lib/handicap.ts` deprecated shim is still live. Unrelated.
