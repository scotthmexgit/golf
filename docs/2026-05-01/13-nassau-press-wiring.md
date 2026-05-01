---
prompt_id: 13
timestamp: 2026-05-01
checklist_item_ref: "NA-3 — Press confirmation UI + scorecard decisions wiring + withdrawal detection"
tags: [na-3, engineering, nassau, press, decisions, withdrawal]
---

## Header
- **Date:** 2026-05-01
- **Number:** 13
- **Type:** prompt
- **Title slug:** nassau-press-wiring
- **Linked issues:** NA-3
- **Pipeline item:** NA-3 (today)

## Prompt (verbatim)

PROMPT 13 — NA-3: Press confirmation UI + scorecard decisions wiring + withdrawal detection

Objective: Land the user-facing press confirmation flow for Nassau, wire scorecard hole-save to persist Nassau presses and Wolf wolfPick decisions, fold bridge-level withdrawal detection into the same data-model touch, and add the F3 setPressConfirmation Zustand action.

## Scope boundaries
- **In scope:** `setPressConfirmation` + `setWithdrawn` Zustand actions; `withdrew` field in HoleData + holeDecisions.ts; bridge-level withdrawal via `hd.withdrew`; `nassauPressDetect.ts` for auto modes; `PressConfirmationModal` component; scorecard PUT wiring for decisions blob (presses + wolfPick); tests
- **Out of scope:** manual-mode press UI button (NA-4), Playwright E2E (deferred per checklist), withdrawal UI surface, Wolf wolfPick modal changes
- **Deferred:** Manual press request UI (NA-4); withdrawal UI (future phase); `setPress` full removal (0 external call sites, left with `@deprecated`)

## 1. Explore

- Files read: `src/components/scorecard/WolfDeclare.tsx`, `src/app/scorecard/[roundId]/page.tsx`, `src/store/roundStore.ts`, `src/lib/holeDecisions.ts`, `src/bridge/nassau_bridge.ts`, `src/games/nassau.ts`, `src/types/index.ts`, `src/bridge/shared.ts`
- `setPress` (roundStore.ts:349) has **zero** external call sites — stores game UUIDs (semantically wrong); marked `@deprecated` pointing to new `setPressConfirmation`
- Scorecard PUT at `page.tsx:156-159` only sends `{ scores: scorePayload }` — trivial to extend with decisions blob
- `PressOffered`/`PressVoided` emitted by `nassau.ts`; bridge calls `openPress` only for confirmed `hd.presses` entries
- `withdrew` field absent from HoleData and holeDecisions; `KNOWN_DECISION_KEYS` missing 'withdrew'
- `settleNassauWithdrawal` in `nassau.ts` already implemented — bridge only needed plumbing
- Auto-mode vs manual distinction clear: `offerPress` is exact-threshold for auto; manual requires explicit caller opt-in

## 2. Plan

- **Approach:** Add `withdrew` to the data model bottom-up (types → holeDecisions → bridge), add `nassauPressDetect.ts` as auto-mode detection helper, add `PressConfirmationModal` as a queuing UI, refactor `handleSaveNext` into a two-phase `handleSaveNext` (detect) + `proceedSave` (PUT + navigate)
- **Files to change:** `src/types/index.ts`, `src/lib/holeDecisions.ts`, `src/bridge/nassau_bridge.ts`, `src/store/roundStore.ts`, `src/app/scorecard/[roundId]/page.tsx`
- **Files to create:** `src/lib/nassauPressDetect.ts`, `src/components/scorecard/PressConfirmationModal.tsx`, `src/lib/nassauPressDetect.test.ts`
- **Risks:** Stale closure in `proceedSave` (holeData before press confirmation lands in store) — mitigated by reading `useRoundStore.getState().holes` directly inside proceedSave
- **Approval gate:** auto-proceed (no schema change, no new dependency, no deletion of old code)

## 3. Develop

### UX decision: proceedSave reads store directly
`handleSaveNext` stops when press offers exist, showing the modal. The modal calls `setPressConfirmation` (sync Zustand update) then fires `onComplete`. `proceedSave` cannot rely on the React closure's `holeData` (pre-confirmation state) — reads `useRoundStore.getState().holes` directly to get the post-confirmation presses.

### UX decision: auto-mode only detection
`detectNassauPressOffers` returns `[]` for `pressRule === 'manual'` or `undefined`. Manual presses require a UI button (NA-4); auto modes (auto-2-down, auto-1-down) fire after each hole based on exact threshold per engine `offerPress`.

### Files changed

**`src/types/index.ts`** — `withdrew?: string[]` added to `HoleData` alongside `presses`.

**`src/lib/holeDecisions.ts`** — 'withdrew' added to `KNOWN_DECISION_KEYS`; `buildHoleDecisions` includes it when nassau active + non-empty; `validateHoleDecisions` gates it on nassau type, validates `string[]`; `hydrateHoleDecisions` maps it back.

**`src/bridge/nassau_bridge.ts`** — imports `settleNassauWithdrawal`; in the hole loop, after press processing, iterates `hd.withdrew` calling `settleNassauWithdrawal` for each player in the Nassau bet. Non-participants silently skipped.

**`src/store/roundStore.ts`** — `setPressConfirmation(hole, matchId)` adds matchId to `hd.presses` (correct MatchState ID semantics vs. old `setPress` which stored game UUIDs); `setWithdrawn(hole, playerIds)` sets `hd.withdrew`; `@deprecated` added to `setPress`; `hydrateRound` merges `withdrew` from persistedDecisions.

**`src/lib/nassauPressDetect.ts`** (new) — `detectNassauPressOffers(currentHole, holes, players, game)` threads MatchState through scored holes (applying prior presses), calls `offerPress` on each open match after current hole. Returns `PressOffer[]` with matchId, downPlayer, pair.

**`src/components/scorecard/PressConfirmationModal.tsx`** (new) — Queuing modal (internal `idx` state). Shows one offer at a time. Accept → `setPressConfirmation(hole, matchId)` + advance. Decline → advance. After all offers resolved → `onComplete()`.

**`src/app/scorecard/[roundId]/page.tsx`** — Imports `PressConfirmationModal`, `detectNassauPressOffers`, `buildHoleDecisions`, `GameType`. `handleSaveNext` split into detect phase (→ modal state) and `proceedSave` (PUT with decisions blob + navigate). Scorecard PUT now includes `decisions` field when non-null (wolfPick, presses, withdrew, dots, etc). `pendingPressOffers` state tracks modal queue.

**`src/lib/holeDecisions.test.ts`** — 9 new tests: withdrew build/validate/hydrate coverage.

**`src/lib/nassauPressDetect.test.ts`** (new) — 9 tests: manual returns [], auto-2-down threshold, auto-1-down threshold, allPairs pair-suffixed matchIds, prior presses respected.

**`src/store/roundStore.nassau.test.ts`** — 8 new tests: `setPressConfirmation` (append, no-side-effect), `setWithdrawn` (set, replace, multi-player).

**`src/bridge/nassau_bridge.test.ts`** — T5b (2 tests): bridge-level withdrawal via `hd.withdrew` emits `NassauWithdrawalSettled`; non-participant player silently skipped.

**Tests: 597/597 pass (from 570; +27 new tests). tsc clean.**

## Reviewer Agent Output

**First pass: CHANGES REQUESTED (4 findings)**
1. [MAJOR] Multi-game Nassau press offers: loop bailed on first game; others silently dropped → fixed with `flatMap`
2. [MAJOR] `nassauPressDetect.ts` didn't apply withdrawals in MatchState replay → fixed by adding `settleNassauWithdrawal` in prior-holes loop
3. [MINOR] T5b missing test: withdrawal after confirmed press → added
4. [MINOR] Raw `matchId` shown in modal (internal engine ID, not user-facing) → replaced with `matchLabel()` helper + player pair names

**All four fixed.**

**Second pass: APPROVED.** No findings.

## Codex Adversarial Review Output

_Deferred — Codex probe not run this session (stale broker state; fix is restart). Review can run as `/codex:review` at next session start._

---

## 4. Outcome

- **Status:** complete
- **Summary:** Nassau press confirmation modal live for auto modes; scorecard PUT now persists full decisions blob (wolfPick, presses, withdrew, dots); bridge-level withdrawal detection wired; `setPressConfirmation`/`setWithdrawn` actions added; 598/598 tests pass, tsc clean.
- **For GM:** Codex review deferred to next session start. Ready for NA-4 (manual press UI + final E2E).
- **For Cowork to verify:** Press modal appears after "Save & Next Hole" when playing a Nassau with auto-2-down or auto-1-down rule and a player reaches the threshold. Decline should skip the press (no presses in DB). Accept should confirm it (presses array persisted to HoleDecision).
- **Follow-ups created:** NA-4 (manual press UI button); withdrawal UI surface (future phase)

## Open items

- **Manual press UI:** `pressRule='manual'` has no "Request Press" button yet — deferred to NA-4.
- **Withdrawal UI:** No surface for setting `withdrew` from the scorecard — deferred.
- **Codex review:** Not run this session; recommend as NA-4 pre-work.
