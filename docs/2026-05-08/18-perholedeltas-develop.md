---
prompt_id: "18"
timestamp: 2026-05-08T00:00:00Z
checklist_item_ref: "Phase 7 #11 — perHoleDeltas.ts cutover"
tags: [develop, phase-7, perHoleDeltas, closure]
status: CLOSED
---

# perHoleDeltas.ts — Develop Report (Steps 5–7)

**Verification mode:** Codex-verified  
**Reviewer:** APPROVED  
**Codex pre-review (plan):** needs-attention — 1 high finding (SOD plan entry 1 directed invalid aggregateRound migration; addressed in revised Plan doc 17)  
**Codex post-review (final):** needs-attention → addressed — 1 high finding (test key-set exhaustiveness; autonomous fix applied)

---

## Step 5 — Develop

### Files changed

| File | Change |
|---|---|
| `src/lib/perHoleDeltas.ts` | Header comment lines 14-17: removed stale "Parked games (wolf, nassau, matchPlay, etc.)" note. Added accurate per-game description: Skins/Wolf produce per-hole events; Nassau produces MatchClosedOut at settlement holes; matchPlay stays default (disabled). |
| `src/components/scorecard/BetDetailsSheet.tsx` | JSDoc lines 20-23: removed stale "Nassau and Match Play will appear when their perHoleDeltas.ts cases land." Updated to reflect Nassau IS wired (— on in-progress holes, $ on settlement holes). Match Play remains unparked. |
| `src/lib/perHoleDeltas.test.ts` | Added NHC1-NHC6 Nassau per-hole delta test cases (6 new tests). Added `makeNassauGame()` fixture factory and `sumPlayerDeltas()` zero-sum helper. |

### No functional code changes

`computePerHoleDeltas` itself was NOT modified. All four active bet types were already correctly dispatched. The function was functionally complete; only test coverage and comment accuracy were missing.

### Architectural recharacterization (key finding from Explore)

The "aggregateRound cutover" framing from prior EODs was WRONG for perHoleDeltas.ts:
- `aggregateRound` returns `RunningLedger = { netByPlayer, byBet, lastRecomputeTs }` — no per-hole events
- `computePerHoleDeltas` needs raw per-hole monetary events (`event.hole != null && 'points' in event`)
- These are structurally incompatible: cannot replace the event-filter approach with `aggregateRound`

Correct architecture:
- Nassau's `NassauHoleResolved` has no `points` field → filtered out (correct; in-progress holes show `—`)
- `MatchClosedOut` events (from `finalizeNassauRound` inside `settleNassauBet`) have `hole: match.endHole` AND `points` → land in per-hole map at settlement holes (correct; matches Cowork spec)

### BetDetailsSheet.tsx verification

Before editing the stale comment, verified the actual component behavior:
- `BetDetailsSheet` calls `computePerHoleDeltas` and renders `formatMoneyDecimal(totals[hd.number]?.[p.id] ?? 0)`
- Nassau settlement holes (MatchClosedOut fires) → `totals[N]` has money → `$N.00` renders ✓
- Nassau in-progress holes (NassauHoleResolved, no points, filtered) → `totals[N]` undefined → `0` fallback → `formatMoneyDecimal(0)` → `—` renders ✓
- Behavior matches cowork-claude.md spec exactly. No UI gap behind the stale comment.
- Comment updated (clarification #2 condition satisfied: "displays correctly → update the comment").

### NHC test plan (executed)

| ID | Scenario | Asserts |
|---|---|---|
| NHC1 | Front-9 decisive (A 5-4) → MatchClosedOut hole 9 | totals[9]: +100/-100; totals[18]: overall; exact key set ['18','9']; zero-sum |
| NHC2 | Front-9 all tied → MatchTied hole 9 | totals/byGame both empty; length=0 |
| NHC3 | Early closeout (A 5-0 after hole 5) → MatchClosedOut hole 5 | totals[5]: +100/-100; holes 1-4 undefined; totals[18]: overall; exact key set ['18','5']; zero-sum |
| NHC4 | Nassau + Skins multi-bet → hole 9 combined | totals[9]: 300/-200/-100; byGame separates; exact key set; named zero-sum (GR3) |
| NHC5 | GR8: UUID-style game.id | byGame[9]['uuid-abc-123-456'] exists; 'nassau-1' absent; exact key set ['18','9'] |
| NHC6 | allPairs 3-player early closeout | totals[5]: 200/0/-200; totals[18]: overall 3-pair; exact key set ['18','5']; named zero-sum |

### Codex post-review finding (addressed autonomously)

**Finding:** Tests did not assert the complete set of emitted delta hole keys. Nassau's overall match also produces `MatchClosedOut` at `hole: 18` (via `finalizeNassauRound`) for partial-round fixtures. Tests could pass while missing unexpected extra-hole phantom entries.

**Fix (autonomous — all 5 rules met):**
- Added `Object.keys(totals).sort()` exact key assertions to NHC1, NHC3, NHC4, NHC5, NHC6
- Added `totals[18]` assertions documenting and verifying the overall-match settlement
- Rule satisfaction: in scope (test file only), no dependency/schema/API change, unambiguous recommendation, small (key assertion per test), high confidence

---

## Step 6 — Codex review summary

| Phase | Verdict | Session ID | Findings |
|---|---|---|---|
| Pre-review (plan) | needs-attention → addressed | 019e07ca-5379-73e3-bd03-85511d711186 | 1 high: SOD plan entry directed invalid migration. Plan revised in doc 17. |
| Post-review (final) | needs-attention → addressed | 019e07e3-a6de-7d50-b2e2-d3fd79e620ff | 1 high: test key exhaustiveness. Autonomous fix applied (5-rule gate passed). |

**Autonomous fixes applied:** 1 — added `Object.keys(totals).sort()` and hole-18 assertions to NHC1/NHC3/NHC4/NHC5/NHC6. Why all 5 rules passed: in-scope (test file); no dep/schema/API change; unambiguous (Codex's recommendation was "assert exact key sets"); single assertion pattern per test; high confidence (I verified the expected key sets independently via engine trace).

**Reviewer sub-agent verdict:** APPROVED — no findings.

---

## Verification

| Check | Result |
|---|---|
| `npm run test:run` | 23 files, 772 tests — all pass (+6 new NHC tests) |
| `npx tsc --noEmit` | Clean |
| Codex pre-review | needs-attention → plan revised (doc 17) |
| Codex post-review | needs-attention → key-set assertions added |
| Reviewer sub-agent | APPROVED |

---

## Phase 7 #11 closure declaration

**Phase 7 #11 — Full multi-bet cutover — CODE WORK COMPLETE.**

All Phase 7 #11 engineering milestones satisfied:

| Milestone | Status | Commit |
|---|---|---|
| Wolf aggregateRound cutover (payouts.ts) | CLOSED 2026-05-07 | 5a88052 |
| Skins aggregateRound cutover (payouts.ts) | CLOSED 2026-05-08 | effb63d |
| Nassau aggregateRound cutover (payouts.ts) | CLOSED 2026-05-08 | b528b52 |
| Stroke Play aggregateRound cutover (payouts.ts) | CLOSED 2026-05-08 | 3a09d79 |
| perHoleDeltas.ts cutover (test coverage + comment cleanup) | **CLOSED 2026-05-08** | **32d91c0** |

`IMPLEMENTATION_CHECKLIST.md` header update needed: change "Active item: perHoleDeltas.ts cutover" to "Phase 7 #11 code work COMPLETE 2026-05-08."

**Remaining Phase 7 gates (not code work):**
- WF7-4 formal closure: re-run Cowork session confirming zero blocking findings
- NA-5 formal closure: same
- Phase 7 #11 closure declaration commit (small doc update)

---

## Commit

SHA: `32d91c0`  
Message: `Phase 7 #11: perHoleDeltas.ts closure — NHC1-NHC6 Nassau tests + comment cleanup`

---

## For Cowork

No UI changes. No verification needed from Cowork for this prompt.
