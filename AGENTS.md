<!-- BEGIN:nextjs-agent-rules -->
# Agent rules — golf betting app

**Applies to:** every agent in `.claude/agents/` and every Claude Code run in this repo.
**When:** read this file before the first tool call of every session.

## Stack

Next.js 16.2 (App Router) + React 19 + TypeScript strict + Prisma 7 (PostgreSQL) + Tailwind 4 + Zustand.

## This is NOT the Next.js you know

Next.js 16 has breaking changes from what appears in model training data. Before calling any Next.js API, open `node_modules/next/dist/docs/` and read the relevant guide. Heed every deprecation notice. Do not invent APIs from memory.

## Five betting games in scope

Skins, Wolf, Nassau, Match Play, Stroke Play. Junk is the side-bet engine (not a game). Canonical rules: `docs/games/game_<name>.md`. No agent may restate rules inline — link to the game file.

Current status (live scope in `IMPLEMENTATION_CHECKLIST.md`):
- All five engines (Skins, Wolf, Nassau, Match Play, Stroke Play) landed under `src/games/` (#3–#8 closed 2026-04-24). Junk Phase 1–2 landed; Phase 3 deferred.
- Active phase: Wolf — see `docs/plans/WOLF_PLAN.md`. Current item: WF-6 (Playwright wolf-flow.spec.ts). WF-1–WF-5 closed 2026-04-30.
- Old scoring in `src/lib/*` remains live; Stroke Play cutover is SP-4; full multi-bet cutover deferred (phase 7).

## Source of truth

- **Rules:** `docs/games/game_<name>.md` plus the two cross-cutting files below.
- **Types:** `src/types/index.ts` and Prisma `schema.prisma`.
- **Scoring (target path):** `src/games/<name>.ts`.
- **Scoring (pre-cutover parallel path):** `src/lib/scoring.ts`, `payouts.ts`, `handicap.ts`, `junk.ts`.
- **Active scope:** `IMPLEMENTATION_CHECKLIST.md` Active item → active plan for that item's AC (currently `docs/plans/STROKE_PLAY_PLAN.md` for the Stroke-Play-only phase; `REBUILD_PLAN.md` retained for #3–#10 history).
- **History (not a todo list):** `MIGRATION_NOTES.md`, `AUDIT.md`.
- **Skill entry point for rule questions:** `.claude/skills/golf-betting-rules/SKILL.md`.

## Cross-cutting rule docs

Apply to every game; override no game-specific logic.

- `docs/games/_ROUND_HANDICAP.md` — per-player, per-round handicap adjustment layered onto `courseHcp` before `strokesOnHole`. Inherited at the handicap-computation boundary.
- `docs/games/_FINAL_ADJUSTMENT.md` — post-hole-18 human-arbitration screen. Every game defers tie/dispute resolution beyond its own rules to this screen.

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

Unclear or multi-role intents route to `team-lead`. A single-role intent routes directly. Default bias: explore before execute — if a task starts with a question about the codebase or docs, route `researcher` before `engineer`.

## Ground rules every agent follows

A change that violates any of these fails `reviewer`.

1. **Rules come from docs.** Rule answers live in `docs/games/game_<name>.md` or the `golf-betting-rules` skill. No agent answers rule questions from training data when a rule file exists. No agent restates rule content inline — link to the file.
2. **Integer-unit math only.** Stakes are integers in minor units (cents). No `Float` in Prisma. No `toFixed` in scoring. No floating-point arithmetic anywhere in `src/games/`. Tests assert `Number.isInteger` on every delta.
3. **Settlement is zero-sum.** Per round, `Σ delta == 0` across all betting players, per game and in total. Unresolvable rounding emits a `RoundingAdjustment` event. Silent zero-pay on a tied hole is a correctness bug.
4. **Portability.** Scoring code under `src/games/` imports zero of: `next/*`, `react`, `react-dom`, `fs`, `path`, `window`, `document`, `localStorage`. Targets a future React Native / Expo port.
5. **Handicap-in-one-place.** Every course-handicap computation and every strokes-on-hole lookup goes through `src/games/handicap.ts`. No other file reimplements USGA allocation. Gross and net are explicit in every signature and variable name.
6. **Audit trail.** Every delta-producing action emits a typed variant of the `ScoringEvent` union in `src/games/events.ts`, carrying `{ timestamp, hole, actor, delta, kind }`. The event log is the settlement record — no delta exists outside it.
7. **No silent defaults.** Every tie, carryover, press, closeout, withdrawal, missing card, and rounding adjustment emits an explicit event. A scoring function that returns a zero delta without a corresponding event is a bug.
8. **Bet-id lookup is string-equality.** `b.id === cfg.id`. Reference-identity comparisons (`b.config === cfg`) are the known anti-pattern closed by REBUILD_PLAN #4 — any new code that reintroduces it fails review.

## Session checklist

Before the first tool call, every agent:

- [ ] Reads this file.
- [ ] Reads the Active item in `IMPLEMENTATION_CHECKLIST.md` and the matching AC in the active plan (`docs/plans/STROKE_PLAY_PLAN.md` for the current phase).
- [ ] Reads the relevant `docs/games/game_<name>.md` before writing scoring code.
- [ ] Reads `.claude/skills/golf-betting-rules/SKILL.md` before answering a rule or settlement question.
<!-- END:nextjs-agent-rules -->