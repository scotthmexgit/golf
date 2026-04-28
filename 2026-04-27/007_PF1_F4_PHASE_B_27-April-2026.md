---
prompt_id: 007
timestamp: 2026-04-27T00:00:00Z
checklist_item_ref: "PF-1-F4 phase (b) — populate game.playerIds at round creation; fix hydrateRound Int→String conversion"
tags: [engineer, pf-2, f4, playerIds, hydration]
---

## Prompt

PF-1-F4 phase (b): two-file edit authorized after phase (a) verification confirmed chain inconsistency. Edit (1) `src/app/api/rounds/route.ts:66` — replace `playerIds: []` with integer IDs of betting players derived from `playerRecords`. Edit (2) `src/store/roundStore.ts:262` — replace `g.playerIds as string[]` with `g.playerIds.map(String)`. Both edits in a single commit; either both apply or neither.

## Action

1. Viewed both target lines; confirmed they matched session log 005 documentation exactly before touching.
2. `src/app/api/rounds/route.ts:66` — replaced `playerIds: []` with `playerRecords.filter((_, i) => players[i]?.betting !== false).map(pr => pr.id)`.
3. First tsc run failed: `TS7034`/`TS7005` on `playerRecords` — the pre-existing implicit `any[]` declaration was benign with the old literal `[]`, but `.map(pr => pr.id)` forced type resolution against Prisma's `Int[]`. Fixed by adding `{ id: number }[]` type annotation at `route.ts:35`. No new import.
4. `src/store/roundStore.ts:262` — replaced `g.playerIds as string[]` with `g.playerIds.map(String)`; updated stale comment at line 255–256.
5. Second tsc run: clean. Tests: 348/348.
6. Showed five stop-and-show artifacts to operator; operator authorized commit.
7. Committed `25839a9`.

## Result

- Files touched: `src/app/api/rounds/route.ts`, `src/store/roundStore.ts`
- Worked: `playerIds` populated at round creation; `hydrateRound` converts Int→String at runtime; 348/348 tests; tsc clean
- Did not work / blocked: none

## Open questions

- PF-1-F4 item does not close here. Full closure requires SP-4 manual playthrough: one 18-hole Stroke Play round end-to-end on the dev server with correct payout display on the results page. See STROKE_PLAY_PLAN.md §4 closure conditions.
- F3 (PUT 503s) remains unresolved. Results and bets pages will still show empty state post-reload until F3 is diagnosed and PF-1-F6 (results-page hydration) lands.

## Parking lot additions

- None
