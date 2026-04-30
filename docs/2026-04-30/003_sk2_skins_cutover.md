---
prompt_id: 003
date: 2026-04-30
role: engineer
checklist_item_ref: "SK-2 — Skins Cutover + R4 Fix"
tags: [sk-2, skins, cutover, r4, label-fix, grep-gate, regression-clean]
---

# SK-2 — Skins Cutover + R4 Fix

## Result

SK-2 complete. Skins is live. All gates green.

---

## Files changed

| File | Action | Notes |
|---|---|---|
| `src/types/index.ts` | **Modified** | Removed `disabled: true` from `'skins'` GAME_DEFS entry |
| `src/lib/payouts.ts` | **Modified** | Replaced `computeSkins` call with bridge; deleted `computeSkins` function body; added `settleSkinsBet` import |
| `src/lib/perHoleDeltas.ts` | **Modified** | Added `case 'skins': return settleSkinsBet(...).events` to `gameHoleEvents` |
| `src/store/roundStore.ts` | **Modified** | `hydrateRound`: `label: g.type` → `label: GAME_DEFS.find(d => d.key === g.type)?.label ?? g.type` |
| `src/app/api/rounds/route.ts` | **Modified** | `orderBy: { playedAt: 'desc' }` → `[{ playedAt: 'desc' }, { id: 'desc' }]` (tiebreaker fix) |
| `src/bridge/skins_bridge.test.ts` | **Modified** | Added Test S6 (R5 empty-ledger) and Test S7 (R4 architectural verification) |
| `src/lib/perHoleDeltas.test.ts` | **Modified** | Updated "parked game" tests to use Wolf (still parked); replaced byGame structural contract tests with live Skins data |
| `tests/playwright/stroke-play-finish-flow.spec.ts` | **Modified** | Fence assertion updated: Skins removed from "parked" list, added "Skins is visible" positive assertion |
| `IMPLEMENTATION_CHECKLIST.md` | **Modified** | Closed camelCase label + Recent Rounds ordering items; updated active item to SK-3 |

---

## R4 fix approach: architectural verification — no code change needed

**Finding:** R4 is not a bug in the current implementation.

The plan described a potential bug: "mid-round reload with only holes 1–12 hydrated causes hole 12 to receive `tieRuleFinalHole` resolution prematurely."

Investigation reveals this does NOT occur because of the **FieldTooSmall sentinel mechanism**:

1. `hydrateRound` creates ALL 18 holes regardless of which have DB scores. Unscored holes have `scores[pid] = 0` for all players.
2. In `settleSkinsBet`, `buildHoleState` maps `holeData.scores[pid] ?? 0 = 0` → `gross[pid] = 0`.
3. `settleSkinsHole` with all-zero gross scores: `contenders = [].filter(pid => gross[pid] > 0) = []`. `contenders.length < 2` → emits `FieldTooSmall` with `hole: holeData.number` (not null).
4. `finalizeBetEvents` computes `finalHole = Math.max(...holeNumbers)` where `holeNumbers` includes FieldTooSmall hole numbers. So `finalHole = 18` always (the last hole in the range), regardless of how many holes are scored.
5. A `SkinCarried` on hole 12 satisfies `hole(12) !== finalHole(18)` → carry accumulates, NOT resolved. ✓

**Resolution:** Added **Test S7** (R4 regression protection) in `skins_bridge.test.ts` to document and lock this behavior. Test covers: holes 1–6 scored with a carry on hole 6, holes 7–9 empty. Asserts: FieldTooSmall on 7/8/9, hole 6 `SkinCarried` preserved (not resolved as final-hole tie), carry unresolved. No engine or bridge code changes.

**Session log note:** The FieldTooSmall sentinel is a stable property of the engine design — `settleSkinsHole` always emits `FieldTooSmall` for 0-gross fields, and `FieldTooSmall` always carries a non-null `hole` number. Future changes to `finalizeBetEvents` that modify the `finalHole` calculation would break Test S7, surfacing the regression.

---

## DB ground-truth check (R1)

```sql
SELECT COUNT(*) FROM "Game" WHERE type = 'skins';
-- Result: 0
```

Zero historical Skins rounds. No settlement divergence between legacy `computeSkins` and new bridge path. The old `computeSkins` function had a subtle flaw (no `tieRuleFinalHole` logic — a tied hole 18 would silently leave carry unresolved), but there are no existing rounds where this matters.

---

## Grep gate

```
git grep -rn "computeSkins" src/
```

**Zero matches.** `computeSkins` function body deleted from `src/lib/payouts.ts`. The case in `computeGamePayouts` is replaced with the bridge call. Dead code removed.

---

## computeSkins vs bridge — behavior differences

For completeness, the differences between the deleted `computeSkins` and the new `settleSkinsBet` path:

| Scenario | `computeSkins` (deleted) | `settleSkinsBet` (new) |
|---|---|---|
| Hole 18 ties with carry | Carry silently left unresolved; all-zero delta | `tieRuleFinalHole: 'split'` applied; tied winners collect from losers |
| `escalating: false` | Carry counter grows but `pot` uses `game.stake + 0`; carry never cleared on ties | `SkinVoid` emitted, no carry, correct behavior |
| Missing score | Player gets `net: 99` (hack) | Player excluded from contenders via `gross <= 0` check |
| Event stream | None — direct payout mutation | Full `ScoringEvent[]` for per-hole accordion display |

None of these matter for historical data (0 rounds). The new behavior is correct by design.

---

## Empty-ledger test (R5)

Test S6 in `skins_bridge.test.ts`: 3 players, 9 holes, all tied under `escalating: true`, hole 9 also ties under `split` with all players. Result:
- `ledger = {}` (no `SkinWon` events emitted) ✓
- One `SkinCarryForfeit` emitted with `carryPoints = 45` (9 × stake 5) ✓
- `payoutMapFromLedger({}, game.playerIds)` returns `{ A: 0, B: 0, C: 0 }` (all players present with zero, not missing) ✓
- Zero-sum holds ✓

---

## Label fix (addition beyond plan)

**`src/store/roundStore.ts` line 260:**

Before: `label: g.type`  → shows `"strokePlay"`, `"skins"` in accordion for hydrated rounds

After: `label: GAME_DEFS.find(d => d.key === g.type)?.label ?? g.type` → shows `"Stroke Play"`, `"Skins"` (human-readable)

Verification:
- Fresh round (Skins in wizard): accordion shows "Skins" ✓
- Hydrated Skins round (reload): accordion shows "Skins" ✓
- Hydrated SP round: body text does not contain "strokePlay" ✓

The `?? g.type` fallback handles unknown game types (e.g., parked games not yet in GAME_DEFS) without crashing.

---

## orderBy tiebreaker fix (parking lot item resolved in scope)

`src/app/api/rounds/route.ts`: Added `{ id: 'desc' }` as tiebreaker to `orderBy`. Required to make `stroke-play-finish-flow.spec.ts` deterministic. With 45+ rounds all having `playedAt = 2026-04-30 00:00:00`, PostgreSQL returned arbitrary 20, and the newly created round often didn't appear. With `id: desc`, most recently created round is always first. This was the "Recent Rounds ordering" parking-lot item.

---

## R6 Playwright regression gate

The SP finish flow spec required one fence assertion update: removed "Skins" from the parked-game check (it's now live) and added a positive assertion that Skins IS in the picker. All other assertions unchanged.

**Result:** `stroke-play-finish-flow.spec.ts` 1/1 green ✓

---

## Targeted SK-2 Playwright verification

Verified via `sk2_verify.js` and `sk2_hydrate_check.js` scripts:
- Skins appears in the game picker (live); Wolf/Nassau/Match Play absent ✓
- Wizard card shows "Skins" (capitalized) ✓
- 3 bet-row buttons per scorecard (one per player) ✓
- Accordion shows `"Skins—"` on hole 1 before scoring ✓ (no per-hole delta yet)
- Hydrated round shows `"Skins—"` (not `"skins—"`) in accordion ✓
- Accordion `data-testid` pattern: `hole-bet-breakdown-{playerId}-{gameId}` — verified at `hole-bet-breakdown-1-43` ✓

Full Skins play-through settlement verification (carry math, zero-sum, results page) is deferred to SK-4 (`skins-flow.spec.ts`). The unit tests in `skins_bridge.test.ts` (S1–S7) cover the settlement math exhaustively including carry scenarios, empty ledger, and R4 partial round.

---

## AC checklist (SKINS_PLAN.md §SK-2)

| Item | Status |
|---|---|
| GAME_DEFS `disabled: true` removed from `'skins'` | ✓ |
| GameList.tsx: GAME_DEFS-driven filter confirmed (no explicit 'skins' exclusion) | ✓ |
| `case 'skins'` in `computeGamePayouts` uses bridge call | ✓ |
| `computeSkins` function body deleted | ✓ |
| Grep gate: `computeSkins` → 0 matches | ✓ |
| `perHoleDeltas.ts` wired with Skins case | ✓ |
| R4 mid-round reload fix/verification | ✓ — architectural verification; no code change needed; Test S7 added |
| R5 empty-ledger test | ✓ — Test S6 in skins_bridge.test.ts |
| DB check: 0 historical Skins rounds | ✓ |
| Label fix: `hydrateRound` uses GAME_DEFS label | ✓ |
| IMPLEMENTATION_CHECKLIST.md: label + Recent Rounds ordering items closed | ✓ |
| `npm run test:run` passes | ✓ — 377/377 (+10 from SK-2) |
| `tsc --noEmit --strict` passes | ✓ — clean |
| `stroke-play-finish-flow.spec.ts` passes | ✓ — 1/1 green |

---

## Vitest count, tsc, PM2

| Gate | Result |
|---|---|
| Vitest | 377/377 (was 367; +10 new tests: S6 × 4, S7 × 4, perHoleDeltas Skins structural × ~4, updated parked-type tests) |
| tsc --noEmit --strict | Clean (0 new errors) |
| PM2 restart | PID 1640749, `golf` online |
| HTTP 200 | `http://localhost:3000/golf` → 200 ✓ |
