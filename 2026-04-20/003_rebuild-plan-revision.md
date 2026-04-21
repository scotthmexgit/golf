---
prompt_id: 003
timestamp: 2026-04-20T21:40:00Z
checklist_item_ref: "#2 — Rebuild plan"
tags: [plan, revision, cutover-pushback, bet-id-refactor]
supersedes: null
note: Back-logged at prompt 004 per session-logging skill amendment (skill updated in same turn). Timestamp approximate.
---

## Prompt

User answered 4 open questions and pushed back on two plan decisions. Answers:
(a) #8 UX out of scope for GAME_DEFS flag — UI decision belongs to UI wiring phase.
(b) #9 data disposable; migration strategy = drop and recreate; downgrade risk.
(c) #11 adapter — keep `payoutMapFromLedger`; do not rewrite UI in cutover PR.
(d) #5 legacy mapping — don't answer from memory; show evidence first.
Push Back 1: justify single-commit vs parallel-path for #11.
Push Back 2: explain flag D (bet-id refactor) in one paragraph; decide include/defer.

Constraints: apply (a), (b), (c) to REBUILD_PLAN.md. Stay paused on (d), #11 strategy, flag D until user sees evidence. #2 Active. No code changes. No move to #3. Park any newly-noticed issues.

## Action

1. Applied (a) to #8: removed UX recommendation; entry is now a pure data-shape change affecting only `src/types/index.ts`; risk flags cleared.
2. Applied (b) to #9: migration strategy = drop-and-recreate; preservation work removed; sizing reduced S; risk downgraded to Low.
3. Applied (c) to #11 risk flag: `payoutMapFromLedger` adapter confirmed in-scope; noted "stays one release cycle, removed in UI rewrite phase."
4. Gathered evidence for (d):
   - `docs/games/game_match_play.md` § 2 names four formats: `singles`, `best-ball (four-ball)`, `alternate-shot`, `foursomes` with table of team sizes.
   - Current legacy call sites: 4 lines across `src/types/index.ts:70`, `src/store/roundStore.ts:155`, `src/components/setup/GameInstanceCard.tsx:69,71`.
   - Presented recommended mapping `'individual'→'singles'`, `'teams'→'best-ball'` with reasoning on alternatives rejected.
5. Investigated Push Back 1 technical feasibility:
   - Grepped `src/games/` imports from `src/lib/`: ONE entanglement at `src/games/handicap.ts:15-16` (re-exports from `src/lib/handicap.ts`).
   - Confirmed no circular imports, no shared mutable state, no Prisma coupling.
   - Revised recommendation from single-commit to parallel-path, consumer-by-consumer commits (7 commits proposed).
   - Explicitly acknowledged the divergence-window trade-off user flagged.
6. Investigated Push Back 2:
   - Confirmed `b.config === cfg` reference-identity pattern in `src/games/skins.ts:103`, `src/games/stroke_play.ts:136`, `src/games/wolf.ts` (same shape).
   - Wrote one-paragraph explanation + file impact + include-vs-defer recommendation.
   - Recommended `#3.5` prerequisite slot (lands after #3, before #4-#6).

## Result

- Files touched:
  - `REBUILD_PLAN.md` — 4 targeted edits: #8 (data-shape-only), #9 (drop-and-recreate), #11 risk flag (adapter confirmed), Open questions section reduced to just #5 pending, risk register refreshed.
- Worked: applied the three settled decisions cleanly. Evidence for (d) shown without pre-committing plan text. Push Back 1 analysis revealed the one technical entanglement (handicap re-export) and produced a concrete 7-commit parallel-path sequence. Push Back 2 mapped the 5-interface refactor blast radius.
- Did not work / blocked: none. Three items paused as instructed.

## Key findings

- **Only one technical entanglement between `src/games/` and `src/lib/`**: the handicap re-export. One prerequisite commit resolves it. Parallel-path is technically sound for the rest.
- **`src/lib/scoring.ts` is misnamed** — pure presentation helpers (`vsPar`, `parLabel`, `formatMoney`). Should rename to `src/components/util/format.ts` during cutover, not delete.
- **Bet-id reference-identity pattern is universal** across the 3 landed engines. Deferring the refactor compounds: Nassau/Match Play/Junk would inherit the anti-pattern unless refactor lands before them.

## Open questions (paused in plan pending user response)

- #5 legacy-value mapping: awaiting user confirm/override.
- #11 parallel-path vs single-commit: awaiting user confirm/override.
- Flag D bet-id refactor include/defer decision: awaiting user response.

## Parking lot additions

(none — per focus-discipline, the `src/lib/scoring.ts` rename observation was folded into #11's existing scope rather than treated as new work)
