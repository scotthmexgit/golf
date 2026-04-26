---
prompt_id: SP1_RULE_DOC_EDITS
timestamp: 2026-04-25T18:32:00Z
checklist_item_ref: "SP-1 follow-on: apply five targeted edits to game_stroke_play.md"
tags: [sp1, documenter, rule-doc-edit, stroke-play]
---

## Prompt

Apply five targeted edits to `docs/games/game_stroke_play.md` based on SP-1 verification findings F2, F5, F6, F8, and the `/tmp` constraint. Out of scope: F1, F3, F4, F7, F9.

## Action

1. Read `docs/games/game_stroke_play.md` in full (confirmed live text before constructing edits).
2. Grepped for `/tmp` in the rule doc — **zero hits**. Reference exists only in `stroke_play.ts` engine file header comment, not in the markdown. SP-1 session log mis-attributed it to §11. Constraint 5 is a no-op on the rule doc; noted below.
3. Applied four edits.

---

## Edits applied

### F2 — §4: Added `id: BetId` as first field (line 29)

**Before:**
```ts
interface StrokePlayConfig {
  stake: number                    // integer minor units, default 100, min 1
```

**After:**
```ts
interface StrokePlayConfig {
  id: BetId                        // unique bet identifier; used for event emission and bet-id lookups
  stake: number                    // integer minor units, default 100, min 1
```

---

### F5 — §5: Removed phantom `delta` field from pseudocode return (line 67–68)

**Before:**
```ts
  return { kind: 'StrokePlayHoleRecorded', hole: state.hole, actor: 'system',
           timestamp: state.timestamp, delta: zero(cfg.playerIds), nets }
```

**After:**
```ts
  return { kind: 'StrokePlayHoleRecorded', hole: state.hole, actor: 'system',
           timestamp: state.timestamp, nets }
```

Function name, return type, and all other pseudocode lines untouched (F3, F4 out of scope).

---

### F6 — §9: Replaced withdrawal phantom spec (line 155)

**Before:**
```
- **Player withdraws mid-round** — withdrawing player is excluded from final rankings; remaining players settle per `settlementMode`. The withdrawn player's `stake` ante (in `places` mode) is redistributed: add `stake` evenly back to remaining players; remainder routes to `RoundingAdjustment`.
```

**After:**
```
- **Player withdraws mid-round** — out of scope for this engine. A withdrawn player who records no further gross scores is handled via IncompleteCard (see the Missing-score case above).
```

Operator decision (this session): mid-round withdrawal is not worth contemplating. Replacement is in-place; no other mention of withdrawal added elsewhere.

---

### F8 — §11: Corrected tieRule dispatch ownership (line 222–223)

**Before:**
```
`aggregate.ts` owns the `tieRule` dispatch.
```

**After:**
```
`stroke_play.ts` owns the `tieRule` dispatch (all branching on `config.tieRule`, all calls to `resolveTieByCardBack` / `resolveTieByScorecardPlayoff` / `emitSplitSettlement`). `aggregate.ts` is the caller; it invokes `finalizeStrokePlayRound` and forwards the result.
```

Verified against `aggregate.ts:370–377` in SP-1 pass: `aggregate.ts` calls `finalizeStrokePlayRound` and does nothing else with tieRule.

---

### Constraint 5 — `/tmp/round-4-notes.md` reference: **no-op**

`grep -n "/tmp" docs/games/game_stroke_play.md` → zero hits. The reference is in `stroke_play.ts` line 17 (engine file header comment: `// Divergences logged to /tmp/round-4-notes.md:`), not in the rule doc. The SP-1 session log mis-attributed it to §11 of the markdown. No edit made to `game_stroke_play.md` for this item. The engine file's stale `/tmp` comment is a separate finding, out of scope for this documenter prompt.

---

## Grep verification (absence checks)

| Check | Command | Result |
|---|---|---|
| phantom `delta` field gone | `grep -n "delta: zero"` | **ABSENT** ✓ |
| old dispatch claim gone | `grep -n "aggregate.ts owns the tieRule"` | **ABSENT** ✓ |
| withdrawal phantom spec gone | `grep -n "withdrawing player is excluded\|redistributed"` | **ABSENT** ✓ |
| `/tmp` never in rule doc | `grep -n "/tmp"` | **ABSENT** (was never present) ✓ |

Positive-presence verification:
- `id: BetId` → line 29 ✓
- `stroke_play.ts owns the tieRule dispatch` → line 223 ✓
- `out of scope for this engine` → line 155 ✓
- `timestamp: state.timestamp, nets }` (no delta) → line 68 ✓

---

## Out-of-scope findings not touched

| Finding | Description | Status |
|---|---|---|
| F1 | Interface name `StrokePlayConfig` → `StrokePlayCfg` | Not touched |
| F3 | Pseudocode function name `recordStrokePlayHole` | Not touched |
| F4 | Pseudocode return type `ScoringEvent` → `ScoringEvent[]` | Not touched |
| F7 | §11 import path `events.ts` vs `./types` | Not touched |
| F9 | §12 test inventory missing Tests 8–16 | Not touched |

---

## SP-1 report status

`2026-04-25/SP1_STROKE_PLAY_RULE_DOC_CHECK_25-April-2026.md` is unchanged. It stands as the historical verification record at the time of SP-1. Findings F2, F5, F6, F8 are now resolved in the doc; F1, F3, F4, F7, F9 remain open in the report.

---

## Noticed but out of scope

- `stroke_play.ts:17` — engine file header comment references `/tmp/round-4-notes.md` as a divergence log. This is a stale developer artifact in the TypeScript source, not the rule doc. Removing it would be a code-hygiene edit, not a documenter task.

## Result

- **Files touched:** `docs/games/game_stroke_play.md`
- **Edits applied:** 4 (F2, F5, F6, F8)
- **Edits not applied:** 1 (constraint 5 — `/tmp` reference absent from target file)
- **Out-of-scope findings not touched:** F1, F3, F4, F7, F9
