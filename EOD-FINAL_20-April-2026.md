# EOD-FINAL 20-April-2026

## Executive summary

- **Four backlog items closed today (#1 audit, #2 rebuild plan, #3 Wolf follow-ups, #4 bet-id refactor) plus two Nassau phases landed (#5 Phase 1, #5 Phase 2 Turn 1 of 2).** All six completions happened same-day as the REBUILD_PLAN.md approval at prompt 004 — ahead of phasing.
- **Nassau engine is real and testable**: Phase 1 put `nassau.ts` + `MatchState` + pair-wise USGA `holeResult` in place with the § 10 Worked Example front-9 passing verbatim. Phase 2 Turn 1 added `offerPress` / `openPress` / `PressConfirmation` with distinguishing-input tests proving `'nine'` vs `'match'` scope handling, `auto-2-down` vs `manual` threshold filtering, and press-on-last-hole voiding.
- **Test count: 100 (start-of-day baseline) → 120 (end-of-day).** Net +20 after the intentional −3 from #3's Wolf test deletions. Every point-producing Nassau test passes zero-sum; every distinguishing test observably pairs mode X vs mode Y.
- **Parallel-path invariant held across every turn.** `src/lib/payouts.ts` SHA256 `52a389607248ffda72f4a3f21561300fe05dedac2d938b38e5cb60a27dfd215c` byte-unchanged from snapshot commit through prompt 015. Cutover (#11) still deferred per plan.
- **Infrastructure built and proven**: session-logging skill tightened at prompt 006 to catch substantive-but-file-free turns; the amended rule back-logged prompts 011 and 012 at prompt 013's close when the real-time miss was caught — pattern now visible.

## Decisions made

| Prompt | Decision | Rationale |
|:-:|---|---|
| 001 | Audit `MIGRATION_NOTES.md` produced 10 Fixed / 9 Open / 0 Lesson-learned / 0 Obsolete. Output venue: new `AUDIT.md`, not inline edit to MIGRATION_NOTES.md. | Preserves MIGRATION_NOTES.md as historical narrative; AUDIT.md is the evidence-cited classification. |
| 002 | `REBUILD_PLAN.md` is a separate forward contract, distinct from MIGRATION_NOTES.md. | Stable, versioned rebuild plan keeps the target visible; arithmetic corrections later live in Done-entry notes, not plan edits. |
| 003 | Push back on single-commit cutover; switch to parallel-path consumer-by-consumer with grep gates. | Cutover correctness risk reduced: rollback granular per commit; only one technical entanglement (`src/games/handicap.ts` re-exports from lib) and it resolves in a prerequisite commit. |
| 004 | Bet-id string-lookup refactor promoted from deviation flag D to #4 (inserted between #3 and Nassau). Wolf follow-ups folded into #3. Plan renumbered to sequential #3–#11. Standing clarification: REBUILD_PLAN.md "100" figures stay unchanged; actual baselines captured in Done-entry notes. | Front-loading bet-id refactor means 3 new engines (Nassau, Match Play, Junk) are built string-id-native from day one; reference-identity anti-pattern never spreads. |
| 006 | Session-logging skill tightened: skip rule requires ALL 4 conditions (single clarification + no file touched + no evidence + no reasoning). Multi-turn revisions log per substantive response. | Old rule dropped substantive architectural reasoning when no file was touched; amended rule correctly captures pushback turns and revision turns. |
| 009 | `#4` executed with per-interface checkpoints (5 total: SkinsCfg, WolfCfg, StrokePlayCfg, NassauCfg, MatchPlayCfg) rather than end-of-refactor-only verification. | Interface-by-interface gates bound blast radius to one type at a time; a mid-refactor type error would have hit one engine rather than three simultaneously. |
| 012 | Four Nassau input decisions: **I1/I4 pair-wise USGA** allocation (option a); **I2 signature threading** (explicit `(hole, cfg, roundCfg, matches) => {events, matches}`, option a); **I3 withdrawal-tied = MatchTied zero-delta** (option a); **I4 architectural separation** — pair-wise reduction inside engines, HoleState.strokes stays per-player across all 5 engines. | § 2 prose is authoritative over § 5 pseudocode; HoleState shape can't vary by game context; per-player is the only builder shape that works for all engines. Architectural clarity extends to #6 Match Play singles format. |
| 013 | Phase 1 landed with pair-wise USGA inside `holeResult` per prompt 012 I1/I4 decision; in-body code comment captures the § 2 authority over § 5 pseudocode. D1 documenter item added to backlog for rule-file § 5 and § 9 N35 ambiguity resolution. | D1 is a separate tracked item (not parking-lot) because it's specification debt that should close before Match Play inherits the same ambiguity. |
| 014 | Phase-tracking checkboxes introduced to Active-item section for #5 rather than per-phase Done entries. #5 does not move to Done until all 4 phases land. | L-sized items with phased execution need sub-tracking; a single Done row wouldn't reflect mid-flight state. |
| 015 | Phase 2 Turn 1: three separate pure functions (`offerPress`, `openPress`, `settleNassauHole` unchanged) rather than extending settle with optional `pressConfirmations?`. | Keeps Phase 1's settle signature byte-identical; matches rule file § 5 division; caller orchestration until `aggregate.ts` (audit #10) lands. |

## Artifacts produced

### Top-level docs (project root)
- `AUDIT.md` — 19-item classification (prompt 001).
- `REBUILD_PLAN.md` — 9-entry plan #3–#11 (created 002; revised 003, 004).
- `IMPLEMENTATION_CHECKLIST.md` — Active/Backlog/Done tracking (modified at prompts 001, 002, 006, 008, 010, 012, 013, 014).
- `CLAUDE.md` — extended with Session logging / Implementation checklist / Focus discipline / Rebuild context sections (prompt 006 Phase B).
- `EOD_20-April-2026.md` — rolling log, 16 lines (001–016).
- `EOD-FINAL_20-April-2026.md` — this file.

### Skills
- `.claude/skills/session-logging/SKILL.md` — created prompt 006; amended prompt 006 (skip rule tightened to 4 AND-conditions; stale example path replaced).
- `.claude/skills/focus-discipline/SKILL.md` — created prompt 006.

### Per-prompt logs — `./2026-04-20/` directory, 16 files
- `001_audit-migration-notes.md`
- `002_rebuild-plan-draft.md`
- `003_rebuild-plan-revision.md` (back-logged at prompt 004)
- `004_rebuild-plan-revision-2.md`
- `005_plan-readback.md` (back-logged at prompt 006)
- `006_skill-fixes-and-checklist-transition.md`
- `007_wolf-followups-complete.md`
- `008_close-3-and-transition-to-4.md`
- `009_bet-id-refactor-complete.md`
- `010_close-4-and-transition-to-5.md`
- `011_nassau-research-and-phase-proposal.md` (back-logged at prompt 013)
- `012_nassau-phase-clarification-and-i4.md` (back-logged at prompt 013)
- `013_nassau-phase-1-complete.md`
- `014_phase-1-close.md`
- `015_nassau-phase-2-turn-1.md`
- `016_apparent-resend-flagged.md`

### Code files modified / created
- `src/games/types.ts` — modified: `'sudden-death'` removed from 4 `*Cfg` unions (007); `WolfCfg.teeOrder`, `WolfCfg.lastTwoHolesRule` deleted (007); `id: BetId` added to 5 `*Cfg` interfaces (009); `NassauCfg.matchTieRule` deleted (013).
- `src/games/events.ts` — modified: `SuddenDeathHole` variant deleted (007); `WolfCaptainTiebreak` reserved-dead-code comment added (007).
- `src/games/skins.ts` — modified: `applySuddenDeathWinner` + sudden-death branch deleted (007); `findBetId` rewritten to string-id lookup (009).
- `src/games/wolf.ts` — modified: sudden-death cleanup (007); `teeOrder` / `lastTwoHolesRule` reads removed; `applyWolfCaptainRotation` rewritten to read `roundCfg.players[]`; `moneyTotalsFromEvents` deleted as dead code; `WolfDecisionMissing.captain` re-sourced (007); `findBetId` rewritten (009).
- `src/games/stroke_play.ts` — modified: `findBetId` rewritten to string-id lookup (009).
- `src/games/nassau.ts` — **new (013)** — Phase 1 skeleton: `NassauConfigError`, `NassauBetNotFoundError`, `MatchState`, `initialMatches`, pair-wise `holeResult`, `applyHoleToMatch`, `settleNassauHole`, `finalizeNassauRound` stub. **Extended (015)**: `PressConfirmation`, `offerPress`, `openPress`, `endOfCurrent9Leg` helper.
- `src/games/__tests__/skins.test.ts` — modified: sudden-death describe block + helper import deleted (007); `id` added to fixtures and strayCfg (009).
- `src/games/__tests__/wolf.test.ts` — modified: `makeWolfCfg` + `makeRoundCfg` updated; 3 tests deleted; Test 1 assertions updated to `{A: +21, B: -19, C: +1, D: -3}` (007); `id` added to fixtures and stray (009).
- `src/games/__tests__/stroke_play.test.ts` — modified: `id` added to fixtures and stray (009).
- `src/games/__tests__/nassau.test.ts` — **new (013)** — 10 tests across 3 describes (Worked Example front-9, pair-wise allocation, typed errors). **Extended (015)**: +13 tests across 4 describes (offerPress thresholds, scope-window, last-hole voiding, press composition).
- `2026-04-20/.gitkeep` — empty placeholder (prompt 006 Phase B).

### Git state
- Branch `pre-rebuild-snapshot` at commit `9055de5 Snapshot: end of Round 5, pre-audit, pre-rebuild` (prompt 008 area, before audit began).
- Branch `main` fast-forwarded to `9055de5` at prompt 009 area.
- No further commits today. End-of-day working tree is uncommitted.

## Checklist items closed today

- **#1 — Audit `MIGRATION_NOTES.md`** — closed prompt 007 (Done-entry at prompt 008 transition). Output: `AUDIT.md`.
- **#2 — Rebuild plan** — closed prompt 008 (Done-entry added at prompt 008 transition). Output: `REBUILD_PLAN.md`.
- **#3 — Wolf follow-ups** — closed prompt 007; Done-entry at prompt 008. Final test count 97 (AC "still 100" was wrong; 100 − 3 deletions = 97 correct).
- **#4 — Bet-id string-lookup refactor** — closed prompt 009; Done-entry at prompt 010. Final test count 97 (AC "100 modulo #3 net-zero" was wrong; 97 start / 97 end / 0 net is correct).

## Checklist items still open

- **#5 — Nassau engine** — Active. Phase 1 `[x]` complete at prompt 013. Phase 2 Turn 1 `[x]` complete at prompt 015. Phase 2 Turn 2 `[ ]` not started. Phase 3 `[ ]`. Phase 4 `[ ]`. #5 does not move to Done until all 4 phases land.
- **D1 — Documenter: Nassau rule-file ambiguities** — Backlog, XS. § 5 pseudocode and § 9 N35 clarifications surfaced at prompt 012; added to backlog at prompt 013. Independent; can be done any time.
- **#6 — Match Play engine** — Backlog, L.
- **#7 — Junk engine** — Backlog, M.
- **#8 — `src/games/aggregate.ts`** — Backlog, S.
- **#9 — GAME_DEFS cleanup** — Backlog, XS.
- **#10 — Prisma Float→Int** — Backlog, S.
- **#11 — Cutover session** — Backlog, M. Depends on #5, #6, #7, #8.

## Parking lot additions today

- SKILL.md NNN-format redundancy: new inline note (Per-prompt path) and trailing standalone sentence overlap — consider future tightening pass — prompt 006.
- `wolf.test.ts` has 4 stale `teeOrder` references in describe names + one inline comment (lines 314, 317, 337, 364) that describe logic now using `roundCfg.players[]`. Fence sentence prevented updates in #3; not functional defect — prompt 007.

## Blockers

None. Phase 2 Turn 2 is ready to start whenever work resumes.

## Tomorrow's starting item

**#5 Phase 2 Turn 2** per the handoff in log 015.

**First concrete step**: re-state Phase 2 scope verbatim from log 012 (re-focus protocol as applied at every phase start). Then execute Turn 2 scope:

1. Extend the § 10 Worked Example test to cover the back-9 press flow: hole 11 auto-2-down trigger (A up 2-0 on back-9 match, B is down), hole 12 press confirmation via `openPress({hole: 12, parentMatchId: 'back', openingPlayer: 'B'}, ...)`, hole 18 press match endpoint.
2. Implement § 12 Test 2 (manual-press-refused): `pressRule: 'manual'`, Bob 2-down after hole 11, test driver simulates no UI confirmation → assert zero `PressOpened` events across the full round.
3. Add a full-round state-topology test asserting final MatchState counts across front/back/overall/press-1 match the § 10 Worked Example table bottom.

Expected test-count delta: +5–7 → end state ~125–127.

Fence stays: press handling only; Phase 3 (finalize, closeout) + Phase 4 (forfeit, withdrawal, allPairs, Round Handicap integration) remain parked.

## Workflow observation

Prompt 015 was accidentally re-sent verbatim as prompt 016's input. Claude Code stopped to clarify rather than blindly re-executing (which would have duplicated all 13 press tests and failed on `Write` file-exists conflicts). Pattern: when two consecutive user messages are byte-identical and the first one produced real code changes, treat the second as a likely accident and disambiguate. This is the first instance today; keeping visible for tomorrow's workflow.

The amended session-logging skill (prompt 006) produced two good catches today — back-logging prompts 011 and 012 at prompt 013's close-out. Both were substantive architectural reasoning (Nassau research read, I4 structured decision) with no files touched; the old skip rule would have dropped them. Amended rule correctly flags them.

## Timeline delta

**Ahead of plan phasing.** REBUILD_PLAN.md was approved at prompt 004. Four plan items (#3 Wolf follow-ups at 007; #4 bet-id refactor at 009; #5 Phase 1 at 013; #5 Phase 2 Turn 1 at 015) completed same-day as plan approval. Plan sized #3 as S, #4 as S, #5 as L across 4 phases; hitting 2 of 4 Nassau phases same-day as plan approval is ahead of any reasonable projection.

If Phase 2 Turn 2 + Phase 3 land tomorrow, Nassau (L) lands on day two of engineering; Match Play (#6, L) and Junk (#7, M) follow with the same template. At current pace the rebuild's engine-side work (#5–#8) could complete in one work week, leaving cutover (#11) and infrastructure (#9, #10) as independent tracks.

End of day.
