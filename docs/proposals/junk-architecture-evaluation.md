# Junk Architecture Evaluation

**Date:** 2026-04-25  
**Status:** Investigation only. No code, no rule-doc, no plan edits.  
**Purpose:** Evaluate the current `src/games/junk.ts` architecture before any v1 bridge work commits to its shape. Feeds into the Stroke-Play-only scoping report's Decision 6 (junk-in-Stroke-Play scope) but is broader: it asks whether the architecture should change before Phase 3 lands.

---

## 1. What Currently Exists

### File inventory

**`src/games/junk.ts`** (194 lines)

Exports: `resolveJunkWinner`, `settleJunkHole`.

Internal structure:
- `isCTP(hole, junkCfg): PlayerId | null` — reads `hole.par` (must equal 3), `hole.ctpWinner`
- `isGreenie(ctpWinner, hole, junkCfg, bet): PlayerId | null` — reads `hole.gir[ctpWinner]`, `hole.gross[ctpWinner]`, `hole.par`, `bet.participants`
- `isLongestDrive(hole, junkCfg): PlayerId[] | null` — reads `hole.par` (must be ≥ 4), `hole.hole`, `hole.longestDriveWinners`
- Phase 3 stubs: `isSandy`, `isBarkie`, `isPolie`, `isArnie` — all declared as `return null` with `// #7b — rules pass 2026-04-24 pending` comment
- `resolveJunkWinner(kind, hole, junkCfg): PlayerId | null` — dispatch switch; LD case explicitly returns `null` (bypassed); Greenie case returns bare CTP candidate without per-bet filtering
- `pushAward(events, kind, hole, ts, bet, winners: PlayerId[], multiplier)` — award builder; already accepts `PlayerId[]` (multi-winner)
- `settleJunkHole(hole, roundCfg, junkCfg): ScoringEvent[]` — main entry; three separate fan-out blocks: CTP, Greenie, LD

**`src/games/__tests__/junk.test.ts`** (489 lines)

29 tests across 7 describe blocks:
- Phase 1 scaffold (2 tests): dispatch does not throw; empty return on no bets
- §12 Test 1 — CTP + Greenie worked example (8 tests): CTPWinnerSelected count, ordering, points per bet, zero-sum, integer invariant
- §12 Test 2 — Parallel awards (3 tests): single bookkeeping event, two JunkAwarded, zero-sum
- §12 Test 3 — GIR toggle OFF (5 tests): CTPWinnerSelected with gir=false, CTP award emits, Greenie does not
- §12 Test 4 — Non-bettor CTP winner (3 tests): bookkeeping fires, zero JunkAwarded
- Topic 8 ordering (2 tests): fan-out order matches bets array order
- §12 Test 5 — Tied Longest Drive (6 tests): LongestDriveWinnerSelected, multi-winner points, zero-sum, ordering

**Gaps in test coverage:**
- `ctpTieRule: 'carry'` path (CTPCarried emits with carryPoints: 0; not tested beyond the code existing)
- CTP on a non-par-3 hole (should produce no award; untested)
- LD on a par-3 or on a hole not in `longestDriveHoles` (should produce no award; untested)
- Greenie where `gross[ctpWinner] > par` (fails the par-or-better check; untested)
- Multiple bets declaring both `ctp` AND `greenie` on the same hole (separation of CTP and Greenie events across bets; untested)
- All Phase 3 items (Sandy, Barkie, Polie, Arnie) — not covered; stubs return null

**`src/lib/junk.ts`** (legacy parallel path, 127 lines)

Completely different architecture from `src/games/junk.ts`. Uses `JunkConfig` (different type: birdie, eagle, garbage, hammer, snake, lowball) vs `JunkRoundConfig` + `JunkKind[]`. Reads `HoleData.dots` (HoleDots shape) and `HoleData.greenieWinners[gameId]`. Provides: `defaultJunk`, `syncJunkAmounts`, `hasAnyJunk`, `hasGreenieJunk`, `computeJunkPayouts`. These four functions are called from the UI store and setup components; none is called by any engine.

The two junk implementations are not variations of the same algorithm — they are different systems for different data models. The legacy system handles a different set of junk items (birdie, eagle, snake, lowball are not in the new system).

**`HoleDots` type** (`src/types/index.ts:98`):
```ts
interface HoleDots {
  sandy: boolean
  chipIn: boolean
  threePutt: boolean
  onePutt: boolean
}
```
`HoleData.dots: Record<string, HoleDots>` — keyed by player id.

### Rule doc (`game_junk.md`) — section-by-section

| Section | Status |
|---|---|
| §1 Overview | Fully specified |
| §2 Players & Teams | Fully specified (2–5 players, eligibility per declaring bet) |
| §3 Unit of Wager | Fully specified (stake lives on BetSelection, integer points) |
| §4 Setup | Fully specified (`JunkRoundConfig`, `JunkKind[]`, `junkMultiplier`) |
| §5 Per-Hole Scoring | Partially specified — Phase 1/2 items (CTP, LD, Greenie) fully specified; Phase 3 pseudocode (Sandy, Barkie, Polie, Arnie) present in §5 but all return `PlayerId | null` (single winner) |
| §6 Tie Handling | Specifies multi-winner for Sandy/Barkie/Polie/Arnie ("all tied winners collect") — **conflicts with §5 pseudocode** which returns `PlayerId | null` via `candidates.length === 1 ? candidates[0] : null` |
| §7 Press & Variants | Fully specified |
| §8 End-of-Round Settlement | Fully specified |
| §9 Edge Cases | Partially specified — Polie "doubles the loss" schema is unresolved (`IMPL:86`) |
| §10 Worked Example | Complete (CTP + Greenie) |
| §11 Implementation Notes | Covers Phase 1/2 events only |
| §12 Test Cases | All 5 cases implemented |

**Phase boundary:**

| Phase | Status | Content |
|---|---|---|
| Phase 1 | Landed | Dispatch scaffold; CTP; Greenie; basic per-bet fan-out structure |
| Phase 2 | Landed | Longest Drive (multi-winner); CTPCarried stub (carryPoints: 0); all §12 Tests 1–5 |
| Phase 3 (#7b) | Not started | Sandy, Barkie, Polie, Arnie — gated on rules pass |

**Rules pass for Phase 3 must resolve before engineering:**
1. Multi-winner return type for Sandy/Barkie/Polie/Arnie: §5 pseudocode returns `PlayerId | null`; §6 says all tied winners collect — these conflict. Phase 3 requires returning a candidate set, not a single winner.
2. Polie "doubles the loss" schema (IMPL:86): whether `JunkAwarded.doubled: boolean` or a separate event type.
3. Test coverage AC for carry accumulation and resolution (IMPL:91): CTPCarried stub must be replaced with correct logic; §6 carry formula is deferred.
4. Super Sandy event-level multiplier: `pushAward`'s `multiplier` param vs `junkMultiplier` boundary (IMPL:92 — noted as closed but still relevant to Phase 3 Sandy implementation).

---

## 2. Evaluation Criteria

Listed explicitly before evaluation, per task instructions.

**Load-bearing:**

1. **Phase 3 structural readiness.** Phase 3 is the next engineering gate. Changes that require rewriting Phases 1–2 are not viable; changes that are cheap precisely because Phase 3 hasn't landed are the window.

2. **Multi-candidate return type compatibility.** The `resolveJunkWinner` return type (`PlayerId | null`) cannot serve Phase 3 multi-winner items (Sandy, Barkie, Polie, Arnie). Whether Phase 3 requires a type change to the exported function or can bypass it is load-bearing for any architectural change.

3. **Bridge work compatibility.** The bridge must map HoleData fields to HoleState junk fields. How many fields require new HoleData additions vs trivial remapping determines how much bridge work junk adds beyond Stroke Play's core 5 fields.

4. **Test isolation.** Can junk tests run without touching primary bet tests? A junk architectural change should not ripple to skins.test.ts or wolf.test.ts.

5. **Cutover compatibility (src/lib/junk.ts).** The legacy `computeJunkPayouts` uses a completely different type (`JunkConfig`) and serves functions not in the new junk system (birdie, eagle, snake, lowball). The cutover requires replacing the four legacy helpers' callers in the UI store — this is independent of architecture but is affected by whether the new engine's types change.

**Nice-to-have:**

6. **Code clarity.** The current fan-out structure (separate blocks for CTP, Greenie, LD in `settleJunkHole`) is understandable but produces inconsistency between items handled by the dispatch switch and items bypassed.

7. **Coupling to primary bet engines.** Currently: none. Primary bets and junk are called independently by `aggregateRound`. Any alternative should preserve this independence.

8. **Rework cost when parked bets unpark.** Junk attaches to any bet via `junkItems`. When Wolf/Nassau/Match Play/Skins unpark, junk code does not change — only HoleState field population by the bridge changes.

---

## 3. Evaluation Against Criteria

### Is junk one engine or many?

Structurally: one engine, one entry point (`settleJunkHole`), one dispatch function (`resolveJunkWinner`). Functionally: already N independent resolvers (isCTP, isGreenie, isLongestDrive, four Phase 3 stubs) called by a single orchestrator. The N-independent shape is present inside the file; it is not exposed as separate exports.

### Dispatch and resolution flow

`settleJunkHole` runs three sequential blocks:

1. **CTP block:** Calls `isCTP`. If a winner exists, emits `CTPWinnerSelected` (once, not per-bet). Then fans out `JunkAwarded` per bet that declares `'ctp'`, filtered by whether the winner is in that bet's participants.

2. **Greenie block:** For each bet declaring `'greenie'`, calls `isGreenie(ctpWinner, hole, junkCfg, bet)`. Greenie passes the bet as a parameter so it can check `bet.participants.includes(ctpWinner)` — a per-bet eligibility check that is not in `resolveJunkWinner`.

3. **LD block:** Calls `isLongestDrive`. If winners exist, emits `LongestDriveWinnerSelected` (once). Then fans out `JunkAwarded` per bet that declares `'longestDrive'`.

The dispatch switch (`resolveJunkWinner`) is bypassed for LD (returns null always; documented) and partially bypassed for Greenie (switch returns the CTP winner without the bet-participant filter; `settleJunkHole` performs the full check inline). The dispatch switch is only cleanly authoritative for CTP.

### How junk interacts with primary bet engines

**No coupling in either direction.** Junk does not call any of the five primary bet engines. No primary bet engine calls junk. `aggregateRound` calls both independently per hole. This is a clean separation and holds across all five primary bets.

### HoleState fields: junk-unique vs shared

From the §4 grep in the stroke-play-only scoping report, confirmed and extended here:

| HoleState field | Used by any primary bet engine? | Used by junk? |
|---|---|---|
| `gross[pid]` | Yes (all five) | Yes (`isGreenie`, `isSandy`, `isBarkie`, `isPolie`, `isArnie`) |
| `strokes[pid]` | Yes (all five) | No |
| `holeIndex` | Yes (all five) | No |
| `hole` | Yes (all five) | Yes |
| `timestamp` | Yes (all five) | Yes |
| `par` | No primary bet | **Yes, junk only** |
| `ctpWinner` | No primary bet | **Yes, junk only** |
| `longestDriveWinners` | No primary bet | **Yes, junk only** |
| `gir[pid]` | No primary bet | **Yes, junk only** |
| `bunkerVisited[pid]` | No primary bet | **Yes, junk only** (Phase 3 Sandy) |
| `treeSolidHit[pid]` | No primary bet | **Yes, junk only** (Phase 3 Barkie) |
| `treeAnyHit[pid]` | No primary bet | **Yes, junk only** (Phase 3 Barkie) |
| `longPutt[pid]` | No primary bet | **Yes, junk only** (Phase 3 Polie) |
| `polieInvoked[pid]` | No primary bet | **Yes, junk only** (Phase 3 Polie invoked mode) |
| `fairwayHit[pid]` | No primary bet | **Yes, junk only** (Phase 3 Arnie) |
| `withdrew` | Match Play only | No |
| `conceded` | Match Play only | No |
| `pickedUp` | No engine | No |
| `status` | No engine | No |

Junk owns 9 HoleState fields exclusively (par, ctpWinner, longestDriveWinners, gir, bunkerVisited, treeSolidHit, treeAnyHit, longPutt, polieInvoked, fairwayHit). Primary bet engines collectively own 3 fields exclusively (strokes, holeIndex, withdrew/conceded). The gross, hole, and timestamp fields are shared.

### Multi-candidate resolution: Phase 3 structural readiness

The current `resolveJunkWinner` return type is `PlayerId | null`. Phases 1–2 items (CTP, Greenie, LD) are consistent with this: CTP returns one winner or null; Greenie returns one winner or null; LD bypasses the switch and returns `PlayerId[] | null` directly via `isLongestDrive`.

Phase 3 items per §6: "Sandy, Barkie, Polie, Arnie — all tied winners collect." With two players visiting a bunker and both making par, there are two Sandy winners. The §5 pseudocode returns `PlayerId | null` via `candidates.length === 1 ? candidates[0] : null` — this returns null for multi-candidate Sandys, silently dropping the award.

This is a **spec inconsistency between §5 and §6**: §5 pseudocode returns single winner or null; §6 says all tied winners collect. The rules pass must resolve which is authoritative. The resolution changes the engine implementation:

- If §6 is authoritative (all winners collect): `isSandy` must return `PlayerId[] | null`. The dispatch switch's return type changes for Sandy/Barkie/Polie/Arnie items. `settleJunkHole` needs per-item fan-out blocks similar to LD's current block, or `resolveJunkWinner` needs an overload.
- If §5 is authoritative (single winner or null when tied): no structural change to `resolveJunkWinner`; the Phase 3 stubs can be filled in as-is. Multi-candidate Sandy would void (return null) rather than split.

Under the §6-authoritative reading, Phase 3 requires structural changes to `resolveJunkWinner` or to the fan-out pattern in `settleJunkHole`. `pushAward` already accepts `PlayerId[]` — it will not need changes. The fan-out blocks are the surface.

### Reference-identity anti-pattern

Grepped both `junk.ts` and `junk.test.ts` for `b.config === cfg`, `config ===`, and reference-identity patterns. **Zero matches.** Junk uses `bet.id` (string) for identification and `bet.junkItems.includes(kind)` for declaration lookup. No reference-identity anti-pattern present.

### What is working well

- **Primary bet independence.** No coupling in either direction. Changing junk does not touch any of the five primary bet engines, and primary bet changes do not touch junk. This is correct.
- **`pushAward` is multi-winner ready.** `winners: PlayerId[]` was designed for the multi-candidate case. Phase 3 does not need to change `pushAward`.
- **Bookkeeping events are cleanly separated.** `CTPWinnerSelected` and `LongestDriveWinnerSelected` fire once per hole regardless of bet count. Money events (`JunkAwarded`) fan out per declaring bet. This separation is well-designed and tested.
- **No reference-identity anti-pattern.** String-id lookup throughout.
- **Portability invariant met.** No `next/*`, React, DOM, or Prisma imports.
- **Fan-out order is deterministic** (`roundCfg.bets` array order, per Topic 8) and tested.

### What is structurally off

- **`resolveJunkWinner` has mixed fidelity.** LD always returns null (bypassed). Greenie returns a bare CTP candidate without the bet-participant filter. CTP returns cleanly. The switch is the authoritative resolver for CTP only; calling it for Greenie or LD does not produce the final answer used by `settleJunkHole`. The export name implies a general contract it does not fulfill.

- **Separate fan-out blocks for each junk item.** Currently: one block for CTP, one for Greenie, one for LD. When Phase 3 lands, three or four more blocks must be added (Sandy, Barkie, Polie, Arnie). This is predictable growth but produces a longer `settleJunkHole` function with repeated `for (const bet of roundCfg.bets) { if (!bet.junkItems.includes(X)) continue; ... }` patterns.

- **§5/§6 doc inconsistency gates Phase 3.** The return-type gap (single winner vs multi-winner) is currently hidden by the stubs. Until the rules pass resolves §5 vs §6, the Phase 3 implementation cannot be written. This is not a code defect in Phases 1–2; it is a spec gap that propagates forward.

- **CTPCarried carryPoints: 0 is an acknowledged stub.** The carry path emits an event with incorrect data (`IMPL:91`, `IMPL:98`). This stub has been present since Phase 2 and is documented; it is not a defect, but it is known-wrong behavior in the carry path.

---

## 4. Alternative Architectures

Surfaced only where the §3 evidence supports doing so.

### Alternative A — Status quo (current shape)

`settleJunkHole(hole, roundCfg, junkCfg): ScoringEvent[]` takes `HoleState` directly. Per-item resolver functions (isCTP, isGreenie, isLongestDrive). Fan-out per declaring bet. `resolveJunkWinner` as dispatch switch.

**What's good:** Clean primary-bet independence. Bookkeeping events separated from money events. `pushAward` multi-winner ready. Topic 8 ordering tested.

**What Phase 3 requires under status quo:** Either (a) `resolveJunkWinner` gains an overloaded multi-winner return for Sandy/Barkie/Polie/Arnie, or (b) Phase 3 items bypass `resolveJunkWinner` entirely (the LD pattern) and get their own fan-out blocks in `settleJunkHole`. Option (b) can be done without changing the exported interface. The `settleJunkHole` function grows by ~40–60 lines (four more fan-out blocks).

**Migration cost from Phases 1–2:** None if Phase 3 uses the LD-bypass pattern. The 29 existing tests are unaffected.

**What it makes harder:** The `resolveJunkWinner` export continues to be inconsistently authoritative — it handles CTP cleanly, partially handles Greenie, and explicitly bypasses LD and Phase 3. As a documented "dispatch for single-winner items only," this is livable but not clean.

---

### Alternative B — Two-tier dispatch: single-winner and multi-winner

Split `resolveJunkWinner` into two functions:
- `resolveJunkSingleWinner(kind, hole, junkCfg): PlayerId | null` — CTP only in practice
- `resolveJunkWinners(kind, hole, junkCfg): PlayerId[] | null` — LD, Greenie (with bet parameter modification), Sandy, Barkie, Polie, Arnie

`settleJunkHole` uses `resolveJunkWinners` for all items. CTP returns a single-element array.

**What changes:** `resolveJunkWinner` is replaced or renamed. The fan-out loop in `settleJunkHole` becomes uniform: for each kind in each bet's junkItems, call `resolveJunkWinners`, filter by bet participants, call `pushAward`. One loop instead of three separate blocks.

**What it makes easier:** Phase 3 items slot into the same loop without new fan-out blocks. `settleJunkHole` stays compact. The export is genuinely authoritative for all items.

**What it makes harder:** Greenie's per-bet participant check currently happens inside `isGreenie(ctpWinner, hole, junkCfg, bet)` — the bet is a parameter. Under a unified dispatch, the bet parameter would need to be threaded into the dispatch function or the participant filter would move to the caller. This is a minor coupling change.

**Migration cost from Phases 1–2:** `resolveJunkWinner` is renamed or replaced. 29 existing tests use `resolveJunkWinner` indirectly through `settleJunkHole`; the Phase 1 scaffold test calls `resolveJunkWinner` directly (2 tests at `junk.test.ts:124`). Those 2 tests need updating; the remaining 27 are `settleJunkHole` integration tests and are unaffected if behavior is identical.

**Phase 1/2 work that survives:** `isCTP`, `isGreenie`, `isLongestDrive` helper functions survive unchanged. `pushAward` survives unchanged. `settleJunkHole`'s behavior is identical; the shape of internal calling changes.

---

### Alternative C — Junk as N independent per-item modules

Each junk item (`ctp`, `greenie`, `longestDrive`, `sandy`, `barkie`, `polie`, `arnie`) becomes a separately exported function: `settleCtpHole`, `settleGreenieHole`, etc. `settleJunkHole` becomes a thin dispatcher calling each.

**What changes:** The public API widens from one export to seven (or eight with a dispatcher). Test files could test each item in isolation. Phase 3 items could land without touching Phases 1–2 exports.

**What it makes easier:** Phase 3 items can be added as new exports without touching existing exports. Each item's rules can be tested in complete isolation.

**What it makes harder:** `aggregateRound` would need to call seven functions per hole instead of one. The bookkeeping event separation (CTPWinnerSelected fires once per hole for both CTP and Greenie) becomes harder — CTP and Greenie are coupled at the bookkeeping level because Greenie derives from CTP.

**Migration cost from Phases 1–2:** The CTP/Greenie coupling in bookkeeping events (CTPWinnerSelected fires once, then both CTP fan-out and Greenie fan-out use it) would need to be preserved across separate modules. This is non-trivial if CTP and Greenie become separate exports. The 29 tests would need to be restructured to test new exports.

**Phases 1–2 work that survives:** `isCTP`, `isGreenie`, `isLongestDrive` helper functions. `pushAward`. The event types and fan-out logic.

---

### Alternative D — Junk as post-resolution event subscriber

Junk consumes `ScoringEvent[]` from primary bets and derives awards from bet outcomes.

**What would need to change:** Primary bet engines emit richer events — they currently emit nothing about shot quality (whether a player was in a bunker, hit the fairway, GIR, etc.). Junk items like Sandy, Arnie, Greenie depend on conditions that exist in `HoleState`, not in any primary bet event. This architecture requires either (a) primary bet events to carry shot-quality metadata, or (b) HoleState is still passed to junk as a secondary input alongside primary bet events.

If `HoleState` is still passed, this becomes equivalent to the status quo with an additional event input that junk ignores (since its awards are condition-based, not outcome-based). If HoleState is removed and primary bet events must carry shot-quality metadata, primary bet engines must change significantly.

**Migration cost from Phases 1–2:** High. The primary bet engines' event schemas would need to add shot-quality fields that do not exist today and that primary bets have no rule-based reason to know about.

---

### Alternative E — Junk awards computed during HoleState construction (pre-engine)

All junk results (ctpWinner, isGreenie, longestDriveWinners, sandyWinners, etc.) are computed in the bridge/builder before `settleJunkHole` is called. HoleState carries pre-computed award fields; `settleJunkHole` simply reads them and emits events.

**What would change:** `settleJunkHole` becomes a thin event emitter reading pre-resolved awards from new HoleState fields. The resolution logic (isCTP, isGreenie, etc.) moves to the bridge builder.

**What it makes easier:** The bridge builder has one place to gather all junk data from the UI store and present it to the engine.

**What it makes harder:** Pure-engine testability is reduced — junk engine tests would need to pre-populate the resolved winners rather than testing the resolution logic itself. The portability invariant of `src/games/` (pure TypeScript, no DOM/store dependencies) is preserved only if the builder remains outside `src/games/`. Testing the resolution logic would require testing the builder, which depends on the UI store. Phase 3 resolution logic (isSandy, isBarkie) moves out of the portable engine layer.

**Migration cost from Phases 1–2:** High. The `isCTP`, `isGreenie`, `isLongestDrive` resolvers move out of `junk.ts`. The 29 existing tests test `settleJunkHole` against full HoleState inputs; they would need to be restructured to test the builder layer instead, or new HoleState fields would need to be added that carry pre-resolved award arrays.

---

## 5. Phase 3 Redesign Window

Phase 3 has not landed. This is the window for architectural changes that avoid rewriting Phases 1–2.

**Changes that are cheap now (before Phase 3 lands):**

- **Renaming or replacing `resolveJunkWinner`** with a multi-winner-capable interface (Alternative B). The 2 direct callers of `resolveJunkWinner` in the test file (Phase 1 scaffold test at `junk.test.ts:124`) are updated. The remaining 27 tests call `settleJunkHole` — they test behavior, not the dispatch interface, and are unaffected by an interface rename.

- **Adding a unified multi-winner fan-out loop** in `settleJunkHole` (Alternative B), replacing the three separate blocks. The behavior for CTP, Greenie, and LD is preserved; Phase 3 items slot in without adding more blocks. Cost: restructuring the three existing fan-out blocks into one loop; the 27 integration tests remain green.

- **Resolving the §5/§6 doc inconsistency** (single-winner vs multi-winner return) via the rules pass. Until the rules pass resolves this, any Phase 3 implementation is uncertain regardless of architecture.

**Changes that require rewriting Phase 1/2 work (not viable):**

- Moving `isCTP`, `isGreenie`, `isLongestDrive` resolution logic out of `junk.ts` (Alternative E). These functions are directly tested via `settleJunkHole` integration tests — restructuring them out of the engine layer would require restructuring the test surface.

- Changing the bookkeeping event emission pattern (`CTPWinnerSelected` fires once per hole). This pattern is tested across 5 describe blocks. Changing it would break multiple tests.

- Splitting CTP and Greenie into fully independent modules (Alternative C) — their coupling at the bookkeeping level (CTPWinnerSelected gates Greenie resolution) makes this a Phase 1 rewrite.

**What is unaffected by any architecture choice:**

- `pushAward` — already multi-winner capable; survives any alternative
- Event types (`JunkAwarded`, `CTPWinnerSelected`, `LongestDriveWinnerSelected`, `CTPCarried`) — defined in `events.ts`, not in `junk.ts`; unchanged
- Phase 1/2 behavior — CTP, Greenie, and LD produce identical output under any alternative that preserves their logic

---

## 6. Bridge Interaction

The stroke-play-only scoping report (§4) identified these junk-related HoleState fields the bridge must populate for junk to work: `par`, `ctpWinner`, `gir`, `longestDriveWinners`, and junk booleans (bunkerVisited, treeSolidHit, etc.).

### Mapping each field from HoleData

| HoleState field needed by junk | HoleData source | Mapping complexity |
|---|---|---|
| `par` | `HoleData.par` | Trivial — direct field |
| `ctpWinner` | `HoleData.greenieWinners[gameInstanceId]` | **Awkward.** `greenieWinners` is keyed by `GameInstance.id` (legacy UI concept). `HoleState.ctpWinner` is a single `PlayerId`. The bridge must choose which gameInstance's winner to use as the authoritative ctpWinner, or the UI must record ctpWinner at the round level rather than per-game-instance. |
| `gir[pid]` | **Not in HoleData** | HoleDots has: sandy, chipIn, threePutt, onePutt. No GIR field. Adding `gir` to HoleDots (or to HoleData directly) requires a new score-entry UI interaction — the scorekeeper must record who made the green in regulation. |
| `longestDriveWinners` | **Not in HoleData** | HoleData has no longestDriveWinners field at all. Adding it requires a new score-entry UI interaction — the scorekeeper must record who had the longest drive in the fairway. |
| `bunkerVisited[pid]` (Phase 3 Sandy) | `HoleData.dots[pid].sandy` (partial) | HoleDots.sandy represents "player was in a bunker" — the mapping is plausible, but the legacy semantics conflate condition (`bunkerVisited`) with outcome (`sandy = bunkerVisited AND par or better`). The bridge must map only `dots.sandy → bunkerVisited` and let the engine apply the par check. |
| `treeSolidHit[pid]` (Phase 3 Barkie) | **Not in HoleData** | No HoleDots field for tree contact. New interaction required. |
| `treeAnyHit[pid]` (Phase 3 Barkie non-strict) | **Not in HoleData** | Same. |
| `longPutt[pid]` (Phase 3 Polie) | **Not in HoleData** | HoleDots has `onePutt` but not `longPutt` (7-foot threshold). Different concept. New interaction required. |
| `polieInvoked[pid]` (Phase 3 Polie invoked mode) | **Not in HoleData** | Not in HoleDots. New interaction required. |
| `fairwayHit[pid]` (Phase 3 Arnie) | **Not in HoleData** | Not in HoleDots. New interaction required. |

**Summary of bridge surface for junk:**

- Phase 1/2 junk (CTP, Greenie, LD): 3 fields need non-trivial work — `ctpWinner` (awkward key lookup), `gir` (new HoleData field required), `longestDriveWinners` (new HoleData field required). `par` is trivial.
- Phase 3 junk (Sandy, Barkie, Polie, Arnie): 1 field has a partial HoleDots mapping (`bunkerVisited` ← `dots.sandy`); 5 fields require new HoleData fields and new score-entry UI interactions.

**Does the current architecture make these mappings natural or awkward?**

The current `junk.ts` takes `HoleState` directly and reads its fields. This means the bridge must produce a populated `HoleState` before calling `settleJunkHole`. The mapping awkwardness is in the bridge layer (HoleData → HoleState), not in junk.ts itself.

The architecture-neutral finding: Phase 1/2 junk requires 2 new HoleData fields (`gir` per player, `longestDriveWinners`) plus resolution of the `ctpWinner` key lookup. Phase 3 junk requires 5 more new HoleData fields and corresponding score-entry UI. This work is required regardless of which junk architecture is chosen, because the underlying HoleData type does not carry the data the engine needs.

**Would Alternative B or C reduce the bridge surface?** No. The HoleState fields read by junk are the same regardless of whether junk is one engine or N engines. The bridge must populate `gir`, `longestDriveWinners`, and resolve `ctpWinner` under any alternative. Alternative E (pre-engine resolution in the builder) would restructure where this data is computed but not reduce the total number of new HoleData fields required.

---

## 7. Operator Decisions Needed

1. **§5 vs §6 multi-winner resolution:** The rules pass must resolve whether Sandy/Barkie/Polie/Arnie return a single winner (§5 pseudocode, `PlayerId | null`) or all tied winners (§6 spec, `PlayerId[] | null`). This is the gate for Phase 3 engineering and determines whether `resolveJunkWinner` must change its return type.

2. **Phase 3 fan-out pattern:** If §6 is authoritative (all winners collect), Phase 3 can be implemented via (a) extending `resolveJunkWinner` to return `PlayerId[] | null` (Alternative B), or (b) bypassing `resolveJunkWinner` for Phase 3 items (LD-bypass pattern, status quo). The choice determines whether `resolveJunkWinner` changes or stays the same.

3. **Junk in v1 Stroke Play bridge:** Decision 6 from the stroke-play-only scoping report. If junk is included, the bridge must add `gir` and `longestDriveWinners` to `HoleData` and add score-entry UI for both. If junk is excluded from v1 Stroke Play, the bridge populates only Stroke Play's 5 core HoleState fields plus stubs; junk fields are deferred to when junk enters the bridge scope.

4. **`ctpWinner` key lookup:** `HoleData.greenieWinners` is keyed by `GameInstance.id` (legacy UI concept); `HoleState.ctpWinner` is a round-level `PlayerId`. Before the bridge can populate `ctpWinner`, either (a) `HoleData` gains a new round-level `ctpWinner: PlayerId | null` field, or (b) the bridge resolves which gameInstance's greenieWinner is authoritative. This is a data model decision for the bridge design, independent of junk engine architecture.

5. **CTPCarried carryPoints: 0 stub:** The stub has been present since Phase 2. Before Phase 3 lands, the carry formula (`IMPL:91`, deferred) must be resolved if the carry path is to be exercised in production. If the carry path is gated behind a UI toggle that defaults to `groupResolve`, the stub can remain until the carry formula is specified.

---

## Noticed But Out of Scope

1. `src/lib/junk.ts` serves junk items not in the new system (birdie, eagle, garbage, hammer, snake, lowball). The new `JunkKind` union does not include these. The cutover (#11) will delete `computeJunkPayouts` and these items will silently lose settlement. This is noted in `pending-items-evaluation.md §4 Bug 2` for Stableford; the same risk applies to any round using legacy junk items. Not an architectural question for `src/games/junk.ts` but relevant to cutover planning.

2. `junk.test.ts:83` — `makeBet` hardcodes `type: 'skins'` for all test bets regardless of the actual bet type being tested. This is cosmetically wrong (a Nassau bet fixture that says it's Skins) but functionally harmless since `settleJunkHole` reads `bet.junkItems` and `bet.participants`, not `bet.type`. Cosmetic cleanup item, not an architecture issue.

3. The Phase 2 header comment in `junk.test.ts:1` says "Phase 2 Iteration 1: CTP + Greenie surface tests" but the file also contains Test 5 (Longest Drive, Phase 2 Iteration 2). The comment is stale. Not an architecture issue.

4. `resolveJunkWinner` is exported but serves no documented external consumer in the current codebase beyond the 2 Phase 1 scaffold tests. If it is not intended as a public API (only `settleJunkHole` is the intended external interface), the export could be made package-private (removed from exports). This is a scope clarification, not an architectural change.
