# MIGRATION_NOTES.md Audit — 2026-04-20

Classification of the 19 items in `MIGRATION_NOTES.md` against the current working tree and the Round 1–5 summaries at `/tmp/execution-round-{1..5}-*-summary.md`.

**Rubric:**
- **Fixed** — closed, verified against current code/docs.
- **Open** — still a live gap.
- **Lesson-learned** — closed as intended; retained for reference.
- **Obsolete** — no longer meaningful.

**Scope note**: several items were "fixed in `src/games/` new implementation" while "still present in `src/lib/payouts.ts` old implementation" per the project's **parallel-path discipline** (Round 1 Summary § 4). The audit marks those **Fixed** because the new engine meets the merge decision; the old code-path survives by design and is slated for deletion in backlog item #3 (cutover session). The audit explicitly calls out parallel-path carryover so the cutover plan has a complete list.

**Tally (19 items):**

| Class | Count | Items |
|---|---:|---|
| Fixed | 10 | 4, 7, 8, 9*, 11, 12, 13, 15, 16, 17* |
| Open | 9 | 1, 2, 3, 5, 6, 10, 14, 18, 19 |
| Lesson-learned | 0 | — |
| Obsolete | 0 | — |

`*` = Fixed with a caveat documented below.

---

## Per-item classification

### 1. `src/games/` does not exist — **Open** (partial)

`src/games/` exists with `events.ts`, `handicap.ts`, `skins.ts`, `stroke_play.ts`, `types.ts`, `wolf.ts` (6 files).

Missing per the merge decision's full scope: `nassau.ts`, `match_play.ts`, `aggregate.ts`, `junk.ts`. Old scoring files `src/lib/scoring.ts`, `payouts.ts`, `junk.ts` still exist and still serve production (parallel-path).

**Evidence:**
- `ls src/games/*.ts` → 6 files listed.
- `ls src/lib/` → `handicap.ts`, `junk.ts`, `payouts.ts`, `prisma.ts`, `scoring.ts`.
- Round 4 Summary § 5 marks this item as "partial (Skins + Wolf + StrokePlay)".

**Open work:** Nassau engine, Match Play engine, Junk engine, aggregate.ts.

---

### 2. Prisma `stake` is `Float`, not integer units — **Open**

Unchanged since Task 1 audit.

**Evidence:**
- `prisma/schema.prisma:79` — `stake     Float` (Game model).
- `prisma/schema.prisma:98` — `stake     Float           @default(0)` (SideBet model).
- `src/lib/scoring.ts:34` — `formatMoneyDecimal` still exists (evidence of non-integer amounts in the UI path).

**Open work:** schema migration, retire `formatMoneyDecimal`, consolidate conversion at UI boundary.

---

### 3. Scope mismatch — extra games in the codebase — **Open**

Unchanged. `GAME_DEFS` still lists nine game types; no `disabled: true` flag added.

**Evidence:**
- `src/types/index.ts:38-40` — `GameType = 'strokePlay' | 'matchPlay' | 'stableford' | 'skins' | 'nassau' | 'bestBall' | 'bingoBangoBongo' | 'wolf' | 'vegas'`.
- `grep "disabled: true" src/types/index.ts` → zero matches.

**Open work:** mark the four non-scope games (`stableford`, `bestBall`, `bingoBangoBongo`, `vegas`) as `disabled: true` in `GAME_DEFS`.

---

### 4. Wolf has no compute function — **Fixed**

`src/games/wolf.ts` implements `settleWolfHole`, `finalizeWolfRound`, `applyWolfCaptainRotation`. 31 tests in `wolf.test.ts` including § 10 Worked Example verbatim and every § 9 edge case.

**Caveat (parallel-path):** `src/lib/payouts.ts:165` still has `default: return computeStrokePlay(holes, players, game)` fall-through for `wolf` — production paths still get stroke-play settlement. This is the parallel-path hold deleted at cutover.

**Evidence:**
- `src/games/wolf.ts` — 490 lines, 10 variants emitted.
- `src/games/__tests__/wolf.test.ts` — 31 `it()` blocks, 100-test suite passes.
- Round 3 Summary § 4 marks this item **closed**.
- `src/lib/payouts.ts:165` — `default:` branch still falls to `computeStrokePlay`.

---

### 5. Nassau is hard-limited to two players and has no press logic — **Open**

Old code unchanged. No new Nassau engine.

**Evidence:**
- `src/lib/payouts.ts:104` — `if (inGame.length !== 2) return payouts`.
- `ls src/games/nassau*` → file does not exist.
- Round 3 Sub-Task 4 research (`/tmp/round-3-nassau-research.md`) recommended `matchTieRule` removal but no engineer round has shipped the Nassau engine.

**Open work:** full Nassau end-to-end implementation; gated on item 19 removal (per Round 4 Summary § 10 and IMPLEMENTATION_CHECKLIST.md backlog #8).

---

### 6. Match Play format labels do not match the brief — **Open**

Old field unchanged. No new Match Play engine.

**Evidence:**
- `src/types/index.ts:70` — `matchFormat?: 'individual' | 'teams'` (still the 2-value enum).
- `ls src/games/match_play*` → file does not exist.

**Open work:** widen `matchFormat` to `'singles' | 'best-ball' | 'alternate-shot' | 'foursomes'`, implement closeout logic (`holesUp > holesRemaining`), implement team handicap helper.

---

### 7. Skins has no tie rule for hole 18 — **Fixed**

`src/games/skins.ts` implements `tieRuleFinalHole: 'carryover' | 'split' | 'no-points'` (after Round 3 Sub-Task 1 removed `sudden-death`). `finalizeSkinsRound` resolves final-hole ties with `SkinCarryForfeit` or per-winner `SkinWon` events.

**Caveat (parallel-path):** `src/lib/payouts.ts:75-96` still has the old `computeSkins` with indefinite carry and no final-hole rule. Survives by design until cutover.

**Evidence:**
- `src/games/skins.ts:316` — `switch (config.tieRuleFinalHole)` covers all three modes.
- `src/games/__tests__/skins.test.ts` — Tests 3, 4, 8, 9 cover `carryover`, `no-points`, `split`, all-tied-final-hole.
- Round 4 Summary § 5 marks #7 as "partial"; partial-meaning is parallel-path only — the new engine is complete per the merge decision, classified **Fixed** here.

---

### 8. Stroke Play has no settlement mode — **Fixed**

`src/games/stroke_play.ts` implements all three modes (`winner-takes-pot`, `per-stroke`, `places`) and all three tie rules (`split`, `card-back`, `scorecard-playoff`). 24 tests.

**Caveat (parallel-path):** `src/lib/payouts.ts:16-43` still implements `winner-takes-pot` only and silently zero-pays on tie (see item 15). Survives until cutover.

**Evidence:**
- `src/games/stroke_play.ts:183-225` — `settleWinnerTakesPot`, `settlePerStroke`, `settlePlaces`.
- `src/games/__tests__/stroke_play.test.ts` — Tests 1, 2, 3 cover the three modes against § 10 Worked Example.
- Round 4 Summary § 5: **closed**.

---

### 9. No `ScoringEvent` union / audit trail — **Fixed** (caveat: persistence not yet wired)

55-variant discriminated union exists with exhaustive-switch test enforcing drift detection.

**Caveat**: the merge decision also said "Persist to a new `ScoringEvent` Prisma model." `prisma/schema.prisma` has no `ScoringEvent` model — only `Player`, `Course`, `CourseHole`, `Round`, `RoundPlayer`, `Score`, `Game`, `GameResult`, `SideBet`, `SideBetResult`. Persistence is pending.

**Evidence:**
- `src/games/events.ts` — 55-variant `ScoringEvent` discriminated union.
- `src/games/__tests__/types.test.ts:161` — `expect(kinds.size).toBe(55)`.
- `grep -n "ScoringEvent\|model " prisma/schema.prisma` → no `ScoringEvent` model defined.

**Open sub-work:** ScoringEvent Prisma model (carries over to cutover / persistence session).

---

### 10. Pure-function signature contract not met — **Open** (partial)

Three games (Skins, Wolf, Stroke Play) match the `(hole, config, roundCfg, ...) => ScoringEvent[]` contract. Two (Nassau, Match Play) not landed. `src/games/aggregate.ts` does not exist.

**Evidence:**
- `src/games/skins.ts:129`, `src/games/wolf.ts:163`, `src/games/stroke_play.ts:152` — pure per-hole signatures.
- `ls src/games/aggregate*` → file does not exist.
- Round 4 Summary § 5 marks this **partial**.

**Open work:** Nassau and Match Play implementations; `aggregate.ts` for round-total aggregation.

---

### 11. Handicap utility is in `src/lib/`, not `src/games/` — **Fixed**

`src/games/handicap.ts` is the canonical home. `src/lib/handicap.ts` remains as a deprecated re-export shim.

**Evidence:**
- `src/games/handicap.ts:1-69` — exports `calcCourseHcp`, `calcStrokes`, `strokesOnHole`, `net`, `effectiveCourseHcp`, `validatePlayerSetup`, `PlayerSetupError`.
- `src/lib/handicap.ts:1-4` — header comment `@deprecated Import from src/games/handicap.ts. This file remains during the MIGRATION_NOTES.md item 11 transition and will be deleted after every caller ... has migrated.`
- Round 3 Summary § 4: **closed**.

**Note:** the deprecated shim deletion is a cutover-session task.

---

### 12. README.md was generic `create-next-app` boilerplate — **Fixed**

Replaced with an app-specific stub.

**Evidence:**
- `README.md:1-3` — `# Golf Betting App\n\nA Next.js 16 (App Router) + TypeScript strict-mode web app that scores golf betting games...`
- Round 1 Summary notes README replaced in Task 1.

---

### 13. No tests exist — **Fixed**

Vitest wired; 100 tests passing across 6 files.

**Evidence:**
- `package.json` — `"test": "vitest"`, `"test:run": "vitest run"`, `"vitest": "^4.1.4"` devDep.
- `grep -c "it(" src/games/__tests__/*.test.ts` → sanity 1, types 4, handicap 10, skins 30, wolf 31, stroke_play 24 = 100.
- Round 4 Summary § 11: **100 tests passing**.

---

### 14. Junk (side bets) sits outside the scope but is wired into payouts — **Open** (partial)

Documentation (`docs/games/game_junk.md`) landed in Round 1. The follow-up replacement `src/games/junk.ts` has not been implemented; `src/lib/junk.ts` still drives `computeAllPayouts`.

**Evidence:**
- `docs/games/game_junk.md` — exists, 311 lines, cleaned of drift in Round 5 Sub-Task 2.
- `ls src/games/junk*` → file does not exist.
- `src/lib/junk.ts` — still present and wired.

**Open work:** engine-side rewrite per `game_junk.md` plus cutover.

---

### 15. `computeStrokePlay` silently zero-pays on tie — **Fixed**

`src/games/stroke_play.ts` emits `TieFallthrough` before every split-based resolution (direct-split, card-back-fallthrough, scorecard-playoff-fallthrough). Test 14 asserts event ordering.

**Caveat (parallel-path):** `src/lib/payouts.ts:36-40` still has the silent-zero-pay branch. Still triggers in production paths until cutover.

**Evidence:**
- `src/games/stroke_play.ts:498-527` — `emitSplitSettlement` unconditionally emits `TieFallthrough` before `StrokePlaySettled`.
- `src/games/__tests__/stroke_play.test.ts` Test 14 — asserts `ftIdx < settledIdx`.
- `sed -n '36,40p' src/lib/payouts.ts` → `if (winners.length === 1) { ... }` still the only branch; no else clause.
- Round 4 Summary § 5: **closed**.

---

### 16. `PlayerSetup.roundHandicap` field and validation — **Fixed**

Field added to `PlayerSetup`; `PlayerSetupError` + `validatePlayerSetup` + `effectiveCourseHcp` live in `src/games/handicap.ts`. Skins, Wolf, Stroke Play all consume via `state.strokes` populated from `effectiveCourseHcp` (verified by integration tests in each test file).

**Evidence:**
- `src/types/index.ts:33` — `roundHandicap: number`.
- `src/games/handicap.ts` — exports `PlayerSetupError`, `validatePlayerSetup`, `effectiveCourseHcp`.
- `src/games/__tests__/handicap.test.ts` — 6 boundary tests at -11/-10/0/0.5/10/11.
- Round 3 Summary § 4: **closed**.

---

### 17. Final Adjustment event variants absent from `src/games/events.ts` — **Fixed** (type-level)

All five variants (`FinalAdjustmentApplied`, `AdjustmentProposed`, `AdjustmentApproved`, `AdjustmentRejected`, `RoundControlTransferred`) exist with field-complete payloads per `_FINAL_ADJUSTMENT.md` § 7. Exhaustive-switch variant count is 55.

**Caveat:** type-level only. No engine logic emits these events. The merge decision mentioned engine enforcement of zero-sum per bet before persisting `FinalAdjustmentApplied`; that logic is not in place. This was the documented scope of item 17 per Round 3 Sub-Task 2 ("do NOT add engine logic that produces these events"), so classifying **Fixed** within item 17's stated scope.

**Evidence:**
- `src/games/events.ts:325-353` — five variant type definitions.
- `src/games/__tests__/types.test.ts:155-163` — five sample events + narrowing test.
- Round 3 Summary § 4: **closed (type-level)**.

**Open sub-work (beyond item 17's scope):** Final Adjustment UI + engine validation is a future session; not tracked inside the 1–19 list.

---

### 18. Role-holder disconnect quorum override — v2 deferred — **Open** (by design)

Still open because v1 doesn't ship it. Listed for visibility; owner is product + engineer at v2 planning.

**Evidence:**
- `grep -rn "quorum\|RoundControlTransferred" src/` → the variant exists in `events.ts:351` but no code emits it and no UI implements the flow.
- Round 4 Summary § 5 keeps this Open.

**Classification note:** this could also be read as **Lesson-learned** ("v1 documents both deferrals") — but because the v1 engine could still produce a `RoundControlTransferred` event that has no consumer, it remains a live gap, not merely a retained-for-reference note.

---

### 19. `NassauCfg.matchTieRule` present in types but absent from `game_nassau.md` § 4 — **Open**

Research complete; removal pending.

**Evidence:**
- `src/games/types.ts:63` — `matchTieRule: 'split'` (single-value enum after Round 3 Sub-Task 1 removed `'sudden-death'`).
- `grep "matchTieRule" docs/games/game_nassau.md` → zero matches.
- `/tmp/round-3-nassau-research.md` — recommendation: option (b), remove from `NassauCfg`.
- Round 4 Summary § 5 keeps this item as "researched; removal pending".

**Open work:** delete the field from `NassauCfg` as part of Nassau end-to-end or as a one-line cleanup.

---

## Cross-cutting carryover to the cutover (backlog #3)

Items marked **Fixed** with a parallel-path caveat all carry forward to the cutover session. The cutover will:

1. Delete `src/lib/payouts.ts` (resolves carryover from items 4, 5, 6, 7, 8, 15).
2. Delete `src/lib/handicap.ts` deprecated shim (item 11 follow-up).
3. Delete `src/lib/junk.ts` (item 14 follow-up).
4. Delete `src/lib/scoring.ts` (retires `formatMoneyDecimal` per item 2).
5. Update `src/app/api/*`, `src/app/bets/*`, `src/app/results/*`, `src/components/scorecard/*`, `src/store/roundStore.ts` to import from `src/games/*` exclusively.
6. Add the ScoringEvent Prisma model per item 9's deferred sub-work.

This cutover work is tracked outside MIGRATION_NOTES 1–19 — it's IMPLEMENTATION_CHECKLIST.md backlog #3 (pending #2 rebuild-plan approval).

---

## Round-5 notes still open (separate tracking — out of 1–19 scope)

For completeness, `/tmp/round-5-notes.md` lists **7 engineer follow-ups** from the Wolf rule-file refactor (types.ts field removals, wolf.ts rotation refactor, wolf.test.ts Test-1 assertion updates, `WolfCaptainTiebreak` disposition). These are not part of items 1–19 and are not audited here. They'll need their own disposition as part of the next engineer round or explicitly deferred.

---

## Classification rollup

- **Fixed: 10 / 19.** Items 4, 7, 8, 11, 12, 13, 15, 16 are unqualified Fixed. Items 9, 17 are Fixed within their stated scope with a documented sub-gap carried forward.
- **Open: 9 / 19.** Items 1, 2, 3, 5, 6, 10, 14, 18, 19. Of these:
  - #1 and #10 are partial (3 of 5 games landed; 2 remain).
  - #2, #3, #5, #6 are rebuild targets (Nassau, Match Play, Prisma, UI scope).
  - #14 is engine-side of a documented rule.
  - #18 is an explicit v2 deferral.
  - #19 is a one-line type change after research.
- **Lesson-learned: 0 / 19.** No item fits the rubric cleanly — every closed item either materially affected code (Fixed) or is a live gap (Open).
- **Obsolete: 0 / 19.** No item is unambiguously obsolete. #18 is the closest candidate (v2-deferred), but the variant exists in the union and so remains a live gap rather than obsolete.

**Conclusion for rebuild planning (backlog #2):** 9 open items frame the remaining work. Item 1 is an umbrella for items 5, 6, 10, 14; those four mostly collapse into "implement Nassau and Match Play engines, implement the Junk engine, write aggregate.ts." Items 2 and 18 are independent tracks. Item 3 is small cleanup. Item 19 is a one-line change. No item calls for "nuke `src/games/` and restart from zero" — the three landed engines (Skins, Wolf, Stroke Play) meet their merge decisions and should be preserved, subject to the Round-5 Wolf follow-ups also being addressed.

The user-announced "partial rebuild" intent should therefore target the unbuilt engines and the still-old `src/lib/*`, not the already-clean `src/games/` engines.
