---
prompt_id: 009
date: 2026-04-29
role: engineer
checklist_item_ref: "SP-UI-4 — stake unit label /hole→/round for Stroke Play"
tags: [engineer, sp-ui, label-defect, scoring, vitest, pm2]
commit: f43d2db
---

# SP-UI-4 — Stake Unit Label Fix

## Explore

Session 007 researcher pass identified three UI locations that unconditionally
render `/hole` for all game types. For Stroke Play, the rule doc (`§3`, `§8`)
defines stake as a flat per-round ante; the engine confirms this — there is no
per-hole multiplication. The `/hole` label implies 18× more exposure than
actually settles, creating a material user-expectation gap.

**Three sites confirmed:**

| File | Line | Before |
|---|---|---|
| `src/components/setup/GameInstanceCard.tsx` | 47 | `<span>/hole</span>` (unconditional) |
| `src/app/round/new/page.tsx` | 49 | `{formatMoneyDecimal(g.stake)}/hole` (unconditional) |
| `src/app/results/[roundId]/page.tsx` | 96 | `{formatMoneyDecimal(g.stake)}/hole` (unconditional) |

`game.type` is available at all three call sites. `formatMoneyDecimal` was
already imported in two of the three files. `vitest.config.ts` only covered
`src/games/**` and `src/bridge/**` — `src/lib/` had no test infrastructure.

## Plan

1. Add `stakeUnitLabel(gameType: string): string` to `src/lib/scoring.ts`
   — returns `'/round'` for `'strokePlay'`, `'/hole'` for all others.
2. Extend `vitest.config.ts` include to `src/lib/**/*.test.ts`.
3. Create `src/lib/scoring.test.ts` with 6 unit cases.
4. Import and apply `stakeUnitLabel` at all three component sites.
5. Run `npm run test:run`, then `npm run build`, then PM2 restart.

No fence crossings. No engine, API, or schema changes.

## Develop

**`src/lib/scoring.ts`** — new export appended after `formatMoneyDecimal`:

```ts
export function stakeUnitLabel(gameType: string): string {
  return gameType === 'strokePlay' ? '/round' : '/hole'
}
```

**`vitest.config.ts`** — include extended:

```ts
include: ['src/games/**/*.test.ts', 'src/bridge/**/*.test.ts', 'src/lib/**/*.test.ts'],
```

**`src/lib/scoring.test.ts`** — new file, 6 cases:
- `stakeUnitLabel('strokePlay')` → `'/round'`
- `stakeUnitLabel('skins')` → `'/hole'`
- `stakeUnitLabel('wolf')` → `'/hole'`
- `stakeUnitLabel('nassau')` → `'/hole'`
- `stakeUnitLabel('matchPlay')` → `'/hole'`
- `stakeUnitLabel('unknown')` → `'/hole'` (safe default)

**Component changes** — import added; label replaced at each site:

- `GameInstanceCard.tsx:47`: `{stakeUnitLabel(game.type)}`
- `round/new/page.tsx:49`: `{formatMoneyDecimal(g.stake)}{stakeUnitLabel(g.type)}`
- `results/[roundId]/page.tsx:96`: `{formatMoneyDecimal(g.stake)}{stakeUnitLabel(g.type)}`

**`IMPLEMENTATION_CHECKLIST.md`** — SP-UI-4 filed and closed; F9-a-HOLE18-RACE
closed with rationale from session 006.

**Test results:** `354/354` passed (13 test files). +6 new cases in
`scoring.test.ts`.

**Build:** `next build` — TypeScript clean, all 12 routes compiled, no errors.

**PM2:** `pm2 stop golf && npm run build && pm2 start golf`
→ PID 1467752, status online, HTTP 200 confirmed at `localhost:3000/golf`.

**Commit:** `f43d2db`

## F9-a-HOLE18-RACE closure

Closed in the same checklist pass (session 006 ruled out the race):

> Ruled out 2026-04-29 (session 006): Finish button is disabled while
> `allScored=false`, `|| 0` fallback suppresses `gross:undefined` at the PUT
> call site, and `fromBunker:undefined` in the one observed error is
> inconsistent with all code versions in git history — likely a stale bundle
> during the PM2 restart storm, not a reproducible race. No code defect; no
> fix needed.

## State after this prompt

| Item | Status |
|---|---|
| SP-UI-4 | Closed — commit f43d2db |
| F9-a-HOLE18-RACE | Closed — no code defect |
| Active item | SP-4 §4 manual browser playthrough (unchanged) |
| Test count | 354/354 (was 348) |
| Production server | PID 1467752, current bundle, HTTP 200 |
| CLAUDE.md test count | Updated to 354, vitest scope updated |

## Decisions / questions for GM

None. SP-UI-4 is fence-compliant and self-contained.

## What Cowork should verify

- Setup wizard (step 3 Games, step 4 Review): a Stroke Play game shows
  `$X.XX/round`; Skins/Wolf/Nassau/Match Play continue to show `$X.XX/hole`.
- Results page Game Breakdown: Stroke Play row shows `/round`.
- This is a pre-playthrough cleanup — the correct label will now be visible
  during the SP-4 §4 manual playthrough.
