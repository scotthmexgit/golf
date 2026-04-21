---
prompt_id: 002
timestamp: 2026-04-20T21:26:21Z
checklist_item_ref: "#2 — Rebuild plan"
tags: [plan, rebuild, cutover-analysis]
---

## Prompt

Audit stands; no classification corrections. 7 Wolf follow-ups fold into #3 (decision: keep `WolfCaptainTiebreak` as reserved dead code, variant count 55). Clear parking lot entry. Draft rebuild plan at `REBUILD_PLAN.md` per 7 constraints: (1) scope is 9 Open audit items + folded Wolf follow-ups; (2) per-item AC with fence sentence; (3) #3 has specific AC including keep-reserved note; (4) flag any scope deviations from AUDIT; (5) cutover sequencing detail for #11 (consumer map, parallel vs single-commit); (6) output to `REBUILD_PLAN.md`; (7) do not mark #2 closed — stop and show for approval.

## Action

1. Cleared parking lot entry in `IMPLEMENTATION_CHECKLIST.md` (Wolf follow-up disposition resolved).
2. Collected cutover consumer evidence via grep:
   - `src/lib/payouts.ts` → 2 consumers (`results/page.tsx`, `bets/page.tsx`).
   - `src/lib/junk.ts` → 4 consumers (2 UI pages, `round/new/page.tsx`, `roundStore.ts`).
   - `src/lib/scoring.ts` → 6 consumers (5 UI sites, `LiveBar.tsx`).
   - `src/lib/handicap.ts` → 3 consumers (`roundStore.ts`, `ScoreRow.tsx`, re-exported by `src/games/handicap.ts`).
   - `src/lib/prisma.ts` → 1 consumer (API route). NOT a cutover target.
3. Mapped `matchFormat` consumers (3 sites) for #5 widening risk.
4. Mapped `GAME_DEFS` consumers (2 sites) for #8 scope.
5. Mapped `stake` consumers (many; concentrated in UI display + old `payouts.ts`) for #9 risk.
6. Wrote `REBUILD_PLAN.md`: scope/constraints, 5 deviation flags (A–E), 8 plan entries (#3, #4, #5, #6, #7, #8, #9, #11), cutover sequencing table with 14 consumer rows, dependency graph, risk register, 4 open questions.

## Result

- Files touched:
  - `REBUILD_PLAN.md` (new, plan draft awaiting user approval).
  - `IMPLEMENTATION_CHECKLIST.md` (parking lot entry cleared).
- Git: no new commits; working-tree changes only.
- Worked: all 7 user constraints satisfied. Scope contained to 9 Open audit items + Wolf follow-ups + cutover (per constraint 5). 5 deviations from AUDIT-implied scope explicitly flagged with recommended disposition.
- Did not work / blocked: none. #2 intentionally kept Active per constraint 7; awaiting user approval before #3 starts.

## Key plan decisions surfaced for user

- #5 legacy-value mapping (`'individual'→'singles'`, `'teams'→'best-ball'`) is a guess; user confirmation requested.
- #8 UX for disabled games: recommend greyed out with tooltip; user confirmation.
- #9 Prisma migration: requires pre-migration SELECT for non-integer stake values to avoid data loss.
- #11 output-shape adapter (`payoutMapFromLedger`): kept in presentation tier until UI rewrite; user confirmation.
- `src/lib/scoring.ts` is presentation, not scoring. Renaming to `src/components/util/format.ts` recommended instead of deletion.

## Open questions

Four listed at the bottom of `REBUILD_PLAN.md`:
1. #8 UX for disabled games.
2. #9 pre-migration data check.
3. #11 adapter vs UI rewrite in the same PR.
4. #5 legacy-value mapping confirmation.

## Parking lot additions

(none this prompt)
