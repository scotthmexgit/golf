# Glossary — Bet and Game Terminology

Last revised: 2026-04-26

> This glossary documents how bet and game terminology appears in the codebase today. It is descriptive, not prescriptive. It is not an authority for naming decisions, and it does not propose renames. Future renames remain valid; this doc tracks reality and gets updated when the code changes.
>
> Scope: bet and game terminology only. Other vocabulary (player roles, round structure, scoring units) is out of scope and may be documented in future glossary additions.

## The collision

"Bet" and "game" appear across the engine, schema, and UI with different names for the same concept. What the engine calls `BetSelection` (a configured wager in a round), the UI-facing TS types call `GameInstance`, and the Prisma schema calls `Game`. What the engine calls `BetType`, the UI-facing TS types call `GameType`. Neither naming is wrong for its layer; the collision is a product of the project growing across two naming eras. This glossary maps the aliases without prescribing a winner.

## Terms

### BetId

- **Layer/definition:** engine — `src/games/types.ts:17`
- **Meaning:** A string identifier that uniquely names one configured wager within a round; every `BetSelection` carries one and every `ScoringEvent` references it via the `declaringBet` field.
- **Cross-refs:** BetSelection, declaringBet

### BetSelection

- **Layer/definition:** engine — `src/games/types.ts:126`
- **Meaning:** The engine's representation of one configured wager in a round — contains a `BetId`, a `BetType`, stake, participants, a per-game config struct, and junk settings.
- **Cross-refs:** BetType, BetId, GameInstance, Game (schema)

### BetType

- **Layer/definition:** engine — `src/games/types.ts:124`
- **Meaning:** A string union naming the five implemented game kinds (`skins | wolf | nassau | matchPlay | strokePlay`); the engine uses this to dispatch scoring.
- **Cross-refs:** GameType, GAME_DEFS

### declaringBet

- **Layer/definition:** engine — `src/games/types.ts` (`WithBet`); used in `src/games/stroke_play.ts:164` and throughout `src/games/events.ts`
- **Meaning:** The `BetId` attached to every `ScoringEvent`, tying each audit event back to the wager that produced it.
- **Cross-refs:** BetId, BetSelection

### GAME_DEFS

- **Layer/definition:** TS types / UI — `src/types/index.ts:148`
- **Meaning:** An array of display metadata (key, label, description, player count constraints, disabled flag) for every game kind; the setup UI reads this to populate the "Add a game" picker and apply the `disabled` park flag for games not yet active.
- **Cross-refs:** GameType

### Game (schema model)

- **Layer/definition:** schema (Prisma) — `prisma/schema.prisma:74`
- **Meaning:** The persisted record for one configured wager in a round; stores `roundId`, `type` (a string matching `GameType`/`BetType`), `stake`, `playerIds`, and relates to `GameResult` rows.
- **Cross-refs:** GameResult, BetSelection, GameInstance

### GameInstance

- **Layer/definition:** TS types / UI store — `src/types/index.ts:60`
- **Meaning:** The UI-layer struct for one configured wager — mirrors `BetSelection` in purpose but carries UI-only fields (label, junk UI config) and string player IDs rather than engine-typed ones; the Zustand store's `games` array holds `GameInstance[]`.
- **Cross-refs:** BetSelection, Game (schema), GAME_DEFS

### GameType

- **Layer/definition:** TS types / UI — `src/types/index.ts:38`
- **Meaning:** A string union naming game kinds from the UI perspective; the superset of `BetType` (adds `stableford | bestBall | bingoBangoBongo | vegas`) because the UI lists all planned games while the engine only implements five.
- **Cross-refs:** BetType, GAME_DEFS

### JunkConfig

- **Layer/definition:** TS types / UI — `src/types/index.ts:42`
- **Meaning:** A flat boolean-and-amount struct controlling which junk side-events (greenie, sandy, birdie, eagle, garbage, hammer, snake, lowball) are active for a `GameInstance`; one `JunkConfig` is embedded per `GameInstance`.
- **Cross-refs:** GameInstance

## Concept map

**"A bet kind/category" (Skins, Wolf, Stroke Play, etc.):**

| Layer | Name |
|---|---|
| Engine | `BetType` |
| TS types | `GameType` |
| Schema field | `Game.type` (string) |
| UI | "Games" (setup labels) |

**"A configured wager in a round" (one instance with stake, players, config):**

| Layer | Name |
|---|---|
| Engine | `BetSelection` |
| TS types | `GameInstance` |
| Schema model | `Game` |
| UI | "Games" (setup) / "Bets" (nav) |

## Notes

`wager` appears once — `docs/games/game_stroke_play.md:17` as a section heading. Not a code entity. `SideBet` and `SideBetResult` were Prisma models removed in M-1 (2026-04-26); `SideBetConfig` and `SideBetHoleResult` remain as dead TypeScript interfaces in `src/types/index.ts:92,128` (left in place per M-1 fence, not in active use).

## Revision policy

Update this file whenever a cross-layer rename lands or a new alias is introduced; the concept map rows are the fastest thing to go stale.
