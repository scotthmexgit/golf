---
prompt_id: "014"
timestamp: "2026-04-22T19:10:00Z"
checklist_item_ref: "#6 — Match Play engine (phase breakdown + design question answers)"
tags: [match-play, phase-breakdown, documenter, rebuild-plan]
---

# 014 — Match Play phase breakdown

## Task

Documenter pass: draft the phase breakdown for #6 Match Play engine. Output goes into
`REBUILD_PLAN.md` as a new sub-section under the existing #6 AC entry. No engine code,
no rule-doc edits.

## Pre-work: evidence gathered

### Files read
- `REBUILD_PLAN.md` — #6 entry at lines 130–158. Phase breakdown appended below AC (not replacing it).
- `IMPLEMENTATION_CHECKLIST.md` — Nassau phase tracking confirmed to live in IMPLEMENTATION_CHECKLIST.md (Active item section). Match Play breakdown goes into REBUILD_PLAN.md since #6 is not yet the active item.
- `docs/games/game_match_play.md` — all 12 sections. All 10 gaps resolved at prompt 013. Authoritative input for phases.
- `2026-04-22/012_match-play-scoping-survey.md` — 8 open design questions confirmed.
- `src/games/types.ts` lines 69–81 — `MatchPlayCfg` quoted in evidence gate. Four-format union already correct.
- `src/types/index.ts` line 71 — `GameInstance.matchFormat?: 'individual' | 'teams'` (breaking change target).
- `src/games/events.ts` — Match Play events: `HoleResolved` (no matchId), `HoleHalved` (no matchId), `MatchClosedOut` (matchId: string), `MatchTied` (matchId: string), `MatchHalved` (matchId: string).
- `src/games/nassau.ts` — exported signatures for structural pattern reference.
- `docs/games/_ROUND_HANDICAP.md` — caller-applies confirmed; § 6 Match Play entry quoted.
- `src/store/roundStore.ts` line 155 — legacy `'individual'` default confirmed.
- `src/components/setup/GameInstanceCard.tsx` lines 69, 71 — legacy `'individual'`/`'teams'` literals confirmed.

### Key evidence quotes

`src/types/index.ts` line 71:
```ts
matchFormat?: 'individual' | 'teams'
```

`src/games/types.ts` lines 69–81: full `MatchPlayCfg` interface (four-format union already correct).

`src/games/events.ts`:
- Line 148: `HoleResolved` — **no matchId**
- Line 157: `MatchClosedOut` — **has `matchId: string`**
- Line 164: `MatchTied` — **has `matchId: string`**
- Line 169: `MatchHalved` — **has `matchId: string`**

## Design questions answered (all 8)

| Q | Answer |
|---|--------|
| Q1 | `{ events, match }` — caller threads MatchState; § 11 confirms stateful threading |
| Q2 | Singular MatchState — no presses (§ 7 explicit), no mid-round expansion |
| Q3 | No matchId on HoleResolved/HoleHalved; matchId already on MatchClosedOut/MatchHalved from events.ts; declaringBet uniquely identifies match |
| Q4 | Separate exported `finalizeMatchPlayRound` — extra-holes loop is caller-driven; independently testable |
| Q5 | Inline in settleMatchPlayHole — AC says "or equivalents"; no benefit to standalone export |
| Q6 | Caller-applies per _ROUND_HANDICAP.md § 3 and § 6; engine reads state.strokes[pid] |
| Q7 | In-scope Phase 4 — § 9 explicit; TeamSizeReduced event already in events.ts |
| Q8 | Junk engine (#7) responsibility — junkItems/junkMultiplier are config fields only; match_play.ts emits no JunkAwarded events |

No stop-and-report triggered. All 8 answers grounded in rule doc or events.ts.

## Phase structure

| Phase | Title | Key deliverable |
|-------|-------|-----------------|
| 1 | Type widening + MatchState + singles per-hole | matchFormat widened; settleMatchPlayHole (singles); § 10 worked example Test 1 |
| 2 | Team formats (best-ball, alt-shot, foursomes) | holeWinner for 4 formats; teamCourseHandicap; MatchConfigInvalid; delta splitting |
| 3 | End-of-round settlement + extra holes | finalizeMatchPlayRound; tieRule dispatch; cap-exhaustion sub-item |
| 4 | Round Handicap + edge cases | RoundHcp integration; concession-closeout ordering; TeamSizeReduced; partial miss |

4 phases total. Phase dependencies documented: each phase depends on the prior phase's signatures being stable.

## Files changed

- `REBUILD_PLAN.md` — phase breakdown added as new sub-section under #6 AC entry

## Key decisions recorded

- `MatchState` is a singular object (not array) — no presses, no expansion
- `settleMatchPlayHole` signature: `(hole, cfg, roundCfg, match) => { events, match }`
- `finalizeMatchPlayRound` signature: `(cfg, roundCfg, match, extraHoleStates?) => ScoringEvent[]`
- Cap-exhaustion is a named sub-item in Phase 3 (not buried in "end-of-round")
- Concession-closeout ordering and best-ball partial miss are Phase 4 (dedicated edge-cases phase)
- TeamSizeReduced emitted in Phase 4
- No press phase (§ 7 explicit)
- Legacy shim: `'individual'` → `'singles'`, `'teams'` → `'best-ball'` applied in Phase 1 consumer files
