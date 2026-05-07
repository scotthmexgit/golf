---
prompt_id: "06"
timestamp: 2026-05-07T00:00:00Z
checklist_item_ref: "Phase 7 — WF7-1 wizard config completeness (wolfTieRule)"
tags: [develop, wf7-1, wolf, config]
status: AWAITING_GM_REVIEW
---

# WF7-1 Develop Report — wolfTieRule Wizard Config

**Verification mode:** Standard (approval gate triggered during Plan; GM approved Develop)  
**Reviewer:** APPROVED  
**Codex post-review:** 2 findings — 1 GM-confirmed-acceptable (existing rounds), 1 addressed autonomously

---

## Step 4 — Diff-level pre-review

Skipped. The schema gate was moot (no Prisma migration). Step 4 only runs on approval-gate prompts.

"Step 4 skipped — no Prisma migration / not high-stakes diff."

---

## Step 5 — Develop

### Files modified (7 files, no new files, no migration)

| File | Change |
|---|---|
| `src/types/index.ts` | Added `wolfTieRule?: 'no-points' \| 'carryover'` to `GameInstance` |
| `src/bridge/wolf_bridge.ts` | Replaced `tieRule: 'carryover'` hardcode with `game.wolfTieRule ?? 'no-points'`; added rule-doc reference comment |
| `src/lib/gameConfig.ts` | Added `WOLF_TIE_RULES`; expanded `WOLF_KEYS`; updated `buildGameConfig`, `validateGameConfig` (with string-type guard), `hydrateGameConfig` wolf cases |
| `src/store/roundStore.ts` | Added `inst.wolfTieRule = 'no-points'` in `addGame` wolf init |
| `src/components/setup/GameInstanceCard.tsx` | Added "Tied hole" pill row (No pts / Carry) in wolf wizard section |
| `src/bridge/wolf_bridge.test.ts` | Added W12a/b/c (3 new describes); fixed W5 to use explicit `wolfTieRule: 'carryover'` (was relying on old hardcode) |
| `src/lib/gameConfig.test.ts` | Added wolfTieRule tests: build (3), validate (4), hydrate (3), round-trip (2) |

### Ground rule 1 correction

The WF-0 bridge hardcode `tieRule: 'carryover'` was an author opinion ("most common Wolf rule"), not derived from `docs/games/game_wolf.md`. WF7-1 corrects this:

```typescript
// Before (WF-0 hardcode — ground rule 1 violation):
// HARDCODE: tieRule not on GameInstance; 'carryover' is the most common Wolf
// rule and doubles the pot on consecutive tied holes. Replace when surfaced.
tieRule: 'carryover',

// After (WF7-1 — rule-doc derived):
// Default per docs/games/game_wolf.md §5: tieRule defaults to 'no-points'.
tieRule: game.wolfTieRule ?? 'no-points',
```

Rule doc (`docs/games/game_wolf.md:130`): `| \`no-points\` *(default)* | Hole is voided...`

### Test fix (W5)

W5 was testing carryover behavior but relied on the old `'carryover'` bridge hardcode. Fixed to explicitly set `wolfTieRule: 'carryover'` in the fixture:

```typescript
// Before:
const game = makeWolfGame(PLAYERS_4, { stake: 100, loneWolfMultiplier: 3 })
// After:
const game = { ...makeWolfGame(PLAYERS_4, { stake: 100, loneWolfMultiplier: 3 }), wolfTieRule: 'carryover' as const }
```

### Autonomous fix (Codex P2-2)

Codex flagged that `String(['carryover'])` === `'carryover'` allows array values to pass enum validation at the POST boundary. Fixed `validateGameConfig` to require a string type before set membership check:

```typescript
// Before:
if (obj.wolfTieRule !== undefined && !WOLF_TIE_RULES.has(String(obj.wolfTieRule))) {
// After:
if (obj.wolfTieRule !== undefined && (typeof obj.wolfTieRule !== 'string' || !WOLF_TIE_RULES.has(obj.wolfTieRule))) {
```

Autonomous fix justified: in-scope, no schema/API/security impact, unambiguous, single expression, high confidence.

---

## Step 6 — Codex post-review

**Session ID:** 019e02c6-e09e-7090-8d4e-8012c9fe2778

| Finding | Priority | Disposition |
|---|---|---|
| Preserve legacy Wolf tie behavior for old rounds | P2 | Deferred — GM confirmed at approval gate: "All existing Wolf rounds are test data with no historical value. Move on." |
| Reject non-string wolfTieRule values at POST boundary | P2 | Addressed autonomously — string type guard added to `validateGameConfig`; test added. |

**Autonomous fixes applied:** 1  
**Reviewer sub-agent verdict:** APPROVED (all 7 ground rules satisfied; 625/625 tests green)

---

## Verification

- `npm run test:run`: 22 files, 625 tests — all pass
- `npx tsc --noEmit`: clean
- Reviewer sub-agent: APPROVED
- `grep -rn "tieRule: 'carryover'" src/bridge/wolf_bridge.ts`: 0 matches (hardcode removed)

---

## For Cowork to verify

WF7-1 is config/wizard only — no scoring behavioral changes visible in existing rounds without a tied hole. Cowork verification is batched with WF7-4 (end of Phase 7 Wolf pilot) rather than triggered now. When Cowork runs, verify:
- Wolf wizard shows "Tied hole" selector (No pts / Carry pills)
- Selection persists through round creation
- Existing Wolf rounds without wolfTieRule in config still load and display correctly
