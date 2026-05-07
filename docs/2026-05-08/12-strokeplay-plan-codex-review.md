---
prompt_id: "12"
timestamp: 2026-05-08T00:00:00Z
checklist_item_ref: "Phase 7 — Stroke Play sweep cutover — Codex plan-review"
tags: [codex-review, strokePlay, phase-7, sweep]
status: COMPLETE
---

# Stroke Play Phase 7 Codex Plan-Review

**Review target:** docs/2026-05-08/11-strokeplay-plan.md  
**Commands attempted:**
1. `/codex:adversarial-review --wait` — FAILED: "Input exceeds the maximum length." Working tree diff exceeds Codex input limit (accumulated Nassau + Stroke Play doc additions too large).
2. `/codex:review --wait` — completed but scanned wrong project (payrollperfect, not golf); findings irrelevant to this change. Discarded.

**Degraded fallback:** Self-review pass applied per CLAUDE.md degraded review protocol.  
**Mode escalation:** Standard (Codex unavailable for this prompt).

---

## Self-review findings

### Concern 1 — aggregateRound finalizer no-op: fragile guarantee

The correctness of the Stroke Play cutover depends on `finalizeStrokePlayRound([])` returning `[]` (empty). If the bridge were ever changed to return `StrokePlayHoleRecorded` events alongside final events, the aggregateRound finalizer would double-finalize. The orchestration comment mentions this, but STP9 (the dedicated no-op test) provides the empirical guard.

**Assessment:** Correctly identified and mitigated in Plan (SE3 note in comment + STP9 test). No architectural change needed.

### Concern 2 — `??{}` semantics differ from Wolf/Skins

For Wolf/Skins, `??{}` is a "should not fire" safety net (no monetary events = genuinely no activity). For Stroke Play, `??{}` fires when `FieldTooSmall` occurs (all players missing scores) — a real production scenario. The comment documents this; STP5 tests it.

**Assessment:** Correctly flagged in Plan (SE5, SE9-C). The fallback is intentional and correct. STP5 provides direct test coverage.

### Concern 3 — RoundingAdjustment accumulation path

`RoundingAdjustment` is listed as a monetary event that accumulates to `byBet[game.id]` alongside `StrokePlaySettled`. If the bridge emits `StrokePlaySettled` WITHOUT the corresponding `RoundingAdjustment` (e.g., `remainder=0`), zero-sum still holds. If it emits both, both accumulate. Either way, the aggregation is correct.

**Assessment:** No structural concern. STP7 tests the 3-way tie scenario where remainder=1 fires `RoundingAdjustment`. Zero-sum check in `aggregateRound` catches any mis-accumulation.

### Concern 4 — STP test prefix collision check

`STP` prefix does not exist in the current test file (which uses WP, SP, NP). No collision. Header comment update will disambiguate `SP=Skins` vs `STP=Stroke Play`.

**Assessment:** No issue.

---

## Plan verdict (self-review)

No architectural objections. All three self-review concerns are addressed in the Plan. The orchestration code shape is Wolf/Skins template; the only deviation is the `buildSpCfg` export (1-char, same pattern as Skins).

**Plan is self-review-clean.** Mode escalated to Standard — GM review required before Develop.

---

## STOP — awaiting GM approval before Develop begins.

GM review package:
- Explore: [10-strokeplay-explore.md](10-strokeplay-explore.md) — all 10 SE items answered; aggregateRound finalizer no-op documented; no config flag traps
- Plan: [11-strokeplay-plan.md](11-strokeplay-plan.md) — Wolf/Skins template; STP1-STP10; GR8 guard; STP9 no-op proof; STP10 multi-bet isolation
- Codex review: [12-strokeplay-plan-codex-review.md](12-strokeplay-plan-codex-review.md) — Codex unavailable (input too large); degraded self-review applied; no architectural objections; mode escalated to Standard

Key decision for GM: Confirm `byBet[game.id] ?? {}` extraction (Wolf/Skins template). Confirm `buildSpCfg` export (1-char change). Both are straightforward given the Explore findings.
