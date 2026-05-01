# Nassau Phase Plan

**Authored:** 2026-05-01
**Status:** PROPOSED — awaiting GM approval of Decisions A and B (sections 1 and 2) before NA-1 implementation begins.
**Source research:** `docs/2026-05-01/02-nassau-plan.md` (this prompt's report)
**Preceding phase:** Wolf phase — closed 2026-04-30 per `docs/plans/WOLF_PLAN.md`

---

## Scope

The Nassau phase begins when GM approves this plan. It ends when **NA-5 closes**.

**"Live in production" definition (NA-5 closure trigger):**

All of the following must be true before NA-5 is declared closed:

1. `src/types/index.ts` GAME_DEFS `'nassau'` entry has no `disabled: true` flag.
2. All Nassau engine and bridge tests pass (`npm run test:run`).
3. `tsc --noEmit --strict` passes.
4. Playwright spec `tests/playwright/nassau-flow.spec.ts` passes (see NA-4 §3).
5. Cowork verification pass complete (see NA-5 §3).

Closing NA-5 does **not** automatically unpark Match Play or Junk #7b. The next bet is a separate operator decision. Nassau unparking opens the path to Phase 7 multi-bet cutover (the third bet condition per REBUILD_PLAN.md #11).

**Does not supersede:** `WOLF_PLAN.md` (retained for history). Phase 7 (full multi-bet cutover) remains deferred — three bets required; after Nassau, the third (Match Play or other) is the remaining gate.

---

## 1. Resolved Decisions

Decisions settled before the plan was written or resolved by the project state. Not re-litigable within this phase.

### Decision A — allPairs in v1 *(assessment — GM approval required)*

**See §2 below.** Whether `pairingMode = 'allPairs'` (3–5 player Nassau with every distinct pair scoring independently) is in scope for v1. Code recommendation: **yes, include allPairs in v1.** The engine already handles it; the bridge handles it by iterating pairs; the wizard needs a `pairingMode` toggle. Marginal cost over singles-only is low.

**If GM selects singles-only:** the bridge is simpler (one pair, two playerIds required), but Nassau only works for 2-player rounds in v1. A follow-on phase would unpark allPairs.

**GM must confirm before NA-1 implementation begins.**

### Decision B — Press offer interaction shape *(assessment — GM approval required)*

**See §2 below.** How the press confirmation dialog surfaces to the user. Three options evaluated; Code recommends one.

**GM must confirm before NA-3 implementation begins.** (NA-1 and NA-2 are not blocked by this decision.)

---

## 2. Assessments Requiring GM Decision

### Assessment A — allPairs in v1

The Nassau engine (`nassau.ts`) has first-class support for `pairingMode = 'allPairs'`: `initialMatches(cfg)` generates all `C(n,2)` pair-match triples when `pairingMode = 'allPairs'`; `settleNassauHole` iterates over all match states; `finalizeNassauRound` settles each pair's front/back/overall/press independently. The existing tests include allPairs (Test 5: 3-player allPairs settlement).

**Option (a): allPairs in v1.**

*What it means:* The bridge supports both `pairingMode = 'singles'` (2-player only) and `pairingMode = 'allPairs'` (3–5 players). The wizard shows a `pairingMode` toggle. The player-count guard accepts either 2 players (singles only) or 3–5 players (allPairs only).

*Pros:* Nassau becomes useful immediately for the group. Engine is complete; bridge cost is one outer loop over pairs. Wizard toggle is one `<select>` element. No follow-on "allPairs unlock" phase needed.

*Cons:* The allPairs ledger merge is slightly more complex: for N players with `C(N,2)` pairs, each pair produces its own deltas that must be aggregated per player across pairs. The aggregate logic is already in `aggregate.ts` (which handles `byBet` compound keys for Nassau) — but the bridge must build the compound keys correctly. One additional bridge test fixture (3-player allPairs) is required.

*Risk:* Low. Engine and aggregate layer are both tested for allPairs.

---

**Option (b): singles-only v1; allPairs in a follow-on prompt.**

*What it means:* Bridge accepts only 2-player Nassau. `pairingMode` is hardcoded `'singles'` in v1. A follow-on phase (NA-1b or a post-NA-5 prompt) wires allPairs.

*Pros:* Simpler bridge; fewer moving parts in NA-1.

*Cons:* Nassau is only useful for 2-player rounds in v1 — a significant limitation for a 3–5 player group betting app. Requires a follow-on phase to unlock a feature the engine already supports. Likely delays full Nassau usability by one extra phase.

*Risk:* Low for v1; creates a phase-7 blocker if Match Play is needed alongside Nassau.

---

**Code recommendation: Option (a) — allPairs in v1.**

The engine supports it; the aggregate layer supports it; the marginal cost is modest. Nassau without allPairs is only useful for 2-player match-up rounds, which is a common but limited subset of the group's use cases. Including allPairs makes Nassau immediately useful for the full group.

---

### Assessment B — Press offer interaction shape

After a player saves a hole score, if that hole meets a press threshold (`pressRule = 'auto-2-down'` or `auto-1-down'`), the UI must prompt the down player: "You are N down on [front/back/overall]. Do you want to press?" The player's answer is stored in `HoleData.presses?: string[]` (already on `HoleData` — the matchId of confirmed presses is appended; empty or absent means no press on this hole). The bridge reads `holeData.presses` to know which presses were confirmed.

Three interaction options:

---

**Option (a): Post-save modal on the scorecard.**

*What it means:* After "Save & Next Hole" is tapped, if a press threshold is met, a modal overlay appears before hole navigation completes. The modal shows the match state ("Alice is 2 down on the Front — press?") with "Accept" and "Decline" buttons. On Accept, `matchId` is written to `HoleData.presses[currentHole]` before the hole PUT fires. On Decline, the hole saves without a press entry. Implemented as a local state flag in `scorecard/[roundId]/page.tsx` — `pendingPressOffers: PressOffered[]` — set in `handleSaveNext` before navigation.

*Pros:* Zero new routes. Modal pattern already exists (finish confirmation overlay). Inline with the save gesture — natural timing for a press decision. Low implementation complexity.

*Cons:* Modal appears mid-save-gesture, which may feel jarring if multiple presses are offered simultaneously (allPairs mode: 3 matches, up to 3 concurrent offers). Multiple modals must be handled serially.

*Risk:* Low. The existing finish-confirmation modal is the exact pattern. Multiple concurrent press offers require an offer queue (process one at a time).

---

**Option (b): Dedicated `press/[roundId]/[hole]` route.**

*What it means:* After saving a hole, `handleSaveNext` checks for pending press offers and navigates to `/golf/scorecard/[roundId]/press/[hole]` instead of `/golf/scorecard/[roundId]/resolve/[hole]` (or in sequence with resolve). The press route lists all open offers for the current hole; the player accepts or declines each. On completion, navigates to the next hole.

*Pros:* Full-screen press decision; more screen real estate for multiple simultaneous offers (allPairs); clean separation of press logic from scorecard page.

*Cons:* New App Router route and page component. Extra navigation step between every hole (even holes with no press offers would be a pass-through, requiring a redirect). Adds to the hole-transition latency. Pattern is different from Wolf declaration (which is inline on the scorecard, not a separate route).

*Risk:* Moderate implementation cost. Adds one more route to the App Router's hole-transition chain.

---

**Option (c): Between-hole press panel inside `BetDetailsSheet`.**

*What it means:* The existing `BetDetailsSheet` gains a "Press offers" section at the top when a press threshold is met. A badge or notification indicator on the sheet trigger button alerts the user to open the sheet. Inside, the press offer is prominent at the top with Accept/Decline. The sheet can be dismissed without accepting; the press offer stays visible until the player explicitly declines or the hole window closes.

*Pros:* Leverages the existing shared sheet; no new components or routes. Press and score review happen in the same interaction.

*Cons:* Requires the player to actively open the sheet to respond to a press offer — less discoverable than a modal. The notification badge pattern adds UI complexity. The sheet trigger may be easily missed on-course.

*Risk:* Discoverability risk. Press offers are time-sensitive (player needs to decide per hole); a passive notification may result in missed presses.

---

**Code recommendation: Option (a) — post-save modal.**

`pressRule = 'manual'` (the default) means the player actively requests a press — no automatic prompt needed. Only `auto-2-down` and `auto-1-down` trigger automatic prompts. For v1 with `pressRule = 'manual'` as the default, the offer queue starts empty on most rounds. For auto rules, the modal appears when needed, is familiar (matches the finish confirmation pattern), and is processed serially. The press offer is a blocking decision (the player must decide before the round advances); a modal is the right choice for a blocking decision.

For allPairs with multiple concurrent offers: the bridge determines offer order (e.g., front match first, back second, overall third); the modal processes them one at a time with a "Next offer" step.

**GM must confirm (a) — or select (b) or (c) — before NA-3 implementation begins.** NA-1 and NA-2 are not blocked.

---

## 3. Park Definitions

**Nassau is the only bet unparking in this phase.** All other bets remain parked.

### 3a. Match Play

**Park option:** (c) — maintained. `'matchPlay'` GAME_DEFS entry retains `disabled: true`.
**Note:** Match Play and Nassau share match-format concepts; they may be well-suited for a paired phase after Nassau. Match Play bridge does not exist yet.

### 3b. Wolf

**Park option:** Wolf is already **live** (WF-7 closed 2026-04-30). No change.

### 3c. Junk (side-bet engine)

Junk remains structurally parked in this phase. `junkItems: []` and `junkMultiplier: 1` are hardcoded in `nassau_bridge.ts` (same as `skins_bridge.ts` and `wolf_bridge.ts`). The Junk section in `GameInstanceCard.tsx` may appear on Nassau wizard cards — pre-existing cosmetic artifact; suppressing it is out of scope until Junk Phase 3 unparks.

### 3d. Nassau config options parked for v1

| Field | Hardcoded value | Unpark trigger |
|---|---|---|
| `appliesHandicap` | `true` | Separate operator decision |
| `junkItems` | `[]` | Junk Phase 3 |
| `junkMultiplier` | `1` | Junk Phase 3 |
| `pressRule` display confirmation (pending-confirmation UI) | n/a — see NA-3 | Decision B selection |

`pressRule` itself is **not** parked — it is surfaced in the wizard with a default of `'manual'`. `pressScope` is not parked — also in the wizard. `pairingMode` is not parked (per Decision A recommendation).

---

## 4. Fully Functional — Nassau v1

### Engine surface exercised

- `initialMatches(cfg)` — generates front/back/overall MatchState entries for each pair.
- `settleNassauHole(hole, cfg, roundCfg, matches)` — per-hole stateful settlement; returns `{ events, matches }` with updated state.
- `finalizeNassauRound(events, matches, cfg)` — emits closing events for all open matches.
- `offerPress(hole, match, cfg, downSide)` — produces `PressOffered` event; bridge reads `HoleData.presses` to determine if player confirmed.
- `openPress(hole, match, cfg)` — opens a press after confirmation; bridge calls when `presses` entry is present.
- `pressScope: 'nine' | 'match'` — both paths tested.
- `pressRule: 'manual' | 'auto-2-down' | 'auto-1-down'` — all three paths.
- `pairingMode: 'singles' | 'allPairs'` — both paths (per Decision A).
- `appliesHandicap: true` (hardcoded).
- 2 players (singles) or 3–5 players (allPairs).
- `junkItems: []`.

### Bridge threading model

Nassau's `settleNassauHole` takes and returns `MatchState[]` explicitly. The bridge maintains this state across the per-hole loop — unlike Skins and Wolf which are stateless per hole. The threading model:

```
matches = initialMatches(cfg)
for each hole in order:
  { events: holeEvents, matches } = settleNassauHole(hole, cfg, roundCfg, matches)
  if pressOffered on this hole AND presses includes matchId:
    { events: pressEvents, matches } = openPress(hole, matchState, cfg)
    allEvents = [...allEvents, ...holeEvents, ...pressEvents]
  else:
    allEvents = [...allEvents, ...holeEvents]
finalEvents = finalizeNassauRound(allEvents, matches, cfg)
```

For `allPairs` mode, the bridge runs the above loop once per pair combination, then aggregates ledger entries across pairs using compound keys (`${betId}::${matchId}`). The `aggregate.ts` layer already supports this key format.

### UI surfaces in scope

| Surface | File | Role | New in this phase |
|---|---|---|---|
| Nassau in game picker | `GameList.tsx` via GAME_DEFS | `disabled: true` removed | **Yes (NA-1)** |
| Nassau wizard controls | `GameInstanceCard.tsx` | `pressRule`, `pressScope`, `pairingMode` selectors | **Yes (NA-2)** |
| Player-count guard | `GameInstanceCard.tsx` or wizard submit | 2 players for singles; 3–5 for allPairs | **Yes (NA-2)** |
| Press offer modal | `scorecard/[roundId]/page.tsx` | Post-save modal when press threshold met | **Yes (NA-3 — if Decision B = option a)** |
| Nassau results integration | `results/[roundId]/page.tsx`, `bets/[roundId]/page.tsx` | Net totals (via PayoutMap, same as SP/Skins/Wolf) | No new component |
| BetDetailsSheet Nassau data | `BetDetailsSheet.tsx` | Nassau per-hole deltas via perHoleDeltas dispatch | Free — dispatch added in NA-1 |

### UI surfaces NOT in scope for v1

- `appliesHandicap` toggle — parked (§3d).
- Per-match score display in BetDetailsSheet ("Alice 2 Up through hole 7") — deferred; sheet shows delta amounts, not match status.
- Press-depth cap in the wizard (UI to limit max press depth) — engine has no cap; UI can add later.
- Junk side bets with Nassau — parked (§3c).
- `pairingMode = 'teams'` (2-on-2 best-ball-net) — not implemented in engine; out of scope.

### Edge cases in scope

- Singles: front/back/overall three-match structure; closeout when lead exceeds remaining holes.
- allPairs: every `C(N,2)` pair generates its own three-match Nassau; deltas sum per player.
- Manual press: `pressRule = 'manual'`; player explicitly requests press; bridge reads `HoleData.presses`.
- Auto-2-down press: `pressRule = 'auto-2-down'`; press offered at 2 down; player confirms or declines.
- Auto-1-down press: `pressRule = 'auto-1-down'`.
- pressScope 'nine' and 'match': different press endHole calculation.
- Tied match at end: `MatchTied`, zero delta.
- Closeout: `MatchClosedOut` when lead > holes remaining.
- Missing score: that player forfeits the hole (`NassauHoleForfeited`).
- `PressVoided`: press opened on the last hole of its window (zero-hole press).

### Edge cases out of scope for v1

- `appliesHandicap: false` gross scoring (hardcoded `true`).
- Player withdrawal mid-round (`settleNassauWithdrawal` — engine-complete; UI defers to manual score entry per existing convention).
- `pairingMode = 'teams'` (engine not implemented).
- Junk items with Nassau.

---

## 5. Sequencing Options

Three sequencing options are evaluated. Code's recommendation follows.

### Option A — Bridge-first (recommended)

**Order:** NA-0 → NA-1 (bridge + cutover + GAME_DEFS unpark) → NA-2 (wizard setup) → NA-3 (press offer UI) → NA-4 (Playwright spec) → NA-5 (Cowork)

*Rationale:* Same pattern as Skins (SK-2 before SK-3) and Wolf (WF-1 first). The bridge is wired early, which means `BetDetailsSheet` immediately shows Nassau data (via `perHoleDeltas.ts` dispatch) after NA-1. The wizard (NA-2) can follow in a separate focused prompt. Press offer UI (NA-3) is the most complex piece and is deferred until the bridge is stable — if the bridge reveals unexpected behavior, the press UI design is not yet committed.

*Risk:* Medium. Nassau bridge is more complex than Wolf/Skins (MatchState threading, press handling from HoleData). NA-1 is the largest single item. Mitigation: the engine is complete and well-tested; the bridge has a clear contract.

### Option B — Wizard-first with stub bridge

**Order:** NA-0 → NA-1 (wizard + GAME_DEFS unpark + stub bridge returning empty events) → NA-2 (full bridge + cutover) → NA-3 (press offer UI) → NA-4 → NA-5

*Rationale:* The wizard UI is visible and testable before bridge complexity is tackled. A stub bridge (`settleNassauBet` returns `{ events: [], ledger: {} }`) allows the wizard, player-count guard, and scorecard to function while the full bridge is developed.

*Risk:* Higher. A stub bridge masks bridge-level bugs until NA-2; the GAME_DEFS unpark exposes Nassau in the wizard but the game produces no settlement until NA-2 lands. Two-step cutover is messier. Not recommended unless the wizard has significant design uncertainty.

### Option C — Combined bridge + wizard in one item

**Order:** NA-0 → NA-1 (bridge + cutover + wizard + GAME_DEFS unpark, combined) → NA-2 (press offer UI) → NA-3 (Playwright spec) → NA-4 (Cowork)

*Rationale:* Wolf's WF-1 combined bridge + wizard + player-count guard successfully. Nassau can follow the same pattern. Fewer items, fewer commits.

*Risk:* NA-1 becomes a large L-sized item (bridge complexity + wizard complexity). Wolf's WF-1 succeeded because the bridge was stateless; Nassau's bridge has MatchState threading. If the bridge hits unexpected issues, the wizard is blocked. Recommend splitting to reduce blast radius.

---

**Code recommendation: Option A (bridge-first, split bridge/wizard).**

The Nassau bridge is meaningfully more complex than prior bridges (MatchState threading, press handling from HoleData, allPairs pair iteration). Splitting bridge (NA-1) from wizard (NA-2) reduces the blast radius of unexpected bridge issues and keeps each item reviewable. The BetDetailsSheet immediately benefits from NA-1 (Nassau deltas visible in the sheet before the wizard is complete). The press offer UI (NA-3) is the most novel piece and is best deferred until the bridge's press-handling contract is proven in tests.

---

## 6. Phases

### NA-0 — Plan Doc (this document)

**Type:** Documenter
**Sizing:** S
**Status:** PROPOSED — awaiting GM approval of Decisions A and B.

Deliverable: `docs/plans/NASSAU_PLAN.md`. Plan is approved when GM confirms both decisions and signals green light for NA-1. AGENTS.md "Current item" pointer will be updated to NA-1 on approval.

---

### NA-1 — Nassau Bridge + Cutover + GAME_DEFS Unpark

**Type:** Engineer
**Sizing:** M–L
**Dependencies:** NA-0 approved (GM green-lights plan + Decision A).

**Purpose:** Create `src/bridge/nassau_bridge.ts`, wire `computeGamePayouts` to route `'nassau'` through the bridge, add `case 'nassau'` to `perHoleDeltas.ts`, and unpark Nassau in GAME_DEFS. This is the most complex bridge in the project due to MatchState threading.

**Bridge surface (`nassau_bridge.ts`):**

```
buildNassauCfg(game: GameInstance) → NassauCfg
  — maps: id, stake, pressRule, pressScope, pairingMode, playerIds
  — hardcodes: appliesHandicap: true, junkItems: [], junkMultiplier: 1

settleNassauBet(
  holes: HoleData[],
  players: PlayerSetup[],
  game: GameInstance,
) → { events: ScoringEvent[]; ledger: Record<string, number> }
  — for singles (pairingMode = 'singles'):
      runs per-hole loop for the single pair; maintains MatchState[]
      checks holeData.presses for confirmed press matchIds
      calls finalizeNassauRound after loop
  — for allPairs (pairingMode = 'allPairs', Decision A = option a):
      iterates every C(N,2) pair combination
      runs per-hole loop per pair; accumulates events per pair
      calls finalizeNassauRound per pair
      merges ledger entries: compound key `${betId}::${matchId}` per aggregate.ts convention
  — ledger built from NassauHoleWon.points, MatchClosedOut.points, MatchTied.points, NassauWithdrawalSettled.points
  — portability: no next/*, react, react-dom, fs, or path imports
```

**Press handling in bridge:**

The bridge checks `hole.presses` (the `HoleData.presses?: string[]` field already present on `HoleData`). For each hole, after calling `settleNassauHole`:
1. Call `offerPress(hole, match, cfg, downSide)` for each open match where the down player meets the pressRule threshold.
2. If `offerPress` returns a `PressOffered` event AND `hole.presses?.includes(matchId)` is true, call `openPress(hole, match, cfg)` to generate `PressOpened` and update the MatchState.
3. If not confirmed (or no offer), continue with unmodified matches.

For `pressRule = 'manual'`: `offerPress` only returns a `PressOffered` event when the player explicitly requests it (the engine returns [] for 'manual' unless the down side proactively called it). The bridge does not call `offerPress` for 'manual' — the press is recorded in `presses` directly by the UI (NA-3). For NA-1, manual presses from `holeData.presses` trigger `openPress` directly (no `offerPress` needed).

**Cutover (`src/lib/payouts.ts`):**

Replace `case 'nassau': return computeNassau(holes, players, game)` with:
```ts
case 'nassau': return payoutMapFromLedger(settleNassauBet(holes, players, game).ledger, game.playerIds)
```
Import `settleNassauBet` from `'../bridge/nassau_bridge'`. The legacy `computeNassau` function body can remain as dead code until #11 full cutover (or can be deleted — grep gate confirms zero dispatch path).

**`perHoleDeltas.ts` update:**
Add `case 'nassau': return settleNassauBet(holes, players, game).events` to `gameHoleEvents`. One-line addition.

**Unpark:** `src/types/index.ts` GAME_DEFS `'nassau'` — remove `disabled: true`.

**Grep gate:** `git grep -rn "case 'nassau'.*computeNassau" src/lib/payouts.ts` → zero matches after cutover.

**D1 sub-task B gate:** Before NA-1 closes, the engineer runs `git grep -n "settleNassauWithdrawal\|MatchTied" src/games/nassau.ts` and confirms the tied-withdrawal behavior matches either the I3 decision (MatchTied emitted) or the current silent-close implementation. Document whichever is correct in the NA-1 session log. This observation informs D1 sub-task B but does not block NA-1 closure.

**Test bridge:** Add `src/bridge/nassau_bridge.test.ts` with coverage of:
- Singles: front-wins round (correct front delta, zero back/overall); all-tied (zero-sum); closeout.
- Singles with manual press: bridge reads `presses: ['front']` from a hole and opens a press; correct delta includes press settlement.
- allPairs (if Decision A = option a): 3-player allPairs; zero-sum across all 3 players; correct per-pair deltas.
- allPairs with one press: bridge handles concurrent press offers across pairs.
- Empty holes: ledger is all-zeros; no throws.

**Acceptance criteria:**

- `nassau_bridge.ts` exists; `settleNassauBet` exported.
- `case 'nassau'` in `computeGamePayouts` routes through bridge; `computeNassau` dispatch path removed.
- `case 'nassau'` in `perHoleDeltas.ts` `gameHoleEvents`.
- Nassau appears in the "Add a game" picker (GAME_DEFS `disabled` removed). Player count and pressRule wizard controls are **not** required for this item — that is NA-2.
- Two-player Nassau round settles correctly: zero-sum `PayoutMap`, correct per-match deltas, press included when `presses` field present.
- allPairs: 3-player allPairs round zero-sum across all 3 players (if Decision A = option a).
- `npm run test:run` passes (all existing tests + new bridge tests).
- `tsc --noEmit --strict` passes.
- Playwright `skins-flow.spec.ts` and `wolf-flow.spec.ts` still pass (regression gate).
- **Fence:** `nassau_bridge.ts`, `nassau_bridge.test.ts`, `payouts.ts` (nassau case), `perHoleDeltas.ts` (nassau case), `src/types/index.ts` (disabled flag removal). No Skins, Wolf, Stroke Play, or scorecard UI files touched.

**Risk flags:**

- MatchState threading: the bridge must maintain `MatchState[]` across the per-hole loop. If holes are not in order or have gaps, the state machine may diverge. The bridge should sort holes by `number` ascending before the loop.
- allPairs pair ordering: `C(N,2)` pairs must be generated deterministically (e.g., sorted player-id pairs). Non-deterministic ordering produces non-reproducible compound keys. Use `playerIds.sort()` to generate canonical pair order.
- Press timing: `openPress` must be called in the bridge at the correct hole (the hole after the press offer). Confirm the engine's press contract (offer hole N → open takes effect from hole N+1) is respected in the per-hole loop.
- Legacy Nassau rounds in DB: `SELECT COUNT(*) FROM "Game" WHERE type = 'nassau'` should return 0 (Nassau was always `disabled: true`). Confirm before NA-1 closes.

---

### NA-2 — Nassau Wizard Setup

**Type:** Engineer
**Sizing:** S
**Dependencies:** NA-1 complete (Nassau must be unparked and visible in the picker before wizard controls are testable).

**Purpose:** Add Nassau-specific wizard controls to `GameInstanceCard.tsx`: `pressRule` selector, `pressScope` selector, `pairingMode` toggle (or selector), and player-count guard. These controls are the only new UI items beyond what the bridge provides.

**Controls:**

| Control | Field | Type | Default | Values |
|---|---|---|---|---|
| Press rule | `pressRule` | Select or radio | `'manual'` | manual, auto-2-down, auto-1-down |
| Press scope | `pressScope` | Select or radio | `'nine'` | nine (nine only), match (full match) |
| Pairing mode | `pairingMode` | Toggle or select | `'singles'` | singles (2 players), all pairs (3–5) |

**Labels (human-readable):**
- `'manual'` → "Manual press (player requests)"
- `'auto-2-down'` → "Auto press at 2 down"
- `'auto-1-down'` → "Auto press at 1 down"
- `'nine'` → "Press to end of 9 (nine scope)"
- `'match'` → "Press to end of match"
- `'singles'` → "1-on-1 (2 players)"
- `'allPairs'` → "All pairs (3–5 players)"

**Player-count guard:**
- `pairingMode = 'singles'`: exactly 2 `playerIds` required. Wizard disables "Tee It Up" with < 2 or > 2 Nassau players; error: "Nassau singles requires exactly 2 players."
- `pairingMode = 'allPairs'`: 3–5 players required. Error: "Nassau all-pairs requires 3–5 players."
- Guard updates reactively as players are added/removed.

**GameInstance fields:**
These fields are already on `GameInstance` (from prior engine work): `pressRule`, `pressScope`, `pairingMode`. The wizard writes to them via the existing `updateGame` mechanism. No schema change needed.

**Acceptance criteria:**

- All three controls render for Nassau only (`game.type === 'nassau'`).
- Player-count guard shows correct error and disables "Tee It Up" for invalid counts.
- Controls are absent from Skins, Wolf, and Stroke Play cards.
- `pressRule`, `pressScope`, `pairingMode` stored on `GameInstance` and persisted through round creation.
- `npm run test:run` passes. `tsc --noEmit --strict` passes.
- Playwright regression: `skins-flow.spec.ts` and `wolf-flow.spec.ts` still pass.
- **Fence:** `GameInstanceCard.tsx` (Nassau-specific wizard controls), `round/new/page.tsx` (if wizard-level submit guard needed). No engine, bridge, or scorecard changes.

**Risk flags:**

- `GameInstance` may not yet have `pressRule`, `pressScope`, `pairingMode` fields if they were not added during engine work. The bridge defaults them; the wizard just needs to surface them. If missing: add to `GameInstance` type (in `src/types/index.ts`) and the Zustand store's `addGame` / `updateGame` logic. This is a type-only change — no DB schema change (the `Game` model stores game config as JSON or as separate columns depending on current schema).
- Confirm `Game` Prisma model stores these fields. If stored as typed columns, they may need a DB migration. If stored as a JSON config blob, no migration needed. **Explore phase for NA-2 must read the `prisma/schema.prisma` Game model before planning the wizard change.**

---

### NA-3 — Press Offer UI

**Type:** Engineer
**Sizing:** M
**Dependencies:** NA-2 complete (wizard controls must be in place so pressRule is saved and the bridge knows to expect press confirmations). Decision B must be approved.
**Applies only if Decision B = option (a) (post-save modal). Adapted if GM selects (b) or (c).**

**Purpose:** Add the press offer interaction to the hole-save flow. After a player saves a hole score, if any match meets the `pressRule` threshold, the UI prompts the down player to accept or decline. The bridge reads `HoleData.presses` to determine which presses were confirmed.

**Press offer detection:**

In `scorecard/[roundId]/page.tsx`, after `handleSaveNext` completes the PUT for the current hole:
1. Check if any Nassau game is active in the round.
2. If yes: call `getPressSOffersForHole(holes, players, nassauGame, currentHole)` — a new utility function in `nassau_bridge.ts` (or a helper exported from the bridge) that returns `PressOffered[]` events for the current hole given the current match states.
3. If `offers.length > 0`: set `pendingPressOffers` state; do NOT navigate to next hole yet.
4. If no offers: navigate normally.

**Modal implementation (Decision B = option a):**

Add to `scorecard/[roundId]/page.tsx`:
- State: `pendingPressOffers: PressOffered[]` and `currentPressIndex: number`.
- Modal renders when `pendingPressOffers.length > 0` and `currentPressIndex < pendingPressOffers.length`.
- Each modal shows: match description (front 9 / back 9 / overall / press name), down player name, holes remaining in the match, and Accept / Decline buttons.
- On Accept: call `setPressConfirmation(currentHole, matchId)` (new Zustand action added to `roundStore.ts`), which appends `matchId` to `holeData.presses`. Then advance to next offer or navigate.
- On Decline: advance to next offer or navigate without writing to `presses`.
- After all offers processed: trigger the PUT for the hole with the updated `holeData.presses`, then navigate to next hole.

**PUT update:** `HoleData.presses` must be included in the PUT body for the hole score endpoint. Confirm the existing PUT handler persists `presses` (the handler already persists all `HoleData` fields; `presses` is already on `HoleData`).

**`getPressSOffersForHole` helper:**

```
getPressSOffersForHole(
  holes: HoleData[],
  players: PlayerSetup[],
  game: GameInstance,
  holeNumber: number,
): PressOffered[]
```

Runs a partial bridge up to `holeNumber` to get current MatchState[], then calls `offerPress` for each open match to determine offers. Exported from `nassau_bridge.ts`. This is read-only (no state mutation); the bridge runs the partial simulation to get the MatchState at that point.

**Manual press (`pressRule = 'manual'`):**

For manual press, the player initiates — no automatic offer. A "Press" button in `BetDetailsSheet` or a dedicated gesture lets the captain request a press. On tap, `setPressConfirmation(currentHole, matchId)` is called directly. The post-save modal is skipped for `pressRule = 'manual'`. Implementation: add a "Request press" button to `BetDetailsSheet` Nassau section (visible only when `pressRule = 'manual'` and a pressable match exists). This button is optional for v1 — without it, manual press requires direct `presses` manipulation, which is impractical. Include as a stretch AC: if not implemented in NA-3, it is a parking-lot item.

**Acceptance criteria (Decision B = option a):**

- For `pressRule = 'auto-2-down'` or `'auto-1-down'`: post-save modal appears on the correct hole when the press threshold is met; disappears (or is skipped) when no threshold met.
- Modal shows correct match description and down player name.
- Accepting writes `matchId` to `HoleData.presses`; bridge correctly generates `PressOpened` on the next hole.
- Declining does not write to `presses`; bridge does not open a press.
- Multiple simultaneous offers (allPairs mode) processed serially by the modal queue.
- `setPressConfirmation` action added to `roundStore.ts`.
- `getPressSOffersForHole` helper exported from `nassau_bridge.ts`.
- PUT for the hole includes updated `presses` in the body.
- `npm run test:run` passes. `tsc --noEmit --strict` passes.
- Playwright regressions: `skins-flow.spec.ts` and `wolf-flow.spec.ts` pass.
- **Fence:** `scorecard/[roundId]/page.tsx` (press offer detection + modal), `roundStore.ts` (`setPressConfirmation`), `nassau_bridge.ts` (`getPressSOffersForHole` helper addition). No engine changes. No wizard changes.

**Risk flags:**

- The partial-bridge simulation in `getPressSOffersForHole` must be read-only and not mutate store state. It recomputes MatchState from scratch each call using holes up to `holeNumber`.
- The PUT timing: if `presses` is written to `holeData` before the PUT fires, the PUT body will include the press. If the PUT fires before the modal, the press is lost. Ensure `setPressConfirmation` + PUT run in the correct order (modal → setPressConfirmation → PUT).
- For `pressRule = 'manual'`: the "Request press" button in `BetDetailsSheet` is a stretch goal for NA-3. If not implemented, Nassau `pressRule = 'manual'` rounds will not support presses in v1 (they still settle correctly — just without presses). File as a parking-lot item if not completed in NA-3.

---

### NA-4 — Playwright Spec

**Type:** Engineer
**Sizing:** S
**Dependencies:** NA-1 through NA-3 all complete.

**Spec file:** `tests/playwright/nassau-flow.spec.ts`

**Spec scope (minimum assertions for gate):**

1. **Setup:** Create a new round with 2 players, add a Nassau bet (`pressRule: 'auto-2-down'`, `pressScope: 'nine'`, `pairingMode: 'singles'`, stake default), start the round.
2. **Hole-by-hole scoring:** Enter scores for holes 1–9 with a specific fixture: player A wins holes 1–3 (A leads 3 up, 3 down). Assert BetDetailsSheet shows Nassau deltas visible.
3. **Press offer:** On hole 4 (A leads 2 up after holes 1–3), the auto-2-down threshold triggers the press offer modal for player B. Accept the press. Assert `HoleData.presses` includes the front matchId after save.
4. **Press settlement:** Complete front 9 with the press winning for player B. Assert BetDetailsSheet shows combined front + press delta; zero-sum across 2 players.
5. **Back 9:** Enter scores for holes 10–18 without a press. Assert back 9 settles correctly.
6. **Results page:** Finish the round. Assert `Round.status = 'Complete'`. Assert results page shows correct net totals per player; zero-sum holds.
7. **BetDetailsSheet:** Open the sheet mid-round. Assert per-hole Nassau deltas visible; per-match breakdown present.
8. **Fence tokens:** Nassau GAME_DEFS `disabled` flag absent. Match Play, stableford absent from picker. Wolf and Skins still present.

**Acceptance criteria:**

- All 8 assertion groups pass on a clean run.
- Spec is self-contained (creates its own round; does not depend on pre-existing DB state).
- `npm run test:e2e` exits 0.
- **Fence:** New test file only. No application code changes.

---

### NA-5 — Cowork Visual Verification Pass

**Type:** Cowork
**Sizing:** 1 session
**Dependencies:** NA-4 green.

**Cowork verification checklist:**

1. **Nassau in wizard:** Nassau appears in the "Add a game" picker. `pressRule`, `pressScope`, and `pairingMode` controls render and save correctly. Player-count guard shows correct error.
2. **Press offer modal:** Play through holes with `pressRule = 'auto-2-down'`. Confirm modal appears when the threshold is met. Accept and decline both work correctly.
3. **BetDetailsSheet Nassau data:** Nassau per-hole deltas appear in the sheet. Match breakdown (front/back/overall) visible per player.
4. **Scorecard per-hole row:** Nassau delta appears in the two-row scorecard bottom row alongside any other active bets.
5. **Results page:** Nassau net totals correct. Zero-sum holds.
6. **Parked engines:** Match Play absent from game picker. Stableford, bestBall absent.
7. **Regression:** Skins and Wolf rounds still function. Wolf declaration gesture unaffected. Skins accordion (via BetDetailsSheet) unaffected.
8. **Known watchouts:** Note any hole where the press offer modal fires unexpectedly. Note any BetDetailsSheet row showing unexpected Nassau amount. Note any layout issues on narrow viewport with the press offer modal.

**Phase-end trigger:** NA-4 green AND Cowork files no blocking findings. Minor cosmetic findings filed to parking lot do not block NA-5 close.

---

## 7. Phase-End Trigger Criteria

NA-5 is the terminal sub-item of the Nassau phase. Closure requires all five conditions:

1. `git grep -rn "disabled: true" src/types/index.ts | grep nassau` → **zero matches**.
2. `npm run test:run` → all engine + bridge tests pass (including new `nassau_bridge.test.ts`).
3. `tsc --noEmit --strict` → passes.
4. `npm run test:e2e` → `tests/playwright/nassau-flow.spec.ts` passes (all 8 assertion groups).
5. Cowork verification pass: Nassau wizard, press offer modal, BetDetailsSheet Nassau data, results zero-sum, parked-engine fence. No blocking findings.

After NA-5 closes, Nassau is live. Phase 7 (full multi-bet cutover) can now be evaluated: it requires a third bet (Match Play is the most natural candidate).

---

## 8. Backlog Items Resolved in This Phase

The following IMPLEMENTATION_CHECKLIST backlog/parking-lot items are addressed or explicitly deferred:

| Item | Disposition |
|---|---|
| **D1 sub-task B** — Nassau §9 N35 tied-withdrawal back-propagation | NA-1 Explore phase resolves the open question (bridge confirms whether MatchTied or silent-close is implemented); D1 B back-propagation runs as a docs follow-on if the implementation question resolves. |
| **D4** — Nassau §7 press Junk annotation | Rides alongside NA-2 (same file territory) or runs as an independent XS prompt at any time. |

---

## 9. Risk Register

### R1 — MatchState threading diverges from engine contract

**Risk:** The bridge must maintain `MatchState[]` correctly across the hole loop. If `initialMatches` is called at the wrong scope, or matches are mutated rather than replaced, the state machine diverges.

**Mitigation:** NA-1 bridge tests include a full 18-hole singles fixture with expected events at each hole. Any divergence surfaces immediately. The per-hole loop must treat `matches` as immutable (spread or return new instances per `settleNassauHole`'s contract).

### R2 — allPairs compound key collisions

**Risk:** `byBet` compound key `${betId}::${matchId}` may collide if `matchId` is not unique across pair combinations.

**Mitigation:** `initialMatches` generates `matchId` as `'front'`, `'back'`, `'overall'` for each pair. In allPairs mode, the pair identifier must be prepended: `'${betId}::${pairKey}-front'` where `pairKey = '${pidA}-${pidB}'` (sorted). Confirm compound key format with the `aggregate.ts` contract before implementing.

### R3 — Press offer detection fires on wrong hole

**Risk:** `getPressSOffersForHole` runs a partial bridge simulation. If the simulation does not correctly replay the match state up to `holeNumber`, it may offer a press on the wrong hole.

**Mitigation:** The partial bridge uses the same per-hole loop as `settleNassauBet`, stopping at `holeNumber`. The engineer unit-tests `getPressSOffersForHole` with the same fixtures used in `nassau_bridge.test.ts` to confirm correct offer timing.

### R4 — PUT timing loses press confirmation

**Risk:** If the hole PUT fires before `setPressConfirmation` writes `matchId` to `HoleData.presses`, the press is lost.

**Mitigation:** NA-3 explicitly sequences: modal → `setPressConfirmation` (Zustand write) → PUT. The existing PUT handler sends the full `holeData` from Zustand; as long as `setPressConfirmation` runs before the PUT, the press is included. No async race if the modal is synchronous and `setPressConfirmation` is synchronous.

### R5 — Nassau wizard fields not on Game Prisma model

**Risk:** `pressRule`, `pressScope`, `pairingMode` may not be stored as DB columns on the `Game` model; if stored as a JSON blob or simply missing, wizard saves are lost on hydration.

**Mitigation:** NA-2 Explore phase reads `prisma/schema.prisma` to confirm the `Game` model. If fields are missing, a DB migration is required (add them as typed columns or extend a JSON config field). This is an Approval Gate item for NA-2 — if a migration is needed, stop after Plan and report to GM before applying.

### R6 — Legacy `computeNassau` semantic divergence

**Risk:** The legacy `computeNassau` only handles 2-player singles (front/back/overall; no presses; rough net scoring). The new engine path handles allPairs, presses, closeout, and precise pair-wise USGA handicap. Existing Nassau rounds in DB (expected: zero, since Nassau was always `disabled`) would show different settlement after cutover.

**Mitigation:** NA-1 AC includes a DB count query confirming zero Nassau rounds before cutover.

---

## 10. Decisions Deferred

| Decision | Required before | Source |
|---|---|---|
| `appliesHandicap` toggle | Separate unpark dispatch | §3d above |
| Junk items with Nassau | Junk Phase 3 | §3c above |
| `pairingMode = 'teams'` | Engine work | Not implemented |
| Per-match status in BetDetailsSheet ("Alice 2 Up") | Post-NA-5 | Display enhancement |
| Manual press "Request press" button in BetDetailsSheet | Post-NA-3 or parking-lot | Stretch goal |
| Press-depth cap in wizard | Post-NA-5 | Enhancement |
| D1 sub-task B — Nassau §9 N35 docs back-propagation | After NA-1 resolves the open question | IMPLEMENTATION_CHECKLIST D1 |
| Match Play unpark | Match Play phase | Separate operator decision |
| #11 full multi-bet cutover | Third bet unparks | Requires Nassau + one more |
| PUT-HANDLER-400-ON-MISSING-FIELDS | Independent | Backlog |
