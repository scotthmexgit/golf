---
prompt_id: 08
timestamp: 2026-05-01
checklist_item_ref: "NA-2 — Nassau wizard setup + F10 hydrateRound"
tags: [na-2, engineering, nassau, wizard, f10, paused]
---

## Prompt

Build Nassau setup wizard UI (pressRule, pressScope, pairingMode). Wire hydrateRound to map Nassau config fields from API response. Requires F10 Explore gate to pass first.

## Codex Probe

Probe result: **SUCCEEDED.** Codex ready, auth active (ChatGPT login, scotthmex@gmail.com), shared session runtime live at `unix:/tmp/cxc-H5mcxW/broker.sock`. Codex review will be invoked at end of Develop when NA-2 resumes.

## Explore Findings — F10 Gate

### Layer 1: Prisma schema (prisma/schema.prisma)

`Game` model:
```prisma
model Game {
  id        Int          @id @default(autoincrement())
  roundId   Int
  type      String
  stake     Int
  playerIds Int[]
  round     Round        @relation(fields: [roundId], references: [id])
  results   GameResult[]
}
```

**Finding:** NO `pressRule`, `pressScope`, `pairingMode` columns. No `config` JSON blob. Nassau-specific fields have no persistence path.

### Layer 2: POST /api/rounds (route.ts)

```typescript
games: {
  create: (gameInstances || []).map((g: { type: string; stake: number; playerIds: string[] }) => ({
    type: g.type,
    stake: g.stake,
    playerIds: ...,
  })),
},
```

**Finding:** Game creation writes only `type`, `stake`, `playerIds`. Nassau config fields (`pressRule`, `pressScope`, `pairingMode`) are silently dropped at round creation time — they never reach the DB.

### Layer 3: GET /api/rounds/[id] (route.ts)

```typescript
games: round.games.map((g) => ({
  id: g.id,
  type: g.type,
  stake: g.stake,
  playerIds: g.playerIds,
})),
```

**Finding:** Serialization returns only `id`, `type`, `stake`, `playerIds`. Even if Prisma had the fields, they are not included in the GET response.

### Layer 4: hydrateRound (roundStore.ts:263-270)

```typescript
const games: GameInstance[] = apiGames.map(g => ({
  id: String(g.id),
  type: g.type as GameType,
  label: GAME_DEFS.find(d => d.key === g.type)?.label ?? g.type,
  stake: g.stake,
  playerIds: g.playerIds.map(String),
  junk: defaultJunk(g.stake),
}))
```

**Finding:** GameInstance is reconstructed without Nassau fields. On every round hydration, `pressRule`/`pressScope`/`pairingMode` silently revert to buildNassauCfg defaults. This is the F10 audit finding.

### Breadth note

The gap is broader than Nassau: Wolf's `loneWolfMultiplier`, `escalating`, and all other `GameInstance` game-specific config fields (lines 67–78 of `src/types/index.ts`) are equally unprotected — no DB column, no serialization, no hydration mapping. NA-2 is the first phase to need a persisted game-specific config field. The migration design should be forward-compatible with future game types.

## Plan

**F10 Gate verdict: FAILED.** Three layers are all missing: Prisma schema, POST creation, GET serialization. Engineering (wizard, hydrateRound wiring) is blocked until a Prisma migration lands.

**NA-2 is paused at Plan boundary.**

---

### Migration scope required

Two design options for GM decision:

#### Option A: Three nullable String columns on `Game`

```prisma
model Game {
  id          Int    @id @default(autoincrement())
  roundId     Int
  type        String
  stake       Int
  playerIds   Int[]
  pressRule   String?    // nullable; NULL treated as 'manual' in hydrateRound
  pressScope  String?    // nullable; NULL treated as 'nine'
  pairingMode String?    // nullable; NULL derived from playerIds.length
  round       Round        @relation(fields: [roundId], references: [id])
  results     GameResult[]
}
```

- Migration name: `add_nassau_game_config_fields`
- Pros: explicit columns, easy to query/index, TypeScript-typed at Prisma client boundary
- Cons: requires another migration when Match Play (`format`, `holesToPlay`) or Wolf (`loneWolfMultiplier`) need persistence; schema change per new game-type field

#### Option B: Single `config Json?` column (recommended)

```prisma
model Game {
  id        Int          @id @default(autoincrement())
  roundId   Int
  type      String
  stake     Int
  playerIds Int[]
  config    Json?        // game-type-specific config blob; hydrateRound deserializes per type
  round     Round        @relation(fields: [roundId], references: [id])
  results   GameResult[]
}
```

- Migration name: `add_game_config_json`
- Pros: single migration handles all current and future game-type-specific fields (Wolf, Match Play, Nassau, Vegas, Stableford); no schema change per new game type; aligns with existing `GameResult.detail Json`
- Cons: less structured at DB layer; no column-level constraints on config field values; requires JSON parse in hydrateRound

**Recommendation: Option B.** Wolf, Match Play, and future game types all have game-specific config fields. A single `config Json?` stores them all; `hydrateRound` deserializes per type. This avoids a migration per game type. Aligns with the existing `GameResult.detail Json` pattern in the schema.

---

### Engineering scope after migration lands (NA-2 resumed)

**Three-file engineering block:**

1. **POST /api/rounds** — write `config` from wizard GameInstance into DB:
   ```typescript
   // For nassau: config = { pressRule, pressScope, pairingMode }
   // For other types: config = null or {}
   create: (gameInstances || []).map((g) => ({
     type: g.type,
     stake: g.stake,
     playerIds: ...,
     config: buildGameConfig(g),  // derives JSON blob per type
   }))
   ```

2. **GET /api/rounds/[id]** — include `config` in games serialization:
   ```typescript
   games: round.games.map((g) => ({
     id: g.id, type: g.type, stake: g.stake, playerIds: g.playerIds,
     config: g.config ?? null,
   }))
   ```

3. **hydrateRound** — deserialize `config` per game type, apply defaults:
   ```typescript
   const cfg = (g.config && typeof g.config === 'object') ? g.config as Record<string, unknown> : {}
   const gameInstance: GameInstance = {
     id: String(g.id), type: g.type as GameType,
     label: GAME_DEFS.find(d => d.key === g.type)?.label ?? g.type,
     stake: g.stake,
     playerIds: g.playerIds.map(String),
     junk: defaultJunk(g.stake),
     ...(g.type === 'nassau' && {
       pressRule: (cfg.pressRule as GameInstance['pressRule']) ?? 'manual',
       pressScope: (cfg.pressScope as GameInstance['pressScope']) ?? 'nine',
       pairingMode: (cfg.pairingMode as GameInstance['pairingMode']) ?? undefined,
       // pairingMode=undefined → buildNassauCfg derives from playerIds.length
     }),
   }
   ```

**Two-file wizard block:**

4. **`src/components/setup/GameInstanceCard.tsx`** — add Nassau config section (conditionally rendered for `game.type === 'nassau'`): pressRule selector, pressScope selector, pairingMode toggle. Reuse existing `updateGame` store action.

5. **Test file** (pattern TBD after migration lands): two hydrateRound test cases (explicit fields preserved; missing fields default).

---

### Migration prompt proposed

A new GM prompt is needed before NA-2 can resume:

```
Objective: Prisma migration — add game_config_json column to Game model.
In scope:
  - Add `config Json?` to Game model in prisma/schema.prisma
  - Generate migration: npx prisma migrate dev --name add_game_config_json
  - Apply to local dev DB
  - Verify: GET /api/rounds/[id] serialization passes config through (even if null)
  - No wizard, no hydrateRound wiring — that is NA-2 scope
Out of scope: wizard UI, hydrateRound changes, POST changes (those wait for NA-2)
Success: migration applied, `npm run build` clean, `npx tsc --noEmit` clean, existing 454 tests pass
```

Alternatively, PM can authorize GM to fold the migration into NA-2 as the first step of Develop — the migration is small (one schema line + `prisma migrate dev`) and NA-2 engineering is naturally blocked on it anyway.

## Result

**NA-2 PAUSED at F10 Explore gate.**

- Codex probe: SUCCEEDED (ready for Develop phase when NA-2 resumes)
- F10 gate: FAILED — Prisma `Game` model missing `pressRule`/`pressScope`/`pairingMode` (and no `config` blob); POST creation silently drops these; GET serialization omits them; hydrateRound has no mapping
- No files changed; no commit

## Open questions

1. **Option A vs Option B for migration design** — does GM prefer three explicit columns or single `config Json?` blob? Recommendation above is Option B.
2. **Migration-as-separate-prompt vs fold-into-NA-2** — does GM want a dedicated migration prompt, or should NA-2 be reissued with the migration as its first step?

## Parking lot additions

- **BRIDGE-WITHDRAWAL-DETECTION-FOLD** — Should deferred bridge-level withdrawal detection (NA-1 Open question: `HoleData.withdrew` field + bridge auto-detect) be folded into NA-3 or dropped? Recommended resolution: evaluate in NA-3 Explore — if NA-3's already-planned scope touches `HoleData` data model, fold; otherwise drop and revisit only when a UI consumer needs it. — 2026-05-01 — NA-2 scope maintenance

---

**NA-2 paused at F10 Explore gate — Prisma/API gap detected. Three-layer gap: schema missing config columns; POST silently drops Nassau fields; GET omits them. Option B (config Json?) recommended migration. Awaiting GM decision on migration scope and Option A/B choice.**
