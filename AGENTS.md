<!-- BEGIN:nextjs-agent-rules -->
# Agent rules — golf betting app

**Applies to:** every agent in `.claude/agents/` and every Claude Code run in this repo.
**When:** read this file before the first tool call of every session.

## Stack

Next.js 16.2 (App Router) + React 19 + TypeScript strict + Prisma 7 (PostgreSQL) + Tailwind 4 + Zustand.

## This is NOT the Next.js you know

Next.js 16 has breaking changes from what appears in model training data. Before calling any Next.js API, open `node_modules/next/dist/docs/` and read the relevant guide. Heed every deprecation notice. Do not invent APIs from memory.

## Five implemented betting games

Skins, Wolf, Nassau, Match Play, Stroke Play. Canonical rules: `docs/games/game_<name>.md`. No agent may restate rules inline — link to the game file.

## Source of truth

- **Rules:** `docs/games/game_<name>.md`
- **Types:** `src/types/index.ts` and Prisma `schema.prisma`
- **Scoring (target path):** `src/games/<name>.ts` (migration tracked in `MIGRATION_NOTES.md`)
- **Current scoring (pre-migration):** `src/lib/scoring.ts`, `src/lib/payouts.ts`, `src/lib/handicap.ts`, `src/lib/junk.ts`
- **Skill entry point for rule questions:** `.claude/skills/golf-betting-rules/SKILL.md`

## Cross-cutting docs

Two rule files apply to every game and override no game-specific logic. They live alongside `docs/games/game_<name>.md` and are read before, or in addition to, the per-game file whenever their concern is touched.

- `docs/games/_ROUND_HANDICAP.md` — per-player, per-round handicap adjustment layered onto `courseHcp` before `strokesOnHole`. No game restates the math; every handicap-aware game inherits it at the handicap-computation boundary.
- `docs/games/_FINAL_ADJUSTMENT.md` — post-hole-18 human-arbitration screen for tie and dispute resolution. Every game defers tie resolution beyond its own rules to this screen.

## User intent → agent routing

| User intent | First responder | Hands off to |
|---|---|---|
| "How does game X score hole Y?" | `golf-betting-rules` skill → `docs/games/game_<name>.md` | — |
| "Explain X's press / tie / closeout / Lone Wolf rule" | `golf-betting-rules` skill → `docs/games/game_<name>.md` | — |
| "Add / change scoring for X" | `engineer` | `reviewer` (gate) |
| "Implement / migrate `src/lib/*.ts` to `src/games/*.ts`" | `engineer` | `reviewer` |
| "Change the Prisma schema" | `engineer` (must include migration) | `reviewer` |
| "Change the UI / scorecard / setup flow" | `engineer` | — |
| "Rule is ambiguous; what do USGA / R&A say?" | `researcher` | `documenter` (records citation) |
| "Draft / update `docs/games/*.md`" | `documenter` | `reviewer` |
| "Update README / AGENTS / skill text" | `documenter` | `reviewer` |
| "Review this scoring / rule / schema change" | `reviewer` | — |
| "Add a new betting game" | `team-lead` → `researcher` → `documenter` → `engineer` | `reviewer` |
| "Plan end-to-end feature (scoring + UI + docs)" | `team-lead` | every role |
| "Ship this / declare done" | `team-lead` | `reviewer` (mandatory gate) |

Unclear or multi-role intents route to `team-lead`. A single-role intent routes directly.

## Ground rules every agent follows

Seven rules apply to every action in this repo. A change that violates any of them fails `reviewer`.

1. **Rules come from docs.** For every rule question, the answer lives in `docs/games/game_<name>.md` or `.claude/skills/golf-betting-rules/SKILL.md`. No agent answers rule questions from training data when a rule file exists. No agent restates a rule file's content inline — link to the file.
2. **Integer-unit math only.** Stakes are integers in the app's minor unit (cents). No `Float` in Prisma (see `MIGRATION_NOTES.md` item 2 for the pending migration). No `toFixed` in scoring. No floating-point arithmetic anywhere in `src/games/`. Tests assert `Number.isInteger` on every delta.
3. **Settlement is zero-sum.** For every round, `Σ delta == 0` across all betting players, per game and in total. A tie that cannot settle without a rounding remainder emits a `RoundingAdjustment` event that restores zero-sum. A silent zero-pay on a tied hole is a correctness bug.
4. **Portability.** Scoring code under `src/games/` imports zero of: `next/*`, `react`, `react-dom`, `fs`, `path`, `window`, `document`, `localStorage`. The scoring engine targets a future React Native / Expo port.
5. **Handicap-in-one-place.** Every course-handicap computation and every strokes-on-hole lookup goes through `src/games/handicap.ts`. No other file reimplements USGA allocation. Gross and net are explicit in every function signature and variable name.
6. **Audit trail.** Every delta-producing action emits a typed variant of the `ScoringEvent` discriminated union in `src/games/events.ts`, carrying `{ timestamp, hole, actor, delta, kind }`. The event log is the settlement record — no delta exists outside it.
7. **No silent defaults.** Every tie, carryover, press, closeout, withdrawal, missing card, and rounding adjustment emits an explicit event. A scoring function that returns a zero delta without a corresponding event is a bug. A press that opens without a `PressOpened` event whose `actor` is the confirming player is a bug.

## Session checklist

Before the first tool call, every agent:

- [ ] Reads this file.
- [ ] Reads the relevant `docs/games/game_<name>.md` before writing scoring code.
- [ ] Reads `.claude/skills/golf-betting-rules/SKILL.md` before answering a rule or settlement question.
- [ ] Checks `MIGRATION_NOTES.md` for known contradictions before editing `src/lib/payouts.ts` or `prisma/schema.prisma`.
<!-- END:nextjs-agent-rules -->
