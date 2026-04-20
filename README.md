# Golf Betting App

A Next.js 16 (App Router) + TypeScript strict-mode web app that scores golf betting games and settles side bets round-by-round. Scoring logic targets a future React Native / Expo port; the engine under `src/games/` stays platform-agnostic.

## Implemented games

Canonical rules for each game live in `docs/games/game_<name>.md`.

| Game | Field | Rule file | Scoring file |
|---|---|---|---|
| Skins | 2–5 | `docs/games/game_skins.md` | `src/games/skins.ts` |
| Wolf | 4–5 | `docs/games/game_wolf.md` | `src/games/wolf.ts` |
| Nassau | 2 (singles); 3–5 (allPairs) | `docs/games/game_nassau.md` | `src/games/nassau.ts` |
| Match Play | 2 singles; 4 best-ball / alternate-shot / foursomes | `docs/games/game_match_play.md` | `src/games/match_play.ts` |
| Stroke Play | 2–5 | `docs/games/game_stroke_play.md` | `src/games/stroke_play.ts` |

Scoring file paths are target paths per `MIGRATION_NOTES.md` item 1; current scoring lives under `src/lib/`.

## How this project is organized

```
golf/
├── AGENTS.md                          Agent rules, intent routing, seven ground rules
├── MIGRATION_NOTES.md                 Known divergences between brief and code — do not silently fix
├── README.md                          This file
├── .claude/
│   ├── agents/                        One file per role: team-lead, engineer, researcher, reviewer, documenter
│   └── skills/golf-betting-rules/     Entry point for every rule, scoring, and settlement question
├── docs/games/
│   ├── _TEMPLATE.md                   12 required sections for every game file
│   └── game_<name>.md                 One canonical spec per betting game
├── prisma/
│   └── schema.prisma                  Round, Player, Game, Score, GameResult, SideBet
├── src/
│   ├── games/                         Pure, platform-agnostic scoring (target — see MIGRATION_NOTES)
│   │   ├── handicap.ts                USGA course handicap + strokes-on-hole
│   │   ├── events.ts                  ScoringEvent discriminated union
│   │   ├── aggregate.ts               Per-hole → per-round aggregation
│   │   └── <name>.ts                  One file per game
│   ├── lib/                           Legacy scoring (being migrated into src/games/)
│   ├── app/                           Next.js App Router routes (scorecard, round, bets, results, api)
│   ├── components/                    UI: layout, scorecard, setup, ui primitives
│   ├── store/                         Zustand round store
│   └── types/                         Cross-cutting TS types
└── package.json                       Next 16.2, React 19.2, Prisma 7.5, Tailwind 4, Zustand 5
```

## Run locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:3000`.

## Portability invariants

`src/games/` targets a future React Native / Expo port. Code under `src/games/` follows these rules:

1. **No Next.js imports.** `import … from 'next/…'` is forbidden.
2. **No React imports.** `import … from 'react'` and `'react-dom'` are forbidden — scoring is not a UI concern.
3. **No Node built-ins.** `fs`, `path`, `process`, and other Node-only modules are forbidden.
4. **No DOM globals.** `window`, `document`, `localStorage`, `sessionStorage`, `navigator`, `fetch` (browser-only variants), and any DOM-typed value are forbidden.
5. **No Prisma / DB.** `src/games/` never imports from `@prisma/client` or `src/lib/prisma.ts`. Persistence happens outside the engine.
6. **Pure functions.** Every exported function in `src/games/` is `(holeState, ruleConfig) => SettlementDelta` at the hole level or `(roundState, ruleConfig) => ScoringEvent[]` at the round level. No side effects, no timers, no I/O.
7. **Integer-unit math only.** No `Float`, no `toFixed`, no floating-point arithmetic. Every delta satisfies `Number.isInteger`.

The reviewer agent enforces these invariants via grep. See `.claude/agents/reviewer.md` section C.

## Agent rules

Every Claude Code session in this repo is governed by `AGENTS.md`. Read it before the first tool call. Before writing scoring code, read the matching `docs/games/game_<name>.md`. For rule questions, invoke the `golf-betting-rules` skill.
