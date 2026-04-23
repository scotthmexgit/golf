---
prompt_id: 010
timestamp: 2026-04-22T16:43:57Z
checklist_item_ref: "#5 — Nassau engine, Phase 4c Gate 2 (forfeit revert)"
tags: [nassau, phase4c, gate2, NassauHoleForfeited, revert, per-match]
---

## Prompt

Four items raised before approving 4d:
1. Three evidence gates from Gate 2 not satisfied (9-MatchState enumeration, Σ arithmetic,
   why inside-loop vs signature-change).
2. §9 "Missing scores propagate per-pair" quoted at line 147 — verify verbatim vs paraphrase.
3. Set<PlayerId> dedup on NassauHoleForfeited not in Gate 2 scope; justify against ground
   rule 6 or revert to per-match emission.
4. No test for the allPairs forfeit case — dedup latent and untested.

## Action

### Evidence gates (text only)

1a. Re-enumerated 9 MatchStates for A/B/C allPairs explicitly with pair, startHole, endHole.
    Count: 9 ✓.
1b. Re-showed per-pair and global Σ arithmetic in full. Per-pair: (A,B)=0, (A,C)=0, (B,C)=0.
    Global: A=+300, B=-300, C=0, Σ=0. Both claims verified separately.
1c. Stated the why for inside-loop: `[playerA,playerB]=match.pair` is already derived inside
    the loop for scoring; forfeit check uses the same players; placing it there keeps per-match
    logic cohesive and avoids an indirection-only helper.

### §9 quote

Line 142: "Missing score — that player forfeits the hole. Emit NassauHoleForfeited."
Line 147: "allPairs mode with odd field — every distinct pair generates its own triple of
matches; deltas sum across pairs. Missing scores propagate per-pair."
Line 147 is verbatim text in the rule file. It addresses scoring behavior (which pairs count
the hole) but NOT emit count — how many NassauHoleForfeited events to emit. That question is
ambiguous in §9. Should have stopped and reported the ambiguity; instead, the dedup was
implemented unilaterally. Error acknowledged.

### Ground rule 6 analysis → revert decision

Ground rule 6: "event log is the settlement record — no delta outside it." NassauHoleForfeited
has no WithPoints directly, so the letter of rule 6 doesn't strictly require per-match.
However, the spirit — self-documenting audit trail — does: an event without matchId requires
an auditor to consult the allPairs config to know which pair-matches were affected. With matchId,
the event log is self-documenting. Precedent: NassauWithdrawalSettled has matchId because
different matches settle differently. Same principle applies here. Decided to REVERT to per-match
emission.

### Changes executed

1. `events.ts`: added `matchId: string` to `NassauHoleForfeited`.
2. `nassau.ts` `settleNassauHole`: removed `emittedForfeitForPlayers` Set; emit
   `NassauHoleForfeited` per active match with `matchId: match.id` inside the loop.
3. `nassau.test.ts`:
   - A-missing test: updated to `toHaveLength(2)` with matchId assertions for 'front'
     and 'overall' (back not active on h1).
   - B-missing test: same update.
   - Added allPairs forfeit describe block (4 it() blocks): A missing in 3-player game on h1.
     Asserts 4 NassauHoleForfeited events (front-A-B, overall-A-B, front-A-C, overall-A-C),
     zero NassauHoleForfeited for B-C pair, B-C pair resolves normally, match states correct.
4. `types.test.ts:95`: added `matchId: 'front'` to NassauHoleForfeited structural consumer.

## Result

- Files touched: `src/games/events.ts`, `src/games/nassau.ts`,
  `src/games/__tests__/nassau.test.ts`, `src/games/__tests__/types.test.ts`
- Tests: 171 passed, 0 failed. Net change from 167: +4 allPairs forfeit tests.
- `npx tsc --noEmit --strict` clean.
- Gate grep 1 (b.config === cfg): 0. Gate grep 2 (b.id === cfg.id): 4. Both pass.

## Open questions

- §9 line 147 allPairs forfeit emit-count is still ambiguous (rule says "propagate per-pair"
  but doesn't specify per-match vs per-pair vs per-player). Per-match was chosen by analogy
  with NassauWithdrawalSettled and ground rule 6 spirit. Documenter item D1 should clarify
  this in the rule file.
- Phase 4d (allPairs withdrawal) still awaiting user approval.

## Parking lot additions

- (none new)

## Edit 2026-04-22T17:30:00Z

User noted that items 1a/1b/1c were stated in this log as compressed assertions only, not full
artifacts. The full enumeration and arithmetic were only in chat. Capturing them here now.

### 1a — 9 MatchStates (allPairs, players A/B/C, initial state)

```
id           | startHole | endHole | pair  | holesWonA | holesWonB | parentId
-------------|-----------|---------|-------|-----------|-----------|--------
front-A-B    | 1         | 9       | [A,B] | 0         | 0         | null
back-A-B     | 10        | 18      | [A,B] | 0         | 0         | null
overall-A-B  | 1         | 18      | [A,B] | 0         | 0         | null
front-A-C    | 1         | 9       | [A,C] | 0         | 0         | null
back-A-C     | 10        | 18      | [A,C] | 0         | 0         | null
overall-A-C  | 1         | 18      | [A,C] | 0         | 0         | null
front-B-C    | 1         | 9       | [B,C] | 0         | 0         | null
back-B-C     | 10        | 18      | [B,C] | 0         | 0         | null
overall-B-C  | 1         | 18      | [B,C] | 0         | 0         | null
```
Count: 9 ✓. Generated by C(3,2)=3 pairs × 3 bases (front/back/overall).

### 1b — Test 5 Σ arithmetic (stake=100, h1-9: A=4,B=5,C=3; h10-18: A=3,B=4,C=5)

Pair (A,B): A<B every hole (4<5 front, 3<4 back). A wins all 18.
- front-A-B closeout: A 5 up after h5 (holesUp=5 > holesRemaining=4). MatchClosedOut: A+100, B−100.
- back-A-B closeout: A 5 up after h14 (holesUp=5 > holesRemaining=4). MatchClosedOut: A+100, B−100.
- overall-A-B closeout: A 10 up after h10 (holesUp=10 > holesRemaining=8). MatchClosedOut: A+100, B−100.
- Pair total: A+300, B−300. Per-pair Σ=0. ✓

Pair (A,C): C<A on front (3<4); A<C on back (3<5). 9 holes each, never trigger closeout:
- h9: C 9 up, 9 remaining (9 not > 9 → no closeout). Then A wins h10-18 to reach 0 up at h18.
- front-A-C closeout: C 5 up after h5 (5>4). MatchClosedOut: C+100, A−100.
- back-A-C closeout: A 5 up after h14 (5>4). MatchClosedOut: A+100, C−100.
- overall-A-C: tied at h18 (9-9). finalizeNassauRound → MatchTied (no points).
- Pair total: A: −100+100+0=0, C: +100−100+0=0. Per-pair Σ=0. ✓

Pair (B,C): C<B on front (3<5); B<C on back (4<5). Same symmetry as (A,C).
- front-B-C closeout: C 5 up after h5. MatchClosedOut: C+100, B−100.
- back-B-C closeout: B 5 up after h14. MatchClosedOut: B+100, C−100.
- overall-B-C: tied at h18 (9-9). MatchTied (no points).
- Pair total: B: −100+100+0=0, C: +100−100+0=0. Per-pair Σ=0. ✓

Global: A=+300, B=−300, C=0. Σ=0. ✓ All deltas integers. ✓

### 1c — Inside-loop forfeit rationale (why not a pre-loop helper)

`const [playerA, playerB] = match.pair` is already derived inside the per-match loop
for the `holeResult` call and gross lookups. The forfeit check uses those same two players.
Adjacent placement keeps all per-pair logic in one lexical scope. A pre-loop helper would
need `match.pair` as an argument, adding indirection without simplification. No behavioral
difference between the two placements — the inside-loop location is purely for cohesion.
