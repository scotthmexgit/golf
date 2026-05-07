---
prompt_id: "03"
timestamp: 2026-05-08T00:00:00Z
checklist_item_ref: "Phase 7 — Skins sweep cutover — Plan"
tags: [plan, skins, phase-7, sweep]
status: AWAITING_GM_APPROVAL
---

# Skins Phase 7 Plan — aggregateRound Cutover

**Phase:** Phase 7 sweep — Skins (second bet after Wolf pilot)  
**Status: AWAITING GM APPROVAL — do not begin Develop until explicit "approved" from GM**  
**Source explore:** `docs/2026-05-08/02-skins-explore.md`  
**Reference plan (Wolf-pilot):** `docs/2026-05-07/07-wf72-develop.md`  
**Rule file:** `docs/games/game_skins.md` (authoritative — not restated here per ground rule 1)

---

## Phase scope

Migrate the `'skins'` case in `computeGamePayouts` (`src/lib/payouts.ts`) from per-bet bridge dispatch to `aggregateRound`-based orchestration. **Pattern is identical to WF7-2 Wolf-pilot.** The Skins bridge, engine, and aggregate.ts are all unchanged.

---

## Ground rules acknowledged (constraints on all Develop work)

Per AGENTS.md — every ground rule applies to every change in this slice:

1. **Rules from docs.** Rule answers live in `docs/games/game_skins.md`. No scoring code without a rule-file reference. No inline rule restatement in payouts.ts comments.
2. **Integer-unit math only.** All stake and delta values are integers in cents. No `toFixed`, no `Float`, no floating-point in any scoring code. Tests assert `Number.isInteger` on every delta.
3. **Settlement is zero-sum.** Per round, `Σ delta == 0` across all betting players. `aggregateRound` throws `ZeroSumViolationError` on violation — this is the backstop.
4. **Portability.** `src/games/` imports zero of: `next/*`, `react`, `react-dom`, `fs`, `path`, `window`, `document`. Not applicable to payouts.ts (src/lib), but no new portability violations.
5. **Handicap-in-one-place.** No handicap logic added or changed.
6. **Typed ScoringEvent per delta.** Only `SkinWon` events carry `points` and contribute to the ledger. All other Skins events (`SkinCarried`, `SkinVoid`, `SkinCarryForfeit`, `FieldTooSmall`) are informational — `aggregateRound` correctly handles them via `default: break` in `reduceEvent`. Every monetary delta is traced to a typed `SkinWon` event.
7. **No silent defaults.** Carry events emit explicit `SkinCarried` events; forfeit emits `SkinCarryForfeit`. A skin carried without an event is a bug in the engine (not introduced here). The `?? {}` fallback on `byBet[game.id]` is correct for zero-SkinWon rounds (all holes tied/forfeited).
8. **String-equality bet-id lookup.** `b.id === cfg.id`. The `byBet[game.id]` extraction relies on this chain. GR8 guard decision required (see below).

---

## Orchestration code (target)

```typescript
case 'skins': {
  // Phase 7 sweep: orchestrate through aggregateRound (Skins, same pattern as WF7-2 Wolf-pilot).
  // Bridge produces finalized events (finalizeSkinsRound runs inside settleSkinsBet);
  // log is assembled here; aggregateRound reduces to RunningLedger;
  // Skins ledger extracted from byBet[game.id].
  // Ref: docs/games/game_skins.md; docs/2026-05-08/03-skins-plan.md
  const skinsCfg = buildSkinsCfg(game)   // see GR8 decision below
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

**Identical to Wolf.** Same shape, same comments pattern, same GR8 guard, same `?? {}` fallback justification.

---

## GR8 guard decision — requires GM input before Develop

**Finding from Explore:** `buildSkinsCfg` is private (not exported from `skins_bridge.ts`). `buildWolfCfg` was exported because it's needed by the `getWolfCaptain` UI helper. No analogous UI helper exists for Skins.

**Three options:**

### Option A (Code recommendation) — export `buildSkinsCfg`

Add `export` to `buildSkinsCfg` in `skins_bridge.ts` (1-line change: `function buildSkinsCfg` → `export function buildSkinsCfg`).

**Pros:** Identical pattern to Wolf; GR8 guard is explicit and early.  
**Cons:** Adds to skins_bridge.ts (marked out-of-scope in today's prompt).  
**Verdict:** Minor scope extension. The 1-char change has no behavioral effect; it only enables the guard in payouts.ts. Recommend GM approves this as a trivial scope extension.

### Option B — post-events GR8 check

After `settleSkinsBet(...).events`, verify any event's `declaringBet === game.id`. Skip `buildSkinsCfg` entirely.

```typescript
const { events } = settleSkinsBet(holes, players, game)
// GR8 guard (buildSkinsCfg private — verified via emitted events):
for (const e of events) {
  if ('declaringBet' in e && (e as {declaringBet: string}).declaringBet !== game.id) {
    throw new Error(`Skins bridge id contract violation`)
  }
}
```

**Pros:** No skins_bridge.ts change.  
**Cons:** Guard only fires when events exist; a round where ALL holes produce `FieldTooSmall` (no players have scores) would emit no events with `declaringBet`, making the guard a no-op. Slightly more complex.

### Option C — no explicit guard; rely on tests

Skip the guard. Add a GR8 contract test (non-default UUID game id, verify non-zero payouts) as the implicit check — same as WP8 in payouts.test.ts for Wolf.

**Pros:** No skins_bridge.ts change; simpler code.  
**Cons:** No runtime guard; contract violation fails silently with zero payouts rather than throwing.

**GM confirmation needed:** Option A, B, or C?

---

## File inventory

| File | Action | Condition |
|---|---|---|
| `src/lib/payouts.ts` | Modify — Skins case replaced | Always |
| `src/lib/payouts.test.ts` | Modify — Skins tests appended | Always |
| `src/bridge/skins_bridge.ts` | Modify — add `export` to `buildSkinsCfg` | Option A only |

**No changes to:**
- `src/games/skins.ts` (engine complete)
- `src/bridge/skins_bridge.ts` (bridge interface unchanged — except 1-line export if Option A)
- `src/games/aggregate.ts` (orchestrator unchanged)
- `src/lib/perHoleDeltas.ts` (deferred)
- Any Nassau, Wolf, Stroke Play, Match Play files
- `prisma/schema.prisma`

---

## Test plan for payouts.test.ts (new Skins section)

| # | Test | Verifies |
|---|---|---|
| SP1 | Basic skin win (Alice wins hole 1, unique lowest) | SkinWon → correct per-player delta |
| SP2 | Zero-sum: SP1 scenario | Σ delta === 0 (GR3) |
| SP3 | Integer assertion: SP1 scenario | Number.isInteger on every delta (GR2) |
| SP4 | Carry chain → split at final hole | SkinCarried → SkinCarryForfeit → all zero (GR7: informational events, no silent delta) |
| SP5 | Carry chain → resolved skin (next decisive hole) | Carry-scaled SkinWon delta correct |
| SP6 | Zero-sum: SP4 + SP5 | Σ delta === 0 on each |
| SP7 | Integer assertion: SP4 + SP5 | Number.isInteger on each |
| SP8 | GR8 contract — non-default UUID-style game id | Payouts non-zero; byBet keyed correctly (parallel to WP8 for Wolf) |
| SP9 | No-skin round (all holes FieldTooSmall or all tied → split → zero) | `skinsLedger` is `{}` or all-zero; `payoutMapFromLedger` returns all-zero PayoutMap |
| SP10 | Escalating=true — confirmed carry multiplier applies | Carry-scaled SkinWon larger than base stake per hole (engine property, not plan-phase test) |

**Note on SP10:** The escalating skin carry is an engine-level property (`settleSkinsRound` applies carry scaling). `aggregateRound` just reduces the already-scaled `SkinWon.points`. The test verifies the end-to-end payout is correct, not the scaling mechanism.

---

## Skins-specific edge case flagged in Explore: escalating=false vs true

The `settleSkinsBet` bridge defaults `escalating: game.escalating ?? true`. In the existing `wolf-skins-multibet-flow.spec.ts`, the Skins game uses `escalating=false` (store default in `addGame`). The test plan should cover both:
- SP1–SP7: `escalating=false` (simpler, deterministic)
- SP10: `escalating=true` (verifies carry multiplier doesn't break aggregateRound reduction)

---

## Schema delta

None. Same `Game.config Json?` field handles Skins config. No Prisma migration.

---

## Dep additions

None. All needed utilities already imported in payouts.ts (from WF7-2): `aggregateRound`, `ScoringEventLog`, `buildMinimalRoundCfg`.

New import if Option A: `buildSkinsCfg` from `'../bridge/skins_bridge'`.

---

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| `SkinCarried`/`SkinCarryForfeit` have `carryPoints` that could be misread as monetary | Low | Verified: `reduceEvent` handles them in `default: break`; only `SkinWon` has `points`. |
| Carry scaling double-applied (once in finalizeSkinsRound, once in aggregateRound) | None | Finalizer runs inside bridge; aggregateRound receives already-finalized events. |
| GR8 guard fires incorrectly on valid round | None | `buildSkinsCfg.id === game.id` by construction; guard never fires on valid input. |
| WP8-style test with UUID game id fails to catch mismatch | Low if Option C | Mitigated by choosing Option A or B (explicit runtime guard). |

---

## STOP — Plan phase complete

**DO NOT begin Develop until GM approves this plan and /codex:review findings.**

Required before Develop:
- [ ] GM approves this plan
- [ ] GM selects GR8 guard option (A recommended / B / C)
- [ ] `/codex:review` findings reviewed (see `04-skins-plan-codex-review.md`)
- [ ] SCORECARD-DECISIONS-WIRING confirmed closed (Explore item 7 — closing in this session's commit)

Resume on explicit "approved" from GM.

---

*Authored: 2026-05-08 | Phase 7 Sweep — Skins slice*
