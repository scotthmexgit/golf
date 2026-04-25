# Pass 1 — Finalizer calling-convention refactor scope survey

Date: 2026-04-24  
Status: COMPLETE — no blocker

---

## 1. Verbatim signatures

### `finalizeNassauRound` (nassau.ts:481–485)

```typescript
export function finalizeNassauRound(
  config: NassauCfg,
  roundCfg: RoundConfig,
  matches: MatchState[],
): ScoringEvent[]
```

Returns: new events only (MatchTied, MatchClosedOut for open matches). Walks `matches[]`, emits for each `!match.closed` entry.

### `finalizeMatchPlayRound` (match_play.ts:413–417)

```typescript
export function finalizeMatchPlayRound(
  cfg: MatchPlayCfg,
  _roundCfg: RoundConfig,
  match: MatchState,
): { events: ScoringEvent[]; match: MatchState }
```

Returns: `{ events: ScoringEvent[], match: MatchState }`. Events are new events only (MatchHalved or MatchClosedOut, or `[]` if already closedOut). Note: return type is an object, not `ScoringEvent[]` directly.

### `finalizeStrokePlayRound` (stroke_play.ts:210–213)

```typescript
export function finalizeStrokePlayRound(
  events: ScoringEvent[],
  config: StrokePlayCfg,
): ScoringEvent[]
```

Returns: input events + new settlement events (see §2).

---

## 2. Passthrough behavior — verbatim code

### Outer function (stroke_play.ts:216–236)

```typescript
  const owned: ScoringEvent[] = []
  const passThrough: ScoringEvent[] = []
  for (const e of events) {
    if (STROKE_EVENT_KINDS.has(e.kind) && 'declaringBet' in e) owned.push(e)
    else passThrough.push(e)
  }

  const byBet = new Map<BetId, ScoringEvent[]>()
  for (const e of owned) {
    if (!('declaringBet' in e)) continue
    const list = byBet.get(e.declaringBet) ?? []
    list.push(e)
    byBet.set(e.declaringBet, list)
  }

  const result: ScoringEvent[] = [...passThrough]
  for (const [betId, betEvents] of byBet) {
    result.push(...finalizeBetEvents(betEvents, config, betId))
  }
  return result
```

Line 231: `[...passThrough]` means any input events NOT in STROKE_EVENT_KINDS flow through to the return.

### Inner function `finalizeBetEvents` (stroke_play.ts:262–264)

```typescript
  const passthrough = betEvents.filter((e) => !STROKE_EVENT_KINDS.has(e.kind))
  const result: ScoringEvent[] = [...betEvents]
```

Line 263: `[...betEvents]` — result starts with ALL input events for this bet (StrokePlayHoleRecorded, IncompleteCard, etc.), then settlement events are appended.

Line 262 `passthrough` is defined but functionally dead — line 271 (`return passthrough.length > 0 ? result : result`) returns `result` either way.

**Concrete effect**: a call with 4 × StrokePlayHoleRecorded events returns 4 × StrokePlayHoleRecorded + 1 × StrokePlaySettled (5 events, not 1).

---

## 3. What "normalize to new-events-only" requires per finalizer

### `finalizeNassauRound` — **No change needed.** Already returns new events only.

### `finalizeMatchPlayRound` — **No change needed.** Returns `{ events: [], match }` or `{ events: [new], match }`. No passthrough.

### `finalizeStrokePlayRound` — **Changes required** in `stroke_play.ts`:

In outer `finalizeStrokePlayRound` (lines 216–231):
- Remove the `passThrough` tracking entirely (lines 217, 218–221: `const passThrough = []` + the partition loop)
- Change `const result: ScoringEvent[] = [...passThrough]` → `const result: ScoringEvent[] = []`

In `finalizeBetEvents` (lines 262–264):
- Remove `const passthrough = betEvents.filter(...)` (line 262 — dead code anyway)
- Change `const result: ScoringEvent[] = [...betEvents]` → `const result: ScoringEvent[] = []`

**LOC estimate for stroke_play.ts**: ~8 LOC removed/changed (5 in outer function, 2 in finalizeBetEvents, 1 removal of dead passthrough var).

**No changes needed to `finalizeNassauRound` or `finalizeMatchPlayRound`.**

---

## 4. Consumer surface grep results

```
grep -rn "finalizeNassauRound\|finalizeMatchPlayRound\|finalizeStrokePlayRound" /src/ --include="*.ts"
```

| Location | File:line | Context |
|---|---|---|
| **aggregate.ts** import | aggregate.ts:22 | `import { ..., finalizeNassauRound } from './nassau'` |
| **aggregate.ts** import | aggregate.ts:24 | `import { ..., finalizeMatchPlayRound } from './match_play'` |
| **aggregate.ts** import | aggregate.ts:26 | `import { finalizeStrokePlayRound } from './stroke_play'` |
| **aggregate.ts** call | aggregate.ts:361 | `const events = finalizeNassauRound(bet.config as NassauCfg, roundCfg, matches)` |
| **aggregate.ts** call | aggregate.ts:367 | `const { events } = finalizeMatchPlayRound(bet.config as MatchPlayCfg, roundCfg, match)` |
| **aggregate.ts** call | aggregate.ts:377 | `const spEvents = finalizeStrokePlayRound(strokeEvents, bet.config as StrokePlayCfg)` |
| **nassau.test.ts** call | nassau.test.ts:579 | direct test call |
| **nassau.test.ts** call | nassau.test.ts:800 | direct test call |
| **nassau.test.ts** call | nassau.test.ts:1240 | direct test call |
| **match_play.test.ts** call | match_play.test.ts:571 | direct test call |
| **match_play.test.ts** call | match_play.test.ts:584 | direct test call |
| **match_play.test.ts** call | match_play.test.ts:601 | direct test call |
| **match_play.test.ts** call | match_play.test.ts:615 | direct test call |
| **stroke_play.test.ts** call | stroke_play.test.ts:125 | `return finalizeStrokePlayRound(events, cfg)` in `runRound()` helper |

All consumers confirmed. No callers outside aggregate.ts and the dedicated test files.

---

## 5. Per-consumer impact if `finalizeStrokePlayRound` returns new events only

### aggregate.ts (aggregate.ts:374–377)

```typescript
const strokeEvents = log.events.filter(
  e => e.kind === 'StrokePlayHoleRecorded' && e.declaringBet === bet.id
)
const spEvents = finalizeStrokePlayRound(strokeEvents, bet.config as StrokePlayCfg)
finalizerEvents.push(...spEvents)
```

Currently: `spEvents` = StrokePlayHoleRecorded × N + StrokePlaySettled × 1. After normalization: `spEvents` = StrokePlaySettled × 1 only.

The pre-bet filter `strokeEvents` was added to prevent cross-bet contamination (per comment at lines 372–376). With new-events-only return, the filter becomes optional but harmless. **Aggregate.ts does not need a code change** to be correct after normalization; the filter can stay.

The StrokePlayHoleRecorded events in the current `spEvents` hit `default: break` in `reduceEvent` (no money), so they cause no double-count now. Normalization makes this a non-issue.

### stroke_play.test.ts (stroke_play.test.ts:125)

`runRound()` helper calls `finalizeStrokePlayRound(events, cfg)` and returns the result. Test at **stroke_play.test.ts:204–206** explicitly asserts:

```typescript
it('emits exactly 18 StrokePlayHoleRecorded and exactly 1 StrokePlaySettled', () => {
  expect(events.filter((e) => e.kind === 'StrokePlayHoleRecorded')).toHaveLength(18)
  expect(events.filter((e) => e.kind === 'StrokePlaySettled')).toHaveLength(1)
```

This test **explicitly relies on passthrough behavior** — it expects 18 StrokePlayHoleRecorded in the finalizer's return. After normalization, it would get 0 StrokePlayHoleRecorded and fail.

**1 test case in stroke_play.test.ts requires update** (remove the StrokePlayHoleRecorded assertion, or change to assert 0 StrokePlayHoleRecorded).

### nassau.test.ts and match_play.test.ts — **No changes needed.** Their finalizers already return new-events-only.

---

## 6. Risk assessment

**Is passthrough relied on anywhere beyond aggregate.ts and stroke_play.test.ts?**
Grep confirms only 3 callers: aggregate.ts, stroke_play.test.ts, match_play.test.ts. Match_play.test.ts calls `finalizeMatchPlayRound` (no passthrough). Nassau.test.ts calls `finalizeNassauRound` (no passthrough). No other consumers.

**Does passthrough serve any purpose the caller depends on?**
- In aggregate.ts: NO. The pre-bet filter (`StrokePlayHoleRecorded` only) means passThrough in the outer function is always empty. And finalizeBetEvents's `[...betEvents]` echo flows through `reduceEvent`'s `default: break` — no money effect.
- In stroke_play.test.ts: YES, for one test (stroke_play.test.ts:204–206). The test is validating the internal return shape of finalizeStrokePlayRound, not any caller behavior. The test's intent is to verify event emission — after normalization, the assertion changes from "18 hole records + 1 settlement" to "1 settlement record."

**Other passthrough hazard (potential future caller bug)**: The passthrough design was apparently intended for multi-bet scenarios where a caller passes ALL events to one `finalizeStrokePlayRound` call. In that case, non-STROKE_EVENT_KINDS events would be echoed back. But aggregate.ts never does this (per-bet filter). Any future naive caller passing a mixed event log would get inputs echoed — a potential confusion source. Normalization eliminates this hazard.

---

## 7. Should the other two finalizers adopt passthrough?

**Counter-recommended.** Nassau and Match Play finalizers are called after the full log-event walk and after the per-game reduce loop. They emit new settlement events (MatchClosedOut, MatchTied, MatchHalved). Their callers (aggregate.ts) want only the new events to pass through `reduceEvent`. Echoing inputs would pass already-reduced events through `reduceEvent` a second time, potentially double-counting monetary events.

---

## Summary

| Finalizer | Convention | Change needed for normalization |
|---|---|---|
| `finalizeNassauRound` | New-events-only | None |
| `finalizeMatchPlayRound` | New-events-only (wrapped in `{events, match}`) | None |
| `finalizeStrokePlayRound` | Input + new events (passthrough) | **Yes** |

**Recommended direction**: Normalize `finalizeStrokePlayRound` to return new events only.

**Estimated scope**: **S** — ~8 LOC changes in stroke_play.ts, 1 test assertion update in stroke_play.test.ts. aggregate.ts: no required change (filter harmless either way).

**Files affected**: `src/games/stroke_play.ts` (8 LOC), `src/games/__tests__/stroke_play.test.ts` (1 test).

**No blocking issues.** Engineer can execute when authorized.
