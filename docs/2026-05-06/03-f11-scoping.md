# F11-PRESS-GAME-SCOPE — Design Document

**Date:** 2026-05-06  
**Source:** IMPLEMENTATION_CHECKLIST.md `F11-PRESS-GAME-SCOPE`; originally filed in Codex NA-3 retroactive review (docs/2026-05-01/14-codex-na3-retroactive.md §3 H1, triage: ACCEPT/DEFERRED)  
**Status:** Design only — no code. Implementation requires GM approval of this document.

---

## 1. Problem statement

### 1.1 Failure scenario

A round has two Nassau bets on the same 2-player pair — e.g., Alice and Bob play one "casual" Nassau (Game A) and one "press-heavy" Nassau (Game B), both singles. After hole 2, Game A offers a press on its `front` match. Alice's captain accepts. The confirmed match ID `'front'` is written to `holeData.presses` (a flat `string[]`).

During settlement, the bridge is called once for Game A and once for Game B. Both iterate `holeData.presses`. Both see `'front'` in that array. Both call `matches.find(m => m.id === 'front')`. Because singles mode uses fixed match IDs (`'front'`, `'back'`, `'overall'`), **both** Game A and Game B find a match and open a press — even though the user only confirmed a press for Game A.

Result: Game B silently receives an unconfirmed press, inflating its settlement. Zero-sum is violated per game (Game B's press generates a delta with no user confirmation).

### 1.2 Where the bleed occurs

Three sites are involved:

| File | Line(s) | Description |
|---|---|---|
| `src/store/roundStore.ts` | 359–362 | `setPressConfirmation` appends `matchId` to `holeData.presses` (no game identity) |
| `src/bridge/nassau_bridge.ts` | 88–106 | `settleNassauBet` iterates `hd.presses` for every call regardless of which game they belong to |
| `src/lib/nassauPressDetect.ts` | 55–69 | `detectNassauPressOffers` applies `hd.presses` for prior-hole replay without game-scoping |

The root field: `HoleData.presses?: string[]` (`src/types/index.ts:117`) — a flat array with no game identity.

### 1.3 Production-risk assessment

**Low probability in production** (inherited from prompt 01 / Codex H1 triage):
- Typical rounds have exactly one Nassau game. `hd.presses` affects only that game.
- `allPairs` mode generates pair-suffixed match IDs (`'front-Alice-Bob'`) that are naturally unique across games, partially mitigating the risk.
- The pathological case requires: two Nassau games + same player pair + same pairingMode='singles'. No wizard flow currently encourages this.

**Why fix it anyway:** The fix is contained, testable, and closes a ground-rule violation (ground rule #3: settlement is zero-sum per bet; ground rule #7: no silent defaults). It is the right fix before Phase 7 multi-bet cutover, which explicitly routes multiple games through the same bridge path.

---

## 2. Current data flow

```
UI click → store → DB blob → bridge
```

**Step 1 — Offer generation**  
`handleSaveNext` (scorecard page:205) calls `detectNassauPressOffers(currentHole, holes, players, game)` for each Nassau game. Returns `PressOffer[] = { matchId, downPlayer, pair }[]` — **no `gameId`**.

**Step 2 — Modal display**  
`PressConfirmationModal` receives `PressOffer[]`. On Accept, calls `setPressConfirmation(hole, current.matchId)`.

**Step 3 — Store write**  
`roundStore.ts:361`: `setPressConfirmation(hole, matchId)` appends `matchId` to `holeData.presses` (flat `string[]`). Shape after acceptance:  
```
holeData.presses = ['front']   // from one or more games — indistinguishable
```

**Step 4 — Persistence**  
`buildHoleDecisions(holeData, gameTypes)` (holeDecisions.ts:40–42) includes `presses: holeData.presses` if non-empty. DB stores:  
```json
{ "presses": ["front"] }
```

**Step 5 — Hydration**  
`hydrateHoleDecisions` maps `presses` back to `result.presses` (flat `string[]`). Merged into Zustand via `hydrateRound`.

**Step 6 — Bridge consumption (the bleed)**  
`settleNassauBet` (nassau_bridge.ts:88–89) and `detectNassauPressOffers` (nassauPressDetect.ts:55–56) both iterate `hd.presses` for every Nassau game in scope. No game-scope filter.

**The exact un-scoped field:** `HoleData.presses: string[]` — carries match IDs without game identity.

---

## 3. Proposed fix shape

### 3.1 New key/shape

Change `HoleData.presses` from a flat `string[]` to a `Record<gameInstanceId, string[]>`:

```typescript
// src/types/index.ts — HoleData
// Before:
presses?: string[]
// After:
presses?: Record<string, string[]>   // keyed by GameInstance.id (UUID)
```

A confirmed press for Game A's `'front'` match is stored as:
```typescript
holeData.presses = { 'game-a-uuid': ['front'] }
```

Game B can only open a press if `holeData.presses['game-b-uuid']` contains the relevant match ID. Cross-game bleed is structurally impossible.

### 3.2 Type signature changes

**`PressOffer` interface** (`src/lib/nassauPressDetect.ts`):
```typescript
// Before:
export interface PressOffer {
  matchId: string
  downPlayer: string
  pair: [string, string]
}
// After:
export interface PressOffer {
  gameId: string          // game instance UUID — NEW
  matchId: string
  downPlayer: string
  pair: [string, string]
}
```

**`setPressConfirmation` store action** (`src/store/roundStore.ts`):
```typescript
// Before:
setPressConfirmation: (hole: number, matchId: string) => void
// After:
setPressConfirmation: (hole: number, gameId: string, matchId: string) => void
```

The implementation writes `matchId` into `holeData.presses[gameId]` (creating the sub-array if absent):
```typescript
setPressConfirmation: (hole, gameId, matchId) => set((state) => ({
  holes: state.holes.map(h => {
    if (h.number !== hole) return h
    const existing = h.presses ?? {}
    const arr = existing[gameId] ?? []
    return { ...h, presses: { ...existing, [gameId]: [...arr, matchId] } }
  }),
})),
```

**`detectNassauPressOffers`** (`src/lib/nassauPressDetect.ts`):
- Add `gameId: game.id` to each returned `PressOffer`
- Change prior-hole press replay to read `hd.presses?.[game.id] ?? []` instead of `hd.presses ?? []`

**`settleNassauBet`** (`src/bridge/nassau_bridge.ts`):
- Change press consumption from `hd.presses` (line 88) to `hd.presses?.[cfg.id] ?? []`

**`PressConfirmationModal`** (`src/components/scorecard/PressConfirmationModal.tsx`):
- Call `setPressConfirmation(hole, current.gameId, current.matchId)` instead of `setPressConfirmation(hole, current.matchId)`

**`buildHoleDecisions` / `validateHoleDecisions` / `hydrateHoleDecisions`** (`src/lib/holeDecisions.ts`):
- Build: include `presses: holeData.presses` (shape is now a record, not an array — no change to inclusion logic, just what the field contains)
- Validate: check `presses` is a plain object (not an array); each value is `string[]`
- Hydrate: map back to `Record<string, string[]>`

### 3.3 Backward compatibility

**Not backward-compatible for existing HoleDecision DB rows.**

The DB blob currently stores `{ "presses": ["front"] }`. The new reader expects `{ "presses": { "game-uuid": ["front"] } }`. If `hydrateHoleDecisions` receives the old flat-array shape, it will fail validation (array is not a plain object) and return `{}` — silently dropping the presses on load.

**Impact on existing rounds:** Any Nassau round that had presses confirmed before this fix will lose those presses on reload (the scorecard will show no presses persisted). Settlement from Zustand will be unaffected for the active session, but a reload would re-settle without presses.

**Migration options** (see §8 for the GM question):
1. **Wipe dev DB** — simplest; all Nassau rounds are test data (Nassau only unparked 2026-05-01)
2. **Hydration shim** — detect `Array.isArray(presses)` → convert to `{}` (drop old data, since we can't reconstruct game ID)
3. **DB migration SQL** — update `HoleDecision.decisions` rows, setting `presses = {}` for rows where `presses` is a JSON array (lossy but clean)

---

## 4. Files touched (estimated)

| File | Change | Notes |
|---|---|---|
| `src/types/index.ts` | `HoleData.presses` type: `string[]` → `Record<string, string[]>` | 1-line change |
| `src/lib/nassauPressDetect.ts` | Add `gameId` to `PressOffer`; change prior-hole press replay to use `hd.presses?.[game.id]`; add `gameId: game.id` to returned offers | ~8 lines |
| `src/components/scorecard/PressConfirmationModal.tsx` | Call `setPressConfirmation(hole, current.gameId, current.matchId)` | 1-line change |
| `src/store/roundStore.ts` | `setPressConfirmation` signature + impl; `hydrateRound` presses merge | ~10 lines |
| `src/lib/holeDecisions.ts` | `validateHoleDecisions`: presses must be a plain object; `hydrateHoleDecisions`: map to `Record<string, string[]>` | ~8 lines |
| `src/bridge/nassau_bridge.ts` | Change `hd.presses` reads to `hd.presses?.[cfg.id] ?? []` (2 sites) | ~2 lines |

**Test files:**

| File | Change |
|---|---|
| `src/lib/nassauPressDetect.test.ts` | Update `PressOffer` assertions to include `gameId`; update prior-hole press replay test with new shape |
| `src/lib/holeDecisions.test.ts` | Update presses build/validate/hydrate tests for new shape; add two-game scenario test |
| `src/store/roundStore.nassau.test.ts` | Update `setPressConfirmation` tests for new 3-arg signature; update store shape assertions |
| `src/bridge/nassau_bridge.test.ts` | Update T2 (press fixture) for new `HoleData.presses` shape; add new **T8** (two-Nassau-game round, same pair — presses from game A do not open a press in game B) |

**Does the NA-4 Playwright spec need updating?**  
No. `nassau-flow.spec.ts` exercises a single-Nassau-game round. The fix is transparent at the E2E level (behavior unchanged for single-game rounds). No Playwright assertion changes needed.

---

## 5. Test plan

### 5.1 Vitest cases needed

**`nassauPressDetect.test.ts` updates:**
- All 9 existing tests: update `PressOffer` assertions to include `gameId` field
- No new tests needed for detection — `gameId` is just threaded through from `game.id`

**`holeDecisions.test.ts` updates:**
- Existing build/validate/hydrate tests for presses: update shape from `['front']` to `{ 'game-1': ['front'] }`
- New: validate rejects flat array `['front']` for presses (old shape is now invalid)
- New: hydrate returns `{}` for old flat-array shape (backward-compat boundary test)

**`roundStore.nassau.test.ts` updates:**
- Existing `setPressConfirmation` tests: update to 3-arg call `(hole, gameId, matchId)`
- New: two `setPressConfirmation` calls with different gameIds on the same hole → both stored correctly without clobbering

**`nassau_bridge.test.ts` additions:**
- Update T2 (press fixture): `HoleData.presses` shape from `{ 2: ['front'] }` to `{ 2: { 'nassau-1': ['front'] } }`
- New **T8** (two-Nassau-game round, same pair, singles): both games share the same player pair and the same hole-2 scores; only game A has `presses['game-a-uuid'] = ['front']`; assert game B settles with NO press (press-1 absent from game B's events); zero-sum holds per game

### 5.2 Playwright spec changes

None required. Existing `nassau-flow.spec.ts` tests a single-game round; behavior is unchanged.

### 5.3 Regression surface

- `skins-flow.spec.ts`, `wolf-flow.spec.ts`, `stroke-play-finish-flow.spec.ts`: **no changes needed** — press scoping is Nassau-only
- `nassau_bridge.test.ts` T1, T3, T4, T5, T6, T7: need HoleData fixture shape updates for the new `presses` structure (Record vs array), but behavior is unchanged
- `nassauPressDetect.test.ts`: all existing tests need PressOffer shape update (add `gameId`)

---

## 6. Risks

### 6.1 Migration risk

**Existing rounds in dev DB** will have `presses` stored as flat arrays. After the fix, hydration silently drops them. For test rounds (which they all are — Nassau unparked 2026-05-01), this is acceptable. See §8 for the GM decision.

### 6.2 Scoring invariant risk

The fix does NOT change how the bridge computes settlement — it only changes which subset of `hd.presses` the bridge reads. For a single-game round (99% of real rounds), `hd.presses['game-id']` contains exactly the same match IDs that `hd.presses` did. Settlement is identical. Zero-sum is preserved.

For a two-game-same-pair scenario (the failure case), the fix prevents an unconfirmed press from being opened. This is the correct behavior — zero-sum is preserved per game because no phantom delta is introduced.

### 6.3 AGENTS.md ground-rule audit

| Ground rule | Impact |
|---|---|
| **#1 Rules come from docs** | Not affected — no rule-file changes |
| **#2 Integer-unit math only** | Not affected — stakes are unchanged |
| **#3 Settlement is zero-sum** | FIXED — the bug violated this; the fix restores it |
| **#4 Portability** | Not affected — no new imports |
| **#5 Handicap-in-one-place** | Not affected |
| **#6 Audit trail (ScoringEvent)** | Not affected — event emission unchanged |
| **#7 No silent defaults** | Not affected by the fix (the *current* bug silently opened a press; the fix *removes* the silent behavior) |
| **#8 Bet-id lookup is string-equality** | Not affected — `cfg.id === game.id` lookup is unchanged |

Reviewer gate items: the new T8 test (two-game scenario) is the primary gate. No scoring logic changes — reviewer concerns are limited to the shape change passing through the bridge correctly.

---

## 7. Estimate

**S–M** (single prompt, leaning toward the lower end of M).

**Breakdown:**
- Type change + store update + modal: XS (~20 LOC)
- nassauPressDetect + holeDecisions: S (~30 LOC + test updates)
- Bridge consumption change: XS (~5 LOC + T2/T8 test updates)
- Test fixture updates across 4 files: S (~40 LOC)

**Total:** ~95 LOC of source + ~80 LOC of tests. Fits comfortably in one engineering prompt. No schema migration (DB layer stores a JSON blob; only application-layer interpretation changes).

**Does it split?** No. All changes are in a single coherent data-shape change. Splitting would leave an intermediate state where the type is changed but the bridge hasn't been updated — invalid and not shippable. Bundle everything into one atomic commit (analogous to NA-1's F7 atomic-commit gate).

---

## 8. Open questions for GM

### Q1 — Dev DB migration strategy

**Context:** Existing `HoleDecision` rows (if any) store `presses: ['front']` (flat array). After the fix, `hydrateHoleDecisions` will silently drop these on reload.

**Options:**
- **A (wipe dev DB)** — Run `npx prisma db push --force-reset` or equivalent. All test Nassau rounds are discarded. Simplest; no migration code.
- **B (hydration shim)** — Add `if (Array.isArray(presses))` guard in `hydrateHoleDecisions` that returns `{}` for old shape. No DB changes; old rows just lose their press state on reload.
- **C (SQL migration)** — Update `HoleDecision` rows: `UPDATE "HoleDecision" SET decisions = decisions - 'presses' WHERE decisions ? 'presses' AND jsonb_typeof(decisions->'presses') = 'array'`. Removes old flat-array presses cleanly without dropping other fields.

**Recommendation:** Option A (wipe) for dev. The dev DB has only test Nassau rounds (game unparked ~5 days ago). No real data at risk.

**Question for GM:** Which option? If the dev DB has rounds you want to keep for other reasons (Skins, Wolf, Stroke Play results), option C is safer — it targets only the press field in Nassau HoleDecision rows.

### Q2 — Scope: fix `withdrew` scoping too?

**Context:** `holeData.withdrew: string[]` has the same flat-array-no-game-scope structure as `presses`. However, the bridge already has a non-participant guard: `if (!cfg.playerIds.includes(withdrawingPlayer)) continue`. This means `withdrew` entries for players NOT in a given Nassau game are silently skipped.

In the two-game-same-pair scenario, `withdrew` WOULD affect both games (same players → guard passes). This is arguably correct behavior (a player who withdraws from a round withdraws from all bets). But it could be debated.

**Question for GM:** Should `withdrew` also be game-scoped in this prompt, or leave it as-is and only fix `presses`? Recommendation: leave `withdrew` as-is (distinct semantics — withdrawal affects all player-matching bets) and file as a separate future item if needed.

### Q3 — Minimum viable fix vs. broader PressOffer type refactor

**Context:** The current fix adds `gameId` to `PressOffer` and changes the storage shape. An alternative "minimum viable" fix is to **not** change `HoleData.presses` at all, and instead have the bridge read `hd.presses` filtered to match IDs that belong to THIS game's `matches` array. This avoids the type/store change but has a subtle flaw: in singles mode, match IDs are the same across games (`'front'`, `'back'`, `'overall'`), so filtering by match ID doesn't help disambiguate.

The storage-level fix (proposed here) is the correct fix. The bridge-only filter is not sufficient for the failure case.

**No GM question needed** — the storage fix is clearly right. But noting it so GM has context when reviewing.

---

## Appendix: Trace summary

```
UI click "Accept Press" (PressConfirmationModal)
  → setPressConfirmation(hole, matchId)                [rootStore.ts:361]
    → holeData.presses.push(matchId)                   [flat string[], no game scope]
      → buildHoleDecisions → DB blob: {presses: ['front']}  [holeDecisions.ts:40]

Bridge (settleNassauBet, called per Nassau game)
  → for parentMatchId of hd.presses               [nassau_bridge.ts:89]
    → matches.find(m => m.id === parentMatchId)   [BOTH games find 'front']
      → openPress(...)                            [BOTH games open a press — BUG]

Proposed fix path:
  → setPressConfirmation(hole, gameId, matchId)        [new]
    → holeData.presses[gameId].push(matchId)           [Record<string, string[]>]
      → DB blob: {presses: {'game-a-uuid': ['front']}} [only game A]

Bridge (post-fix)
  → for parentMatchId of (hd.presses?.[cfg.id] ?? [])  [game-scoped]
    → game A finds 'front' → opens press               [CORRECT]
    → game B finds nothing → no press                  [CORRECT]
```
