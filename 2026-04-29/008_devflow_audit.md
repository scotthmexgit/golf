# DevFlow Audit — 2026-04-29

**Type:** Read-only audit  
**Scope:** All 10 items (codebase size, branching, commits, tests, lint, README, runbook, auth, UI surface, phase plan)  
**Commands run:** All read-only (find, wc, git, cat, grep, stat, ls)

---

## 1. Codebase Size

```
find src -type f \( -name '*.ts' -o -name '*.tsx' \) | wc -l
→ 59 TypeScript/TSX files

find src -type f | wc -l
→ 61 total files under src/ (59 TS/TSX + favicon.ico + globals.css)

wc -l <all TS/TSX files>
→ 15,095 total LOC (TS/TSX, excluding node_modules and .next)
```

Breakdown of main subtrees:
- `src/app/` — 10 files (API routes, pages, layout)
- `src/bridge/` — 4 files (2 bridge modules + 2 test files)
- `src/components/` — 11 files (layout: 4, scorecard: 3, setup: 5, ui: 3)
- `src/games/` — 20 files (9 engine modules + 11 test files including `__tests__/` subtree)
- `src/lib/` — 5 files (handicap, junk, payouts, prisma, scoring)
- `src/store/` — 1 file (roundStore.ts)
- `src/types/` — 1 file (index.ts)

No `cloc` installed; LOC from `wc -l`. Prisma schema and config files not counted above (under `prisma/`).

---

## 2. Branching

```
git status
→ On branch main
→ Untracked files: 2026-04-29/, EOD_29-April-2026.md
→ nothing added to commit but untracked files present

git branch -a
→ * main
→   pre-rebuild-snapshot
```

Two branches. `main` is the active development branch. `pre-rebuild-snapshot` is a historical checkpoint (name implies it was cut before a rebuild). No remote configured — there is no `origin` or other remote branch listed (`git branch -a` shows only local branches).

---

## 3. Commit Convention

```
git log --oneline -20
4b9bbbb AGENTS.md: update current item to SP-4 §4 playthrough gate
d4d6845 CLAUDE.md: DevFlow rewrite + grooming (test count 348, active phase note, SOD/EOD ownership)
0f142fd Grooming 2026-04-29: close Apr27 items in checklist; rewrite active item to SP-4 §4 playthrough gate
51660c4 Open F9-a hole 18 race and PUT handler 400 follow-ups; document PM2 rebuild procedure
481ad90 PF-1-F3 v2 diagnosis: two root causes (PM2 restart storm proxy 503s + one client payload undefined); no F3 handler defect
645cc61 PF-1-F3 diagnosis: not reproducible; likely transient state at time of original walkthrough; no code defect
941a858 Session log and EOD for PF-1-F6
6150ba8 PF-1-F6: server-authoritative hydration on results page
011ca8b Session log and EOD for bookkeeping pass
f57d326 Bookkeeping 2026-04-27: close F9-b, revise PF-1-F4 AC, file roundStore as-cast observation
ba2cf9e Session log and EOD for F9-a
108e629 F9-a: write par to Zustand on hole mount so Next is enabled at default scores
e5a8de3 Session log and EOD for PF-1-F4 phase (b)
25839a9 PF-1-F4 phase (b): populate game.playerIds at round creation; convert Int→String at hydration boundary
b880e1d Batch run session logs and EOD for 2026-04-27
debd931 F4 phase (a): type-contract verification pass — researcher output only
647520f SP-UI-2: gate junk DotButtons in ScoreRow behind showJunkDots prop
5c36797 PF-1-F5A: read roundId from useParams for bets page backHref
ab0f3b1 SP-UI-3: render playedAt with timeZone UTC to fix one-day shift in negative offsets
778bb99 Session logs and EOD for 2026-04-27
```

**Pattern:** Freeform descriptive messages. Not Conventional Commits. Internal ticket codes used as prefixes (`SP-UI-2`, `PF-1-F6`, `F9-a`) matching items in `IMPLEMENTATION_CHECKLIST.md`. Typically one commit per productive day covering all work done in that session. Some commits are pure session-log/EOD document commits; others are code commits with a brief description of what changed and why.

---

## 4. Test Command and Coverage

**Commands from `package.json`:**
```json
"test": "vitest",
"test:run": "vitest run"
```

`npm run test` — interactive watch mode.  
`npm run test:run` — one-shot run, used as the CI gate in SP-2 and SP-3 AC.

**Coverage tooling:** None configured. `vitest.config.ts` has no `coverage` block; no `c8` or `@vitest/coverage-v8` in devDependencies.

```ts
// vitest.config.ts
export default defineConfig({
  test: {
    include: ['src/games/**/*.test.ts', 'src/bridge/**/*.test.ts'],
    environment: 'node',
    typecheck: { enabled: false },
  },
})
```

**Test file inventory:**

Engine (`src/games/__tests__/`, 10 files):
- aggregate.test.ts, handicap.test.ts, junk.test.ts, match_play.test.ts
- nassau.test.ts, sanity.test.ts, skins.test.ts, stroke_play.test.ts
- types.test.ts, wolf.test.ts

Bridge (`src/bridge/`, 2 files):
- skins_bridge.test.ts
- stroke_play_bridge.test.ts

**Total: 12 test files.** All engine + bridge tests; zero UI test files. No component tests, no API route tests, no end-to-end tests. CLAUDE.md notes "test count 348" (individual test cases) as of 2026-04-29 grooming.

---

## 5. Lint / Format

**Scripts in `package.json`:**
```json
"lint": "eslint"
```
No `format` script. No `typecheck` script (would need `tsc --noEmit`; SP-4 AC requires this to be run manually).

**ESLint config (`eslint.config.mjs`):** Uses `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`. Standard Next.js/TS config. No custom rules observed.

**Prettier:** No `.prettierrc`, `.prettierrc.json`, `.prettierrc.js`, or `prettier.config.*` found anywhere in the project root. No prettier in devDependencies.

**TypeScript strictness (`tsconfig.json`):**
```json
"strict": true
```
`strict: true` enables all strict-mode flags (`strictNullChecks`, `noImplicitAny`, etc.). No additional `noUncheckedIndexedAccess` or `exactOptionalPropertyTypes` beyond base strict mode.

---

## 6. README State

```
wc -l README.md  →  73 lines
stat README.md   →  Modify: 2026-04-20 15:05:17 -0600
```

**Last modified: 2026-04-20** — nine days before this audit. Created at initial setup.

**Content:** Not a placeholder. Describes the app purpose (golf betting, Next.js 16 App Router, TS strict), lists implemented games with field sizes and rule-doc paths, explains top-level directory organization including `AGENTS.md`, `MIGRATION_NOTES.md`, `docs/games/`, `.claude/` agent files. Mentions Prisma + PostgreSQL, running with `npm run dev`, basePath `/golf`.

**Staleness flags:**
- Scoring file paths listed as "target paths per MIGRATION_NOTES.md item 1; current scoring lives under `src/lib/`" — acknowledges divergence but does not resolve it.
- Does not mention the Stroke-Play-only phase, SP-4 current status, or PM2 deployment.
- Game table includes Skins, Wolf, Nassau, Match Play, Stroke Play as equals; does not indicate which are parked.

---

## 7. Runbook / Operations Docs

```
find /home/seadmin/golf -maxdepth 2 -name 'OPERATIONS*' -o -name 'DEPLOY*' \
  -o -name 'runbook*' -o -name 'RUNBOOK*'
→ (no matches)

find /home/seadmin -maxdepth 4 -name 'ecosystem.config*'
→ (no matches)
```

**No DEPLOY.md, OPERATIONS.md, or runbook file exists** in the project tree.

**PM2 information is scattered across prose:**
- `CLAUDE.md` (grep): "PM2 used for local process management; rebuild procedure documented in commit 51660c4. Hosting: Local PM2 on a Linux host reached over Tailscale at http://100.71.214.25/golf from the Windows machine where Cowork operates."
- Commit `51660c4` message: "Open F9-a hole 18 race and PUT handler 400 follow-ups; document PM2 rebuild procedure" — rebuild steps in the commit itself, not in a standalone doc.
- `docs/sessions/` contains per-session logs; `docs/plans/STROKE_PLAY_PLAN.md` is the primary planning doc.
- `docs/product/north-star.md` exists but is product vision, not operations.

**Conclusion:** No consolidated runbook. PM2 rebuild procedure exists only in a commit message. Gap for any operator who needs to recover the process without reading git history.

---

## 8. Auth on the Running Site

```
find /home/seadmin/golf/src -name 'middleware.ts' -o -name 'middleware.tsx'
→ (no matches)
```

**No `middleware.ts` exists.** No Next.js middleware auth gate.

Root route (`src/app/page.tsx`): Renders immediately without any auth check. No redirect to login, no session validation, no cookie check. The `useEffect` on mount calls `/golf/api/rounds` to populate recent rounds — also unauthenticated.

**Conclusion: The app at `/golf` requires no login.** It is open to anyone who can reach the host (which is Tailscale-gated at the network level, per CLAUDE.md). Auth is network-perimeter only.

---

## 9. UI Surface — Top-Level Routes

Routes under `src/app/` (App Router):

| Route | File | Description |
|---|---|---|
| `/` | `app/page.tsx` | Home: lists recent rounds (InProgress → scorecard, Complete → results); "Start New Round" CTA |
| `/round/new` | `app/round/new/page.tsx` | 4-step setup wizard: Course search → Players (name/tee/handicap) → Games picker → Review; POSTs to create round |
| `/scorecard/[roundId]` | `app/scorecard/[roundId]/page.tsx` | Live hole-by-hole scorecard; stepper scores per player; "Next hole" / "Finish Round" flow |
| `/scorecard/[roundId]/resolve/[hole]` | `app/scorecard/[roundId]/resolve/[hole]/page.tsx` | Junk dot resolution for a specific hole |
| `/bets/[roundId]` | `app/bets/[roundId]/page.tsx` | Mid-round bets/settlement view |
| `/results/[roundId]` | `app/results/[roundId]/page.tsx` | Final results: per-player vs-par summary and payout settlement |

**One-sentence summary of Stroke-Play-only build:** The user can create a Stroke Play round at a searched course with up to 5 players, enter scores hole-by-hole on a live scorecard, and see final handicap-adjusted payouts on a results page — all other bet types (Skins, Wolf, Nassau, Match Play) are present in the engine but parked/disabled in the UI.

---

## 10. Phase Endpoint: SP-4 or SP-6?

**The Stroke-Play-only phase ends at SP-4.** SP-6 is a separate, independent cleanup task.

Authoritative quote from `docs/plans/STROKE_PLAY_PLAN.md` §Scope (line 11):

> "The Stroke-Play-only phase begins at adoption of this plan and ends when **SP-4 closes**."

SP-4 closure requires five gates (lines 15–23):
1. `git grep -rn "computeStrokePlay" src/` → zero matches
2. SP-2 builder tests pass (`npm run test:run`)
3. SP-3 bridge integration tests pass (`npm run test:run`)
4. Manual 18-hole playthrough on running dev server (handicap applied, payouts verified)
5. `tsc --noEmit --strict` passes

**SP-6** is defined separately at `§SP-6 — GAME_DEFS Cleanup (Independent)` (line 280):

> "The `GameList.tsx` filter is implemented in SP-6." / "SP-6 recommended before SP-3 (parked bets hidden so the test environment is clean)."

SP-6 is the `disabled: true` flag plumbing in `src/types/index.ts` and the `GameList.tsx` filter — it runs as an independent item, recommended (but not required) before SP-3. It does not close the phase; SP-4 does.

**Current active item (from `AGENTS.md` line 21):**

> "Active phase: Stroke-Play-only UI wiring — see `docs/plans/STROKE_PLAY_PLAN.md`. Current item: SP-4 §4 manual browser playthrough (PF-2 phase-end gate)."

**Resolution:** Any GM instruction that says the phase ends at SP-6 is incorrect. The plan is unambiguous: phase end = SP-4 closure. SP-6 is a GAME_DEFS cleanup that can run independently at any point.

---

## Audit Summary

| Item | Status | Notes |
|---|---|---|
| Codebase size | 61 files / ~15k LOC | TS/TSX only, excl. node_modules/.next |
| Branching | `main` + `pre-rebuild-snapshot` | No remote |
| Commit convention | Freeform with internal ticket prefixes | Not Conventional Commits |
| Test command | `npm run test:run` | 12 test files, 348 cases; engine + bridge only |
| Coverage | None configured | No c8 / vitest --coverage |
| Lint/format | `npm run lint` only | No format script, no prettier |
| TypeScript | `strict: true` | No extra flags beyond base strict |
| README | 73 lines, dated 2026-04-20 | Functional but 9 days stale; parked bets not noted |
| Runbook | None | PM2 procedure in commit message only |
| Auth | None — no middleware.ts | Network-perimeter (Tailscale) only |
| UI surface | 6 routes (home/setup/scorecard/resolve/bets/results) | Stroke Play only live |
| Phase endpoint | **SP-4** closes the phase | SP-6 is an independent cleanup item |
