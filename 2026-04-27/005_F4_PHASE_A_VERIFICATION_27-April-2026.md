---
prompt_id: 005
timestamp: 2026-04-27T00:00:00Z
checklist_item_ref: "PF-1-F4 phase (a) — type-contract verification: DB Int[] round-trip chain"
tags: [researcher, pf-2, f4, type-contract, verification]
---

## Prompt

F4 phase (a): verify the full int-array round-trip chain for `Game.playerIds` before any code edit lands. Confirm or refute consistency end-to-end. Confirm score PUT does not use `game.playerIds`. Write explicit chain with file:line. Deliver verdict: consistent (phase b is a one-line fix) or inconsistent (list sites needing change).

## Action

Grepped and read all sites in the chain:
- `prisma/schema.prisma:82`
- `src/app/api/rounds/route.ts:63-67`
- `src/app/api/rounds/[id]/route.ts:83-88`
- `src/store/roundStore.ts:87-93` (hydrateRound type signature)
- `src/store/roundStore.ts:257-263` (hydrateRound implementation)
- `src/types/index.ts:60-65` (GameInstance interface)
- `src/bridge/stroke_play_bridge.ts:62` (bettingPlayers filter)
- `src/games/stroke_play.ts:81-82` (assertValidStrokePlayCfg playerIds check)
- `src/app/api/rounds/[id]/scores/hole/[hole]/route.ts` (score PUT player validation)

## Result

### Full chain with file:line

| Step | Site | Value / Type | Notes |
|---|---|---|---|
| 1. DB schema | `prisma/schema.prisma:82` | `playerIds Int[]` | PostgreSQL integer array. Currently always `[]` due to hardcode at step 2. |
| 2. Round creation POST | `src/app/api/rounds/route.ts:66` | `playerIds: []` | Hardcoded empty. `g.playerIds` from wizard payload (Zustand strings like `"uuid-abc"`) is ignored. |
| 3. GET response serialization | `src/app/api/rounds/[id]/route.ts:87` | `playerIds: g.playerIds` | Passes Prisma `Int[]` as-is. Prisma serializes to JSON numbers: `[1, 2]`. No conversion. |
| 4. hydrateRound type signature | `src/store/roundStore.ts:91` | `playerIds: string[]` | TypeScript annotation only. The actual runtime value arriving from step 3 is `number[]`. No runtime conversion enforced. |
| 5. hydrateRound implementation | `src/store/roundStore.ts:262` | `playerIds: g.playerIds as string[]` | TypeScript `as` cast — **zero runtime conversion**. At runtime Zustand holds `[1, 2]` (numbers), not `["1", "2"]` (strings). |
| 6. GameInstance type | `src/types/index.ts:65` | `playerIds: string[]` | Declared as `string[]`. Zustand runtime value after hydration is `number[]` — silent type lie via `as`. |
| 7. Bridge filter | `src/bridge/stroke_play_bridge.ts:62` | `players.filter(p => game.playerIds.includes(p.id))` | `p.id` is `String(rp.playerId)` = `"1"` (string). `[1, 2].includes("1")` → `false` (JS strict equality). `bettingPlayers = []`. |
| 8. assertValidStrokePlayCfg | `src/games/stroke_play.ts:81-82` | `playerIds.length < 2 → throw` | Currently throws because `playerIds = []`. After populating with `[1, 2]`, length check passes — but `bettingPlayers = []` from step 7 means settlement is incorrect. |

### In-session (non-hydrated) path — for comparison

- `addGame` at `src/store/roundStore.ts:152-158`: `bettingIds = players.filter(p => p.betting).map(p => p.id)` — these are string UUIDs (Zustand player IDs set at round creation from the wizard). So `game.playerIds = ["uuid-abc", "uuid-def"]` in Zustand during a live session.
- POST sends `gameInstances: store.games` → `g.playerIds = ["uuid-abc", "uuid-def"]` → ignored at `api/rounds/route.ts:66` → DB stores `[]`.
- The in-session path works because Zustand held the correct string IDs; the hydration path breaks because the DB stored `[]` and would store integers after fix.

### Score PUT path (unaffected)

`src/app/api/rounds/[id]/scores/hole/[hole]/route.ts` validates players via `prisma.roundPlayer.findMany({ where: { roundId } })`. It does not reference `game.playerIds` at any point. Confirmed: score writes are independent of this chain.

### Verdict: **CHAIN INCONSISTENT**

The F4 fix at `api/rounds/route.ts:66` alone is **insufficient**. Two sites need changing:

1. **`src/app/api/rounds/route.ts:66`** — populate `playerIds` with integer player IDs from `playerRecords` (the original proposed fix). This stores `[1, 2]` in the DB.

2. **`src/store/roundStore.ts:262`** — change `playerIds: g.playerIds as string[]` to `playerIds: g.playerIds.map(String)`. This performs the actual runtime conversion: `[1, 2]` → `["1", "2"]`, matching `PlayerSetup.id = String(rp.playerId)`.

Without fix (2), `game.playerIds.includes(p.id)` in the bridge returns `false` for all players (number vs string comparison), `bettingPlayers` is empty, and settlement produces incorrect results even after the StrokePlayConfigError stops throwing.

No other sites in the chain require changes.

## Open questions

- F4 phase (b) is now a two-file edit, not a one-line fix. Operator should confirm scope before dispatch.
- The `hydrateRound` type signature at `roundStore.ts:91` declares `games: { playerIds: string[] }[]` but the actual API response delivers `number[]`. The `map(String)` fix at step 5 makes the runtime value match the declared type. No type signature change needed beyond that.

## Parking lot additions

- None (chain inconsistency already captured in the triage report's F4 section; this verifies it)

## Stop condition triggered

Stop condition 5 applies: chain is INCONSISTENT. F4 phase (b) is NOT dispatchable until the operator reviews this finding and authorizes the two-file scope. Batch halted at item 4 per instructions. No further engineer turns executed.
