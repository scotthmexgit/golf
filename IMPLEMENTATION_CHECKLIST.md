# Implementation Checklist

Single source of truth for scope. Read the **Active item** before any work. Tangents → Parking Lot. Closed items → Done (append-only).

## Project North Star

Golf betting app: a pure-TypeScript scoring engine under `src/games/` plus a Next.js 16 UI that collects per-hole scores, runs five canonical betting games (Skins, Wolf, Nassau, Match Play, Stroke Play) with Junk side bets, and settles zero-sum at round end. Portable to React Native.

<!-- TODO if the above understanding drifts, update from docs/games/ + AGENTS.md -->

## Design timeline

Updated at EOD-FINAL.

| Phase | Target | Status |
|---|---|---|
| 1. Audit MIGRATION_NOTES.md | 2026-04-20 | **done** (closed 2026-04-20 at prompt 001; see `AUDIT.md`) |
| 2. Rebuild plan approval | 2026-04-20 | **done** (closed 2026-04-20 at prompt 004; see `REBUILD_PLAN.md`) |
| 3. Targeted rebuild (#3–#8: Wolf follow-ups, bet-id refactor, Nassau, Match Play, Junk, aggregate) | TBD | active (starting with #3) |
| 4. `prisma/` Float→Int migration + GAME_DEFS cleanup (#9, #10) | TBD | independent of phase 3 |
| 5. Cutover session (#11, delete `src/lib/*` parallel paths) | TBD | blocked on phase 3 |
| 6. UI routes + hole-state builder (deferred beyond this rebuild) | TBD | blocked on phase 5 |

## Active item

### #5 — Nassau engine

**Why**: Audit #5 (Nassau 2-player limit + no press logic) and audit #19 (`NassauCfg.matchTieRule` type/doc mismatch) both close with a single engine build. First greenfield engine of the rebuild; #3 and #4 have prepared the shared types and the string-id pattern so #5 consumes them directly.

**Acceptance criteria**: see `REBUILD_PLAN.md` `### #5 — Nassau engine` for full AC. Summary:
- `src/games/nassau.ts` implements `settleNassauHole`, `finalizeNassauRound`, `offerPress`, `openPress` per `docs/games/game_nassau.md` § 5, matching the `(hole, config, roundCfg, ...) => ScoringEvent[]` signature contract.
- 2–5 players via `pairingMode: 'singles' | 'allPairs'`; three match bases (front / back / overall); press rules (`manual`, `auto-2-down`, `auto-1-down`); press scope (`nine`, `match`); closeout when `holesUp > holesRemaining`; halved matches emit `MatchTied`; disputes escalate to Final Adjustment.
- `src/games/types.ts` `NassauCfg.matchTieRule` field **deleted** (closes audit #19).
- Bet-id lookup uses `b.id === cfg.id` (from #4) — string-id-native.
- `src/games/__tests__/nassau.test.ts` covers § 10 Worked Example verbatim, every § 9 edge case, every § 12 Test Case, and a Round Handicap integration test mirroring Wolf Test 10 and Stroke Play Test 12.
- Zero-sum on every point-producing test. `tsc --noEmit --strict` clean. Portability grep empty. No `any` / `@ts-ignore` / non-null `!` on untrusted input.
- Fence sentence: **No changes to `src/games/skins.ts`, `wolf.ts`, `stroke_play.ts`, or their test files. No changes to `docs/games/game_nassau.md`. No UI wiring.** Old `computeNassau` in `src/lib/payouts.ts` stays untouched (parallel-path hold until #11 cutover).

**Must complete before**: #6 Match Play, #7 Junk (shared types); #8 aggregate (needs Nassau events in multi-game zero-sum test).

**Phase tracking**:
- [x] Phase 1 — Types + `MatchState` + per-hole scoring (singles, no presses) — closed 2026-04-20 at prompt 013. `NassauCfg.matchTieRule` deleted (closes audit #19); `nassau.ts` skeleton with pair-wise USGA `holeResult` per I1/I4; `settleNassauHole` signature `(hole, cfg, roundCfg, matches) => { events, matches }` per I2; 10 tests added; 107 total pass.
- [x] Phase 2 — Press handling — closed 2026-04-21. Turn 1 (offerPress, openPress, settleNassauHole MatchState[] iteration; engine-only, no tests) at d4bddb3; 13 tests added, 120 total. Turn 2 (§ 10 integration, manual-press negative case, unit proof; test-additive only) at 5716120; 8 tests added, 128 total.
- [ ] Phase 3 — End-of-round settlement + closeout — not started.
- [ ] Phase 4 — Edge cases + `allPairs` + Round Handicap integration — not started; Phase 4 gate re-runs `b.config === cfg` and `b.id === cfg.id` greps per prompt 012.

**Status**: #5 **Active**, Phase 2 **complete**. Phase 3 (end-of-round settlement + closeout) is the next sub-step; user approval required to begin. #5 does not close until all 4 phases land.

## Backlog

Ordered; rough sizing in parens. Backlog structure revised after audit and rebuild plan: Skins, Wolf, Stroke Play meet their merge decisions and are NOT rebuilt. See `REBUILD_PLAN.md` for full acceptance criteria per item. Backlog numbers here match `REBUILD_PLAN.md` numbers.

- (#5 is currently Active — see "Active item" section above.)
- **D1** — Documenter: resolve Nassau rule-file ambiguities surfaced at prompt 012. Update `docs/games/game_nassau.md` § 5 pseudocode to show pair-wise USGA allocation (matching § 2 prose, which is authoritative per I1/I4 decision). Update § 9 N35 to clarify that "in favor of opposing player" applies only when a lead exists — tied in-flight matches on withdrawal get `MatchTied` zero-delta per § 6. Independent of all engine work; can be done any time. (XS)
- **#6** — Match Play end-to-end engine: `src/games/match_play.ts` + tests. Widen `matchFormat` with legacy-value migration shim. (L)
- **#7** — Junk engine: `src/games/junk.ts` + tests. (M)
- **#8** — `src/games/aggregate.ts` for round-total aggregation. (S)
- **#9** — `GAME_DEFS` cleanup: mark 4 non-scope games as `disabled: true`. (XS)
- **#10** — Prisma `Float` → `Int` cents migration; drop-and-recreate per disposable-data baseline. (S)
- **#11** — Cutover session: parallel-path migration across ~7 commits with grep gates. Depends on #5, #6, #7, #8. (M)

Deferred beyond this rebuild plan (see REBUILD_PLAN.md "Deferred" section): ScoringEvent Prisma model, Final Adjustment engine logic + UI, hole-state builder, UI wiring, Player abandonment, Comeback Multiplier, PlayerDecision generic mechanism.

## Parking Lot

Untriaged. Dated and sourced to a prompt. Triage at EOD-FINAL or on explicit request.

<!-- format: - [ ] <description> — YYYY-MM-DD — prompt NNN -->

- [ ] SKILL.md NNN-format redundancy: new inline note and trailing standalone sentence overlap — consider a future tightening pass — 2026-04-20 — prompt 006
- [ ] wolf.test.ts has 4 stale references to `teeOrder` in describe names + one inline comment (lines 314, 317, 337, 364) that describe logic that now uses `roundCfg.players[]`. Fence sentence prevented updates in #3; not functional defect; worth a cosmetic pass in a later cleanup — 2026-04-20 — prompt 007
- [ ] Stroke Play is played in several formats including Front 9, Back 9, Total 18. Investigate methods to make the UI simple and intuitive. No junk bets for skins — amount is based on chosen bet format. Could be 3 bets if the user selects Front 9 winner, Back 9 winner, and Total winner as the option. — 2026-04-21 — prompt 001
- [ ] On the Closest to the Pin screens, all players are shown for Bingo Bango Bongo. Unclear whether other bet types have the same issue. Investigate. — 2026-04-21 — prompt 001
- [ ] `makeRoundCfg` helpers in `skins.test.ts` (line 51), `stroke_play.test.ts` (line 55), and `wolf.test.ts` (line 55) all retain unused `betId` defaults after commit 3 drops their sole non-default callers; parameters are now dead code — cosmetic cleanup, not bundled into commit 3 — 2026-04-21 — prompt 021
- [ ] Stress-test the refactored engines (Skins, Wolf, Stroke Play, Nassau once Phase 2 Turn 2 lands) with end-to-end sample data to surface integration issues unit tests don't catch — particularly around serialization boundaries and the bet-id string-lookup refactor's assumptions — 2026-04-21 — prompt 033
- [ ] Per-prompt NNN_slug.md session log entries were not produced for the prior context-window session; artifact files 015–041 in 2026-04-21/ are raw gate artifacts and diffs, not structured log entries. Structured per-prompt logging resumed in the post-reset session at 044. Skill is silent on context-reset and extended-session handling; amendment is a deferred item — 2026-04-21 — prompt 027
- [ ] Session-logging skill should be reviewed for (i) long-session exception clause with prompt-count threshold, and (ii) integration with EOD-FINAL routine for handling days where per-prompt logs are absent or deferred. Today's deviation (prompt 027 above) is the trigger. Amendment belongs in a session focused on skill maintenance, not inline during engineering work — 2026-04-21 — prompt 027

## Done

Append-only. Close date + pointer to prompt NNN or EOD.

<!-- format: - [x] #N — <title> — closed YYYY-MM-DD — prompt NNN -->

- [x] #1 — Audit `MIGRATION_NOTES.md` — closed 2026-04-20 — prompt 001 — output: `AUDIT.md`
- [x] #2 — Rebuild plan — closed 2026-04-20 — prompt 004 — output: `REBUILD_PLAN.md`
- [x] #3 — Wolf follow-ups — closed 2026-04-20, prompt 007. Final test count 97 (AC's "still 100" figure was arithmetically wrong; 100 − 3 deletions = 97 was the intended result).
- [x] #4 — Bet-id string-lookup refactor — closed 2026-04-20, prompt 009. Final test count 97 (AC's "100 modulo the #3 net-zero" figure was arithmetically wrong; 97 start, 97 end, 0 net change is correct).

## Deferred / won't-do

With reason.

<!-- format: - [ ] <description> — reason — YYYY-MM-DD -->

- Player abandonment / `PlayerWithdrew` UI flow — deferred indefinitely per product decision (2026-04-20).
- Comeback Multiplier (last-hole stakes adjustment) — deferred to post-v1 PlayerDecision design round (2026-04-20).
- `PlayerDecision` generic mechanism — deferred to its own design round after Nassau/Match Play (2026-04-20).
