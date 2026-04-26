---
prompt_id: SP4_CLOSE_HOUSEKEEPING
timestamp: 2026-04-25T19:42:00Z
checklist_item_ref: "SP-4 closure + hardcode tracking + rule-doc cosmetic cleanup (F1/F3/F4/F7/F9)"
tags: [housekeeping, sp4-close, hardcodes, rule-doc, checklist]
---

## Prompt

Three bundled housekeeping items post-SP-4: (1) record SP-4 closure in checklist, (2) document two hardcodes in buildSpCfg, (3) apply deferred cosmetic rule-doc fixes F1/F3/F4/F7/F9.

## Action

Read IMPLEMENTATION_CHECKLIST.md, src/bridge/stroke_play_bridge.ts (buildSpCfg area), docs/games/game_stroke_play.md (§4, §5, §11, §12), src/games/__tests__/stroke_play.test.ts (describe block names for Tests 8–16). Applied all edits.

---

## Item 1 — IMPLEMENTATION_CHECKLIST.md diffs

### Design Timeline row 5
- **Before:** `**active** — SP-1 is current item`
- **After:** `**done** — SP-1–SP-4 closed 2026-04-25; SP-5 deferred; SP-6 closed 2026-04-25`

### Active item section
- **Before:** SP-1 Stroke Play Rule Doc Check entry (never updated since initial set)
- **After:** `Operator decision: next bet to unpark, or address known follow-ups (see Parked / Deferred).` + one-line summary noting phase is structurally complete

### Done section — SP-1 through SP-4 added (after SP-6)

| Entry | Note |
|---|---|
| SP-1 | Rule doc check; 9 findings, none blocking; two session logs cited |
| SP-2 | HoleState builder; bridge file created; 316/316 tests |
| SP-3 | settleStrokePlayBet + payoutMapFromLedger; 326/326 tests |
| SP-4 | computeStrokePlay deleted; grep gate clean; programmatic playthrough 4/4 pass; browser deferred (not a gate — PayoutMap shape unchanged) |

SP-4 closure note includes verbatim: "Browser rendering verification deferred (no browser access at close); not a closure gate because PayoutMap shape contract is unchanged from legacy path."

### Two parking-lot entries added
- `src/bridge/stroke_play_bridge.ts buildSpCfg appliesHandicap hardcoded true (line 100)` — remove when Option β/γ
- `src/bridge/stroke_play_bridge.ts buildSpCfg junkMultiplier hardcoded 1 (line 103)` — remove when junk re-enters scope

---

## Item 2 — src/bridge/stroke_play_bridge.ts diffs (comments only)

Line 100 region:
```ts
    // HARDCODE (Option α Minimal): appliesHandicap is always true in v1 Stroke Play.
    // Replace with a config field read when Option β/γ expands scope beyond α and
    // per-game handicap toggling is supported. See STROKE_PLAY_PLAN.md §2.
    appliesHandicap: true,
    playerIds: game.playerIds,
    junkItems: [],
    // HARDCODE: GameInstance has no junkMultiplier field; junk is out of scope for
    // v1 Stroke Play (STROKE_PLAY_PLAN.md §1e). Replace when junk re-enters scope.
    junkMultiplier: 1,
```

No logic modified. Both hardcode values unchanged.

---

## Item 3 — docs/games/game_stroke_play.md diffs

### F1 — §4 interface renamed
- `interface StrokePlayConfig` → `interface StrokePlayCfg` (line 28)
- §5 pseudocode parameter `cfg: StrokePlayConfig` → `cfg: StrokePlayCfg` (line 60)

**Note:** `StrokePlayConfigError` (error class name) appears in new Test 13 entry at line 318 — this is a substring match, not the interface name. The interface rename is complete.

### F3 — §5 pseudocode function renamed
- `recordStrokePlayHole` → `settleStrokePlayHole` (line 59)

### F4 — §5 pseudocode return type changed
- `): ScoringEvent {` → `): ScoringEvent[] {` (line 61)
- Verified: line 61 now reads `): ScoringEvent[] {`

### F7 — §11 import path corrected
- Before: `and ScoringEvent from \`src/games/events.ts\``
- After: `and ScoringEvent from \`./types\``
- Note: Initial fix included parenthetical "(which re-exports from `src/games/events.ts`)" — corrected to plain `./types` to satisfy the F7 absence check.

### F9 — §12 test inventory expanded (Tests 8–16)

Nine new entries added after Test 7. Describe block names sourced from actual test file:

| Test | Describe block |
|---|---|
| 8 | `tieRule = 'split' — direct split emits TieFallthrough before StrokePlaySettled` |
| 9 | `tieRule = split — 3-way tie among 5 players → RoundingAdjustment` |
| 10 | `tieRule = card-back — back-9 tied, back-6 separates` |
| 11 | `tieRule = scorecard-playoff` |
| 12 | `Round Handicap integration (item 16 × Stroke Play)` |
| 13 | `typed errors: throw on invalid or missing config` |
| 14 | `MIGRATION_NOTES #15 fix: every split-resolution is preceded by TieFallthrough` |
| 15 | `§ 9: FieldTooSmall when fewer than 2 players complete the round` |
| 16 | `resolveTieByCardBack helper` |

---

## Grep verification (from constraint 11)

| Check | Result |
|---|---|
| `interface StrokePlayConfig` / `cfg: StrokePlayConfig` | **ABSENT** ✓ |
| `recordStrokePlayHole` | **ABSENT** ✓ |
| `src/games/events.ts` | **ABSENT** ✓ |
| `settleStrokePlayHole` present with `ScoringEvent[]` | **line 59–61** ✓ |

---

## Test count and tsc

- **Tests:** 326/326 (no additions) ✓
- **tsc `--noEmit --strict`:** `.next/types/validator.ts` 2 errors — **pre-existing**. Confirmed via `git stash` baseline: same 2 errors present before this session's changes. These errors are in a Next.js dev-server generated file (`.next/types/validator.ts`), which is included in `tsconfig.json` line 29 (`".next/types/**/*.ts"`). The production build (`npm run build`) succeeded cleanly. No new errors introduced. Source code is type-clean.

---

## No code logic modified

- `src/bridge/stroke_play_bridge.ts`: two comment blocks added; `buildSpCfg` return values unchanged
- `IMPLEMENTATION_CHECKLIST.md`: text entries only (closure records, parking lot items)
- `docs/games/game_stroke_play.md`: identifier renames, return type plural, import path correction, test inventory expansion — all documentation-only

## Noticed but out of scope

- `tsconfig.json` includes `.next/types/**/*.ts` which causes the pre-existing `validator.ts` error to appear in `tsc` output. This is a Next.js tsconfig pattern issue; fixing it would require modifying `tsconfig.json` or the Next.js config. Not addressed.
- `STROKE_PLAY_PLAN.md` has no status field at the top; per constraint 2 it was left unchanged. Checklist is the source of truth.

## Result

- **Files modified:** `IMPLEMENTATION_CHECKLIST.md`, `src/bridge/stroke_play_bridge.ts`, `docs/games/game_stroke_play.md`
- **Tests:** 326/326 ✓
- **tsc:** pre-existing `.next/` error only; no new errors ✓
- **SP-4 status:** Closed and recorded in Done section ✓
