# Pending Items Evaluation

**Date:** 2026-04-25  
**Status:** Investigation only. No code, no rule-doc, no plan edits.  
**Purpose:** Enumerate all pending items and surface every implicit decision left open by the UI-first reframe proposals before plan-shape choice (integrate vs new plan document) is made.

---

## 1. Pending Items

### 1a. REBUILD_PLAN.md — items not marked done

| Source | Item | Status | Size | Blockers |
|---|---|---|---|---|
| `REBUILD_PLAN.md:1137` | **#9** GAME_DEFS cleanup — mark 4 non-scope games `disabled: true` in `src/types/index.ts` | Backlog | XS | None |
| `REBUILD_PLAN.md:1159` | **#10** Prisma `Float → Int` cents migration — drop-and-recreate per disposable-data baseline | Backlog | S | None |
| `REBUILD_PLAN.md:1186` | **#11** Cutover session — consumer-by-consumer commits (~7) with grep gates; delete `src/lib/payouts.ts`, `junk.ts`, `handicap.ts`; rename `scoring.ts → src/components/util/format.ts`; adapt `computeAllPayouts` callers to `aggregateRound` | Backlog | M | AC says "depends on #5–#8" (all done); true gate is now the UI bridge work per SOD report |
| `REBUILD_PLAN.md:1256` | **#12** HoleData ↔ HoleState bridge — wire `withdrew`, `pickedUp`, `conceded`; covering-score field; `setScore(0)` guard; Wolf `PlayerWithdrew` writer; Nassau `settleNassauWithdrawal` caller | Backlog | L (placeholder) | "Full AC drafted after A/B/C decision and Phase 4d close" — both prerequisites met but AC never drafted |
| `REBUILD_PLAN.md:1266` | **Deferred #18** — role-holder quorum override (v2 planning round) | Deferred | — | Design round |
| `REBUILD_PLAN.md:1271` | **Deferred** — Audit #9 sub-gap: ScoringEvent Prisma model | Deferred | — | Post-rebuild |
| `REBUILD_PLAN.md:1272` | **Deferred** — Audit #17 sub-gap: Final Adjustment engine logic + UI | Deferred | — | Post-rebuild |
| `REBUILD_PLAN.md:1273` | **Deferred** — Hole-state builder (was labeled deferred "post-cutover") | Deferred | — | Post-cutover per plan; reframe elevates to active |
| `REBUILD_PLAN.md:1274` | **Deferred** — UI wiring / Zustand route migration | Deferred | — | Post-cutover per plan; reframe elevates to active |
| `REBUILD_PLAN.md:1275` | **Deferred** — Player abandonment / `PlayerWithdrew` UI flow | Deferred indefinitely | — | — |
| `REBUILD_PLAN.md:1276` | **Deferred** — Comeback Multiplier | Deferred | — | PlayerDecision design round |
| `REBUILD_PLAN.md:1277` | **Deferred** — `PlayerDecision` generic mechanism | Deferred | — | Own design round |

### 1b. IMPLEMENTATION_CHECKLIST.md — active item and open backlog

| Source | Item | Status | Size | Blockers |
|---|---|---|---|---|
| `IMPL:26` | **Active: Verification agent** `src/verify/verifyRound.ts` — 10-invariant round verification; pre-scope (researcher pass next, no engineer work until scope is written) | Active (pre-scope) | M | Researcher pass |
| `IMPL:42` | **D1 sub-task B** — Nassau §9 N35 tied-withdrawal back-propagation; two open questions: (1) should `settleNassauWithdrawal` emit `MatchTied` for tied in-flight matches per I3, and (2) is I3 a confirmed decision or provisional | Backlog (partial) | XS | Two questions at `IMPL:99` must resolve first |
| `IMPL:43` | **D2** — annotate `game_junk.md` §5 `isSandy`/`isBarkie`/`isPolie`/`isArnie` as superseded (multi-candidate ties) | Backlog | XS | Blocked on #7b Phase 3 landing |
| (same as above) | **#9, #10, #11, #12** — same items as REBUILD_PLAN.md rows above | Backlog | (same) | (same) |

### 1c. IMPLEMENTATION_CHECKLIST.md — open parking-lot items

| Source | Item | Size | Blockers |
|---|---|---|---|
| `IMPL:60` | Stroke Play Front 9 / Back 9 / Total 18 format investigation — UI complexity question; no junk for skins; up to 3 bets if all formats selected | — | Untriaged |
| `IMPL:61` | CTP screen shows all players for Bingo Bango Bongo; stroke play greenie shows "nobody" when all players birdied — bet-scope filtering bug | — | Untriaged |
| `IMPL:65` | Session-logging skill: long-session exception clause + context-reset handling | — | Skill maintenance session |
| `IMPL:66` | Session-logging skill: EOD-FINAL routine for days where per-prompt logs are absent | — | Skill maintenance session |
| `IMPL:70` | Main screen: clicking recent round is non-functional; requires authentication system | — | Future-UX |
| `IMPL:71` | User authentication system prerequisite for prior-round access | — | Future-UX |
| `IMPL:72` | Friends list and auto-add to new round player setup | — | Future-UX |
| `IMPL:73` | Hole score entry: default each player's score to par to reduce friction | — | Future-UX |
| `IMPL:74` | Greenie eligibility "par or better" hard-enforced at both engine and UI layers; should be user-configurable | — | UI-Flow |
| `IMPL:75` | Greenie bet-scope filtering bug specific to stroke play (shows "nobody" when all birdied) | — | Bridge-#12 |
| `IMPL:76` | Greenie pop-up: no back-navigation to current hole score entry | — | UI-Flow |
| `IMPL:77` | Results screen: presentationally complete but informationally thin | — | Low priority |
| `IMPL:78` | Mutual forfeit rule decision (both sides missing gross) — §5/§9 silent | — | Documenter pass |
| `IMPL:81` | Singles `withdrew` exclusion in `bestNet`: gap if future phases write `withdrew` for singles players with gross present | — | Future |
| `IMPL:86` | Polie three-putt doubled-loss schema decision — gates #7b `isPolie` unskip | — | Rules pass |
| `IMPL:89` | Supersession schema design — pre-Phase-2 gate; three design options (id field, index-based, other) | — | Pre-Phase-2 |
| `IMPL:91` | Junk CTPCarried stub: Phase 2 coverage gap for carry accumulation and resolution | — | Rules pass before #7b |
| `IMPL:94` | Verifier Invariant 11 — event payload consistency; add before Phase 3 engineer work | — | Before Phase 3 |
| `IMPL:96` | Verifier Invariant 4 — early-closeout hole coverage semantics (3 candidate definitions) | — | Before Verifier Phase 2 |
| `IMPL:98` | CTP carry back-propagation — re-triggered; runs after CTP accumulation/resolution land | — | Post-implementation |
| `IMPL:99` | **D1 sub-task B** — two open questions on Nassau §9 N35 and I3 decision provenance | — | See above |
| `IMPL:100` | Stale rebuild-context status in AGENTS.md + CLAUDE.md — trigger is #10 and #11 close | — | #10 + #11 close |
| `IMPL:101` | Late-arrival / early-departure player handling — affects all four engines, UI flow, `RoundConfigLocked` semantics | — | Future-bucket |

### 1d. Proposals — new items not yet reflected in plan files

These appear in the two reframe proposals and have no entry in REBUILD_PLAN.md or IMPLEMENTATION_CHECKLIST.md:

| Source | Item | Status | Size | Blockers |
|---|---|---|---|---|
| `ui-first-reframe.md §5` | Shared `HoleData → HoleState` builder (one-time, reused by all five bridges) | Proposal-only | XS–S | None |
| `ui-first-reframe.md §5` | Engine wiring: Stroke Play — wire `settleStrokePlayHole` + `finalizeStrokePlayRound` | Proposal-only | S | Bridge builder |
| `ui-first-reframe.md §5` | Engine wiring: Match Play + concession UI | Proposal-only | M | Bridge builder |
| `ui-first-reframe.md §5` | Engine wiring: Skins | Proposal-only | S | Bridge builder; rule-doc fix |
| `ui-first-reframe.md §5` | Engine wiring: Wolf + per-hole captain decision UI | Proposal-only | M–L | Bridge builder |
| `ui-first-reframe.md §5` | Engine wiring: Nassau + press confirmation UI | Proposal-only | M–L | Bridge builder; D1 sub-task B resolution |
| `ui-first-reframe.md §5` | Junk Phase 3 multi-candidate resolution UI (Sandy/Barkie/Polie/Arnie) | Proposal-only | S (gated) | Rules pass; #7b Phase 3 |
| `ui-first-reframe.md §5` | REBUILD_PLAN.md #11 gate update — from "#5–#8 done" to "all five bridges validated" | Proposal-only (plan edit) | — | Plan-shape decision |

### 1e. Scope gap — REBUILD_PLAN.md #12 vs the reframe's bridge concept

The plan's #12 (`REBUILD_PLAN.md:1256`) describes edge-case field threading only: `withdrew`, `pickedUp`, `conceded`, `setScore(0)` guard, Wolf `PlayerWithdrew` writer, Nassau `settleNassauWithdrawal` caller. Its AC was explicitly deferred ("drafted after A/B/C decision and Phase 4d close") and never written.

The reframe's "shared builder + per-bet bridge" work is different: connecting `HoleData.scores` to `HoleState.gross`, calling the engine, threading events and match state. This basic bridge is not described in the plan's #12 and has no plan entry at all. The plan's #12 is edge cases; the reframe adds the happy-path plumbing that should logically come first.

**This gap means the reframe's bridge work has no home in the existing plan.** Either the plan's #12 is expanded to cover both, or the per-bet bridge prompts live outside #12 and #12 stays as the edge-case follow-on.

---

## 2. Three Implicit Decisions from the SOD Eval

### Decision A — Option B vs Option B′ (engine scope vs UI enforcement)

**What was resolved:** Engine supports 3–5 players for Skins. Minimum changes from 2 to 3.

**What was not resolved:** Whether the v1 UI also enforces the minimum-3 constraint at game setup, or whether the UI allows any count ≥ 3 that the engine also permits (i.e., up to 5).

| | Option B | Option B′ |
|---|---|---|
| **Engine** | Supports 3–5 (validation guard `< 3`) | Same |
| **V1 UI** | No player-count restriction at game setup | Game setup enforces minimum 3 at the Skins entry point (`GameInstanceCard.tsx` or equivalent) |
| **Rule doc** | §2: "Minimum 3, maximum 5" | Same |
| **Bridge prompt AC changes** | None — engine validation is the only gate | Add: "Skins game setup validates minimum 3 players" |
| **Scope impact** | Bridge prompt is simpler (engine guard only) | Bridge prompt adds a UI validation AC item |

**What it determines downstream:** The Skins bridge prompt's AC. Under Option B, the engineer only changes `skins.ts:81` and the test fixtures. Under Option B′, the engineer also updates the game setup component. The rule doc text is the same in both cases.

---

### Decision B — Prompt 1 scope: rule-doc-only vs rule-doc + engine guard + test rewrites

**The choice:**

| | Rule-doc-only | Combined |
|---|---|---|
| **Prompt 1 deliverables** | `game_skins.md`: §1, §2, §4 comment, §12 Test 4 updated | Same, plus `skins.ts:81` guard (`< 2` → `< 3`), plus 5 test file changes |
| **After prompt 1:** `skins.ts` state | Accepts 2-player (guard still `< 2`) | Rejects 2-player (guard `< 3`) |
| **After prompt 1:** test state | Test 5 "field of 2 players" still passes | Test 5 removed/replaced; 3 tests rewritten; 1 boundary test updated |
| **Prompt 1 sizing** | XS | XS→S |
| **Drift risk** | `game_skins.md` says min 3; `skins.ts` enforces min 2; Test 5 tests behavior the doc says is invalid — lasts until Skins bridge prompt (at least 2 prompts later) | No drift |

**What it determines downstream:** Whether the reviewer agent will flag a doc/engine mismatch during the Stroke Play bridge prompt (prompt 2 in the proposed sequence). During the Stroke Play prompt, the reviewer will read `skins.ts:81` and see `< 2` while `game_skins.md §2` says "minimum 3" — this is a finding that would need to be parked or resolved out-of-band.

---

### Decision C — #11 cutover gate: "confirmed how?"

**The stated gate** (SOD report): "all five per-bet bridges validated, end-to-end play confirmed for each."

**Candidate validation methods:**

| Method | What it requires | Cost to set up | Existing infrastructure |
|---|---|---|---|
| **Manual UI playthrough** | Developer plays a full 18-hole round for each bet type on the dev server; verifies settlement numbers match expected | ~30–60 min per bet type × 5 = 2.5–5 hrs | None needed |
| **Bridge unit tests** | Vitest tests of `buildHoleState` + per-bet orchestration wrapper producing correct `ScoringEvent[]` | 1 test file per bet (new) | Vitest already set up |
| **Integration test (bets/results pages)** | Render `bets/[roundId]/page` and `results/[roundId]/page` with fixture data; assert payout values | New test setup: Next.js component testing harness | Not currently set up |
| **Zustand store snapshot** | At round end, compare store state against a known-good fixture; assert `netByPlayer` values | New test setup: store unit tests | Not currently set up |
| **E2E test (Playwright/Cypress)** | Automated browser plays through a full round of each bet type | New test infrastructure + test authoring | Not currently set up |

**What it determines downstream:** The #11 prompt's AC. The "grep gates" defined in the current `REBUILD_PLAN.md:1212–1215` are import-deletion checks (zero matches). They confirm the old code is gone but not that the new code is correct. Whichever method is chosen, the #11 AC must name it explicitly so the engineer knows what evidence to produce.

---

## 3. Other Implicit Decisions Surfaced in the Proposals

### Decision D — Sequence order: why Match Play moves behind Skins

The ui-first-reframe.md §1 proposed sequence: Stroke Play (1) → Match Play (2) → Skins (3) → Wolf (4) → Nassau (5).

The ui-first-reframe-sod.md §5 "first three prompts" named: rule doc fix → Stroke Play → Skins, implicitly moving Match Play from position 2 to at least position 4. No reason is stated. Match Play has more complexity (concession UI, format toggle hiding) but was placed second in the original sequence. Skins is structurally simpler (no decision UI, no state threading) but was third.

**What it determines:** Whether the Match Play concession UI and format-toggle work land before or after Skins. If Match Play lands third (not second), the bridge prompts that depend on "core UI primitives already in place" get one more iteration before tackling Match Play's extra AC items.

---

### Decision E — Match Play format toggle: hide vs disable vs remove in v1

The approved answer (Q2, ui-first-reframe.md): "v1 hides or disables the format toggle in `GameInstanceCard.tsx` for Match Play."

**What was not resolved:** The choice between hide (remove from DOM, best-ball not visible to user), disable (show as grayed-out, best-ball visible but non-interactive), or remove from the `format` type entirely.

| Approach | UX signal | Implementation cost | Reversal cost |
|---|---|---|---|
| **Hide** | User sees only "Singles"; best-ball doesn't exist in v1 | Remove conditional in `GameInstanceCard.tsx` | Add it back |
| **Disable** | User sees "Best-ball" grayed out; suggests it's coming | Add `disabled` attribute or UI state | Remove the disabled state |
| **Remove from type** | Best-ball literally doesn't compile in v1 | Delete `'best-ball'` from `MatchPlayCfg.format` union | Re-add to type + tests |

Removing from the type also changes the engine — `settleMatchPlayHole` currently branches on `cfg.format !== 'singles'`. Removing `'best-ball'` from the type would require removing that branch from the engine (or it becomes dead code). That's an engine change, which was explicitly fenced out.

**What it determines:** The Match Play bridge prompt's AC for the format toggle.

---

### Decision F — Stroke Play settlement mode scope for stage 1

Q4 from ui-first-reframe.md was unanswered. The Stroke Play engine supports three `settlementMode` values (`winner-takes-pot`, `per-stroke`, `places`) plus front 9 / back 9 / total 18 variants (parking-lot `IMPL:60`). The SOD report named "Stroke Play bridge" as prompt 2 without specifying which modes are in scope.

If the bridge prompt is written with an unresolved settlement mode scope, the AC will be ambiguous: should it test all three modes end-to-end, or just `winner-takes-pot`?

**What it determines:** The Stroke Play bridge prompt's AC and the parking-lot item at `IMPL:60` — whether it gets resolved inside the Stroke Play bridge prompt or remains open.

---

### Decision G — Verifier agent priority vs #12 bridge priority

The current active item in `IMPLEMENTATION_CHECKLIST.md:26` is the verification agent researcher pass. The ui-first-reframe.md §5 says "#12 becomes the first active task." These two directives conflict.

**What it determines:** What the next engineer prompt actually is. If the verifier takes priority (as the checklist currently states), the next prompt is a researcher pass scoping `src/verify/verifyRound.ts`. If #12/bridge takes priority (as the reframe proposes), the next prompt is the rule doc fix or the Stroke Play bridge.

---

### Decision H — Plan shape: integrate into REBUILD_PLAN.md vs new UI-first plan document

The task description frames this as the downstream question the evaluation is preparing for. The two options:

| | Integrate into REBUILD_PLAN.md | New plan document |
|---|---|---|
| **Adds to** | Items #9–#12 (existing backlog) + new bridge items | A new document, REBUILD_PLAN.md frozen at #12 |
| **Maintains** | Single source-of-truth lineage | Cleaner separation of engine-phase vs UI-phase |
| **Risk** | REBUILD_PLAN.md was scoped to the engine rebuild; UI work is architecturally different | Two plan documents require cross-referencing |
| **Checklist impact** | IMPLEMENTATION_CHECKLIST.md remains single source of truth regardless | Same |

**What it determines:** Whether the bridge items, sequence, and gate criteria for the reframe are written into REBUILD_PLAN.md #12+ or into a new plan doc.

---

## 4. Live Bug Cross-Check

### Bug 1 — Wolf falls through to `computeStrokePlay` (`payouts.ts:165`)

`computeGamePayouts` has no `'wolf'` case. Any Wolf bet resolves via `default: return computeStrokePlay(...)`, which computes a winner-takes-pot total-18 Stroke Play payout on Wolf's players. The result is numerically wrong (per-hole Wolf hole-by-hole resolution is not approximated by total-strokes ranking).

**Current user-facing impact (right now):** If a user adds a Wolf game to a round via game setup, the bets page and results page display Stroke Play settlement amounts for that Wolf game. The display is wrong but not zero — it looks like valid data. No error is shown. Wolf is stage 4 in the bridge sequence; the error persists until batched cutover (#11 commit 6) when `computeAllPayouts` is replaced by `aggregateRound`.

**What would need to happen to fix it before stage 4 Wolf bridge lands:** One-line change to `computeGamePayouts`: add `case 'wolf': return emptyPayouts(game.playerIds)` to zero-out Wolf rather than silently compute Stroke Play. This makes Wolf bets show $0 instead of wrong numbers. Alternatively, leave as-is and accept wrong-but-not-zero display for pre-v1. No engine files touched either way.

**Deferring acceptable?** For a pre-v1 app with no production users: yes, if the behavior is documented. Wolf is not playable anyway (no captain decision UI), so the scenario requires intentional misuse. The more important risk is that a developer reviewing the bets page sees Wolf numbers and believes they're correct — a silent wrong-computation risk. Whether this matters depends on how much Wolf testing occurs before stage 4.

---

### Bug 2 — `computeStableford` in `payouts.ts` has no engine counterpart

`payouts.ts:131` implements `computeStableford`. No `settleStablefordHole` exists in `src/games/`. When #11 batched cutover deletes `payouts.ts`, Stableford payouts silently become zero in `aggregateRound` (which has no Stableford reducer).

**Current user-facing impact (right now):** If a user adds a Stableford game (`game.type === 'stableford'`), the current app computes and displays Stableford payouts using the legacy `computeStableford` function. This works today. After #11 cutover, Stableford payouts silently go to zero.

**What would need to happen to fix it before cutover:** Two options: (a) GAME_DEFS cleanup (#9) marks Stableford as `disabled: true` AND the UI wiring phase hides disabled games before #11 runs, so no Stableford rounds can be created that would produce a zero-payout regression; (b) the #11 AC explicitly calls out Stableford's zero-payout consequence and the operator accepts it. Without either, #11 is a silent regression for any existing Stableford rounds.

**Deferring acceptable?** If #9 (mark disabled) runs before #11 and the UI hides disabled games: yes, fully acceptable. If #9 runs but the UI still shows Stableford (the #9 AC explicitly says "does NOT change any UI rendering behavior"), then Stableford rounds created between #9 and the UI wiring phase would silently zero-out at cutover. The window is small for pre-v1, but the risk is non-zero.

---

## 5. Operator Decisions Needed

In order of likely sequencing impact:

1. **Decision G** — Verifier agent vs bridge work: which is the actual next active item?
2. **Decision H** — Plan shape: integrate new bridge items into REBUILD_PLAN.md, or new plan document?
3. **Decision B** — Prompt 1 scope: rule-doc-only, or rule-doc + engine guard + test rewrites in one pass?
4. **Decision A** — Skins v1 UI: engine 3–5 with no UI restriction (Option B), or engine 3–5 with v1 UI enforcing minimum 3 (Option B′)?
5. **Decision D** — Sequence order: does Match Play stay at position 2 (original reframe sequence), or move behind Skins (SOD report implied order)?
6. **Decision F** — Stroke Play stage-1 scope: all three settlement modes, or `winner-takes-pot` only?
7. **Decision E** — Match Play format toggle in v1: hide, disable, or remove `'best-ball'` from the type?
8. **Decision C** — #11 cutover gate validation method: manual playthrough, bridge unit tests, integration tests, or combination?

---

## Noticed But Out of Scope

1. `payouts.ts:101` `computeNassau` assumes exactly 2 players (`if (inGame.length !== 2) return payouts`). It does not implement `allPairs` mode. If Nassau is wired through the legacy path for any reason, `allPairs` rounds would silently return zero payouts without error. Not a current risk (Nassau bridge will replace this), but worth noting for the #11 AC.
2. `computeMatchPlay` (`payouts.ts:45–73`) implements all-pairs match play (every player vs every other player), not singles. The new engine's `singles` format is one match between two specified players. These are not equivalent algorithms — the legacy implementation is not a simplification of the new one; it's a different calculation. No risk before bridge lands, but the cutover is not a drop-in replacement.
3. `REBUILD_PLAN.md:1256` #12 scope conflicts with the reframe's bridge concept (noted in §1e above). No fix proposed — surfaced for plan-shape decision.
4. The `Post-#8 Tooling` section of REBUILD_PLAN.md (verifier agent spec at line 1342) gives a detailed 10-invariant scope that partially overlaps with parking-lot items at `IMPL:94` (Invariant 11) and `IMPL:96` (Invariant 4). The verifier's `src/verify/verifyRound.ts` scope in REBUILD_PLAN.md is more complete than the parking-lot entries, but the two sources are not reconciled.
