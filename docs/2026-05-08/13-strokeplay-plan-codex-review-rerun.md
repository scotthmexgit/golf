---
prompt_id: "13"
timestamp: 2026-05-08T00:00:00Z
checklist_item_ref: "Phase 7 — Stroke Play sweep cutover — Codex plan-review (rerun)"
tags: [codex-review, strokePlay, phase-7, sweep]
status: COMPLETE — AWAITING_GM_TRIAGE
supersedes: docs/2026-05-08/12-strokeplay-plan-codex-review.md
---

# Stroke Play Phase 7 Codex Plan-Review — Rerun (Scoped)

**Review target:** docs/2026-05-08/11-strokeplay-plan.md + supporting files  
**Command:** `/codex:adversarial-review --wait --scope working-tree "<focus text>"`  
**Thread:** 019e03b1-0cb5-77b0-a67e-c3d82c420c6a  
**Scoped files read by agent:** stroke_play_bridge.ts, payouts.ts, aggregate.ts (lines 384-393), stroke_play.ts, explore doc, plan doc  

**Root cause of prior failures:** Previous runs used the wrong base CWD (home-level `/home/seadmin` git repo has hundreds of modified cache/home files). Running from `/home/seadmin/golf` (golf project's own `.git`) with explicit `--scope working-tree` reduces input to ~23KB (3 untracked Stroke Play docs + 1 tiny eod.md diff). **Fix for future slices:** always `cd /home/seadmin/golf` before running adversarial-review; add `--scope working-tree` when the working tree is small. Documented in tooling gap section below.

---

## Verdict: needs-attention

Two medium findings. No ship-blockers on the architecture; both are addressable within Develop scope.

---

## Finding 1 — `?? {}` fallback turns missing aggregation into silent zero payouts

**Severity:** medium  
**Location:** Plan §"Orchestration code" lines 62-64; SE5 in Explore  

**What can go wrong:** `result.byBet[game.id] ?? {}` treats ANY missing bet entry as an empty ledger, not specifically the FieldTooSmall case. If event attribution regresses (e.g., `declaringBet` is set to the wrong id, or the reduceEvent case is accidentally removed), every Stroke Play payout silently zeros — zero-sum passes (0 = 0), `ZeroSumViolationError` never fires, and players get 0 instead of their correct payouts.

**Why vulnerable:** `byBet[game.id]` is undefined for two different reasons: (a) legitimate FieldTooSmall (no scoring players), (b) event attribution bug. The `??{}` fallback treats both identically. The zero-sum check doesn't help here because 0-per-player is already zero-sum.

**Codex recommendation:** Replace the unconditional fallback with a guarded branch: if `byBet[game.id]` is undefined, verify a `FieldTooSmall` event for `declaringBet === game.id` exists in the log AND that no `StrokePlaySettled`/`RoundingAdjustment` events exist for a different key. Otherwise throw.

**Proposed guard (Plan → Develop):**
```typescript
const spLedger = result.byBet[game.id]
if (spLedger === undefined) {
  // Only acceptable when FieldTooSmall was emitted — never when attribution is wrong.
  const hasFieldTooSmall = events.some(
    e => e.kind === 'FieldTooSmall' && 'declaringBet' in e && (e as { declaringBet: string }).declaringBet === game.id
  )
  if (!hasFieldTooSmall) {
    throw new Error(
      `Stroke Play bridge id contract: byBet["${game.id}"] is undefined but no FieldTooSmall event found — possible event attribution bug.`
    )
  }
  return payoutMapFromLedger({}, game.playerIds)
}
return payoutMapFromLedger(spLedger, game.playerIds)
```

**Impact if not fixed:** Silent zero-payout regression that bypasses zero-sum enforcement. High impact, low probability.

---

## Finding 2 — STP9 no-op test does not prove the no-op property

**Severity:** medium  
**Location:** Plan §"Test plan" STP9 row  

**What can go wrong:** STP9 compares payouts from a 1-hole vs 18-hole scenario. If aggregateRound's Stroke Play finalizer double-finalized BOTH scenarios equally (e.g., because the bridge was changed to return all events), the 1-hole comparison would show A+600 vs A+600 — the equality check would PASS, but the payouts are wrong. The test would not catch the regression it claims to guard against.

**Why vulnerable:** The test asserts equality of two runs but doesn't assert correctness of either run. A doubled-payout bug that affects both runs identically is invisible.

**Codex recommendation:** Either:
(a) Assert exact expected payouts in each STP9 scenario (not just equality between runs), or  
(b) Add a synthetic-log test that passes a log with both `StrokePlayHoleRecorded` AND finalized events to aggregateRound directly, asserting no double-settlement.

**Disposition:** Option (b) tests aggregateRound internals (bridge/engine territory, out of scope). Option (a) is in scope and simple: assert `payouts1hole['A'] === 300` and `payouts18holes['A'] === 300`, not just `payouts1hole['A'] === payouts18holes['A']`. This makes STP9 a real regression tripwire.

---

## Findings disposition (Code's recommendation — for GM triage)

| Finding | Severity | Disposition | In scope? |
|---|---|---|---|
| F1: `?? {}` silent fallback | medium | Add FieldTooSmall guard (3-4 lines in orchestration code) | Yes — stays in payouts.ts |
| F2: STP9 weak equality | medium | Change STP9 to assert exact values, not just equality | Yes — test change only |

Both addressable in Develop without Plan revision. Neither is architectural. GM confirmation required before Develop starts.

---

## Tooling gap — Codex input-size cap

**Problem:** When `codex-companion.mjs` runs from `/home/seadmin` (home-level git repo), `git ls-files --others --exclude-standard` lists hundreds of home-directory cache files. These are included in the context as untracked content, easily exceeding the 1MB input cap.

**Root cause:** The home directory (`/home/seadmin`) is a git repo, and so is the golf project (`/home/seadmin/golf`). Running codex-companion from `/home/seadmin/golf` finds the golf `.git` (correct). Running it from any shell that happened to `cd /home/seadmin` before the codex call would pick up the home-level git repo (too large).

**Fix (scoping pattern, effective immediately):**
1. Always explicitly `cd /home/seadmin/golf` (or use absolute CWD in the Bash command) before calling `codex-companion.mjs`
2. Add `--scope working-tree` when the working tree is known to be small (< 50 files, < 500KB)
3. For large working trees: commit specific files first, then `--base <prior-commit>` to get a focused branch diff

**Future sweep slices and large refactors:** Use the same pattern. The adversarial review for prior slices all ran cleanly when the CWD was correct.

**Proposed documentation location:** `.claude/skills/` or CLAUDE.md §"Codex usage notes". The current CLAUDE.md §"Codex usage notes" only shows the command path — should add "Run from /home/seadmin/golf; use --scope working-tree for small working trees."

---

## STOP — awaiting GM triage of findings before Develop begins.

GM review package (supersedes doc 12):
- Explore: [10-strokeplay-explore.md](10-strokeplay-explore.md)
- Plan: [11-strokeplay-plan.md](11-strokeplay-plan.md)
- Codex review (this doc): [13-strokeplay-plan-codex-review-rerun.md](13-strokeplay-plan-codex-review-rerun.md)
- Failed attempt history: [12-strokeplay-plan-codex-review.md](12-strokeplay-plan-codex-review.md)

**F1 decision needed:** Accept FieldTooSmall guard (3-4 lines) in Develop, or accept the `??{}` silent fallback as-is.  
**F2 decision needed:** Rewrite STP9 to assert exact values (recommended), or accept weak equality test as-is.
