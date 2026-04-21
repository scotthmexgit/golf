---
prompt_id: 004
timestamp: 2026-04-20T21:42:59Z
checklist_item_ref: "#2 — Rebuild plan"
tags: [plan, revision, session-logging-skill, renumbering]
---

## Prompt

Process fix first: tighten the session-logging skill's skip rule — skip only when ALL conditions hold (single-sentence clarification, no evidence, no reasoning, no file touched). Multi-turn revisions log per substantive response. Back-log the prior response as `003_rebuild-plan-revision.md`; log this one separately.

Three paused items resolved:
- (d) Match Play mapping confirmed: `'individual'→'singles'`, `'teams'→'best-ball'`. Migration shim for pre-existing rounds only; new rounds pick from full 4-format UI.
- #11 cutover: parallel-path per my revised 7-commit sequence. Add grep gates after commit 1 (verify zero `src/lib/handicap` consumers) and before final deletion (zero for payouts, junk, handicap).
- Flag D bet-id refactor: include as new #3.5; renumber so entries are sequential #3 through #N.

Fence sentence for bet-id refactor: "Only the 5 *Cfg interfaces, the 3 findBetId helpers in skins/wolf/stroke_play, and the test-file defaults are modified. No engine logic changes. No UI or persistence touched."

Update `REBUILD_PLAN.md`. #2 stays Active. Session-logging amendment is in-scope; other tuning ideas → Parking Lot.

## Action

1. **Skill amendment**: rewrote `.claude/skills/session-logging/SKILL.md` frontmatter + trigger sections. New structure:
   - Explicit "What counts as substantive" list (6 conditions).
   - "Skip-logging rule — ALL of these must hold" with 5 conjunctive conditions.
   - 3 concrete skip and 3 concrete not-skip examples.
   - Explicit multi-turn-revision clause with `⏸` tag convention.
2. **Back-logged prompt 003** as `./2026-04-20/003_rebuild-plan-revision.md` with approximate timestamp, noted the back-log reason in frontmatter, filled in the actions/results/findings from that turn.
3. **Appended prompt 003 to EOD** with `⏸` tag. (Prior EOD had only 001 and 002.)
4. **Rewrote `REBUILD_PLAN.md`** (full rewrite rather than surgical edits — safer for a renumbering of this scope):
   - Inserted new `#4 — Bet-id string-lookup refactor` between former #3 and former #4.
   - Renumbered former #4→#5, #5→#6, #6→#7, #7→#8, #8→#9, #9→#10; #11 stays (no `#10` gap any more).
   - Applied legacy-mapping confirmation to #6 (formerly #5) with user's "migration shim only" note.
   - Applied parallel-path strategy + grep gates to #11. Seven commits detailed: commit 1 (inline handicap), commits 2–6 (consumer migrations), final deletion commit with 3 grep gates.
   - Moved flag D from Deviations table to Scope section (now an explicit inclusion).
   - Updated Deferred section: removed bet-id refactor line.
   - Updated dependency graph: new #4 slots between #3 and the engine fan-out (#5/#6/#7); #5/#6/#7 depend on #4.
   - Updated risk register: downgraded cutover from High to Medium given parallel-path/grep-gate mitigation; added two new Low risks (`id` fixture miss, divergence window).
   - Cleared Open Questions section — all three paused items now resolved.
   - Added sizing totals and parallelization notes.
5. **Updated `IMPLEMENTATION_CHECKLIST.md` Backlog** to match new numbering. Old 12-item backlog replaced with 9-item backlog #3–#11 matching `REBUILD_PLAN.md`. Deferred items listed separately at the bottom of Backlog block.

## Result

- Files touched:
  - `.claude/skills/session-logging/SKILL.md` — tightened skip rule; new "substantive" definition.
  - `2026-04-20/003_rebuild-plan-revision.md` (new) — back-logged prior turn.
  - `2026-04-20/004_rebuild-plan-revision-2.md` (this file, new) — current turn.
  - `EOD_20-April-2026.md` — appended 003 line (mid-turn) and 004 line (end of turn).
  - `REBUILD_PLAN.md` — full rewrite with 9 sequentially-numbered entries (#3–#11).
  - `IMPLEMENTATION_CHECKLIST.md` — Backlog section rewritten to match.
- Worked: all three user decisions landed cleanly. Renumbering is internally consistent across REBUILD_PLAN.md, IMPLEMENTATION_CHECKLIST.md, and the dependency graph. Grep gates on #11 are precise — `git grep -rn "from.*['\"][@./]*lib/handicap" src/games/` after commit 1 and the three gates before final deletion.
- Did not work / blocked: none. #2 remains Active per instruction; awaiting final user approval before #3 begins.

## Key decisions landed

- **Session-logging skill tightened**: substantive-response definition replaces the vague "single factual lookup" language. `⏸` tag conventionalized for Active-item-open logs.
- **Bet-id refactor included as #4**: 5 `*Cfg` interfaces get `id: BetId` in one pass; 3 new engines (#5/#6/#7) are built string-id-native.
- **Cutover parallel-path with grep gates**: commit 1 inlines handicap; commits 2–6 migrate consumers one cluster at a time; final deletion commit runs 3 grep gates. Divergence window during commits 2–6 explicitly disclosed and accepted for pre-v1.
- **Match Play legacy mapping as one-way migration shim**: new rounds pick from the full 4-format UI; only pre-existing-round rendering uses the mapping.

## Open questions

None. All previously-paused plan items now resolved. #2 awaits final approval before #3 starts.

## Parking lot additions

(none — per focus-discipline, no adjacent ideas surfaced that warranted parking)
