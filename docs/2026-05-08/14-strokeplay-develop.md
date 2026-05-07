---
prompt_id: "14"
timestamp: 2026-05-08T00:00:00Z
checklist_item_ref: "Phase 7 — Stroke Play sweep cutover — Develop"
tags: [develop, strokePlay, phase-7, sweep]
status: AWAITING_GM_REVIEW
---

# Stroke Play Phase 7 Develop Report — aggregateRound Cutover

**Reviewer:** APPROVED  
**Codex /review:** P2 finding addressed (empty holes path) — see below  
**Codex /adversarial-review (run 1):** medium finding (partial attribution) addressed — see below  
**Codex /adversarial-review (run 2):** approve — no material findings

---

## Step 5 — Develop

### Files modified (3 files)

| File | Change |
|---|---|
| `src/bridge/stroke_play_bridge.ts` | 1-char: `function buildSpCfg` → `export function buildSpCfg` |
| `src/lib/payouts.ts` | `case 'strokePlay'` body replaced; `buildSpCfg` import added |
| `src/lib/payouts.test.ts` | STP1–STP11 + STP5b appended; header comment updated |

### Orchestration code (final)

```typescript
case 'strokePlay': {
  // Phase 7 sweep: orchestrate through aggregateRound (Stroke Play, Wolf/Skins template).
  // Bridge produces finalized events; aggregateRound reduces to RunningLedger;
  // Stroke Play ledger extracted from byBet[game.id].
  // NOTE: aggregateRound Stroke Play finalizer (aggregate.ts:384-393) filters for
  // StrokePlayHoleRecorded. Bridge returns only final events → filter gets [] → no-op.
  // F1 guard: verify every monetary event is attributed to game.id. See SE3, SE5.
  const spCfg = buildSpCfg(game)
  if (spCfg.id !== game.id) {
    throw new Error(`Stroke Play bridge id contract violation: spCfg.id="${spCfg.id}" !== game.id="${game.id}"`)
  }
  const { events } = settleStrokePlayBet(holes, players, game)
  const log: ScoringEventLog = { events, supersessions: {} }
  const roundCfg = buildMinimalRoundCfg(spCfg, 'strokePlay')
  const result = aggregateRound(log, roundCfg)
  // F1 guard: loop catches wrong declaringBet on StrokePlaySettled OR RoundingAdjustment.
  // Covers both total loss (byBet[game.id] undefined) and partial loss (byBet defined
  // but incomplete because RoundingAdjustment went to a different key).
  for (const e of events) {
    if ((e.kind === 'StrokePlaySettled' || e.kind === 'RoundingAdjustment') &&
        e.declaringBet !== game.id) {
      throw new Error(
        `Stroke Play bridge id contract: ${e.kind} declaringBet="${e.declaringBet}" !== game.id="${game.id}" — event attribution bug.`
      )
    }
  }
  // After the attribution check, byBet[game.id] contains all monetary events or is
  // undefined. undefined is legitimate: empty round (holes=[]), FieldTooSmall, etc.
  const spLedger = result.byBet[game.id] ?? {}
  return payoutMapFromLedger(spLedger, game.playerIds)
}
```

### Codex review findings and fixes during Develop

**Fix 1 — Codex /review P2: empty holes path throws (initial F1 guard)**

Initial F1 guard used `events.some(e => e.kind === 'FieldTooSmall' && e.declaringBet === game.id)`. When `holes = []`, no events are emitted at all — no FieldTooSmall, no StrokePlaySettled. The original guard threw in this case, breaking the pre-score rendering path.

Fix: replaced FieldTooSmall-specific check with a check for ANY monetary event existence (`events.some(e => e.kind === 'StrokePlaySettled' || e.kind === 'RoundingAdjustment')`). Zero-payout paths (empty holes, FieldTooSmall) have no monetary events → guard passes.

**Fix 2 — Codex /adversarial-review (run 1) medium: partial attribution miss**

The second guard (check-for-monetary-events) still missed partial attribution: if `StrokePlaySettled` was correctly attributed to `game.id` but `RoundingAdjustment` went to a different key, `byBet[game.id]` would be defined but missing the adjustment. The guard wouldn't fire (byBet not undefined) and the payout would silently drop the adjustment.

Fix: replaced the undefined-only guard with a pre-extraction attribution loop over ALL monetary events. Any event with wrong `declaringBet` throws before extraction. After the check, `byBet[game.id] ?? {}` is safe (either populated correctly or legitimately undefined).

**Codex /adversarial-review (run 2) finding:** approve — the pre-extraction loop catches both total and partial attribution bugs. No material findings.

This makes Stroke Play's F1 guard meaningfully stronger than the `??{}` patterns in Wolf/Skins:
- Wolf/Skins: `??{}` is a "should not fire" precaution
- Stroke Play: `??{}` is safe AND guarded by a pre-extraction check that explicitly fails on attribution bugs

### Grep gate

```
grep -rn "settleStrokePlayBet.*\.ledger\|\.ledger.*settleStrokePlayBet" src/lib/payouts.ts
→ 0 matches (GATE PASSED)
```

---

## Step 6 — Codex reviews

### /codex:review (line-level)
**Thread:** 019e03bd-676f-7e20-b4cc-9ee2d8153647  
**Finding:** P2 — empty holes path throws on initial F1 guard. Fixed (see Fix 1 above).  
**Post-fix verdict:** addressed.

### /codex:adversarial-review (run 1)
**Thread:** 019e03c0-8930-79c0-bd1e-84df3983a403  
**Focus:** F1 guard attack — partial attribution loss  
**Finding:** medium — byBet defined-but-incomplete if one monetary event mis-attributed. Fixed (see Fix 2 above).

### /codex:adversarial-review (run 2) — final
**Thread:** 019e03c2-2637-7ff0-9970-3af32c387bde  
**Focus:** revised pre-extraction attribution check  
**Verdict:** approve — "Ship: I could not support a blocking finding from the diff. The monetary-event loop catches wrong declaringBet on both StrokePlaySettled and RoundingAdjustment before extraction; empty holes still fall through to zeros; STP9 now asserts exact payouts and would catch doubled settlement; byBet[game.id] ?? {} is safe under the current aggregate reducer."

---

## Verification

| Check | Result |
|---|---|
| `npm run test:run` | 23 files, 762 tests — all pass (718 → +44 new Stroke Play tests, including STP5b) |
| `npx tsc --noEmit` | Clean |
| Grep gate: `"settleStrokePlayBet.*\.ledger"` | 0 matches |
| All E2E specs | 5/5 pass — including `stroke-play-finish-flow.spec.ts` |
| Reviewer sub-agent | APPROVED (all 7 GRs verified) |
| `/codex:review` | P2 finding addressed (Fix 1) |
| `/codex:adversarial-review` (run 2) | approve — no material findings |

---

## Divergences from Wolf/Skins template

| Aspect | Wolf/Skins | Stroke Play |
|---|---|---|
| `buildXxxCfg` already exported? | Skins: no → 1-char fix | No → 1-char fix (same) |
| byBet key shape | Simple | Simple |
| Extraction path | `byBet[game.id] ?? {}` | `byBet[game.id] ?? {}` (same) |
| `??{}` fallback semantics | "Should not fire" safety net | Legitimate (FieldTooSmall, empty round) |
| F1 guard | None | Pre-extraction attribution loop |
| aggregateRound finalizer case? | None | Has case (no-op) |

The F1 guard is the only structural addition beyond the Wolf/Skins template. It's a net improvement — Stroke Play's `??{}` fallback is more reachable than Wolf/Skins's, so the explicit pre-check makes the semantics unambiguous.

---

## Phase 7 #11 status after this slice

All four active bet types in `payouts.ts` now use `aggregateRound` orchestration:

| Bet | Status | Extraction |
|---|---|---|
| Wolf | ✓ WF7-2 | `byBet[game.id] ?? {}` |
| Skins | ✓ Phase 7 sweep | `byBet[game.id] ?? {}` |
| Nassau | ✓ Phase 7 sweep | `netByPlayer` (compound keys) |
| Stroke Play | ✓ Phase 7 sweep (this slice) | `byBet[game.id] ?? {}` + F1 guard |

Remaining Phase 7 #11 work: `perHoleDeltas.ts` cutover (deferred from WF7-2, queued separately).

---

## For GM to verify

- Working tree: 3 files changed (bridge 1-char, payouts.ts case body, payouts.test.ts STP1-STP11+STP5b)
- Codex adversarial run 2: approve, no material findings
- 762 tests pass; 5/5 E2E pass
- F1 guard handles empty holes, FieldTooSmall, AND partial attribution (three separate Codex iterations to get here)
- All four payouts.ts cases now on aggregateRound — the Phase 7 main sweep is functionally complete
