---
prompt_id: "05"
timestamp: 2026-05-08T00:00:00Z
checklist_item_ref: "Phase 7 — Skins sweep cutover — Develop"
tags: [develop, skins, phase-7, sweep]
status: AWAITING_GM_REVIEW
---

# Skins Phase 7 Develop Report — aggregateRound Cutover

**Step 4 (diff-level pre-review):** skipped — no approval gate (no schema, no new dep, no public API change)  
**Reviewer:** APPROVED  
**Codex review:** clean — no findings  
**Codex adversarial review:** approve — no material findings

---

## Step 5 — Develop

### Files modified (3 files)

| File | Change |
|---|---|
| `src/bridge/skins_bridge.ts` | 1-char change: `function buildSkinsCfg` → `export function buildSkinsCfg` |
| `src/lib/payouts.ts` | Skins case replaced; import `buildSkinsCfg` added |
| `src/lib/payouts.test.ts` | SP1–SP10 Skins orchestration tests appended |

### Orchestration code (final)

```typescript
case 'skins': {
  // Phase 7 sweep: orchestrate through aggregateRound (Skins, Wolf-pilot pattern).
  // Bridge produces finalized events (finalizeSkinsRound runs inside settleSkinsBet);
  // log is assembled here; aggregateRound reduces to RunningLedger;
  // Skins ledger extracted from byBet[game.id].
  // Ref: docs/games/game_skins.md; docs/2026-05-08/03-skins-plan.md
  const skinsCfg = buildSkinsCfg(game)
  // Guard: buildSkinsCfg must preserve game.id so byBet keying is correct
  // (GR8 — string-equality bet-id chain). If this throws, the bridge contract broke.
  if (skinsCfg.id !== game.id) {
    throw new Error(`Skins bridge id contract violation: skinsCfg.id="${skinsCfg.id}" !== game.id="${game.id}"`)
  }
  const { events } = settleSkinsBet(holes, players, game)
  const log: ScoringEventLog = { events, supersessions: {} }
  const roundCfg = buildMinimalRoundCfg(skinsCfg, 'skins')
  const result = aggregateRound(log, roundCfg)
  // byBet[game.id] is undefined only when no SkinWon events fired (all holes tied/forfeited).
  const skinsLedger = result.byBet[game.id] ?? {}
  return payoutMapFromLedger(skinsLedger, game.playerIds)
}
```

**Identical to Wolf.** Same shape, same guard, same fallback comment, same import pattern.

### Test fix during Develop — SP4/SP5/SP6/SP7

**Finding:** Initial SP4–SP7 fixtures used `escalating: false`. But the engine voids (not carries) tied holes when `escalating=false` — emitting `SkinVoid` instead of `SkinCarried`. Carry chain behavior requires `escalating: true`. The test assertions for SP5 (carry-scaled SkinWon = +600) were wrong at `escalating=false` (A would get +300 clean, not +600 carry-scaled).

**Fix:** SP4, SP5, SP6, SP7 updated to use `escalating: true`. Comments updated to match. SP10 (also `escalating: true`) was already correct.

This is a test-authoring error, not an engine or orchestration bug. The engine correctly voids at `escalating=false` and carries at `escalating=true`. The Explore doc's event table covered this distinction; the test fixtures did not initially reflect it.

### Grep gate

```
grep -rn "settleSkinsBet.*\.ledger" src/lib/payouts.ts
→ 0 matches (GATE PASSED)
```

No direct `.ledger` extraction from Skins case in payouts.ts.

---

## Step 6 — Codex reviews

### /codex:review (line-level)
**Verdict:** Clean — "Skins payout path now mirrors the existing Wolf aggregateRound orchestration and preserves the bridge's bet-id contract. TypeScript strict checking also passes."

### /codex:adversarial-review (design-level)
**Verdict:** approve — "No ship-blocking defect found. No material findings."

Adversarial specifically checked:
- Double-finalization risk (none — `finalizeSkinsRound` runs inside bridge; aggregateRound receives already-finalized events)
- Bet-id mismatch / zero-sum regression (none — GR8 guard + SP8 test)
- `?? {}` fallback semantics for Skins-specific event shapes (correct — no SkinWon = `{}` = all-zero via `payoutMapFromLedger`)

---

## Verification

| Check | Result |
|---|---|
| `npm run test:run` | 23 files, 677 tests — all pass (658 → +19 new Skins tests) |
| `npx tsc --noEmit` | Clean |
| Grep gate: `"settleSkinsBet.*\.ledger"` | 0 matches |
| All E2E specs | 5/5 pass — including `wolf-skins-multibet-flow.spec.ts` (Skins live path regression) |
| Reviewer sub-agent | APPROVED (all 7 GRs verified) |
| `/codex:review` | Clean |
| `/codex:adversarial-review` | approve — no material findings |

---

## Divergences from Wolf-pilot template

| Aspect | Wolf (WF7-2) | Skins |
|---|---|---|
| Config builder exported? | Already exported (`buildWolfCfg`) | Exported as part of this slice (1-char change) |
| SP4–SP7 fixture: `escalating` | N/A (Wolf has no escalating flag) | Required `escalating: true` for carry behavior |
| Adversarial review: `??{}` concern? | Raised and resolved (WF7-2 high finding) | Re-validated; no new finding |

No other divergences from Wolf-pilot template.

---

## For Cowork to verify

Batched to WF7-4 (Wolf wizard + multi-bet UI). No UI changes in this Skins sweep slice. `wolf-skins-multibet-flow.spec.ts` already exercises the live Skins path through the new orchestration.
