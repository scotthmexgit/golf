---
prompt_id: "02"
timestamp: 2026-05-07T00:00:00Z
checklist_item_ref: "Phase 7 — Full multi-bet cutover (#11) — Wolf explore"
tags: [explore, wolf, phase-7]
---

# Wolf Explore — Phase 7 Multi-Bet Cutover

**Phase:** Phase 7 kickoff — Wolf as first target  
**Scope:** Inventory only. No implementation this document.  
**Source:** Live codebase inspection 2026-05-07

---

## Summary

Wolf was fully unparked in Phase 6 (WF-0 through WF-7, all closed 2026-04-30). The engine, bridge, UI, store wiring, and E2E spec are all live and passing. **What is NOT done** is the Phase 7 multi-bet cutover: routing the app's orchestration layer through `aggregateRound` from `src/games/aggregate.ts` rather than through the per-bet dispatch in `src/lib/payouts.ts`. Wolf-specific config fields are also partially hardcoded in the bridge with no wizard UI exposure.

---

## Engine — `src/games/wolf.ts`

| Surface | Status |
|---|---|
| `settleWolfHole(hole, config, roundCfg, decision)` | ✓ Live |
| `finalizeWolfRound(events, config)` — carryover tieRule | ✓ Live |
| `applyWolfCaptainRotation(hole, config, roundCfg, eventsSoFar?)` | ✓ Live |
| `WolfConfigError`, `WolfBetNotFoundError` typed errors | ✓ Live |
| `WolfDecision` union type (`partner` / `lone` / `lone+blind`) | ✓ Live |
| Integer-unit math (`assertValidWolfCfg` enforces `stake` as integer) | ✓ Confirmed |
| Zero-sum settlement (WolfHoleResolved / LoneWolfResolved / BlindLoneResolved carry points maps) | ✓ Confirmed |
| Rules source | `docs/games/game_wolf.md` — NOT restated inline per ground rule 1 |

**Test file:** `src/games/__tests__/wolf.test.ts` — comprehensive suite including: config validation, partner/lone/blind settlement, carryover boundary (`max(carryMult, decMult)` per TRIAGE §2 Finding 2), 4-player and 5-player rotation, WolfDecisionMissing path.

---

## Bridge — `src/bridge/wolf_bridge.ts`

| Export | Status | Notes |
|---|---|---|
| `buildWolfCfg(game)` | ✓ Live | Maps `GameInstance` → `WolfCfg` |
| `getWolfCaptain(hole, game, players, eventsSoFar?)` | ✓ Live | UI helper for WolfDeclare |
| `settleWolfBet(holes, players, game)` | ✓ Live | Returns `{events, ledger}` |

**Hardcoded defaults in bridge (not exposed in wizard):**

| Field | Hardcoded value | GameInstance field? |
|---|---|---|
| `blindLoneEnabled` | `true` always | No |
| `blindLoneMultiplier` | `max(loneWolfMultiplier + 1, 3)` | No |
| `tieRule` | `'carryover'` always | No |
| `appliesHandicap` | `true` always | No |
| `junkItems` | `[]` | No (Junk Phase 3 deferred) |
| `junkMultiplier` | `1` | No |

**Bridge test file:** `src/bridge/wolf_bridge.test.ts` — passes.

---

## UI scaffolding

| Component | Location | Status |
|---|---|---|
| `WolfDeclare.tsx` | `src/components/scorecard/WolfDeclare.tsx` | ✓ Live (WF-5) — captain display + partner/lone/blind declaration |
| `BetDetailsSheet.tsx` | `src/components/scorecard/BetDetailsSheet.tsx` | ✓ Live (WF-2) — shared full-round bet view |
| Wolf in scorecard page | `src/app/scorecard/[roundId]/page.tsx:67,319-321` | ✓ Live — `wolfGame` extracted; `<WolfDeclare>` rendered conditionally |
| Wolf in game picker | `src/types/index.ts:162` | ✓ Live — no `disabled: true` flag |
| Wolf wizard (loneWolfMultiplier) | `GameInstanceCard.tsx` | ✓ Live (WF-1) |
| Wolf player-count guard (4–5) | Wizard | ✓ Live (WF-1) |
| BetDetailsSheet sheet slice | `roundStore.ts` | ✓ Live |

---

## Schema fields

| Field | Location | Status |
|---|---|---|
| `wolfPick` on `HoleData` | `src/types/index.ts:116,129` | ✓ Live — `'solo' \| 'blind' \| string` (partner ID) |
| `wolfOrder` on `HoleData` | `src/types/index.ts:91` | ✓ Declared (optional) |
| `loneWolfMultiplier` on `GameInstance` | `src/types/index.ts` | ✓ Live |
| `wolfPick` persistence via `HoleDecision` table | Prisma `schema.prisma` | ✓ Live (NA-3 / PER-HOLE-DECISION-STATE) |

**Decisions wiring (SCORECARD-DECISIONS-WIRING gap — CHECK):** `src/app/scorecard/[roundId]/page.tsx:166` calls `buildHoleDecisions(latestHoleData, gameTypes)` and includes `decisions` in the PUT body. **This gap appears to be closed** — wolfPick is included in the decisions blob sent to the API. The parking-lot item should be verified and closed.

---

## Store slices — `src/store/roundStore.ts`

| Slice | Lines | Status |
|---|---|---|
| `setWolfPick(hole, pick)` action | ~374-375 | ✓ Live |
| `wolfPick` hydration from persisted decisions | ~302 | ✓ Live (PER-HOLE-DECISION-STATE) |
| `loneWolfMultiplier` default on game init | ~171 | ✓ Live |
| `BetDetailsSheet` open/close slice | via sheet state | ✓ Live |

---

## Route conventions established by Skins / Stroke Play

| Convention | Established by | Wolf status |
|---|---|---|
| `src/bridge/<name>_bridge.ts` bridge pattern | SP-4 / SK-2 / WF-1 | ✓ wolf_bridge.ts live |
| `GAME_DEFS` disabled flag removal | SK-2 / WF-1 | ✓ already removed |
| `BetDetailsSheet` shared sheet | WF-2 | ✓ live for all bets |
| Per-prompt commit workflow | WF-5 | ✓ adopted |
| `buildHoleDecisions` decisions blob | NA-3 | ✓ Wolf wolfPick included |
| `aggregateRound` as target orchestration | #8 (closed 2026-04-24) | ✗ NOT wired in app layer |

---

## Key Gap: `aggregateRound` not wired in app

`src/games/aggregate.ts:351` exports `aggregateRound` — the unified multi-bet orchestrator that runs all active games through their engines in one pass. **No production app code calls `aggregateRound`.** The current orchestration path is:

```
PUT /api/rounds/[id]/scores/hole/[hole]
  → src/lib/payouts.ts:computeGamePayouts (per-bet dispatch)
    → case 'wolf': settleWolfBet(...)
    → case 'skins': settleSkinsRound(...)
    → case 'nassau': settleNassauBet(...)
    → case 'strokePlay': settleStrokePlayBet(...)
```

The Phase 7 target path is:
```
PUT /api/rounds/[id]/scores/hole/[hole]
  → aggregateRound(holes, players, bets)
    → all engines in one pass
    → single zero-sum verified ledger
```

`src/lib/perHoleDeltas.ts:46` also dispatches per-bet (calls `settleWolfBet` directly for Wolf events). Both files need to migrate.

---

## E2E spec — `tests/playwright/wolf-flow.spec.ts`

**Status:** 3/3 passing (WF-6, verified at WF-7 Cowork 2026-04-30).  
**Sections:** §1 setup, §2 partner declaration, §3 lone wolf, §4 blind lone, §5-6 fence checks (skins-fence, nassau-fence).  
**Gap:** No spec tests Wolf in a multi-bet round alongside Skins or Nassau simultaneously. Wolf-flow tests Wolf in isolation.

---

## What Phase 7 needs for Wolf

Ordered by dependency:

1. **Wizard config completeness** — surface `tieRule`, `blindLoneEnabled`, `blindLoneMultiplier` in wizard UI; remove hardcodes from bridge (or keep bridge defaults and add wizard fields to `GameInstance`).
2. **SCORECARD-DECISIONS-WIRING verification** — confirm wolfPick is persisted correctly end-to-end; close parking-lot item if confirmed.
3. **`aggregateRound` cutover** — migrate `src/lib/payouts.ts` and `src/lib/perHoleDeltas.ts` to use `aggregateRound` for Wolf (pilot; Skins + Nassau follow same pattern).
4. **Multi-bet E2E** — extend or add a spec that runs a Wolf + Skins round (or Wolf + Nassau) and verifies per-hole deltas and zero-sum settlement.
5. **Cowork verification** — visual pass on Wolf in multi-bet context.

---

## Files to be created / modified (for Plan)

**Modified:**
- `src/games/wolf.ts` — no changes expected (engine is complete)
- `src/bridge/wolf_bridge.ts` — may add wizard-surfaced fields if Decision on config completeness goes that route
- `src/lib/payouts.ts` — pilot cutover to `aggregateRound` (Phase 7 core work)
- `src/lib/perHoleDeltas.ts` — same cutover
- `src/types/index.ts` — may add `GameInstance` fields for wolf config
- `prisma/schema.prisma` — may add GameInstance fields (schema delta TBD per Plan decision)

**Created:**
- `docs/plans/WOLF_PHASE7_PLAN.md` — Phase 7 plan (this session produces the plan doc)
- `tests/playwright/wolf-multibet-flow.spec.ts` — multi-bet E2E (later slice)

---

## Skins phase as reference pattern for unpark slicing

The Skins phase (SK-0–SK-5) established the unpark template:
- SK-0: Plan  
- SK-1a/SK-1b: Scorecard UI  
- SK-2: Engine cutover (bridge + `GAME_DEFS`)  
- SK-3: Player-count guard  
- SK-4: Playwright spec  
- SK-5: Cowork verification

For Wolf in Phase 7, the pattern maps as:
- WF7-0: Plan (today)
- WF7-1: Config completeness (wizard fields)
- WF7-2: `aggregateRound` cutover (payouts.ts + perHoleDeltas.ts)
- WF7-3: Multi-bet E2E spec
- WF7-4: Cowork verification

---

**Explore complete. See `03-wolf-plan.md` for slicing proposal.**
