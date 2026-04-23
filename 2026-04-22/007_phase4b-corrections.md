---
prompt_id: 007
timestamp: 2026-04-22T09:35:00Z
checklist_item_ref: "#5 — Nassau engine, Phase 4b corrections"
tags: [nassau, tests, phase4b, withdrawal, forfeit, events]
---

## Prompt
Four corrections to Phase 4b before 4c is approved:
1a. Both-missing throw comment is misleading — §9 doesn't support the throw; fix to "caller
    contract violation, not covered by rule."
1b. Combined withdrawal event was a design regression — revise to per-match events with matchId.
    Extend fence to events.ts (matchId addition) and types.test.ts:96 (one literal field).
2. Two new forfeit tests: B-missing symmetric (proves grossB===undefined branch); forfeit on
   match's final hole (proves NassauHoleForfeited + MatchClosedOut co-emit).

## Action

1. Re-ran NassauWithdrawalSettled grep against full src/**/*.ts. Confirmed five sites:
   events.ts (def + union), nassau.ts, nassau.test.ts, types.test.ts:30 (kind-only switch,
   not structural), types.test.ts:96 (structural literal — requires matchId addition).
2. Read NassauHoleResolved in events.ts — matchId: string at line 112. Adding matchId to
   NassauWithdrawalSettled is pattern-consistent; no other event types need changing.
3. Edited events.ts: added `matchId: string` to NassauWithdrawalSettled (after hole: number).
4. Edited nassau.ts:
   - Forfeit branch comment: "Both-missing is ambiguous per § 9 and throws" → "§ 9 covers one
     missing player only. Both-missing not addressed by rule; engine treats as caller contract
     violation."
   - Withdrawal section comment: "Combined delta in one event" → "Emits one
     NassauWithdrawalSettled per open non-tied match."
   - settleNassauWithdrawal: replaced combined-points accumulator with per-match loop that
     pushes one event per open non-tied match, each with matchId and per-match points.
5. Edited types.test.ts:96: added `matchId: 'back'` to the structural literal.
6. Edited nassau.test.ts:
   - Revised Test 6 test 1: asserts two events (back + overall), each {A:+1,B:-1}, with matchId.
   - Revised Test 6 test 2: per-event zero-sum + cross-event Σ(A)=+2, Σ(B)=-2.
   - Added 'B-missing, symmetric' describe block (3 tests, mirrors A-missing).
   - Added 'forfeit on match final hole' describe block (3 tests, co-emit coverage).

## Result

- Files touched: `src/games/events.ts`, `src/games/nassau.ts`,
  `src/games/__tests__/nassau.test.ts`, `src/games/__tests__/types.test.ts`
- Tests: 162 passed, 0 failed (was 156; +6 new tests, 2 revised). All 8 test files pass.
- `npx tsc --noEmit --strict` clean (no output).

## Σ delta verification (per-match, Test 6)

Pre-withdrawal: front closed, back A 3-0 open, overall A 7-3 open. B withdraws; opposing=A.
- back: not tied → event {A:+1, B:-1}, Σ=0
- overall: not tied → event {A:+1, B:-1}, Σ=0
- Cross-event: Σ(A)=+2, Σ(B)=-2, total=0. Same arithmetic, now asserted per event.

## Open questions
- None. Phase 4b corrections complete.

## Parking lot additions
- (none)
