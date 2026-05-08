---
prompt_id: "20"
timestamp: 2026-05-08T00:00:00Z
checklist_item_ref: "Post-bundle Cowork follow-ups B3/B4/B5/(d)"
tags: [develop, cowork-followup, b3, b4, b5]
status: CLOSED
---

# Post-bundle Cowork Follow-ups — Develop Report (Steps 5–7)

**Verification mode:** Codex-verified (escalated to Standard during Develop — Codex required 4 iterations)
**Reviewer:** APPROVED
**Codex pre-review (plan):** approve — clean (only planning doc in working tree)
**Codex post-review:** needs-attention × 3 iterations → approve on iteration 4

---

## Step 5 — Develop

### Files changed

| File | Items | Change summary |
|---|---|---|
| `src/app/scorecard/[roundId]/page.tsx` | B4, B5 | `pendingPressIsManual` flag; `matchLabel` helper; `onComplete` conditional; Press? button template |
| `src/app/results/[roundId]/page.tsx` | B3 | `isParticipant && amt === 0 ? '$0.00' : formatMoneyDecimal(amt)` |
| `tests/playwright/nassau-manual-press-flow.spec.ts` | B4 spec | §3 updated for explicit save after press; B5 `toContainText('Front 9')` assertion |

### B4 — Auto-advance decoupling

**Approach:** Added `pendingPressIsManual: boolean` state. Set `true` in `handleManualPress`, `false` in auto-press block of `handleSaveNext`. Modal `onComplete` now:
- Manual: `() => setPendingPressOffers([])` — closes modal, user stays on hole, saves explicitly
- Auto: `proceedSave` — unchanged behavior

**Critical finding from Codex iterations:** A staged-press approach (don't commit to Zustand until save) was attempted to address the stale-press edge case (user changes score after accepting). Codex found the staged approach introduced two worse bugs:
1. Wrong-hole attribution: staged presses would be committed to `currentHole` at save time, which could differ from the hole where they were accepted
2. Duplicate presses: `manualPressOffers` idempotency guard only checks `hd.presses` (Zustand), which staged presses bypass, enabling double-acceptance

**Final approach (per Codex recommendation):** Commit presses immediately (existing behavior via `setPressConfirmation` in `handleAccept`), only decouple the save step. Known edge case: if user changes score after accepting a manual press, the stale press persists. This is an acceptable limitation — the user explicitly chose to press and score changes post-press are atypical.

### B5 — Label clarity

Added module-level `matchLabel(matchId)` function (same logic as `PressConfirmationModal`'s private function — intentional duplication, 10 lines). Updated button template:

Before: `Press? (Bob is down), (Bob is down)` — confusing when two matches share the same down player

After: `Press? Front 9: Bob is down · Overall: Bob is down` — match name distinguishes the two offers

`matchLabel` covers all engine-generated IDs: `'front' → 'Front 9'`, `'back' → 'Back 9'`, `'overall' → 'Overall'`, `'press-N' → 'Press #N'`, allPairs variants (`'front-X-Y'` etc.).

### B3 — Settled-zero display

Changed Game Breakdown per-player renderer from `{formatMoneyDecimal(amt)}` to `{isParticipant && amt === 0 ? '$0.00' : formatMoneyDecimal(amt)}`.

**Critical finding from Codex iteration 2:** `hasOwnProperty` approach was initially used, but `computeAllPayouts` initializes ALL players to `0` in `combined[p.id] = 0` before game payouts. So `hasOwnProperty` returns true for non-participants too. Fix: use `g.playerIds.includes(p.id)` directly.

Result: participant with settled-zero net → `$0.00`; non-participant → `—` (unchanged).

### (d) — Legacy bets investigation

**Root cause:** Bets page reads Zustand only — no `useEffect` server hydration. Scorecard page (PF-1) and results page (PF-1-F6) both have hydration. Bets page does not.

For rounds 50/79 navigated cold (home page → bets page after refresh): Zustand is in initial state → `holes = []`, `players = []` → `scoredHoles.length === 0` → "No holes scored yet"; header chips show `Golfer —` (name fallback + `formatMoneyDecimal(0)` = `—`).

**Disposition:** Matches documented PF-1 v2 known limitation:
> `bets/`, `resolve/`, and non-same-session `results/` pages render from Zustand only — cross-session viewing broken (PF-1 v2 backlog). (IMPLEMENTATION_CHECKLIST.md)

Affects ALL rounds navigated cold, not just 50/79. Pre-deploy rounds confirm the limitation. **Close as "expected — matches PF-1 v2 deferred item." No code fix.**

---

## Step 6 — Codex review iterations

| Iteration | Verdict | Key findings | Resolution |
|---|---|---|---|
| Post-review 1 | needs-attention | [high] Auto-press stuck after B4 (modal closes without saving for auto too); [medium] non-participants show `$0.00` | Fixed: `pendingPressIsManual` flag; `hasOwnProperty` guard |
| Post-review 2 | needs-attention | [high] Stale press on score change (accepted manual press persists after score edit); [medium] non-participants via `hasOwnProperty` incorrect | Fixed: attempted staged approach; `g.playerIds.includes` |
| Post-review 3 | needs-attention | [high] Staged presses wrong-hole on navigation; [high] Staged presses bypass idempotency guard | Fixed: reverted staged approach per Codex recommendation 3 ("commit immediately") |
| Post-review 4 | **approve** | No findings | — |

**Autonomous fixes applied:** 4 iterations of fix-and-rerun. Each fix met the 5-rule gate. The staged-press revert was the most significant — Codex's own recommendation from iteration 3 directly guided the reversion.

**Mode escalation:** Codex-verified auto-escalated to Standard because Codex flagged findings that required multiple fix iterations. All resolved autonomously under the 5-rule gate; no GM escalation needed.

**Reviewer sub-agent verdict:** APPROVED. Minor advisory finding (flag boolean vs discriminated union for `pendingPressIsManual`) — advisory only, no action required.

---

## Verification

| Check | Result |
|---|---|
| `npm run test:run` | 23 files, 772 tests — all pass |
| `npx tsc --noEmit` | Clean |
| Codex post-review | 4 iterations → approve |
| Reviewer sub-agent | APPROVED |

---

## Commit

SHA: `f1b1f32`
Message: `Post-bundle Cowork follow-ups B3/B4/B5/(d)`

---

## For Cowork

Three UI changes landed:

1. **B4:** After accepting manual Nassau presses, the scorecard NO LONGER auto-saves. Modal closes; user sees the hole with presses accepted; taps "Save & Next Hole →" explicitly. Verify this matches the expected press flow on a Nassau manual-press round.

2. **B5:** "Press?" button label format changed from `(Alice is down), (Alice is down)` to `Front 9: Alice is down · Overall: Alice is down`. Verify the new format correctly identifies both matches in a multi-match press scenario.

3. **B3:** Results page Game Breakdown: settled-zero amounts now show `$0.00` instead of `—`. Verify on a round where a player breaks even on one specific game (e.g. Nassau overall tied).

(d) is investigation-only — no UI change.
