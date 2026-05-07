---
prompt_id: "02"
timestamp: 2026-05-09T00:00:00Z
tags: [discovery, nassau, press, manual, b5]
status: AWAITING_GM_TRIAGE
---

# B5 — Nassau Manual Press: Discovery Report

**Trigger:** Cowork findings 2026-05-09 round 51 — Manual press unreachable from UI.  
**Type:** Investigation only. No fixes. No code changes.

---

## Summary verdict

**Verdict (b) — Partially wired.**

Engine, bridge, store, and the accept/decline modal component are all correctly implemented and wired. The single gap is in the **press offer detection layer** (`nassauPressDetect.ts`): it explicitly returns `[]` for Manual mode with a source comment pointing to a never-built `NA-4` UI button. No Manual press trigger component exists anywhere in the UI. The auto-press modal (`PressConfirmationModal`) would work for Manual presses if offered to it, but it never receives Manual offers.

**Fix estimate (b):** Medium. Engine and modal are done. Needs: a per-hole "Press?" button on the scorecard (rendered when `pressRule === 'manual'` and a down player exists), wired to the existing `setPressConfirmation` store action. No new engine work, no schema changes, no bridge changes.

---

## 1. Engine handling (nassau.ts)

`offerPress` correctly differentiates Manual from Auto rules:

```typescript
// nassau.ts:183-184
if (cfg.pressRule === 'auto-2-down' && lead !== 2) return []
if (cfg.pressRule === 'auto-1-down' && lead !== 1) return []
```

For `pressRule === 'manual'`, neither guard fires. The comment states:

> "In manual mode, offerPress is only invoked when the down player has opted in (caller's responsibility per rule file § 5). In auto modes, offerPress filters by the exact threshold."

The engine is pure and correct. It will produce a `PressOffered` event if called with the right `PressConfirmation`. It does not self-trigger under Manual; it expects the caller (the UI layer) to invoke `offerPress` when the player opts in. The caller never does.

**Engine: ✓ correctly implemented. The gap is above the engine, not in it.**

---

## 2. Bridge handling (nassau_bridge.ts)

`buildNassauCfg` passes `pressRule` through directly from `GameInstance`:

```typescript
// nassau_bridge.ts:40
pressRule: game.pressRule ?? 'manual',
```

The bridge's hole loop reads confirmed presses from `hd.presses?.[cfg.id]` and calls `openPress` for each confirmed match ID. This is the same mechanism used for Auto presses — the `presses` blob on `HoleData` is the only thing driving press creation in the bridge. If the UI wrote `matchId` into `hd.presses` via `setPressConfirmation`, the bridge would process it identically for Manual as for Auto.

**Bridge: ✓ correctly implemented. Manual presses would flow through the bridge without any changes.**

---

## 3. Store and persistence (roundStore.ts, prisma/schema.prisma)

`setPressConfirmation` exists in the store and works correctly:

```typescript
// roundStore.ts:378-385
setPressConfirmation: (hole, gameId, matchId) => set((state) => ({
  holes: state.holes.map(h => {
    if (h.number !== hole) return h
    const existing = h.presses ?? {}
    const arr = existing[gameId] ?? []
    return { ...h, presses: { ...existing, [gameId]: [...arr, matchId] } }
  }),
})),
```

Presses are persisted via the `HoleDecision` JSON blob (`prisma/schema.prisma:93`):

```prisma
decisions Json   // per-hole decision state (wolfPick, presses, greenieWinners, bangoWinner, dots)
```

The `buildHoleDecisions` function (called in `proceedSave`) bundles the current `hd.presses` into the PUT body. The existing persistence path handles Manual presses identically to Auto presses — there is no Manual-specific store or schema gap.

**Store: ✓ implemented. Schema: ✓ implemented. No new store slice or schema migration needed.**

---

## 4. UI components (nassauPressDetect.ts + scorecard page)

This is where the gap lives.

### nassauPressDetect.ts — explicit early return for Manual

```typescript
// nassauPressDetect.ts:38 (with file header comment at line 1-8)
// "Only fires for pressRule=auto-2-down or auto-1-down. Manual mode is player-
// triggered (future NA-4 UI button); returns [] immediately for manual/undefined."

export function detectNassauPressOffers(...): PressOffer[] {
  if (!game.pressRule || game.pressRule === 'manual') return []
  // ... auto-mode detection logic ...
}
```

The file header states plainly: **"Manual mode is player-triggered (future NA-4 UI button)."** This button was never built.

### Scorecard page — only calls the auto-mode detector

```typescript
// page.tsx:210-218
// Detect auto-mode press offers across ALL Nassau games.
const nassauGames = games.filter(g => g.type === 'nassau')
const allOffers = nassauGames.flatMap(g =>
  detectNassauPressOffers(currentHole, holes, players, g)
)
if (allOffers.length > 0) {
  setPendingPressOffers(allOffers)
  return
}
```

The page's only press-trigger path calls `detectNassauPressOffers` which returns `[]` for Manual. `pendingPressOffers` is never populated for Manual rounds. The modal never shows.

### PressConfirmationModal — exists, functional, never shown for Manual

The component is fully implemented. It renders when `pendingPressOffers.length > 0`, queues multiple offers, handles Accept (`setPressConfirmation`) and Decline, then calls `onComplete` to proceed with the hole save. There is nothing Manual-specific missing from the modal itself — it just needs to receive a `PressOffer` array to display.

### No Manual press button exists

A grep across `src/components/`, `src/store/`, and `src/app/scorecard/` finds zero references to a Manual press trigger, a "Press?" button, a "Request press" UI element, or any component that would initiate a Manual press. The **absence is total** — there is no hidden or conditional component waiting to be switched on.

**UI: ✗ Manual press trigger does not exist. The component infrastructure (modal + store + bridge) is ready; only the trigger is missing.**

---

## 5. E2E coverage (nassau-flow.spec.ts)

The spec header is explicit:

```
Nassau: pressRule='auto-2-down', pressScope='nine', pairingMode='singles', stake=500
```

The entire spec uses `auto-2-down`. Manual press is not exercised at any point. There is no Manual-press test anywhere in the codebase.

**E2E coverage of Manual press: none.**

---

## 6. Gap summary

| Layer | Status | Notes |
|---|---|---|
| Engine (`nassau.ts` `offerPress`) | ✓ done | Manual passes through; caller must invoke when player opts in |
| Engine (`nassau.ts` `openPress`) | ✓ done | Creates MatchState when given a `PressConfirmation` |
| Bridge (`nassau_bridge.ts`) | ✓ done | Reads `hd.presses` and calls `openPress`; identical for Manual and Auto |
| Store (`roundStore.ts` `setPressConfirmation`) | ✓ done | Writes matchId to `hd.presses[gameId]` |
| Persistence (schema `HoleDecision.decisions`) | ✓ done | JSON blob includes `presses`; PUT path includes it |
| Press modal (`PressConfirmationModal`) | ✓ done | Accept/Decline wired; works for any `PressOffer[]` input |
| **Press offer detector** (`nassauPressDetect.ts`) | **✗ gap** | Explicit `return []` for Manual with `// NA-4` TODO note |
| **Manual press trigger** (scorecard UI) | **✗ gap** | No button, no affordance; never existed |
| E2E coverage (Manual press) | **✗ gap** | No test |

---

## 7. Fix scope if approved (Verdict b)

**What needs to be built:**

1. **A Manual press offer detector** (new function, or extend `nassauPressDetect.ts`): given `currentHole`, `holes`, `players`, and a Manual-mode `GameInstance`, compute which matches have a down player eligible for a press and return `PressOffer[]`. This is a subset of the existing `detectNassauPressOffers` logic — the MatchState threading is identical; the only difference is no auto-threshold filter. The engine's `offerPress` already handles Manual correctly once called.

2. **A per-hole "Press?" button on the scorecard**: rendered after scoring when `pressRule === 'manual'` and the Manual detector finds at least one eligible match. This is the "player opts in" gate the engine expects. Tapping it would feed offers into `pendingPressOffers` → `PressConfirmationModal` → `setPressConfirmation` → normal bridge flow. The modal itself needs no changes.

3. **E2E coverage**: one Manual press test scenario (player down after 2 holes, presses, press match settles).

**What does NOT need to change:**

- `nassau.ts` (engine) — no changes
- `nassau_bridge.ts` — no changes
- `roundStore.ts` — no changes (or at most a very small addition)
- `prisma/schema.prisma` — no changes
- `PressConfirmationModal.tsx` — no changes
- `buildHoleDecisions` — no changes

**Estimate: Medium (M).** The detection function is ~30-50 lines mirroring existing logic. The scorecard button integration requires reading current MatchState from the detector, conditional rendering on the scorecard page, and connecting to `pendingPressOffers`. Testing (Playwright) adds another small slice. Single session is plausible; two-session approach (Explore/Plan + Develop) is safer given scorecard page complexity.
