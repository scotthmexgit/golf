# 001 — M1: Prisma Float→Int Cents Migration

**Date:** 2026-04-26  
**Phase:** #10 (Prisma Float→Int cents migration) + Step 6 bare template literals  
**Role:** Engineer  
**Status:** Complete

## What was done

Steps 3–9 of the M1 migration (REBUILD_PLAN.md #10):

### Step 3 — Schema migration

- `prisma/schema.prisma`: `Game.stake Float` → `Int`, `SideBet.stake Float @default(0)` → `Int @default(0)`
- Created `prisma/migrations/20260426000000_stake_int_cents/migration.sql` (drop-and-recreate; data is disposable)

### Step 4 — `formatMoneyDecimal` function body

- `src/lib/scoring.ts`: `formatMoneyDecimal` now divides by 100 before `toFixed(2)`. Serves as the cents-to-dollars render boundary.

### Step 5 — Gate 2 call-site audit (pre-confirmed by operator)

- `results/[roundId]/page.tsx:37` — `formatMoneyDecimal(winnerAmount)`. `winnerAmount` flows from `computeAllPayouts → computeGamePayouts → engine(game.stake)`. Post-migration, stake is cents; engine arithmetic produces cent amounts. Passes cents-native value, no change needed at call site.
- `results/[roundId]/page.tsx:52` — `formatMoneyDecimal(amt)`. Same flow. Passes cents-native value, no change needed at call site.

### Step 6 — Bare template literal fixes (3 sites)

All three routed through `formatMoneyDecimal` per operator directive:
- `src/app/results/[roundId]/page.tsx:66` — `${g.stake}/hole` → `{formatMoneyDecimal(g.stake)}/hole`
- `src/app/round/new/page.tsx:48` — same fix + added `formatMoneyDecimal` import
- `src/app/scorecard/[roundId]/resolve/[hole]/page.tsx:100` — `${game.stake}/pt` → `{formatMoneyDecimal(game.stake)}/pt` + added import

### Store defaults (minimum necessary for cents coherence)

- `src/store/roundStore.ts`: `stake: 5` → `stake: 500`, `defaultJunk(5)` → `defaultJunk(500)`, `pressAmount: 5` → `pressAmount: 500`

## Files changed

| File | Change |
|---|---|
| `prisma/schema.prisma` | Float → Int (2 lines) |
| `prisma/migrations/20260426000000_stake_int_cents/migration.sql` | New file (drop-and-recreate) |
| `src/lib/scoring.ts` | `formatMoneyDecimal`: add `/ 100` |
| `src/app/results/[roundId]/page.tsx` | Line 66: template → `formatMoneyDecimal` |
| `src/app/round/new/page.tsx` | Line 48: template → `formatMoneyDecimal`; add import |
| `src/app/scorecard/[roundId]/resolve/[hole]/page.tsx` | Line 100: template → `formatMoneyDecimal`; add import |
| `src/store/roundStore.ts` | `stake: 5→500`, `defaultJunk(5→500)`, `pressAmount: 5→500` |

## Tests

- Baseline: 348/348
- After changes: 348/348 (no delta — engine tests use explicit integer amounts, not store defaults)
- tsc: zero errors in `src/` (pre-existing `.next/types` errors unchanged)

## Follow-up commit (2026-04-26)

- Schema: SideBet and SideBetResult models deleted; migration 20260426161934_stake_int_and_drop_sidebets generated (DROP TABLE SideBet, DROP TABLE SideBetResult, ALTER COLUMN stake INTEGER)
- GameInstanceCard.tsx: stake input `value={game.stake / 100}` (display), `onChange Math.round(parseFloat(e.target.value) * 100) || 0` (store)
- roundStore.ts: pressAmount reverted to 5 (dollar-unit; operator-confirmed out of scope for M-1)

## Carry-forward / follow-ups

- `resolve/[hole]/page.tsx:69` `${amount}` (junk amounts) — filed as parking-lot item; see doc-only pass.
