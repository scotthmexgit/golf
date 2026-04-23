---
prompt_id: "010"
timestamp: "2026-04-23T22:30:00Z"
checklist_item_ref: "#6 — Match Play engine (Phase 4c engineer: best-ball partial miss + HoleForfeited)"
tags: [match-play, phase4c, missing-score, HoleForfeited, engineer]
---

## Prompt

Phase 4c engineer pass: best-ball partial miss + HoleForfeited (Gap 9). Evidence gates: quote § 5 Gap 9 resolution + § 9 missing-score text with line numbers; grep HoleForfeited; confirm event shape; pre-write test count; stop-condition check on mutual-forfeit.

## Evidence gates (pre-edit)

**§ 5 Gap 9 resolution (lines 97–105):**
- One partner missing gross → graceful degradation; team uses available partner's score via Math.min over present players.
- ALL members missing → team forfeits the hole. See § 9 for HoleForfeited.

**§ 9 line 186:** "the team with a missing scorecard entry forfeits that hole. Emit `HoleForfeited`. For best-ball, see the partial-miss clarification in § 5: a team forfeits only when ALL members have missing scores; a single valid score is used as the team's best-ball net."

**HoleForfeited (events.ts lines 190–194):** `{ kind, hole: number, forfeiter: PlayerId }` — no `matchId`; no events.ts change needed.

**HoleForfeited emit sites grep:** Only `NassauHoleForfeited` is emitted (nassau.ts:358). `HoleForfeited` (non-Nassau) has no emit site yet — this pass is the first.

**Stop condition:** § 5 and § 9 are silent on mutual-forfeit (both-players-missing singles, both-teams-all-missing best-ball). Stop condition triggered per Phase 4c fence. Both cases added to Parking Lot. Implementation covers only the well-specified single-side-missing cases.

**Pre-write test count:**
- Test 1: singles A missing → B wins (3 its)
- Test 2: singles B missing → A wins (2 its)
- Test 3: best-ball partial miss, A absent, B's score counts (3 its)
- Test 4: best-ball all-team missing, HoleForfeited, opponent wins (3 its)
- Test 5: forfeit triggers closeout, ordering (5 its)
- Total: 16 its → expected 219 + 16 = 235

## Action

**1. src/games/match_play.ts:**

- Modified `holeWinner`'s `bestNet`: added `valid = pids.filter(p => state.gross[p] !== undefined)` before `Math.min`. Empty `valid` → Infinity (team has no score). This handles best-ball partial miss naturally: one member absent, partner's score used; all-absent produces Infinity (winner of holeWinner call, but all-absent case is caught before holeWinner via getMissingScoreForfeit).

- Added `getMissingScoreForfeit(hole, cfg)` helper returning `{ forfeiter: PlayerId, winner: 'team1' | 'team2' } | null`. Singles: checks each playerIds index independently; returns null for both-missing (doc silent). Best-ball: `every(p => gross[p] === undefined)` per team; lex-lowest sort for forfeiter when a team is all-missing; returns null for both-teams-all-missing (doc silent).

- Modified `settleMatchPlayHole`: after the concession short-circuit (Phase 4b), added missing-score check block. `getMissingScoreForfeit` returns non-null → emit HoleForfeited, advance match, conditionally emit MatchClosedOut via `buildCloseoutEvent` (same pattern as concession path). Returns early. Fall-through (null result, partial-miss, or both-missing) proceeds to normal `holeWinner` call with the updated `bestNet` handling partial miss via undefined-gross filter.

- tsc: zero errors ✓

**2. src/games/__tests__/match_play.test.ts:**

- Added 5 describe blocks, 16 it tests, covering all well-specified cases.
- Test 1 (singles A missing): gross = `{ B: 4 }` (A absent). HoleForfeited(forfeiter=A), match.holesUp=-1.
- Test 2 (singles B missing): gross = `{ A: 3 }` (B absent). HoleForfeited(forfeiter=B), match.holesUp=+1.
- Test 3 (best-ball partial miss): alice absent, bob gross=3, carol=4, dave=5. HoleResolved winner='team1' (AB wins via bob). No HoleForfeited.
- Test 4 (best-ball all-team missing): alice AND bob absent, carol=4, dave=5. HoleForfeited(forfeiter=alice, lex-lowest of [alice,bob]), match.holesUp=-1.
- Test 5 (forfeit triggers closeout): A leads 3 up after H14; B absent on H15. 2 events in order: [HoleForfeited, MatchClosedOut], holesUp=4, holesRemaining=3, points={A:+1,B:-1}, Σ=0.
- Note: `gross` sparse-record approach (`{ B: 4 }`) passes TypeScript for `Record<string, number>` (index-signature sparse records allowed at runtime).

## Result

- Files touched: `src/games/match_play.ts`, `src/games/__tests__/match_play.test.ts`, `IMPLEMENTATION_CHECKLIST.md`
- `npm run test:run`: 9 test files, **235 tests passed** (219 + 16)
- `npx tsc --noEmit --strict`: zero errors
- Gate greps: `b.config === cfg` → 0 hits; `alternate-shot|foursomes` → 0 hits
- Pre-write count match: 235 ✓

## Open questions

- None. Gate to Phase 4d: TeamSizeReduced emit logic.

## Parking lot additions

- Match Play mutual forfeit (both sides missing gross) — doc § 5/§ 9 silent; engine falls through to halved via Infinity path; needs documenter rule decision. — 2026-04-23 — prompt 010
- concedeMatch inverted-concession test (conceder was leading): preMatch holesUp=-3 (B leads), B concedes — locks the winner-independent-of-holesUp decoupling at test level. — 2026-04-23 — prompt 009
