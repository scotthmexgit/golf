---
prompt_id: "05"
timestamp: 2026-05-07T00:00:00Z
checklist_item_ref: "Phase 7 — WF7-1 wizard config completeness"
tags: [plan, wf7-1, wolf, schema]
status: AWAITING_GM_APPROVAL
---

# WF7-1 Plan — Wolf Wizard Config Completeness (wolfTieRule)

**Step 4 (diff-level pre-review):** skipped — no approval gate triggered (see below)  
**Approval gate status:** STOP — surfacing to GM before Develop

---

## Step 1 — Explore findings

### Architecture finding: no Prisma migration needed

**Wolf-specific config does not go on the `Game` Prisma model as a column.** The existing pattern (confirmed by reading `src/lib/gameConfig.ts` and `prisma/schema.prisma`) is:

- Prisma `Game` model has `config Json?` — a single JSON blob for all game-type-specific config
- `loneWolfMultiplier` (the existing wolf config field) is stored inside this blob, not as a column
- `buildGameConfig(game)` serializes `GameInstance` fields → blob; `hydrateGameConfig(blob)` deserializes → `Partial<GameInstance>`
- `validateGameConfig(type, blob)` and `validateGameConfigInput(type, rawGame)` guard at the POST boundary

**`wolfTieRule` follows the same pattern**: stored in `Game.config`, not as a new column. **No Prisma schema migration.**

### Current wolf config layer in `src/lib/gameConfig.ts`

```
WOLF_KEYS = Set(['loneWolfMultiplier', 'escalating'])
buildGameConfig wolf: { loneWolfMultiplier, escalating }
validateGameConfig wolf: validates loneWolfMultiplier (integer) + escalating (boolean)
hydrateGameConfig wolf: returns { loneWolfMultiplier, escalating }
```

### Current bridge hardcode in `src/bridge/wolf_bridge.ts:38`

```typescript
// HARDCODE: tieRule not on GameInstance; 'carryover' is the most common Wolf
// rule and doubles the pot on consecutive tied holes. Replace when surfaced.
tieRule: 'carryover',
```

### Store initialization in `src/store/roundStore.ts:171`

```typescript
if (type === 'wolf') inst.loneWolfMultiplier = 2
```

### Wizard in `src/components/setup/GameInstanceCard.tsx` (wolf section)

```tsx
{game.type === 'wolf' && (
  <>
    <div className="flex items-center gap-2">
      <label>Solo wolf pays</label>
      <div className="flex gap-1">
        {[2, 3].map(m => (
          <Pill label={`${m}×`} active={(game.loneWolfMultiplier ?? 2) === m} ... />
        ))}
      </div>
    </div>
    <div className="text-[10px]">Wolf rotates in player order. Golfer 1 starts.</div>
  </>
)}
```

---

## Step 2 — Plan

### Proposed type union for `wolfTieRule`

```typescript
// in GameInstance:
wolfTieRule?: 'carryover' | 'no-points'
```

### Backward compatibility

- Existing rounds in DB: `Game.config` is either `null` or `{ loneWolfMultiplier: N }`. No `wolfTieRule` key.
- `hydrateGameConfig` returns `{}` for absent keys → `wolfTieRule` is `undefined` on the in-memory `GameInstance`.
- `buildWolfCfg` reads `game.wolfTieRule ?? 'carryover'` → existing rounds use `'carryover'` exactly as before.
- **No existing round is impacted.** Behavior is identical pre/post WF7-1 for all rounds without an explicit `wolfTieRule` selection.

### Files to modify (7 files, no new files, no migration)

| File | Change |
|---|---|
| `src/types/index.ts` | Add `wolfTieRule?: 'carryover' \| 'no-points'` to `GameInstance` |
| `src/lib/gameConfig.ts` | 5 changes: new `WOLF_TIE_RULES` const; expand `WOLF_KEYS`; `buildGameConfig`; `validateGameConfig`; `hydrateGameConfig` |
| `src/bridge/wolf_bridge.ts` | Replace `tieRule: 'carryover'` hardcode with `game.wolfTieRule ?? 'carryover'`; remove HARDCODE comment |
| `src/store/roundStore.ts` | Add `inst.wolfTieRule = 'carryover'` in addGame wolf case (consistent with loneWolfMultiplier init) |
| `src/components/setup/GameInstanceCard.tsx` | Add tieRule pill row in wolf section |
| `src/bridge/wolf_bridge.test.ts` | Add 3 test cases: null→carryover, explicit carryover, explicit no-points |
| `src/lib/gameConfig.test.ts` | Add wolfTieRule cases for build/validate/hydrate functions |

### Change details

**`src/lib/gameConfig.ts`:**
```typescript
// Add constant (alongside NASSAU_PRESS_RULES etc.)
const WOLF_TIE_RULES = new Set(['carryover', 'no-points'])

// Expand WOLF_KEYS
const WOLF_KEYS = new Set(['loneWolfMultiplier', 'escalating', 'wolfTieRule'])

// buildGameConfig wolf case — add one line:
if (game.wolfTieRule !== undefined) out.wolfTieRule = game.wolfTieRule

// validateGameConfig wolf case — add one check:
if (obj.wolfTieRule !== undefined && !WOLF_TIE_RULES.has(String(obj.wolfTieRule))) {
  return { ok: false, reason: `Wolf config: invalid wolfTieRule "${obj.wolfTieRule}"` }
}

// hydrateGameConfig wolf case — add one field:
wolfTieRule: (obj.wolfTieRule === 'carryover' || obj.wolfTieRule === 'no-points')
  ? obj.wolfTieRule
  : undefined,
```

**`src/components/setup/GameInstanceCard.tsx` (wolf section addition after loneWolfMultiplier pills):**
```tsx
<div>
  <label className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Tied hole</label>
  <div className="flex gap-1.5 mt-1">
    <Pill label="Carry" active={(game.wolfTieRule ?? 'carryover') === 'carryover'}
      onClick={() => updateGame(game.id, { wolfTieRule: 'carryover' })} />
    <Pill label="No pts" active={game.wolfTieRule === 'no-points'}
      onClick={() => updateGame(game.id, { wolfTieRule: 'no-points' })} />
  </div>
</div>
```

### Schema delta summary for GM review

**Prisma schema:** No change.  
**DB migration:** None.  
**Config blob key:** `wolfTieRule` added to the `Game.config` JSON blob when explicitly set; omitted (null fallback) when not set.  
**Existing rounds:** Unaffected. `hydrateGameConfig` returns `undefined` for absent `wolfTieRule` → bridge defaults to `'carryover'`.

---

## Codex pre-review finding (P2) — tieRule default

**Codex session:** 019e02bd-f646-7f43-9395-c83dc657a02b

**Finding:** The plan specified `'carryover'` as the bridge default for `wolfTieRule`, but `docs/games/game_wolf.md:130` is explicit:

> `| \`no-points\` *(default)* | Hole is voided...`

And line 133: "`tieRule` is a field on `WolfConfig` (defaults to `no-points`)`"

**Disposition:** Rule-doc-mandated correction. The bridge hardcode (`tieRule: 'carryover'`) was wrong — it was an author opinion ("most common Wolf rule"), not derived from the game doc. Per ground rule 1 (rules from docs), the correct default is `'no-points'`.

**Updated plan:** `wolfTieRule` defaults and wizard initial value change from `'carryover'` → `'no-points'`.

**Behavior delta for existing wolf rounds:** Rounds created under WF-0–WF-7 (with null/absent `wolfTieRule`) were settled with `tieRule = 'carryover'` (bridge hardcode). After WF7-1, those same rounds will settle with `tieRule = 'no-points'` when no explicit selection is stored. **This is a behavior change for any existing Wolf round that had a tied hole.** Rounds with no tied holes are unaffected.

**GM decision required:** Does the behavior change for existing null-config Wolf rounds acceptable? If yes, proceed with `'no-points'` (rule-correct). If no, we add an explicit migration path (set `wolfTieRule = 'carryover'` in existing Game.config blobs for wolf rounds with null config before applying WF7-1).

---

## Approval gate surface

**1. Generated migration SQL:** None. No Prisma migration needed.  
The `Game.config Json?` field (added in migration `20260501174021_add_config_and_decisions_json`) already handles wolf-specific config. `wolfTieRule` is stored as a blob key, following the identical pattern as `loneWolfMultiplier`.

**2. Proposed type union:** `wolfTieRule?: 'carryover' | 'no-points'` on `GameInstance`.

**3. Existing round data impact:** TWO ISSUES:

- (a) **No schema impact.** `Game.config Json?` already exists. No new columns, no migration.
- (b) **Scoring behavior change for existing rounds with tied Wolf holes.** Rounds created during WF-0–WF-7 had the bridge default `'carryover'`. After WF7-1, null-config Wolf rounds will default to `'no-points'` (per rule doc). Any round where Wolf tied holes occurred will settle differently. GM must confirm this is acceptable, OR request a backfill approach.

**GM confirmation needed:**
- [ ] No-migration approach (wolfTieRule in config blob): **confirmed** / rejected
- [ ] `'no-points'` as default (rule-correct, behavior change for old rounds): **confirmed** / backfill needed

---

**STOP — waiting for GM approval to proceed to Develop (Steps 4–7).**

Once approved: Develop modifies the 7 files listed above, runs `npm run test:run` (Vitest), `npx tsc --noEmit`, and the reviewer sub-agent, then files a codex post-review. Report lands as `06-wf71-develop.md`.
