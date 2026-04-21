---
prompt_id: 001
timestamp: 2026-04-20T21:09:24Z
checklist_item_ref: "#1 — Audit MIGRATION_NOTES.md"
tags: [audit, docs, rebuild-prep]
---

## Prompt

Two pre-audit actions (make snapshot branch real by committing uncommitted state + fast-forwarding main; update IMPLEMENTATION_CHECKLIST.md acceptance criteria to specify AUDIT.md as sole output venue), then execute audit #1 read-only per acceptance criteria.

## Action

1. `git checkout pre-rebuild-snapshot` → committed uncommitted working tree as `9055de5 "Snapshot: end of Round 5, pre-audit, pre-rebuild"`.
2. `git checkout main` → confirmed `main` was at `06d951e` (initial Next.js commit only); flagged the working-tree divergence to user.
3. User chose Path A; executed `git merge --ff-only pre-rebuild-snapshot` on main. Both branches now at `9055de5`.
4. Edited IMPLEMENTATION_CHECKLIST.md Active item acceptance criteria: removed "or `MIGRATION_NOTES.md`" alternative; AUDIT.md is sole output venue; `MIGRATION_NOTES.md` preserved as historical narrative.
5. Collected evidence via targeted grep / read:
   - `src/games/*.ts` file listing
   - `src/lib/*` listing (still present)
   - `prisma/schema.prisma:79, 98` (`stake Float` still)
   - `src/types/index.ts:38-40` (GameType 9-member union unchanged)
   - `src/lib/payouts.ts:36-40, 75-96, 101-130, 165` (parallel-path carryover points)
   - `src/games/events.ts:325-353` (5 Final Adjustment variants)
   - `src/games/__tests__/types.test.ts:161` (variant count 55)
   - `grep "it(" src/games/__tests__/*.test.ts` (100 tests across 6 files)
   - `src/games/handicap.ts` (PlayerSetupError, effectiveCourseHcp, validatePlayerSetup)
   - `src/lib/handicap.ts:1-4` (deprecated shim header)
   - `docs/games/game_junk.md` existence; `src/games/junk*` does not exist
   - `src/games/types.ts:63` (`matchTieRule: 'split'` single-value enum)
6. Classified all 19 items against the rubric (Fixed / Open / Lesson-learned / Obsolete) and wrote `AUDIT.md` at project root with per-item evidence citations, cross-cutting cutover carryover section, round-5-notes acknowledgment, and rollup.

## Result

- Files touched:
  - `AUDIT.md` (new, 256 lines) — sole audit output per updated criteria.
  - `IMPLEMENTATION_CHECKLIST.md` (edited) — Active-item acceptance criteria tightened.
  - `CLAUDE.md` (unchanged in content, only via fast-forward).
- Git: `main` fast-forwarded `06d951e..9055de5`; `pre-rebuild-snapshot` remains as undo marker.
- Worked: read-only audit discipline held (AUDIT.md is the one new file; MIGRATION_NOTES.md untouched). Every classification cites a line number, path, or round-summary reference.
- Did not work / blocked: nothing — acceptance criteria met on first pass.

## Findings summary (see AUDIT.md for details)

- **Fixed: 10 / 19** — #4, #7, #8, #9 (type-level), #11, #12, #13, #15, #16, #17 (type-level).
- **Open: 9 / 19** — #1, #2, #3, #5, #6, #10, #14, #18, #19.
- **Lesson-learned: 0 / 19.**
- **Obsolete: 0 / 19.**

Nine items mostly collapse into: Nassau engine, Match Play engine, Junk engine, aggregate.ts, Prisma Float→Int migration, GAME_DEFS cleanup, matchTieRule removal, v2 quorum override deferral. **No item calls for nuking the three already-landed engines** (Skins, Wolf, Stroke Play) — they meet merge decisions and should be preserved, subject to Round-5 Wolf follow-ups.

## Open questions

- Venue for Round-5-notes follow-up items (7 Wolf refactor tasks): fold into IMPLEMENTATION_CHECKLIST.md backlog before #2 rebuild-plan, or keep them in `/tmp/round-5-notes.md` until user decides? The audit treated them as out-of-scope.

## Parking lot additions

- [ ] Disposition for `/tmp/round-5-notes.md` 7 Wolf follow-up items (types.ts, wolf.ts, wolf.test.ts, events.ts) — likely rolls into backlog #2 rebuild plan — 2026-04-20 — prompt 001
