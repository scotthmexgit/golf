---
prompt_id: 015
timestamp: 2026-04-21T03:14:39Z
checklist_item_ref: "#5 — Nassau engine, Phase 2 Turn 1 of 2"
tags: [engineer, nassau, phase-2, press-handling]
---

## Prompt

Approve Phase 2 start; 2 turns pre-approved. Re-state Phase 2 scope verbatim (re-focus protocol). Apply distinguishing-input test technique to press-scope and auto-threshold tests — pick inputs where the two modes produce observably different outcomes; tautological tests don't count. Phase 2 fence: press handling only (offerPress, PressOffered/PressOpened, composition, scope-window, last-hole-voiding). finalizeNassauRound stubbed; allPairs gated; Phase 3/4 concerns parked.

## Action

Re-stated Phase 2 scope + verification checkpoints verbatim in response. Called out explicit Turn-1 / Turn-2 split: Turn 1 core infrastructure + primitive tests; Turn 2 Worked Example integration + § 12 Test 2 + multi-press scenarios.

**Design choice flagged in narrative** (per prompt 012's "flag if design choice surfaces" clause): landed on three separate pure functions — `offerPress`, `openPress`, `settleNassauHole` (unchanged) — rather than extending `settleNassauHole` with an optional `pressConfirmations?` parameter. Rationale: keeps Phase 1's settle signature byte-identical; matches rule file § 5 division of concerns; caller composes the three explicitly until `aggregate.ts` (audit #10) orchestrates.

**Edits to `src/games/nassau.ts`** (adding ~110 lines of press infrastructure):
- Exported `PressConfirmation` interface — `{ hole, parentMatchId, openingPlayer }` captures UI-confirmation input.
- Exported `offerPress(hole, parent, cfg, downPlayer)` → `ScoringEvent[]`. Threshold filter:
  - `lead = 0`: returns `[]` (no down player).
  - `auto-2-down` and `lead !== 2`: returns `[]`.
  - `auto-1-down` and `lead !== 1`: returns `[]`.
  - `manual`: accepts any non-zero `lead`.
  - Hole outside parent window: returns `[]`.
  - Otherwise emits `PressOffered` event.
- Exported `openPress(confirmation, cfg, roundCfg, matches)` → `{ events, matches }`. Behavior:
  - Validates config + finds bet id via string-id lookup (from #4).
  - Finds parent match by `confirmation.parentMatchId`; throws `NassauConfigError` if unknown.
  - Computes `startHole = confirmation.hole + 1`; `endHole = parent.endHole` under `'match'` scope, else `endOfCurrent9Leg(confirmation.hole, parent.endHole)`.
  - Assigns `press-<n>` id based on existing press count.
  - Always emits `PressOpened`. If `startHole > endHole` (empty window per § 9), also emits `PressVoided` with `reason: 'zero-holes-to-play'` and does NOT add the press MatchState. Otherwise appends new MatchState to matches array.
- Private helper `endOfCurrent9Leg(hole, parentEndHole)` = `min(hole ≤ 9 ? 9 : 18, parentEndHole)` — respects parent's endHole ceiling.

**Edits to `src/games/__tests__/nassau.test.ts`** (adding 13 tests across 4 describes):
- `offerPress threshold semantics` (5 tests): distinguishing `auto-2-down` vs `manual` at `downBy=1` (auto rejects, manual accepts); distinguishing `auto-1-down` vs `manual` at `downBy=2`; `auto-2-down` exactly at `downBy=2` (accepts); all rules `[]` at `downBy=0`; `[]` when hole outside parent window.
- `openPress scope-window enforcement` (3 tests): **canonical distinguishing test** — overall-match press at hole 5 with `'nine'` gives `endHole=9` vs `'match'` gives `endHole=18` (observably different); front-9 agreement case (both give `endHole=9` — documented non-distinguishing); back-9 `'match'` scope runs to hole 18.
- `openPress last-hole voiding` (3 tests): hole-9 front-9 press → `PressOpened` + `PressVoided`, no MatchState; **distinguishing** hole-8 front-9 press → valid 1-hole window (no `PressVoided`); hole-18 back-9 press → `PressVoided`.
- `press composition` (2 tests): press-of-press (press-2 spawns from press-1 with `parentId='press-1'`); invalid `parentMatchId` throws `NassauConfigError`.

## Result

- Files touched:
  - `src/games/nassau.ts` — 110 new lines for press infrastructure. Phase 1's `settleNassauHole` signature unchanged.
  - `src/games/__tests__/nassau.test.ts` — 13 new tests across 4 describes; import list gained `offerPress`, `openPress`, `PressConfirmation`.
  - `2026-04-20/015_nassau-phase-2-turn-1.md` — this log.
  - `EOD_20-April-2026.md` — pending append.
- Verification:
  - `npx tsc --noEmit --strict` → zero errors. ✓
  - `npm run test:run` → **120 pass** (107 baseline + 13 new Nassau press tests). ✓
  - Portability grep on `src/games/` → empty. ✓
  - `sha256sum src/lib/payouts.ts` → `52a389607248ffda72f4a3f21561300fe05dedac2d938b38e5cb60a27dfd215c` unchanged. ✓
- Worked: every distinguishing-input test passes — pair-mode comparisons prove the mode rather than tautologically confirming it.
- Did not work / blocked: none.

## Turn-1 → Turn-2 handoff

Turn 2 scope (not started this turn — user can interrupt if scope change needed):
- Extend the Worked Example test to cover back-9 hole 11 (B auto-2-down trigger) → hole 12 (press opens, Bob confirms) → hole 18 (press match ends).
- Implement § 12 Test 2 (manual press refused — Bob declines at 2-down in back-9): verify zero `PressOpened` events across the full round under `pressRule: 'manual'` when driver simulates no-confirm.
- Add test covering full round state across front, back, overall, and a back-9 press: assert MatchState topology post-settlement (matches final Worked Example table).
- Expected additional test count: +5–7 → total ~125–127.

Turn 2 will re-state Phase 2 scope again (re-focus protocol) before code — same pattern as Phase 1's re-focus.

## Fence observations (parked, not folded forward)

Consistent with prompt 015's fence:
- Settlement math (stake ±, MatchTied emission) → Phase 3.
- Closeout detection → Phase 3.
- `NassauHoleForfeited` missing-score path → Phase 4.
- `NassauWithdrawalSettled` mid-round withdrawal path → Phase 4.
- `allPairs` support → Phase 4.
- Round Handicap integration test → Phase 4.

No signature changes to `settleNassauHole` this turn. `openPress` and `offerPress` are additive new exports; they don't touch the per-hole score flow.

## Open questions

- Continue to Phase 2 Turn 2 (pre-approved), or review Turn 1 first?

## Parking lot additions

(none — Turn 1 scope was clean; fence observations above are all already in later phases)
