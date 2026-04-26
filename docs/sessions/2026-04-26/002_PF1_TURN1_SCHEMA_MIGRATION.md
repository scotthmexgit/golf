# PF-1 Turn 1 — Schema and Migration

**Date:** 2026-04-26
**Phase:** Persistence floor v1, Turn 1 of 3
**Decisions ref:** docs/sessions/2026-04-26-persistence-floor-decisions.md

## What was added to schema

- `Round.status String @default("InProgress")` — plain String, not a Prisma enum (Decision 1: server-authoritative; status will gate round resumption in Turn 2/3)
- `Score @@unique([roundId, playerId, hole])` — enforces exactly one score row per player per hole per round; enables safe upsert in Turn 2 score-write route

## CourseHole on-demand population

Added inline to `src/app/api/rounds/route.ts` immediately after the Course find-or-create block and before the Round create block.

Logic: count existing CourseHole rows for the courseId; if fewer than holeCountInt, find the matching entry in the COURSES constant (by course name) and call `createMany` with `skipDuplicates: true` for holes 1..holeCountInt. Array index is zero-based (hole 1 = index 0). COURSES.hcpIndex maps to CourseHole.index field. If the course name is not in COURSES (future user-defined course), the block is a no-op.

## Migration

**Filename:** `prisma/migrations/20260426174138_pf1_round_status_score_unique/migration.sql`

**SQL summary:**
- `ALTER TABLE "Round" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'InProgress';`
- `CREATE UNIQUE INDEX "Score_roundId_playerId_hole_key" ON "Score"("roundId", "playerId", "hole");`

No drops. No table alterations beyond the two additions above.

Applied via `npx prisma migrate deploy`. Prisma client regenerated.

## Test count

Before: 348/348
After:  348/348

## tsc result

`npx tsc --noEmit --strict` — no output, exit 0. Clean.

## Smoke check

Dev server: not running (ports 3000, 3001 both return 404; port 3002 connection refused). DB state verified directly:
- `Round` table: `status text NOT NULL DEFAULT 'InProgress'` confirmed via `\d "Round"`
- `Score` table: `"Score_roundId_playerId_hole_key" UNIQUE, btree ("roundId", "playerId", hole)` confirmed via `\d "Score"`

## Files touched

- `IMPLEMENTATION_CHECKLIST.md` — Active item updated (Turn 1 open → Turn 1 closed, Turn 2 pending)
- `prisma/schema.prisma` — Round.status field added; Score @@unique constraint added
- `prisma/migrations/20260426174138_pf1_round_status_score_unique/migration.sql` — generated and applied
- `src/app/api/rounds/route.ts` — COURSES import added; CourseHole on-demand population block added (15 lines inline)

## Deviations from task spec

- `prisma migrate dev --name pf1_round_status_score_unique` failed in non-interactive shell (Prisma 7.5.0 hardcodes TTY check). Workaround: used `--create-only` via Python `pty.fork()` to satisfy TTY detection, then applied with `prisma migrate deploy`. Migration SQL and outcome are identical to what `migrate dev` would have produced.
- Migration filename timestamp differs from what would have been generated at task-start time (generated at 17:41:38 UTC); this is purely cosmetic.
