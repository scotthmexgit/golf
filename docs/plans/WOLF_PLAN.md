# Wolf Phase Plan

**Authored:** 2026-04-30
**Status:** ACTIVE — single source of truth for AC during the Wolf phase. Awaiting GM approval of Decisions D and E (sections 1 and 2) before WF-1 implementation begins.
**Source research:** `docs/2026-04-30/02-wolf-phase-plan.md` (this prompt's report)
**Preceding phase:** Skins phase — closed 2026-04-30 per `docs/plans/SKINS_PLAN.md`

---

## Scope

The Wolf phase begins when GM approves this plan. It ends when **WF-7 closes**.

**"Live in production" definition (WF-7 closure trigger):**

All of the following must be true before WF-7 is declared closed:

1. `src/types/index.ts` GAME_DEFS `'wolf'` entry has no `disabled: true` flag.
2. All Wolf engine and bridge tests pass (`npm run test:run`).
3. `tsc --noEmit --strict` passes.
4. Playwright spec `tests/playwright/wolf-flow.spec.ts` passes (see WF-6 §3).
5. Cowork verification pass complete (see WF-7 §3).

Closing WF-7 does **not** automatically unpark Nassau or Match Play. The next bet is a separate operator decision.

**Does not supersede:** `SKINS_PLAN.md` (retained for history). Items SK-0–SK-5 are done. Phase 7 (full multi-bet cutover, REBUILD_PLAN #11) remains deferred until the third bet unparks.

---

## 1. Resolved Decisions

Decisions settled before WF-0 or resolved by GM at first DevFlow SOD. Not re-litigable within this phase.

### Decision A — Wolf is the next bet to unpark

**Resolution:** Wolf unparks before Nassau and Match Play. Rationale from SOD section 6: Skins and Wolf are both per-hole games; the scorecard bet-row and accordion patterns from SK-1a/SK-1b transfer directly. Nassau and Match Play require match-format UI that does not yet exist; they are better developed as a later paired phase. Approved by GM at first DevFlow SOD 2026-04-30.

### Decision B — Scorecard pop-up is a shared primitive

**Resolution (GM directive):** The full-round bet-details view is a shared component — not Wolf-specific. Match Play and Nassau phases consume the same component without rework. This plan calls out the shared-primitive intent explicitly wherever the pop-up is specified.

### Decision C — Hole-entry screen stays minimal

**Resolution (GM directive):** The hole-entry screen (scorecard page, per-hole score entry) stays score-entry-only. The pop-up is reachable from hole-entry via a button or icon trigger, but the full-round data view does not live on the hole-entry screen. Not subject to Code recommendation.

### Decision D — Skins accordion handling *(assessment — GM approval required)*

**See §2 below.** Three options evaluated; Code recommends one. Implementation of any option is blocked until GM selects.

### Decision E — Pop-up style *(assessment — GM approval required)*

**See §2 below.** Three options evaluated; Code recommends one. Implementation is blocked until GM selects.

---

## 2. Assessments Requiring GM Decision

### Assessment D — Skins accordion handling

The existing SK-1b accordion lives in `ScoreRow.tsx`: a `<button>` expand/collapse that shows per-game per-hole deltas inline on the hole-entry screen. The GM directive (Decision C) establishes that the full-round view belongs in a pop-up, not inline. Three options for what to do with the existing Skins accordion:

---

**Option (a): Retrofit Skins now — move accordion off `ScoreRow.tsx` into the pop-up before WF-1 starts.**

*What it means:* Before any Wolf work begins, modify the live Skins accordion: remove the inline expand behavior from `ScoreRow.tsx` and route it to the pop-up. The pop-up is built as a prerequisite to WF-1.

*Pros:* Clean slate for all subsequent work; no legacy inline accordion coexisting with the pop-up.

*Cons:* Touches live Skins code before any Wolf value is delivered. A regression in the retrofit means Skins breaks before the Wolf phase has started. The work is identical to option (c), just sequenced at maximum risk — if something goes wrong, the project has lost ground with nothing shipped.

*Risk:* **High** — first action of the phase is a risky modification to the only live betting UI.

---

**Option (b): Wolf-only pattern — leave Skins accordion as-is, only Wolf and future bets use the pop-up.**

*What it means:* Skins continues to use the SK-1b inline accordion. Wolf bet data surfaces in the new pop-up. Two different UX patterns coexist.

*Pros:* Skins live code is never touched; zero regression risk on the existing UI.

*Cons:* UX inconsistency: users see Skins data by tapping a row inline, but see Wolf data by opening a pop-up. This divergence compounds — every future bet that uses the pop-up makes the Skins inline pattern look more like a bug. Technical debt: two implementations of the same conceptual UI (per-bet breakdown) maintained in parallel.

*Risk:* **Low** engineering risk now; **high** UX debt and maintenance burden long-term.

---

**Option (c): Build pop-up first as WF-2, migrate Skins to it as WF-3.**

*What it means:* WF-2 builds the pop-up as new code (low risk). WF-3, after WF-2 is stable, migrates Skins: removes the inline accordion expand from `ScoreRow.tsx`, connects the Bet-row tap to open the shared pop-up instead. From WF-3 onward, all bets use one path.

*Pros:* Risk is isolated by sequencing. The pop-up (WF-2: new code) lands before the live migration (WF-3: modification of Skins). If WF-3 causes a regression, it is immediately visible and WF-2 is already stable. All future bets (Wolf in WF-4–WF-5, Nassau, Match Play) slot into the same pop-up without rework. One UX pattern, one code path.

*Cons:* There is a window (WF-2 live, WF-3 not yet started) where the pop-up exists but Skins still uses the inline accordion. This is transient — two sub-items, not two phases.

*Risk:* **Low and sequenced.** The only live-code risk (removing SK-1b accordion from ScoreRow) is deferred until WF-2 is stable and the pop-up is verified.

---

**Code recommendation: Option (c).**

Option (a) front-loads risk with no upside; option (b) permanently bifurcates the UX. Option (c) delivers UX consistency and code reuse with risk sequenced behind a stable milestone. The transient window (pop-up exists, Skins still inline) is one sub-item away from resolution, not permanent. This plan is written assuming (c) is approved; Decisions D = (c) labels appear throughout.

**GM must confirm (c) — or select (a) or (b) — before WF-2 implementation begins.**

---

### Assessment E — Pop-up style

Three visual/interaction patterns evaluated for the shared bet-details view. The content is data-heavy: per-player scores across all scored holes plus per-game per-hole deltas with expand/collapse. The context is on-course mobile (Tailscale-accessed, presumed phone usage).

---

**Option (a): Modal overlay — centered card, dimmed background.**

*What it means:* A fixed-position centered `<div>` with `rgba(0,0,0,0.4)` backdrop, matching the existing finish-confirmation pattern in `scorecard/[roundId]/page.tsx:282–313`. Dismiss by tapping backdrop or a close button.

*Stack alignment:* The pattern already exists (finish confirmation). No new component shape needed.

*Pros:* Consistent with existing in-app overlay; engineers already know the pattern; no new dependencies.

*Cons:* Centered modal is sized for short confirmations. For a data view (up to 18 holes × 4–5 players × 2–3 games), a centered card either truncates or needs internal scroll within a constrained width. On a 375px phone screen, a modal card wide enough for tabular data (player names + hole scores + bet deltas) is cramped. The finish confirmation is ~340px wide — usable for two buttons, not a scorecard.

*Risk:* Adequate for small data; **poor** for the full-round scorecard view this pop-up needs to display.

---

**Option (b): Slide-up bottom sheet — mobile-first, scrollable.**

*What it means:* A `fixed bottom-0 inset-x-0` panel that slides up from the bottom of the screen. Occupies ~75% of screen height. Content scrolls vertically. Dimmed backdrop above the sheet; tap backdrop to dismiss. Implemented with Tailwind 4 `translate-y` transition utilities. Zustand slice (`{ sheetOpen: boolean; toggle: () => void }`) drives visibility.

*Stack alignment:* Tailwind 4 has the utilities; React state handles the transition; Zustand is already in the project. No new dependencies.

*Pros:* Standard pattern for mobile data-display overlays (Maps, Golfshot, SwingU all use this). ~75% screen height gives scrollable room for 18 holes. Swipe-dismiss feels natural on-course. Preserves context: the scorecard is visible above the dimmed area as the sheet opens. The share intent is clear — it's a "look" panel, not a blocking confirmation.

*Cons:* Requires implementing the slide-up transition (not as trivial as a centered modal). The finish confirmation (existing) stays centered — two different overlay styles coexist, though for clearly different intents (confirmation vs. data lookup).

*Risk:* Moderate implementation cost; **high** UX suitability for on-course mobile use.

---

**Option (c): Full-screen takeover with back button.**

*What it means:* The bet-details view replaces the hole-entry screen entirely, with a back/chevron button to return to the current hole. Could be a Next.js route (`/scorecard/[roundId]/details`) or a conditional render replacing the scorecard page content.

*Stack alignment:* Next.js App Router can do this. A new route is the cleanest approach.

*Pros:* Maximum screen real estate for data. Standard navigation metaphor (back button). Works well for complex tabular data.

*Cons:* Feels heavy for a quick "check the score" action during a round. A full navigation push means a loading state, potential hydration, and a back-button press — more friction than a dismissible overlay. Also: the GM directive places the trigger "on hole-entry" as a button, not as a link that navigates away. A route-based approach blurs the distinction between scorecard and the pop-up.

*Risk:* Higher App Router complexity; **heavier UX** for a quick contextual lookup.

---

**Code recommendation: Option (b) — slide-up bottom sheet.**

On-course mobile usage patterns favor quick-peek interactions that dismiss naturally. The bottom sheet gives adequate space for scrollable data, preserves hole-entry context, and requires no new dependencies beyond Tailwind 4 utilities already in the stack. The implementation is ~50 lines of new component code. The finish confirmation stays centered (it's a blocking confirmation — different UX contract). Two overlay styles, two clear purposes: no user confusion.

**GM must confirm (b) — or select (a) or (c) — before WF-2 implementation begins.**

---

## 3. Park Definitions

**Wolf is the only bet unparking in this phase.** All other bets remain parked.

### 3a. Nassau

**Park option:** (c) — maintained. `'nassau'` GAME_DEFS entry retains `disabled: true`.
**Note:** D1 sub-task B questions (Nassau §9 N35 tied-withdrawal) remain open. Nassau unparks in a separate phase after Wolf.

### 3b. Match Play

**Park option:** (c) — maintained. `'matchPlay'` GAME_DEFS entry retains `disabled: true`.
**Note:** Match Play and Nassau will share the match-format UI layer. They are better developed as a paired phase after Wolf.

### 3c. Junk (side-bet engine)

Junk remains structurally parked in this phase. `junkItems: []` and `junkMultiplier: 1` are hardcoded in `wolf_bridge.ts` (same as `skins_bridge.ts`). The Junk section in `GameInstanceCard.tsx` may appear on Wolf wizard cards — this is a pre-existing cosmetic artifact (same as Skins); suppressing it is out of scope until junk Phase 3 unparks.

### 3d. Wolf config options parked for v1

| Field | Hardcoded value | Unpark trigger |
|---|---|---|
| `blindLoneEnabled` | `true` | Separate operator decision |
| `blindLoneMultiplier` | `loneWolfMultiplier + 1` (min 3) | Separate operator decision |
| `tieRule` | `'carryover'` | Separate operator decision |
| `appliesHandicap` | `true` | Separate operator decision |
| `junkItems` | `[]` | Junk Phase 3 |
| `junkMultiplier` | `1` | Junk Phase 3 |

`loneWolfMultiplier` (maps to `WolfCfg.loneMultiplier`) is **not** parked — it is already on `GameInstance` and will be surfaced in the wizard with a default of 3.

---

## 4. Fully Functional — Wolf v1

### Engine surface exercised

- `settleWolfHole(hole, config, roundCfg, decision)` — per-hole stateless provisional events.
- `finalizeWolfRound(events, config)` — applies `'carryover'` tieRule (hardcoded default).
- `applyWolfCaptainRotation(hole, config, roundCfg, eventsSoFar?)` — called per-hole in the bridge to determine captain and generate `WolfCaptainReassigned` audit events.
- `loneWolfMultiplier` live (wizard toggle).
- `blindLoneEnabled: true`, `blindLoneMultiplier` derived (hardcoded).
- `tieRule: 'carryover'` (hardcoded default).
- `appliesHandicap: true` (hardcoded).
- 4–5 players.
- `junkItems: []`.

### WolfDecision translation in the bridge

`HoleData.wolfPick?: string | 'solo'` stores the legacy Wolf pick. `wolf_bridge.ts` translates this to `WolfDecision | null` per hole using the captain from `applyWolfCaptainRotation`:

| `wolfPick` value | `WolfDecision` |
|---|---|
| `undefined` / absent | `null` → engine emits `WolfDecisionMissing`, zero delta |
| `'solo'` | `{ kind: 'lone', captain, blind: false }` |
| `'blind'` | `{ kind: 'lone', captain, blind: true }` |
| `playerId` (string) | `{ kind: 'partner', captain, partner: wolfPick }` |

Captain is determined per-hole by `applyWolfCaptainRotation`. The bridge maintains an `eventsSoFar` accumulator across the hole loop so `WolfCaptainReassigned` events are threaded correctly.

The bridge signature stays `(holes, players, game)` — decisions are derived internally. This keeps the caller signature consistent with `settleSkinsBet` and `settleStrokePlayBet`.

### UI surfaces in scope

| Surface | File | Role | New in this phase |
|---|---|---|---|
| Wolf in game picker | `GameList.tsx` via GAME_DEFS | `disabled: true` removed | **Yes (WF-1)** |
| Lone Multiplier input in wizard | `GameInstanceCard.tsx` | Integer input for `loneWolfMultiplier`, default 3 | **Yes (WF-1)** |
| Player-count guard (4–5 players) | `GameInstanceCard.tsx` or wizard submit | Prevent "Tee It Up" with < 4 or > 5 Wolf players | **Yes (WF-1)** |
| Scorecard pop-up (shared primitive) | New `BetDetailsSheet.tsx` component | Full-round per-player/per-game view, slide-up sheet | **Yes (WF-2)** |
| Skins accordion → pop-up migration | `ScoreRow.tsx` | Remove inline expand; Bet-row tap opens pop-up | **Yes (WF-3)** |
| Exit Round surface | `scorecard/[roundId]/page.tsx`, `Header.tsx` | Button to exit mid-round (parking-lot item own slot) | **Yes (WF-4)** |
| Lone Wolf declaration gesture | New `WolfDeclare.tsx` component | Per-hole captain display + declaration UI on hole-entry | **Yes (WF-5)** |
| Wolf results integration | `results/[roundId]/page.tsx`, `bets/[roundId]/page.tsx` | Net totals per player (PayoutMap, same as SP/Skins) | No new component |

### UI surfaces NOT in scope for v1

- `tieRule` picker — parked (§3d).
- `appliesHandicap` toggle — parked (§3d).
- `blindLoneEnabled` / `blindLoneMultiplier` controls — parked (§3d).
- Per-hole Wolf captain annotation in pop-up ("Hole 3: Alice is Wolf") — deferred; the pop-up shows deltas, not captain attribution.
- Junk side bets with Wolf — parked (§3c).
- Blind Lone timing enforcement (declaration before vs after partial score entry) — v1 UI allows declaration at any point before "Save & Next"; `blind` vs `lone` is user-selected; no timing enforcement.

### Edge cases in scope

- Partner Wolf: captain + one partner vs. remaining opponents; standard stake.
- Lone Wolf (non-blind): captain vs. all; `loneMultiplier` applied.
- Blind Lone Wolf: captain vs. all; `blindLoneMultiplier` applied; `BlindLoneDeclared` event emitted before resolution.
- Tied hole with `tieRule: 'carryover'`: `WolfHoleTied` event; next decisive hole doubles the stake.
- Consecutive ties: `carryMult = 2^N`; `effective = max(carryMult, decisionMult)` per engine §6.
- Missing score (any player): `WolfHoleInvalid`; zero delta.
- Missing decision: `WolfDecisionMissing`; zero delta.
- Player count 4 and 5 (both valid per engine).
- Captain rotation: `players[(hole - 1) % players.length]`; holes 17–18 use lowest-money tiebreak.

### Edge cases out of scope for v1

- `tieRule: 'no-points'` path (engine-complete; bridge hardcodes `'carryover'`).
- `appliesHandicap: false` gross scoring (engine-complete; hardcoded `true`).
- Player withdrawal mid-round (`PlayerWithdrew` → `WolfCaptainReassigned`; `buildHoleState` stubs `withdrew: []`).
- Holes 17–18 lowest-money tiebreak (`applyWolfCaptainRotation` handles this internally via `eventsSoFar`; bridge passes accumulated events, so it is technically exercised, but the tiebreak edge case is not a test fixture requirement for v1).

---

## 5. Parking-Lot Folding

Each open parking-lot item is explicitly slotted into the Wolf phase. No item silently defers.

| Parking-lot item | Size | Assignment | Justification |
|---|---|---|---|
| **SKINS-1** — bet-row tap target ~23 px | XS (CSS only) | Rides alongside **WF-2** | WF-2 opens `ScoreRow.tsx` and scorecard component area; CSS padding bump is a one-liner alongside the pop-up build |
| **SKINS-2** — hole-1 non-zero deltas before input | S | Rides alongside **WF-5** | Both concern the hole-entry state machine (par-default + declaration state); suppress-or-pending logic is natural companion to the WolfDeclare mount effect |
| **Stepper par-default affordance** — stepper shows 0 while Zustand has par | S | Rides alongside **WF-5** | `Stepper.tsx` gains `initialValue` prop during the same hole-entry work; co-located component changes |
| **No mid-round home navigation** — no Exit Round/Pause surface | M | **Own slot: WF-4** | Sufficient size for its own sub-item; conceptually paired with the pop-up's "big picture round view" built in WF-2/WF-3 — Exit Round is the natural navigation action a user wants after reviewing the full round |

---

## 6. Phases

### WF-0 — Plan Doc (this document)

**Type:** Documenter
**Sizing:** S
**Status:** ACTIVE — awaiting GM approval of Decisions D and E.

Deliverable: `docs/plans/WOLF_PLAN.md`. Plan is approved when GM confirms both decisions (D and E) and signals green light for WF-1. AGENTS.md "Current item" pointer will be updated to WF-1 on approval.

---

### WF-1 — Wolf Bridge + Cutover + Player-Count Guard

**Type:** Engineer
**Sizing:** M
**Dependencies:** WF-0 approved (GM green-lights plan + decisions D and E).

**Purpose:** Create `src/bridge/wolf_bridge.ts`, wire `computeGamePayouts` to route `'wolf'` through the bridge, unpark Wolf in GAME_DEFS, surface `loneWolfMultiplier` in the wizard, and add the 4–5 player wizard guard. Analogous to SK-2 (Skins cutover) plus SK-3 (player-count guard), combined here because the Wolf guard is inextricable from the unpark step.

**Bridge surface (`wolf_bridge.ts`):**

```
buildWolfCfg(game: GameInstance) → WolfCfg
  — maps: id, stake, playerIds, loneWolfMultiplier (default 3)
  — hardcodes: blindLoneEnabled:true, blindLoneMultiplier:(loneWolfMultiplier+1, min 3),
               tieRule:'carryover', appliesHandicap:true, junkItems:[], junkMultiplier:1

getWolfCaptain(hole: number, game: GameInstance, players: PlayerSetup[], eventsSoFar?: ScoringEvent[])
  → { captain: PlayerId; events: ScoringEvent[] }
  — wraps applyWolfCaptainRotation; exposed for the WolfDeclare UI component (WF-5)

settleWolfBet(holes: HoleData[], players: PlayerSetup[], game: GameInstance)
  → { events: ScoringEvent[]; ledger: Record<string, number> }
  — per-hole loop: calls getWolfCaptain then translateWolfPick → WolfDecision | null → settleWolfHole
  — accumulates captain events into eventsSoFar for the next hole's rotation
  — finalizeWolfRound applied after the per-hole loop
  — ledger built from WolfHoleResolved.points, LoneWolfResolved.points, BlindLoneResolved.points
  — portability: no next/*, react, react-dom, fs, or path imports (same constraint as skins_bridge.ts)
```

**Cutover (`src/lib/payouts.ts`):**

Add `case 'wolf': return payoutMapFromLedger(settleWolfBet(holes, players, game).ledger, game.playerIds)`. Import `settleWolfBet` from `'../bridge/wolf_bridge'`. The `default:` fallthrough (which currently catches all disabled games) continues to cover Nassau, Match Play, and others.

**`perHoleDeltas.ts` update:** `computePerHoleDeltas` likely needs a `'wolf'` case alongside its existing game-type dispatch. Engineer confirms during Explore and adds the case, routing through `settleWolfBet`. Scope-optional cleanup only if the current implementation already handles unknown game types gracefully.

**Unpark:** `src/types/index.ts` GAME_DEFS `'wolf'` — remove `disabled: true`. No `GameList.tsx` changes needed (it already filters on `disabled`).

**Wizard — `loneWolfMultiplier`:** Add an integer input to `GameInstanceCard.tsx` rendered when `game.type === 'wolf'`. Default 3. Label: "Lone Wolf multiplier". Store via existing `updateGame` mechanism. This field is already on `GameInstance`.

**Player-count guard (4–5 players):** Wolf requires exactly 4 or 5 `playerIds`. Guard at the wizard level: when a Wolf `GameInstance` has `playerIds.length < 4` or `playerIds.length > 5`, disable "Tee It Up" or show an error near the Wolf card ("Wolf requires 4–5 players"). The `requirementText: 'Requires 4–5 betting players'` in GAME_DEFS is the label source; the guard enforces the constraint at submit time (and ideally reactively on player add/remove).

**Grep gate:** No direct equivalent to `computeSkins` exists for Wolf (it was never wired to a legacy function). Gate is: `git grep -rn "disabled: true" src/types/index.ts | grep wolf` → zero matches after unpark.

**Test bridge:** Add `src/bridge/wolf_bridge.test.ts` with coverage of:
- Zero-decision round (all `WolfDecisionMissing`): ledger all-zeros, zero-sum.
- Partner Wolf round: correct deltas, zero-sum.
- Lone Wolf win and loss: correct multiplier applied, zero-sum.
- Tied hole + carryover: next decisive hole shows doubled stake.
- Missing score hole: `WolfHoleInvalid`, zero delta.
- `getWolfCaptain` rotation for hole 1 through hole 5 on a 4-player round.

**Acceptance criteria:**

- `wolf_bridge.ts` exists; `settleWolfBet` and `getWolfCaptain` exported.
- `case 'wolf'` in `computeGamePayouts` routes through bridge; zero legacy computation path.
- Wolf appears in the "Add a game" picker (GAME_DEFS `disabled` removed).
- `loneWolfMultiplier` input in wizard: renders for Wolf only; stored on `GameInstance`; default 3.
- Player-count guard: "Tee It Up" blocked with < 4 or > 5 Wolf players; error visible.
- 4-player Wolf round settles correctly: zero-sum `PayoutMap`, correct Lone Wolf multiplier, carry doubled on tied holes.
- `npm run test:run` passes (all existing tests + new bridge tests).
- `tsc --noEmit --strict` passes.
- Playwright `skins-flow.spec.ts` and `stroke-play-finish-flow.spec.ts` still pass (regression gate).
- **Fence:** `wolf_bridge.ts`, `wolf_bridge.test.ts`, `payouts.ts` case, `GameInstanceCard.tsx` (Wolf-only loneMultiplier input + guard), `src/types/index.ts` (disabled flag removal), `perHoleDeltas.ts` (Wolf case if needed). No Skins or Stroke Play files touched.

**Risk flags:**

- `perHoleDeltas.ts` game-type dispatch: engineer reads this file at Explore phase. If it already calls bridges generically, the Wolf case may be free. If it has an explicit `case 'skins'` only, add `case 'wolf'` alongside.
- `blindLoneMultiplier` must be ≥ 3 per `assertValidWolfCfg`. If `loneWolfMultiplier` is 2 (minimum allowed), `blindLoneMultiplier = loneWolfMultiplier + 1 = 3` — valid. Confirm in bridge code.
- Wolf has no pre-existing production rounds in the DB (`disabled: true` since project start). No data migration concern.

---

### WF-2 — Scorecard Pop-Up Shared Primitive

**Type:** Engineer
**Sizing:** M
**Dependencies:** WF-1 complete (Wolf bridge must be live so the pop-up can show Wolf data alongside Skins).

**Purpose:** Build `BetDetailsSheet` — the shared slide-up bottom sheet component. This component is the shared primitive for all bets; Wolf, Nassau, and Match Play phases consume it without rework. It displays per-player scores across the round plus per-game per-hole deltas using the existing accordion model. Parking-lot item SKINS-1 rides alongside this sub-item.

**Component: `src/components/scorecard/BetDetailsSheet.tsx`**

Shape:
- Props: `open: boolean; onClose: () => void` (driven by Zustand slice — see below).
- Content: per-player, per-hole breakdown for all scored holes. Rows: one per player per hole; each row shows gross + total $/hole + expandable per-game deltas (reusing the accordion pattern from SK-1b).
- Sheet height: ~75% of viewport (`h-[75vh]` or `max-h-[75vh]`); scrollable content area.
- Header: game label row (e.g., "Round Summary"), close button.
- Backdrop: `fixed inset-0 z-40 bg-black/40`; tap-to-close.
- Sheet panel: `fixed bottom-0 inset-x-0 z-50 rounded-t-2xl bg-white`; `translate-y-full` (closed) / `translate-y-0` (open) via Tailwind transition utilities.
- Data source: calls `computePerHoleDeltas(holes, players, games)` (same memoized computation as the scorecard page) — no new data-fetching required.

**Shared-primitive intent (explicit for Match Play / Nassau future phases):**

`BetDetailsSheet` receives no Wolf-specific props. It is driven entirely by `holes`, `players`, and `games` from the Zustand store. Any future bet that populates `computePerHoleDeltas` correctly (i.e., any bet with a `case` in `perHoleDeltas.ts`) will appear in the sheet automatically. Nassau and Match Play phases need no changes to this component — they only need to add their bridge case to `perHoleDeltas.ts`.

**Zustand state slice:**

Add `sheetOpen: boolean` and `toggleSheet: () => void` (or `openSheet / closeSheet`) to `roundStore.ts`. Alternatively, use a dedicated `useSheetStore` if GM prefers state isolation — engineer documents the choice.

**Trigger from hole-entry:**

Add a trigger element to `scorecard/[roundId]/page.tsx` — a small icon button (e.g., `📊` or a chart icon) in the header `rightAction` area, or as a floating button above `BottomCta`. Tap opens the sheet. The trigger is present on all holes whenever at least one game is active. Location: engineer documents the chosen placement in the WF-2 report.

**SKINS-1 rides alongside WF-2:**

`ScoreRow.tsx` already has the bet-row `<button>` at `data-testid="hole-bet-total-{pid}"`. Its rendered height is ~23 px (below mobile touch-target guidelines). While opening `ScoreRow.tsx` for WF-2 context, bump the `<button>` vertical padding so rendered height is ≥ 40 px. One-line CSS change; no logic change. AC: `hole-bet-total-{pid}` button has `min-height: 40px` or equivalent computed height.

**Acceptance criteria:**

- `BetDetailsSheet.tsx` exists under `src/components/scorecard/`.
- Sheet slides up when `sheetOpen = true`; dismisses on backdrop tap or close button.
- Content: for a 4-player Skins + Wolf round, shows per-player deltas per hole; Skins rows and Wolf rows both present; expandable per-game breakdown matches SK-1b accordion model.
- Component accepts no game-type-specific props (shared-primitive contract).
- SKINS-1: bet-row tap target height ≥ 40 px.
- `npm run test:run` passes. `tsc --noEmit --strict` passes.
- Playwright `skins-flow.spec.ts` and `stroke-play-finish-flow.spec.ts` still pass.
- **Fence:** `BetDetailsSheet.tsx` (new), `roundStore.ts` (sheet state), `scorecard/[roundId]/page.tsx` (trigger + sheet render), `ScoreRow.tsx` (SKINS-1 padding only). No bridge, engine, or wizard changes.

---

### WF-3 — Skins Accordion → Pop-Up Migration

**Type:** Engineer
**Sizing:** S
**Dependencies:** WF-2 complete and verified (pop-up must be stable before the Skins inline accordion is removed).
**Applies only if Decision D = option (c). Skipped if GM selects (a) or (b).**

**Purpose:** Remove the inline accordion expand behavior from `ScoreRow.tsx`; connect the Bet-row tap to open `BetDetailsSheet` instead. After WF-3, the only path to per-game per-hole data is the shared pop-up. Stroke Play and Skins both route through it.

**What changes:**

- `ScoreRow.tsx`: remove `isExpanded` local state; remove `useEffect` that resets it on hole change; remove the accordion expand section (`{isExpanded && playerGames.map(...)}`) — approximately lines 35–38 and 154–174. The `<button>` (Bet row) remains but its `onClick` becomes `onOpenSheet` (a new prop from the parent). The prop replaces `setIsExpanded`.
- `scorecard/[roundId]/page.tsx`: pass `onOpenSheet={() => openSheet()}` to each `ScoreRow`. The sheet trigger in the header (WF-2) remains.
- `holeBreakdown` prop on `ScoreRow`: removed (no longer needed for inline accordion). The scorecard page no longer computes `holeBreakdownForCurrentHole` for ScoreRow. `BetDetailsSheet` accesses the full `perHoleByGame` map directly from the page (passed as prop or via Zustand).

**Acceptance criteria:**

- `ScoreRow.tsx` no longer has `isExpanded` state or accordion JSX. The `holeBreakdown` prop is removed from `ScoreRowProps`.
- Tapping the Bet row on any player opens `BetDetailsSheet`.
- Per-game per-hole data is identical in the pop-up to what the inline accordion previously showed.
- Stroke Play rounds: pop-up shows "Stroke Play $0" on in-progress holes, final delta on last hole (consistent with SK-1a Decision B).
- `npm run test:run` passes. `tsc --noEmit --strict` passes.
- **Playwright `skins-flow.spec.ts` must be updated**: the spec's assertion group 4 (accordion expand) needs to be updated to use the pop-up trigger instead of the inline row expand. The assertion itself (per-bet delta shown) remains valid — only the interaction changes.
- `stroke-play-finish-flow.spec.ts` still passes.
- **Fence:** `ScoreRow.tsx`, `scorecard/[roundId]/page.tsx`. No engine, bridge, wizard, or results-page changes.

**Risk flags:**

- `skins-flow.spec.ts` assertion group 4 must be updated in the same commit as the ScoreRow change — do not merge WF-3 with a broken Playwright spec.
- The `holeBreakdown` prop removal requires the scorecard page to stop computing and passing it. Confirm no other consumers of `holeBreakdownForCurrentHole` exist before removing.

---

### WF-4 — Exit Round Surface

**Type:** Engineer
**Sizing:** M
**Dependencies:** WF-2 complete (pop-up context established; Exit Round is conceptually paired with the "see the full picture" sheet).
**Source:** Parking-lot item "No mid-round home navigation from scorecard" — own slot.

**Purpose:** Add an explicit Exit Round / Pause surface to the scorecard. Currently, a player who wants to leave mid-round must use browser back, bypassing the Finish flow. This sub-item adds a deliberate exit path that does not interfere with the Finish flow.

**Proposed shape (engineer documents final choice in WF-4 report):**

Option A: An "Exit" link in the scorecard `Header` `rightAction` alongside the existing "Bets" link and "Finish" button. Tapping "Exit" shows a confirmation ("Leave this round? Your scores through hole N are saved.") with "Leave" and "Keep Playing" buttons. On confirm, navigate to `/` (home).

Option B: An "Exit Round" item inside `BetDetailsSheet` header. Users who open the pop-up to check the score can also choose to leave from there. Fewer header items.

Either option must: (a) not interfere with the Finish flow (Finish is hole-18 only; Exit is available on all holes); (b) use the existing `patchRoundComplete` pattern only on the Finish path, not Exit (exit does not mark the round Complete); (c) navigate to `/` on confirm; (d) show a confirmation overlay before leaving.

**Acceptance criteria:**

- Exit Round trigger visible on scorecard; available on holes 1–18 (not gated to last hole).
- Confirmation overlay shown before navigation (mirrors finish-confirmation overlay style).
- Confirming exit navigates to `/` (home page). Round status is NOT patched to `Complete` — status stays `IN_PROGRESS` (or whatever the current DB status is).
- Cancelling the overlay returns to the scorecard without any state change.
- Existing Finish flow is unaffected (Finish button behavior, `patchRoundComplete` on last hole, results navigation).
- `npm run test:run` passes. `tsc --noEmit --strict` passes.
- **Fence:** `scorecard/[roundId]/page.tsx`, `Header.tsx` (if Option A), `BetDetailsSheet.tsx` (if Option B). No engine, bridge, or results-page changes.

---

### WF-5 — Lone Wolf Declaration Gesture

**Type:** Engineer
**Sizing:** M
**Dependencies:** WF-1 complete (Wolf bridge must be wired; `getWolfCaptain` must be available). WF-2 and WF-3 complete (hole-entry is clean after the pop-up migration; declaration is added to a minimal screen).

**Purpose:** Add the per-hole Wolf declaration UI to the hole-entry screen. The Wolf captain declares before entering scores. The declaration is stored in `HoleData.wolfPick` (already on `HoleData`). The bridge translates this to `WolfDecision` at settlement time. Parking-lot items SKINS-2 and stepper par-default affordance ride alongside this sub-item.

**Component: `src/components/scorecard/WolfDeclare.tsx`**

Rendered by `scorecard/[roundId]/page.tsx` above the `ScoreRow` list, only when a Wolf game is active in the round.

Shape:
- Displays: "Hole N — Wolf: [Captain Name]" (captain from `getWolfCaptain(currentHole, wolfGame, players)`).
- Three declaration buttons: "Partner ▾" (drop-down or pill row of the other players' names to select a partner), "Lone Wolf", "Go Blind".
- Once declared, collapses to a compact summary: "[Captain] + [Partner]" or "[Captain] — Lone Wolf" or "[Captain] — Blind Lone", with an "Edit" link to re-open.
- Default state: undeclared (no wolfPick set for this hole). "Save & Next Hole" is NOT blocked by missing declaration — `WolfDecisionMissing` produces zero delta (engine handles it gracefully). A visual nudge (e.g., amber "No Wolf declared" badge on the Bet row) is acceptable but not required.
- State writes: `setWolfPick(holeNumber, pick: string | 'solo' | 'blind')` added to Zustand `roundStore.ts`. `HoleData.wolfPick` is already on `HoleData` — the store writes to it; no schema change needed.

**Blind Lone timing note:** The engine distinguishes Lone from Blind Lone only by the `decision.blind` flag. v1 UI allows "Go Blind" to be tapped at any point before "Save & Next" — no timing enforcement. Engineers do not need to gate blind declaration to pre-score-entry timing. This is an acknowledged simplification for v1.

**Captain rotation display:** `getWolfCaptain` is called on mount for the current hole. `WolfCaptainReassigned` events (for withdrawal cases) are out of scope for v1 (withdrawals are not supported in the current UI). The rotation is the basic `players[(hole - 1) % players.length]` path.

**SKINS-2 rides alongside WF-5:**

Hole 1 shows non-zero deltas immediately because F9-a writes par to Zustand on hole mount and Alice's handicap produces a non-zero net. Fix: when `WolfDeclare` mounts (or when `currentHole` changes), suppress the Bet row display until at least one score has been edited from par on the current hole — OR show a "pending" state on the Bet row amount (`—` instead of a dollar amount) until the hole is saved. Engineer documents the chosen approach in the WF-5 report.

**Stepper par-default affordance rides alongside WF-5:**

`Stepper.tsx` currently shows `0` as the displayed value even when Zustand has par (because the stepper has local state initialized to the `value` prop, but `value` changes on hole mount via F9-a without re-initializing the stepper's local state). Fix: add an `initialValue?: number` prop to `Stepper.tsx` and pass `holeData.par` from `ScoreRow`. The stepper re-initializes its local state when `initialValue` changes. AC: stepper displays par on hole mount without user interaction.

**Acceptance criteria:**

- `WolfDeclare.tsx` exists under `src/components/scorecard/`.
- Component renders on scorecard page only when a Wolf game is active.
- Captain name and hole number displayed correctly for holes 1–18 (4-player rotation: players[0], [1], [2], [3], [0], ...).
- Partner declaration: selecting a partner stores `wolfPick = partnerId` on `HoleData`.
- Lone Wolf: stores `wolfPick = 'solo'`.
- Blind Lone: stores `wolfPick = 'blind'`.
- Undeclared hole: `wolfPick = undefined`; bridge produces `WolfDecisionMissing`; delta is $0.
- SKINS-2: Bet row on hole 1 does not show a misleading pre-entry delta (suppressed or shows `—`).
- Stepper affordance: stepper displays par on hole mount without user interaction.
- `npm run test:run` passes. `tsc --noEmit --strict` passes.
- Playwright `skins-flow.spec.ts` and `stroke-play-finish-flow.spec.ts` still pass.
- **Fence:** `WolfDeclare.tsx` (new), `roundStore.ts` (`setWolfPick`), `scorecard/[roundId]/page.tsx` (render WolfDeclare when Wolf active), `Stepper.tsx` (`initialValue` prop), `ScoreRow.tsx` (pass `initialValue` + SKINS-2 suppression). No engine, bridge (other than the `getWolfCaptain` call), or results-page changes.

---

### WF-6 — Playwright Spec

**Type:** Engineer
**Sizing:** S
**Dependencies:** WF-1 through WF-5 all complete.

**Spec file:** `tests/playwright/wolf-flow.spec.ts`

**Spec scope (minimum assertions for gate):**

1. **Setup:** Create a new round with 4 players, add a Wolf bet (`loneWolfMultiplier: 3`), start the round.
2. **Captain rotation:** On hole 1, assert that player 1 is shown as Wolf captain. On hole 2, assert player 2.
3. **Partner declaration:** On hole 1, declare player 1 as captain with player 2 as partner. Enter scores where captain+partner win. Assert Bet-row delta matches expected settlement (partner wolf: `stake × (winners × losers)` per player).
4. **Lone Wolf:** On hole 2, declare captain as Lone Wolf. Enter scores where captain wins. Assert delta reflects `loneMultiplier`.
5. **Tied hole:** On hole 3, declare partner, enter scores that produce a tie. Assert delta is $0 and carry is reflected on hole 4 (next decisive hole shows doubled stake in pop-up or Bet row).
6. **Pop-up:** Open `BetDetailsSheet` from the scorecard trigger. Assert per-player/per-hole Wolf deltas are visible. Assert zero-sum across all players for the settled holes.
7. **Finish flow:** Complete all holes, finish the round. Assert `Round.status = 'Complete'` in DB.
8. **Results page:** Assert Wolf ledger is zero-sum across all 4 players. Assert each player's payout matches the expected engine output from the spec fixture.
9. **Fence tokens:** Wolf GAME_DEFS `disabled` flag absent. Nassau, Match Play, stableford tokens absent from picker. Skins and Stroke Play still present.

**Acceptance criteria:**

- All 9 assertion groups pass on a clean run.
- Spec is self-contained (creates its own round; does not depend on pre-existing DB state).
- `npm run test:e2e` exits 0.
- **Fence:** New test file only. No application code changes.

---

### WF-7 — Cowork Visual Verification Pass

**Type:** Cowork
**Sizing:** 1 session
**Dependencies:** WF-6 green.

**Cowork verification checklist:**

1. **Wolf in wizard:** Wolf appears in the "Add a game" picker. `loneWolfMultiplier` input renders, accepts integer, defaults to 3. Player-count guard visible when < 4 or > 5 players selected for Wolf.
2. **Wolf declaration gesture:** On hole-entry, captain name and hole number display correctly. Partner, Lone Wolf, and Go Blind buttons functional. Declaration collapses to summary. Undeclared hole shows no erroneous delta.
3. **Scorecard pop-up:** Tap trigger opens bottom sheet. Content shows per-player/per-hole data for all scored holes. Per-game rows present (Wolf and Skins if both active). Sheet dismisses on backdrop tap and close button.
4. **Skins accordion (post WF-3):** Inline accordion expand is gone from hole-entry rows. Tapping the Bet row opens the pop-up, not an inline expansion. Skins data visible in pop-up.
5. **Exit Round:** Exit trigger visible on scorecard. Confirmation overlay shown. Confirming navigates to home; round not marked Complete. Cancelling returns to scorecard.
6. **Settlement — results page:** Wolf deltas are zero-sum across all betting players. Cowork verifies by inspection: sum of all player payouts = $0.
7. **Parked engines:** Nassau and Match Play absent from game picker. Stableford, bestBall, bingoBangoBongo, vegas absent.
8. **Tap target:** Bet-row buttons on hole-entry have comfortable tap target (SKINS-1 fix).
9. **Known watchouts:** Note any hole where the pop-up shows a surprising delta. Note any caption rotation that looks wrong (wrong player shown as Wolf). Note any layout issue on narrow viewport.

**Phase-end trigger:** WF-6 green AND Cowork files no blocking findings. Minor cosmetic findings filed to parking lot do not block WF-7 close.

---

## 7. Phase-End Trigger Criteria

WF-7 is the terminal sub-item of the Wolf phase. Closure requires all five conditions:

1. `git grep -rn "disabled: true" src/types/index.ts | grep wolf` → **zero matches**.
2. `npm run test:run` → all engine + bridge tests pass (including new `wolf_bridge.test.ts`).
3. `tsc --noEmit --strict` → passes.
4. `npm run test:e2e` → `tests/playwright/wolf-flow.spec.ts` passes (all 9 assertion groups).
5. Cowork verification pass: Wolf wizard, declaration gesture, pop-up, Skins migration, Exit Round, results zero-sum, parked-engine fence. No blocking findings.

After WF-7 closes, no bet unparks automatically. Nassau or Match Play is the next operator decision.

---

## 8. Risk Register

### R1 — `perHoleDeltas.ts` Wolf dispatch

**Risk:** `computePerHoleDeltas` may not have a `'wolf'` case. If it only dispatches known game types and falls through silently, Wolf per-hole deltas will show $0 everywhere on the scorecard during play.

**Mitigation:** WF-1 Explore phase reads `perHoleDeltas.ts` and adds the `'wolf'` case. Bridge signature is `(holes, players, game)` — same as Skins — so the case is a one-liner. Playwright spec (WF-6) assertion group 3 will catch a missing dispatch.

### R2 — ScoreRow.tsx is on the Skins hot path

**Risk:** WF-2 (SKINS-1 padding), WF-3 (accordion removal), and WF-5 (SKINS-2 suppression + stepper prop) all touch `ScoreRow.tsx`. Each creates regression risk for the live Skins path.

**Mitigation:** Every sub-item that touches `ScoreRow.tsx` runs `skins-flow.spec.ts` as a regression gate before filing the report. WF-3 additionally requires an updated Playwright assertion for the pop-up interaction (the accordion assertion is no longer valid post-migration).

### R3 — Captain rotation accumulation in bridge

**Risk:** `applyWolfCaptainRotation` takes an optional `eventsSoFar` for holes 17–18 lowest-money tiebreak. The bridge maintains this accumulation across the hole loop. If the accumulator is not threaded correctly, the tiebreak logic on holes 17–18 may use stale state.

**Mitigation:** `wolf_bridge.test.ts` (WF-1) includes a 4-player round test through all 18 holes with a forced tie at hole 17 to verify tiebreak captain resolution. The bridge code comment must note the accumulator threading clearly.

### R4 — `wolfPick: 'blind'` string not on HoleData type

**Risk:** `HoleData.wolfPick` is typed as `string | 'solo' | undefined`. `'blind'` may not be in the type, causing a TypeScript error when `setWolfPick(hole, 'blind')` is called.

**Mitigation:** WF-1 Explore phase reads the `HoleData` type definition and widens `wolfPick` to `string | 'solo' | 'blind' | undefined` if needed. This is a type-only change (no schema, no DB column).

### R5 — Empty ledger on all-tied Wolf round

**Risk:** If all 18 holes tie under `tieRule: 'carryover'` and there is no decisive final hole, the ledger is empty. `payoutMapFromLedger({}, game.playerIds)` must return all-zeros. Confirm `payoutMapFromLedger` handles the empty-ledger case (Skins confirms it does via SK-2 risk R5; Wolf uses the same function but confirm).

**Mitigation:** `wolf_bridge.test.ts` includes an all-tied round fixture.

### R6 — Skins accordion removal breaks `skins-flow.spec.ts` assertion group 4

**Risk:** WF-3 removes the inline accordion. `skins-flow.spec.ts` assertion group 4 ("Accordion: Expand a player row. Assert per-bet breakdown shows 'Skins +$X'") will fail because the expansion mechanism no longer exists on the row.

**Mitigation:** WF-3 scope explicitly includes updating `skins-flow.spec.ts` assertion group 4 to use the pop-up trigger. This is in-scope for WF-3, not deferred to WF-6.

---

## 9. Decisions Deferred

| Decision | Required before | Source |
|---|---|---|
| `tieRule` picker in wizard | Separate unpark dispatch | §3d above |
| `appliesHandicap` toggle | Separate unpark dispatch | §3d above |
| `blindLoneEnabled` / `blindLoneMultiplier` controls | Separate unpark dispatch | §3d above |
| Per-hole Wolf captain annotation in pop-up | Post-WF-7 | Display enhancement |
| Blind Lone timing enforcement (pre-score gate) | Post-WF-7 | v1 simplification |
| Nassau allPairs v1 scope | Nassau bridge prompt | `SKINS_PLAN.md §8` |
| D1 sub-task B — Nassau §9 N35 tied-withdrawal | Nassau unparks | Backlog |
| D2 — junk.md §5 annotation | #7b Phase 3 lands | Backlog |
| D4 — nassau.md §7 press/junk annotation | Independent | Backlog |
| Match Play format toggle (Decision E from SP plan) | Match Play bridge prompt | `STROKE_PLAY_PLAN.md §7` |
| #11 full multi-bet cutover | Third bet unparks | REBUILD_PLAN #11 |
| PUT-HANDLER-400-ON-MISSING-FIELDS | Independent | Backlog |
