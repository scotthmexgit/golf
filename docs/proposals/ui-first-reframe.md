# UI-First Reframe — Scoping Proposal

**Date:** 2026-04-25  
**Status:** Draft — for operator review before any plan edits  
**Scope:** Read-only survey of engine state, rule docs, UI primitives, and plan documents against the proposed UI-first development sequence.

---

## 1. Engine Status

All five engines are **landed (engine + tests)**. None is consumed by UI. The gap is integration, not implementation.

| Engine | Entry Point | Tests | UI Consumers | Classification |
|---|---|---|---|---|
| Stroke Play | `src/games/stroke_play.ts:60` `settleStrokePlayHole` | 24 cases | None | **Landed, not consumed** |
| Match Play | `src/games/match_play.ts:5` `settleMatchPlayHole` | 73 cases | None | **Landed, not consumed** |
| Skins | `src/games/skins.ts:102` `settleSkinsHole` | 33 cases | None | **Landed, not consumed** |
| Wolf | `src/games/wolf.ts:82` `settleWolfHole` | 30 cases | None | **Landed, not consumed** |
| Nassau | `src/games/nassau.ts:51` `settleNassauHole` | 77 cases (phases 1–4d) | None | **Landed, not consumed** |

Total test count: 307 (confirmed by `npm run test:run`). All passing.

The current UI uses `src/lib/payouts.ts` `computeAllPayouts()` via the results page and bets page — a legacy parallel path that does not call any of the five engines above. Engine wiring is the critical missing step for all bet types.

---

## 2. Player-Count Rules vs. Proposed Constraints

Rule files are in `docs/games/`. Each file's §2 is the canonical constraint.

### Stroke Play — proposed 2–5

Rule doc (`game_stroke_play.md` §2): "Minimum 2 players, maximum 5."  
**Status: match.** No product decision required.

### Match Play — proposed 2 players only

Rule doc (`game_match_play.md` §2):

| Format | Field |
|---|---|
| `singles` | 2 players |
| `best-ball` | 4 players |

The rule file defines two formats. "2 players only" means restricting v1 to the `singles` format and deferring `best-ball`.  
**Status: product decision.** The rule doc supports 4-player best-ball as a valid format; the proposed constraint removes it from the v1 sequence. State this explicitly in any checklist update.

### Skins — proposed 3 players only

Rule doc (`game_skins.md` §2): "Minimum 2 players, maximum 5."  
The rule file is silent on any 3-player restriction.  
**Status: product decision.** Nothing in the rule doc motivates a 3-player floor or ceiling for Skins. If the intent is "start with 3 for the first UI iteration and expand later," that's a valid staging choice but it needs to be stated as such. The engine is unaffected — `playerIds.length` is 2–5 and the engine handles all sizes.

### Wolf — proposed 4 or 5 players

Rule doc (`game_wolf.md` §2): "Minimum 4, maximum 5."  
**Status: match.** Wolf is structurally 4-or-5-player; captain rotation and lone-wolf multipliers are defined in terms of the 4-player and 5-player cases specifically. This constraint derives from the rules, not a product decision.

### Nassau — not in the proposed 1–4 sequence (falls under "remaining bets")

Rule doc (`game_nassau.md` §2): 2 players (`pairingMode = 'singles'`) or 3–5 players (`pairingMode = 'allPairs'`). Team mode (`pairingMode = 'teams'`) is documented but explicitly not implemented.  
No player-count constraint is specified in the proposal because Nassau is deferred to stage 5. No mismatch to flag.

---

## 3. UI Primitives

### Shared primitives that exist

| Primitive | File | Notes |
|---|---|---|
| Hole-to-hole navigation | `src/components/scorecard/HoleHeader.tsx` | Prev/next arrows, hole number, par, handicap index, front/back side |
| Score entry | `src/components/scorecard/ScoreRow.tsx` | Per-player stepper, junk dots (Sandy/Chip-in/Three-putt/One-putt), par color coding, stroke allocation display |
| Round shell / routing | `src/app/` (page, round/new, scorecard/[roundId], bets/[roundId], results/[roundId]) | Full route tree present |
| Settlement display | `src/app/results/[roundId]/page.tsx` | Winner announcement, money summary table, game breakdown, scorecard totals. IMPLEMENTATION_CHECKLIST.md notes it as "informationally thin" but structurally present. |
| Game setup | `src/components/setup/GameInstanceCard.tsx` | Stake, press amount, format toggle (Match Play), escalating toggle (Skins), solo wolf multiplier |
| Round state | `src/store/roundStore.ts` | Zustand store |

### What is missing for end-to-end play on any bet type

**1. Engine wiring / HoleState bridge** (IMPLEMENTATION_CHECKLIST.md #12, L-sized backlog)  
No code connects the scorecard UI's input format to the engine's `HoleState` type contract. `settleSkinsHole`, `settleWolfHole`, `settleNassauHole`, `settleMatchPlayHole`, `settleStrokePlayHole` are never called from any UI path. `aggregateRound()` (`src/games/aggregate.ts`) is never called to settle a full round. This is the single blocking item for all five bet types.

**2. Wolf decision UI**  
`settleWolfHole` requires a `WolfDecision` per hole: `{ kind: 'partner', captain, partner }` or `{ kind: 'lone', captain, blind }`. No UI prompt exists for the captain to choose. The rule doc (`game_wolf.md` §5) states: "Every press-like decision…requires a confirmed UI action." The engine emits `WolfDecisionMissing` when no decision is recorded and blocks round close until all holes have a decision.

**3. Nassau press confirmation UI**  
`settleNassauHole` emits `PressOffered` or `OfferPress`; the rule doc (`game_nassau.md` §3) states: "A `PressOpened` event is emitted only after the UI returns a confirmed action from the down player. No press opens from the scoring function alone." No confirmation dialog exists.

**4. Match Play concession UI**  
The engine supports `conceded: PlayerId[]` in `HoleState` and `concedeMatch()`. No UI allows recording a hole concession or match concession.

**5. Junk multi-candidate resolution UI** (Phase 3, gated on rules pass)  
`ScoreRow.tsx` has junk dots for Sandy/Chip-in/Three-putt/One-putt. The engine supports returning multiple candidates for Sandy/Barkie/Polie/Arnie. A UI to resolve multi-candidate junk awards is not built. The greenie pop-up exists but has a known navigation bug (IMPLEMENTATION_CHECKLIST.md line 75: "no back-navigation to current hole's score entry from within greenie selection").

### Bet-specific UI primitives: what exists, what doesn't

| Bet | What Exists | What Doesn't |
|---|---|---|
| Stroke Play | Score entry, hole nav, results display | Engine call (blocked by #12) |
| Match Play | Format toggle in setup, score entry, hole nav | Concession recording, engine call |
| Skins | Escalating toggle in setup, score entry, hole nav | Engine call |
| Wolf | Solo wolf multiplier in setup, score entry, hole nav | Captain decision per hole, engine call |
| Nassau | Press amount in setup, score entry, hole nav | Press confirmation dialog, engine call |

**Claim evaluation:** "Core decision models are mostly in place" — this is accurate for the engines (`src/games/`), but the claim does not apply to the UI. The engines are complete; the UI integration layer is not started.

---

## 4. Nassau Status

**Status: fully landed.** All phases 1–4d closed 2026-04-22 (prompt 011). 77 tests. `tsc` and greps clean. IMPLEMENTATION_CHECKLIST.md Done section confirms: "`NassauCfg.matchTieRule` deleted; allPairs/singles both fully supported; press rules; closeout; finalize; forfeit per-match; withdrawal per-pair."

**What is not blocking:** The engine is complete. No code work remains in `nassau.ts`.

**What is an open question (non-blocking):** Two rule-doc back-propagation items from the documenter pass (IMPLEMENTATION_CHECKLIST.md line 99):
1. Should `settleNassauWithdrawal` emit `MatchTied` for tied in-flight matches per decision I3, or is silent-close correct?
2. Is I3 a confirmed decision or a provisional claim from session logs?

These are documentation clarifications, not code blockers. They do not gate UI work.

### Options under the reframe

**Option A — Park (recommended).**  
Nassau is already done. Under the proposed sequence, it falls in stage 5 ("remaining bets after core UI primitives are in place"). The two open questions are doc-level and don't block UI wiring when Nassau's turn comes. No action needed now. The two I3 questions can be resolved during the stage-5 Nassau UI prompt.

**Option B — Finish first (not applicable).**  
There is nothing to finish in the engine. The open items are documentation questions. If "finish-first" means resolving the I3 questions now, that is a 30-minute documenter task that could be done at any point — but it is not required before any UI work.

**Option C — Absorb into Match Play.**  
Nassau is not a Match Play variant. Both engines are independent (`nassau.ts` and `match_play.ts`). Absorption is architecturally incorrect and the rule docs treat them as distinct bet types. Not recommended.

**Recommendation: Option A.** Nassau landed clean. Leave it in the queue for stage 5. Resolve the I3 doc questions in context when building the Nassau UI.

---

## 5. REBUILD_PLAN.md and IMPLEMENTATION_CHECKLIST.md Under the Reframe

### Items that survive unchanged

| Item | Status | Notes |
|---|---|---|
| #3 Wolf follow-ups | Done 2026-04-20 | Completed engine work; no change |
| #4 Bet-id string-lookup refactor | Done 2026-04-20 | Completed infrastructure; no change |
| #5 Nassau engine | Done 2026-04-22 | Completed; no change |
| #6 Match Play engine | Done 2026-04-24 | Completed; no change |
| #7 Junk engine (Phase 2 core) | Done 2026-04-24 | Completed; no change |
| #8 aggregate.ts | Done 2026-04-24 | Completed; no change |
| #9 GAME_DEFS cleanup | Backlog (XS) | Independent of UI sequence; can run anytime |
| #10 Prisma Float → Int migration | Backlog (S) | Independent of UI sequence; can run anytime |
| Active parking-lot items | Various | Survive; none are superseded by the reframe |

### Items superseded by the reframe

None of the existing items are rendered wrong by the reframe. The plan through #8 was engine-first; it has been executed. What changes is the sequencing of what's next, not any prior decision.

### Items that need re-scoping or reordering

**IMPLEMENTATION_CHECKLIST.md #12: HoleState ↔ HoleData bridge (L-sized backlog)**  
Under the current plan, this is a backlog item with no active prompt. Under the reframe, it becomes the **first active task** — nothing can be played end-to-end without it. Recommend elevating to active item immediately.

**REBUILD_PLAN.md #11: Cutover session (delete `src/lib/*` parallel paths)**  
Currently listed as "blocked on #5–#8." Under the reframe, the natural gate changes: #11 should run *after* the engine wiring layer is live (after #12 and the first bet type's UI calls the engines), not before. If #11 runs before UI wiring, the legacy path is deleted before a replacement is in place. The fence on #11 already implies this: "Delete `src/lib/*` parallel paths" is safe only when the new paths are confirmed live.

**New items not yet in the plan (the reframe adds work)**  
These tasks do not exist in REBUILD_PLAN.md or IMPLEMENTATION_CHECKLIST.md and will need entries:

1. **Engine wiring per bet type** — for each of the five bet types, call the engine from the scorecard resolution flow. Five separate tasks or one combined task depending on how the bridge (#12) is structured.
2. **Wolf per-hole decision UI** (M-sized) — captain partner/lone selection modal. Blocks Wolf end-to-end.
3. **Nassau press confirmation UI** (M-sized) — down-player confirmation dialog. Blocks Nassau end-to-end.
4. **Match Play concession UI** (S–M-sized) — hole concession and match concession recording. Blocks concession gameplay.
5. **Junk Phase 3 multi-candidate resolution UI** (S-sized, gated on rules pass) — Sandy/Barkie/Polie/Arnie winner selection when multiple candidates exist.

### Diff-style summary

```
IMPLEMENTATION_CHECKLIST.md
  ~ #12 HoleState ↔ HoleData bridge: move from backlog → active (first prompt)
  + Engine wiring: Stroke Play (new task)
  + Engine wiring: Match Play (new task)
  + Engine wiring: Skins (new task)
  + Engine wiring: Wolf + decision UI (new task)
  + Engine wiring: Nassau + press UI (new task)
  + Match Play concession UI (new task)
  + Junk Phase 3 multi-candidate UI (new task, gated)

REBUILD_PLAN.md
  ~ #11 Cutover: update blocked-on gate from "#5–#8 done" →
    "first bet type live end-to-end via new engine path"
  (no other changes needed — #3–#10 are correct as written)
```

---

## 6. Open Questions for the User

**Q1 — Skins 3-only rationale.**  
The rule doc supports 2–5. "3 players only" does not appear anywhere in the codebase or rule docs. Is this an intentional v1 scope decision (e.g., "let's build Skins UI for a threesome first and add 2- and 4-5-player variants later"), or was the intent 2–5 from the start?

**Q2 — Match Play best-ball deferral.**  
The engine fully supports `format: 'best-ball'` with a `teams` field. The "2 players only" constraint drops it from v1. Confirming this is intentional, and that the format toggle in `GameInstanceCard.tsx` for Match Play should be hidden or disabled in v1.

**Q3 — Nassau scope in stage 5.**  
The proposal places Nassau in "remaining bets." Do the two I3 doc questions (NassauWithdrawal MatchTied emission) need resolution before Nassau enters the UI queue, or can they be resolved in context during the Nassau UI prompt?

**Q4 — Stroke Play format breadth.**  
IMPLEMENTATION_CHECKLIST.md parking lot line 60 (open): Stroke Play has three `settlementMode` options (`winner-takes-pot`, `per-stroke`, `places`) plus front 9 / back 9 / total 18 staking. The engine supports all of these. Does the v1 Stroke Play UI cover all three settlement modes, or does the "2–5 players" scope also imply a single settlement mode for stage 1?

**Q5 — Bridge task sizing and structure.**  
The HoleState ↔ HoleData bridge (#12) is marked L-sized. Should this be a single prompt that builds a general bridge for all five bet types, or five separate prompts (one per bet type in the proposed sequence)? The answer affects whether Wolf decision UI and Nassau press UI land in the same prompt as the bridge or in separate follow-on prompts.

**Q6 — #11 Cutover timing.**  
The proposal gates #11 on "first bet type live end-to-end via new engine path." Is the intent to cut over all five bet types in one #11 session (after all are wired), or to cut over per-bet-type as each one lands? The current plan implies a single cutover; the UI-first sequence may argue for per-type cutover to get earlier feedback.

---

## Noticed But Out of Scope

The following were observed during the survey but are outside the reframe's scope. Parked here for a future triage pass.

1. **`src/lib/` parallel paths** — `payouts.ts`, `scoring.ts`, `junk.ts`, `handicap.ts` are all parallel to `src/games/` engines. These are the #11 cutover targets. No action needed here; already tracked.
2. **Greenie nav bug** — IMPLEMENTATION_CHECKLIST.md line 75: no back-navigation from greenie pop-up to current hole score entry. Existing parking-lot item; no action needed here.
3. **Stroke Play parking-lot item line 60** — "Front 9 / Back 9 / Total 18 bets" as three separate game instances vs. one configuration. Existing open item; no action needed here.
4. **Hole-score default-to-par UX** — IMPLEMENTATION_CHECKLIST.md line 73. Existing parking-lot item.
5. **Late-arrival / early-departure player handling** — IMPLEMENTATION_CHECKLIST.md line 101. Future-bucket item; no action needed here.
6. **Stale rebuild-context status** — IMPLEMENTATION_CHECKLIST.md line 100: "rebuild-context status content" is noted as stale pending #10 and #11 close. Existing item.
7. **Wolf `captainForHole` helper** — `src/games/wolf.ts:104` exposes a UI-facing helper ("Exposed for the UI's 'who's the wolf?' indicator") but there is no UI that calls it. Minor dead-export; not blocking.
