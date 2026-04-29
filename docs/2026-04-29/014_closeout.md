---
prompt_id: 014
date: 2026-04-29
role: engineer
checklist_item_ref: "Closeout — Stroke-Play-only phase"
tags: [closeout, db-cleanup, sp-4, phase-complete, claude-md, eod]
---

# Closeout — Stroke-Play-only Phase

Five tasks. No application code changes.

---

## Task 1 — test:e2e script

Added `"test:e2e": "playwright test"` to `package.json` scripts, between
`test:run` and closing brace. `npm run test:e2e` now runs the Playwright suite.

`npm run test:run` unchanged. Vitest: 358/358.

---

## Task 2 — DB cleanup (stranded InProgress rounds)

### Audit query

```sql
SELECT r.id, r.status, r."holesCount",
  (SELECT COUNT(*) FROM "RoundPlayer" rp WHERE rp."roundId" = r.id) AS players,
  (SELECT COUNT(*) FROM "Score" s WHERE s."roundId" = r.id) AS score_rows,
  (SELECT COUNT(*) FROM "RoundPlayer" rp WHERE rp."roundId" = r.id)
    * r."holesCount" AS expected_rows
FROM "Round" r
WHERE r.status = 'InProgress'
ORDER BY r.id;
```

Result — all 8 InProgress rounds:

```
 id | holesCount | players | score_rows | expected_rows
----+------------+---------+------------+---------------
  4 |         18 |       1 |          0 |            18  ← empty, skip
  5 |         18 |       2 |          4 |            36  ← partial, skip
  6 |         18 |       2 |          0 |            36  ← empty, skip
  9 |         18 |       2 |         36 |            36  ← fully scored ✓
 10 |         18 |       2 |          2 |            36  ← partial, skip
 12 |         18 |       2 |         36 |            36  ← fully scored ✓
 13 |         18 |       4 |         72 |            72  ← fully scored ✓
 14 |         18 |       4 |         72 |            72  ← fully scored ✓
```

### Cleanup query (targets fully-scored InProgress only)

```sql
UPDATE "Round"
SET status = 'Complete'
WHERE status = 'InProgress'
  AND (SELECT COUNT(*) FROM "Score" s WHERE s."roundId" = "Round".id) > 0
  AND (SELECT COUNT(*) FROM "Score" s WHERE s."roundId" = "Round".id)
    = (SELECT COUNT(*) FROM "RoundPlayer" rp WHERE rp."roundId" = "Round".id)
      * "Round"."holesCount"
```

Result: `UPDATE 4` — rounds 9, 12, 13, 14 set to Complete.

Rounds 4, 5, 6, 10 left InProgress (empty or partially scored — correct).

### Post-update state

```
SELECT id, status FROM "Round" ORDER BY id;

  1 | Complete    2 | Complete    3 | Complete    4 | InProgress
  5 | InProgress  6 | InProgress  7 | Complete    8 | Complete
  9 | Complete   10 | InProgress 11 | Complete   12 | Complete
 13 | Complete   14 | Complete   15 | Complete   16 | Complete
 17 | Complete
```

All finished rounds are now Complete. The four persistent InProgress rounds
(4, 5, 6, 10) are legitimately incomplete sessions.

---

## Task 3 — IMPLEMENTATION_CHECKLIST.md

### Active item rewritten

Replaced "SP-4 §4 manual browser playthrough" with phase-complete declaration.
Full SP-4 closure evidence:

1. `computeStrokePlay` grep → 0 (since 2026-04-25)
2. SP-2 tests pass (358/358)
3. SP-3 tests pass (358/358)
4. Human: Cowork `findings-2026-04-29-2301.md`; Machine: `stroke-play-finish-flow.spec.ts` commit 2cd2b39
5. `tsc --noEmit --strict` passes throughout

Phase end quoted from `STROKE_PLAY_PLAN.md §Scope`: *"ends when SP-4 closes."*

Next phase candidates listed (unpark Skins / small-cleanup backlog / console
exception investigation). No pre-decision made.

### SP-4 §4 added to Done section

Dual-evidence entry with Cowork walkthrough + Playwright spec references.

### SP-UI-5 downgraded

Reproduced once (Cowork 22:16). Four subsequent runs all showed all chips
pre-selected: Cowork 22:38, 23:01, Playwright rounds 15/16/17. Disposition:
"keep filed; investigate only if it resurfaces." Playwright player-add
sequence (`add Golfer 2/3/4`, tap Stroke Play pill) is the known-good baseline.

### Four future-cleanup items filed

| Item | Location | Size |
|---|---|---|
| camelCase strokePlay label | `hydrateRound` label field | XS |
| Recent Rounds ordering tiebreaker | `findMany orderBy` | XS |
| No mid-round home nav from scorecard | UX/nav gap | S |
| Stepper par-default affordance | Stepper ↔ Zustand sync | S |

All independent, non-blocking, non-engine. No dispatch yet.

---

## Task 4 — EOD seed

Written to `EOD_29-April-2026.md` as a "Tomorrow SOD seed" section after the
table. Content: phase state, Cowork verification items (badge cleanup visible),
three candidate directions for Code's next SOD (unpark Skins, small-cleanup,
console exceptions). No pre-decision made; sequencing left to GM/operator.

---

## Task 5 — CLAUDE.md health check

Two changes made:

**1. Playwright conventions updated:**
- `npm run test:e2e` now the canonical command (was "once the script is added")
- Removed dev-server target (prod PM2 is the right target; dev server
  inconsistent with basePath behaviour)
- Tightened the friction note to essentials

**2. Settlement/Zustand architecture note added** (before Sub-agents line):

> Architecture note — settlement is computed from Zustand state, not the DB.
> `computeAllPayouts` is called from `ResultsPage` using Zustand `holes`/`games`.
> DB has no settlement columns. Consequence: settlement renders correctly even
> if `Round.status` was never written Complete (the SP-UI-7 bug). Badge and
> routing were the only observable symptoms, not settlement numbers. When
> debugging "wrong settlement" reports, follow Zustand state or `hydrateRound`
> data path, not the DB.

This captures the SP-UI-7 investigation insight before it fades from context.

**No other CLAUDE.md gaps found.** Phase endpoint, fence, test commands,
commit hygiene, sub-agents, and Cowork format are all current.

---

## Vitest

358/358 — unchanged. No application code modified.

## State after this prompt

| Item | Status |
|---|---|
| Stroke-Play-only phase | **COMPLETE** — 2026-04-29 |
| SP-4 §4 | Closed (dual evidence) |
| DB stranded rounds | Cleaned: 9, 12, 13, 14 → Complete |
| test:e2e script | Added to package.json |
| SP-UI-5 | Downgraded — investigate if resurfaces |
| 4 future-cleanup items | Filed to parking lot |
| CLAUDE.md | Current (Playwright + arch note added) |
| AGENTS.md current item | Should be updated at next SOD to reflect phase complete |
| vitest | 358/358 |
| PM2 | Not rebuilt (no app code changes) |
