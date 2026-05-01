---
prompt_id: 10
timestamp: 2026-05-01
checklist_item_ref: "Prompt 10 — Persistence layer migration (combined)"
tags: [persistence, migration, schema, nassau, paused, plan]
---

## Codex Probe

**SUCCEEDED.** Auth active (ChatGPT login, scotthmex@gmail.com), shared session at `unix:/tmp/cxc-H5mcxW/broker.sock`. Codex will be invoked when Develop resumes.

---

## Explore Findings

### prisma/schema.prisma

```prisma
model Score {
  id         Int     @id @default(autoincrement())
  roundId    Int
  playerId   Int
  hole       Int
  gross      Int
  putts      Int?
  fromBunker Boolean @default(false)
  @@unique([roundId, playerId, hole])       // ← per-PLAYER-per-hole
}

model Game {
  id        Int          @id @default(autoincrement())
  roundId   Int
  type      String
  stake     Int
  playerIds Int[]
  // no config column yet
}
```

**Score is per-player-per-hole.** Decision fields (wolfPick, presses, greenieWinners, bangoWinner, dots) are **per-hole, not per-player**.

### PUT /api/rounds/[id]/scores/hole/[hole]/route.ts

One `prisma.score.upsert` per player per hole. Body: `{ scores: ScoreInput[] }` where `ScoreInput` is `{ playerId, gross, putts, fromBunker }`. No decisions blob today.

### POST /api/rounds/route.ts

`gameInstances` typed as `{ type: string; stake: number; playerIds: string[] }[]` — `g.playerIds` accepted but immediately discarded; all-betting-players substituted. Fake-roundId fallback at line 78.

### GET /api/rounds/[id]/route.ts

Games serialized as `{ id, type, stake, playerIds }` — no config. Scores serialized as `{ playerId, hole, gross, putts, fromBunker }` — no decisions.

### src/store/roundStore.ts hydrateRound (lines 263-270)

Builds GameInstance with only `id, type, label, stake, playerIds, junk`. HoleData with only `scores, dots` (default dots). Neither config nor decisions fields are restored.

### Wizard submit (src/app/round/new/page.tsx:97-120)

Sends full `gameInstances` (which includes `pressRule`, `pressScope` etc from Zustand). On catch, falls back to client-only `Date.now()` round — same silent-failure behavior as the server fallback.

### Validator scope estimate

Game config validators (nassau/wolf/skins only): ~80 lines. Under the 150-line stop threshold if decisions validators are deferred. Adding decisions validators brings total to ~120 lines — still under. **Validator complexity: not a stop condition.**

---

## Plan (partial — stopped at decisions schema decision)

### Part A — Game config (no stop condition, READY to proceed)

**1. Schema** — add `config Json?` to `Game`:
```prisma
model Game {
  id        Int          @id @default(autoincrement())
  roundId   Int
  type      String
  stake     Int
  playerIds Int[]
  config    Json?        // game-type-specific config; NULL = use buildXxxCfg defaults
  round     Round        @relation(fields: [roundId], references: [id])
  results   GameResult[]
}
```
Migration name: `add_config_and_decisions_json` (or split into two migrations if GM chooses Option 2 for decisions — see Part B).

**2. Validator file** — `src/lib/gameConfig.ts` (name follows existing `gameGuards.ts` pattern):
```typescript
// buildGameConfig(game: GameInstance) → Record<string, unknown> | null
// validateGameConfig(type: GameType, config: unknown) → ValidationResult
// hydrateGameConfig(type: GameType, config: unknown) → Partial<GameInstance>
```
Per-type switch for nassau (pressRule/pressScope/pairingMode), wolf (loneWolfMultiplier/escalating), skins (escalating), others null. Enum validation rejects unknown values with HTTP 400 at POST; logs at hydration.

**3. POST /api/rounds** — three changes:
- Use `g.playerIds` from wizard (validate each against `playerRecords`, reject unknown with 400)
- Call `buildGameConfig(g)`, write to `Game.config`
- Replace `catch { return NextResponse.json({ roundId: Date.now() }) }` → `return NextResponse.json({ error: 'Failed to create round' }, { status: 500 })`

**4. GET /api/rounds/[id]** — include `config: g.config ?? null` in games serialization.

**5. hydrateRound** — per-type config deserialization:
```typescript
const cfg = g.config && typeof g.config === 'object' ? g.config as Record<string, unknown> : {}
const gameInstance: GameInstance = {
  ...,
  ...(g.type === 'nassau' && {
    pressRule: (cfg.pressRule as GameInstance['pressRule']) ?? 'manual',
    pressScope: (cfg.pressScope as GameInstance['pressScope']) ?? 'nine',
    pairingMode: cfg.pairingMode as GameInstance['pairingMode'] | undefined,
  }),
  ...(g.type === 'wolf' && {
    loneWolfMultiplier: typeof cfg.loneWolfMultiplier === 'number' ? cfg.loneWolfMultiplier : undefined,
    escalating: typeof cfg.escalating === 'boolean' ? cfg.escalating : undefined,
  }),
  ...(g.type === 'skins' && {
    escalating: typeof cfg.escalating === 'boolean' ? cfg.escalating : undefined,
  }),
}
```

**6. Client error handling** — `src/app/round/new/page.tsx:108-117`: check `res.ok`; on 4xx/5xx surface error to user instead of navigating. Remove `catch` client-side `Date.now()` fallback.

**7. Tests** — round-trip config tests (nassau/wolf/skins), POST validation-rejection tests, POST failure → 500 test, g.playerIds fidelity test.

**Part A scope: ~4 files changed + 1 new file + migration. Validators ~80 lines. READY TO PROCEED.**

---

### Part B — Per-hole decision state (⚠️ STOP — schema decision needed)

**The problem:** `Score` has `@@unique([roundId, playerId, hole])`. Decisions (wolfPick, presses, greenieWinners, bangoWinner) are **per-hole, not per-player**. Putting `decisions Json?` on `Score` forces either:
- Storing the same blob on every player's Score row for that hole (N-way duplication, inconsistent under concurrent updates)
- Picking one player's row as canonical (arbitrary, breaks if that player has no Score row yet)

Both are wrong. The prompt explicitly flags this as a STOP condition.

**Three options for GM:**

#### Option 1: New `HoleDecision` model (recommended)

```prisma
model HoleDecision {
  id        Int    @id @default(autoincrement())
  roundId   Int
  hole      Int
  decisions Json   // { wolfPick?, presses?, greenieWinners?, bangoWinner?, dots? }
  round     Round  @relation(fields: [roundId], references: [id])
  @@unique([roundId, hole])
}
```

- **Pro:** correct normalization; `@@unique([roundId, hole])` exactly matches the per-hole semantics; GET can `include: { holeDecisions: true }` alongside scores; PUT upserts into HoleDecision separately from Score upserts
- **Con:** new table, one more `include` in GET, PUT handler gains one more upsert after the score transaction
- **Impact on migration:** `add_config_and_decisions_json` covers both `Game.config` and `HoleDecision` in one migration

#### Option 2: `holeDecisions Json?` on `Round`

```prisma
model Round {
  ...existing fields...
  holeDecisions Json?  // { [holeNumber]: { wolfPick?, presses?, greenieWinners?, bangoWinner? } }
}
```

- **Pro:** no new table; Round is already fetched by GET; simpler schema
- **Con:** whole-Round blob requires a JSON merge on every PUT (concurrent-safe only with transactions; fragile to partial updates); Round model grows large for 18-hole rounds with many decisions; the blob isn't indexed (can't query "all rounds with a press on hole 5")
- **Impact on PUT:** must `prisma.round.update({ data: { holeDecisions: mergedBlob } })` after scoring

#### Option 3: Defer decisions persistence to a separate phase

Persist only `Game.config` now (Part A closes GAME-CONFIG-JSON-MIGRATION, API-GAME-PLAYERIDS-IGNORED, POST-FAKE-ROUNDID-FALLBACK). File `PER-HOLE-DECISION-STATE` as a separate phase item. Nassau presses continue to rely on Zustand within-session only until that phase.

- **Pro:** smaller scope, atomic commit is still large but doesn't block on schema design
- **Con:** Nassau press survivability across sessions remains unfixed; the "single atomic commit" intent of the prompt is partially satisfied

**Recommendation: Option 1 (HoleDecision table) + proceed now.** It's 5 extra lines in the schema and one more upsert in PUT. If Option 3 is acceptable (defer decisions), that also works cleanly. Option 2 is the least preferred.

---

## Status

**PAUSED AT PLAN — awaiting GM decision on per-hole decisions schema (Part B).**

Part A (Game.config, POST/GET/hydrateRound for game config, g.playerIds fix, fake-roundId fix, validators) is fully designed and ready to implement without further questions.

Part B requires GM choice between:
1. HoleDecision new table (recommended — correct semantic, clean normalization)
2. Round.holeDecisions Json? (denormalized but no new table)
3. Defer decisions to a separate phase (Part A ships alone in this prompt)

**No source changes. No commit for this report.**

---

**Persistence migration paused at Plan — Score model schema question for GM: decisions are per-hole but Score is per-player-per-hole. Three options: (1) new HoleDecision table [recommended], (2) Round.holeDecisions Json? blob, (3) defer decisions to separate phase, ship Part A only now. Awaiting GM decision.**
