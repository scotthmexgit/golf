---
prompt_id: 046
timestamp: 2026-04-21T22:36:20Z
checklist_item_ref: "meta — loop candidate survey"
tags: [survey, planning, revision, read-only]
---

## Prompt
Five revision items:
1. Nassau Phase 3 count dropped from ~5–7 to ~4 without explanation — restore or defend.
2. Junk pairing in turns 2–4 (isGreenie+isLD, isSandy+isBarkie, isPolie+isArnie) — restore one-kind-per-turn or defend pairing.
3. Match Play count dropped from ~15–25 to ~5 — scope change or estimate change?
4. Aggregate: add follow-up count for work after #5/#6/#7 land.
5. "Noticed but out of scope" section gone — restore or declare resolved.

## Action
1. Read `docs/games/game_match_play.md` in full to establish actual Match Play scope (4 formats, tie rules, concession, edge cases, handicap variants).
2. Read `AUDIT.md` to identify stale items — found item 19 (NassauCfg.matchTieRule) shows Open but was closed in Nassau Phase 1; item 13 states 100/6 files vs current 128/7.
3. Ran `npm run test:run` to confirm current test count: 128 tests / 7 files.
4. Produced revised survey:
   - Nassau ~5–6 (added edge-cases turn; explained allPairs and edge cases are distinct)
   - Junk ~9 (one kind per turn: isCTP, isGreenie, isLD, isSandy, isBarkie, isPolie, isArnie, tie handling, round finalize)
   - Match Play ~9–11 (expanded from rule file: 4 formats, extra-holes, concession, edge cases, migration shim)
   - Aggregate ~2 now + ~3 follow-up = ~5 total
5. Restored "Noticed but out of scope" section: AUDIT.md items 19 and 13 stale; git stash state and Nassau closeout decision incorporated into main survey.

## Result
- Files touched: none (read-only)
- Match Play scope change identified: best-ball/alternate-shot/foursomes/extra-holes were compressed into too few turns in prior survey
- AUDIT.md staleness confirmed: item 19 (Open → actually closed), item 13 (100 tests → 128)
- Noticed section restored with two live items

## Open questions
- Match Play alternate-shot/foursomes merge still to be justified in next round

## Parking lot additions
- none
