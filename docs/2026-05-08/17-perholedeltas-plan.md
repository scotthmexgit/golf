---
prompt_id: "17"
timestamp: 2026-05-08T00:00:00Z
checklist_item_ref: "Phase 7 #11 — perHoleDeltas.ts cutover"
tags: [plan, phase-7, perHoleDeltas]
status: STOP_FOR_GM — awaiting approval before Develop
---

# perHoleDeltas.ts — Plan (Step 2, revised after Codex plan-review)

## Codex plan-review result

**Verdict: needs-attention — 1 high finding**
**Session ID:** 019e07ca-5379-73e3-bd03-85511d711186

| Finding | Priority | Disposition |
|---|---|---|
| SOD Plan entry 1 success criteria would force an invalid aggregateRound migration; `aggregateRound` returns `RunningLedger` only, so per-hole event data cannot come from it. Following the SOD as written would cause a regression. | High | Addressed: plan revised below. No aggregateRound migration. Success criteria updated to test coverage + comment cleanup. |

---

## Revised plan

### What the explore found

`computePerHoleDeltas` is already FUNCTIONALLY COMPLETE:
- All four active bet types dispatched: `strokePlay`, `skins`, `wolf`, `nassau`
- Nassau per-hole behavior is correct and intentional: `NassauHoleResolved` (no `points`) → filtered; `MatchClosedOut` (has `hole: match.endHole` + `points`) → lands in the per-hole map at settlement holes
- `aggregateRound` returns `RunningLedger = { netByPlayer, byBet, lastRecomputeTs }` — no events, no per-hole attribution → structurally incompatible with `computePerHoleDeltas`'s event-filter approach
- Two stale comments exist; zero Nassau test coverage exists

### Revised scope

| Item | Type | Size |
|---|---|---|
| Update header comment in `perHoleDeltas.ts` (lines 16-17) | Comment fix | XS |
| Update stale comment in `BetDetailsSheet.tsx` (line 21) | Comment fix | XS |
| Add NHC1-NHC6 Nassau per-hole tests to `perHoleDeltas.test.ts` | Tests | S |

### Files to change

| File | Change |
|---|---|
| `src/lib/perHoleDeltas.ts` | Lines 16-17: remove nassau/wolf from "parked games" comment; note only matchPlay stays in default |
| `src/components/scorecard/BetDetailsSheet.tsx` | Line 21: update "Nassau and Match Play will appear when their perHoleDeltas.ts dispatch is wired" → Nassau IS wired |
| `src/lib/perHoleDeltas.test.ts` | Add NHC1-NHC6 Nassau per-hole delta test cases |

### Files NOT changed

- `src/lib/perHoleDeltas.ts` — no functional code changes (all dispatch already correct)
- `src/games/aggregate.ts` — no changes
- `src/bridge/nassau_bridge.ts` — no changes
- All other files

### NHC test plan (6 cases)

| ID | Scenario | What to assert |
|---|---|---|
| NHC1 | 2-player front-9 Nassau, A wins decisively → MatchClosedOut on hole 9 | `totals[9]['A'] = +stake`, `totals[9]['B'] = -stake`; `byGame[9][game.id]` has entry; zero-sum |
| NHC2 | 2-player front-9 Nassau, match ties at hole 9 → MatchTied emitted (no points) | `totals[9]` is undefined; `byGame[9]` is undefined |
| NHC3 | 2-player Nassau, early closeout (A wins first 5 of 9 holes, +4) → MatchClosedOut on early hole | per-hole entry at closeout hole; no entry for holes after closeout |
| NHC4 | Nassau + Skins multi-bet, settlement hole same as skin win | `totals[9]` has sum of both games; `byGame[9][nassauId]` separates from `byGame[9][skinsId]`; zero-sum |
| NHC5 | GR8: non-default UUID-style game.id | `byGame[9]['uuid-style-game-id-123']` is populated correctly |
| NHC6 | 3-player allPairs Nassau → 3 MatchClosedOut events, all summed in totals | Per-player totals are zero-sum; `byGame[9][game.id]` has all three players |

### No approval gate triggered

- No new dependency
- No schema change
- No public API change
- No refactor across 3+ files (2 comment edits + 1 test file)
- No deletion of code older than 30 days

Verification mode: **Codex-verified** (Codex plan-review addressed; clean post-review sufficient for auto-close)

---

## SOD Plan entry 1 correction

The SOD's Plan entry 1 (`docs/2026-05-08/sod-2.md` lines 117-131) contained these now-incorrect items:
- ✗ "Migrate perHoleDeltas.ts case logic" → removed; no migration needed
- ✗ "perHoleDeltas.ts dispatch routes through aggregateRound" → not applicable
- ✗ "Grep gate passes (no remaining direct bridge dispatch)" → no grep gate; direct bridge dispatch is CORRECT here

These are superseded by this plan. The explore report (doc 16) and Codex finding both confirm the revised scope.

---

**STOP — awaiting GM approval before Develop.**
