# Session Log: PF-1 Turn 2 — API Routes

**Date:** 2026-04-26
**Item:** PF-1 — Persistence floor v1, Turn 2 of 3
**Status:** Closed — all gates passed

## Routes implemented

### PUT /api/rounds/[id]/scores/hole/[hole]

File: `src/app/api/rounds/[id]/scores/hole/[hole]/route.ts`

Per-hole score upsert. Transactional (all players in one Prisma `$transaction`).
Returns 204 No Content.

Validation logic:
- Path param `id` and `hole` must parse to integers (400 otherwise)
- Round must exist (404 otherwise)
- `hole` must be 1..round.holesCount inclusive (400 otherwise)
- Body must be valid JSON with `scores: ScoreInput[]` (400 otherwise)
- Each `score.playerId` must belong to the round via `RoundPlayer` lookup (400 per bad player)
- `putts` and `fromBunker` stored as provided; `putts` null-coalesced

### PATCH /api/rounds/[id] (status field)

File: `src/app/api/rounds/[id]/route.ts`

Forward-only lifecycle transition. Returns 204 No Content.

Validation logic:
- Path param `id` must parse to integer (400 otherwise)
- Body must be valid JSON (400 otherwise)
- `body.status` must equal exactly `"Complete"` (400 otherwise)
- Round must exist (404 otherwise)
- Round's current status must be `"InProgress"` — if already `"Complete"`, returns 409

### GET /api/rounds/[id] (expanded)

File: `src/app/api/rounds/[id]/route.ts`

Returns flat round state. Prisma include: course (with holes ordered by number),
players (with player, ordered by RoundPlayer.id), scores (ordered hole asc, playerId asc), games.

Holes fallback: if `course.holes` is empty, reads from `COURSES` static constant.

Response shape: `{ round, course, players, games, scores }`

## Gate 2 deviations found and fixed

Four deviations identified during Gate 2 review, all fixed before gates g–j ran:

1. **Score route body validation missing `scores` array check** — added `Array.isArray(body?.scores)` guard (400).
2. **Hole boundary off-by-one** — original draft used `holeNum > round.holesCount - 1`; corrected to `holeNum > round.holesCount`.
3. **PATCH body parse try/catch missing** — body parse was bare `await request.json()` without error handling; wrapped in try/catch (400 on malformed JSON).
4. **409 vs 400 for Complete-to-Complete** — initial draft returned 400; spec requires 409 for forward-only lifecycle violation. Corrected.

## Test count

348 → 348 (no new test files; route-level tests are opt-in per Turn 2 AC; zero new tests is sanctioned minimum cut).

## Smoke check substeps a–k

| Step | Description | Result |
|---|---|---|
| a | POST /api/rounds (create round) | PASS |
| b | GET /api/rounds/[id] returns 404 for missing id | PASS |
| c | GET /api/rounds/[id] returns round with players/scores/games | PASS |
| d | PUT /api/rounds/[id]/scores/hole/[hole] returns 204 | PASS |
| e | GET after PUT shows scores persisted | PASS |
| f | PUT with invalid playerId returns 400 | PASS |
| g | PATCH /api/rounds/[id] with status Complete returns 204 | PASS (after fix #4) |
| h | PATCH idempotency: second Complete returns 409 | PASS (after fix #4) |
| i | PATCH with status "InProgress" returns 400 | PASS (after fix #3) |
| j | PUT hole=0 returns 400; PUT hole=19 on 18-hole round returns 400 | PASS (after fix #2) |
| k | GET /api/rounds/[id] players array ordered by RoundPlayer.id | PASS |

Substeps a–f and k passed on first run. Substeps g–j required fixes #2–#4 before passing. Complete-to-Complete 409 verified as part of step h.

## Turn 3 prerequisite

`players[*].id` in the GET /api/rounds/[id] response is `rp.id` (the `RoundPlayer` PK), **not** `rp.playerId` (the `Player` PK).

The spec said `id: number` without specifying which. Turn 3's store hydration must map between these two IDs correctly: engine score lookups use `Player.id` (the `playerId` on `Score` rows), but the GET response's `players[*].id` is `RoundPlayer.id`.

Turn 3 must either:
- Use `players[*].id` only for display ordering and derive `playerId` separately, or
- Extend the GET response to include `playerId` alongside `id`, or
- Document which ID the hydration layer resolves against and test it.

This is a prerequisite gate for Turn 3; do not begin Turn 3 store hydration without resolving this mapping.

## Files touched

- `src/app/api/rounds/[id]/scores/hole/[hole]/route.ts` — new file, 96 lines
- `src/app/api/rounds/[id]/route.ts` — new GET + PATCH handlers, 151 lines
- `IMPLEMENTATION_CHECKLIST.md` — Active item updated (Turn 2 closed, Turn 3 pending)
- `docs/sessions/2026-04-26/003_PF1_TURN2_API_ROUTES.md` — this file

## 2026-04-26 patch

Resolved the Turn 3 prerequisite identified at Turn 2 close. Added `playerId: rp.playerId` to the players[*] objects in GET /api/rounds/[id] response. Both `id` (RoundPlayer.id) and `playerId` (Player.id) now present in each player object. Turn 3 store hydration unblocked.

Operator decision: Option β (extend response with both IDs).

Files touched: src/app/api/rounds/[id]/route.ts (one field added to players array construction, line 76).
