# Session Log: Cowork Walkthrough Triage — 2026-04-27

**Date:** 2026-04-27  
**Item:** Researcher pass — Cowork UI walkthrough triage (F1–F10)  
**Status:** Complete — report written; no code changes; no plan/checklist edits  

## What was done

Read the Cowork walkthrough report (round id=9, Chambers Bay, Alice + Bob, Stroke Play $5/hole), STROKE_PLAY_PLAN.md, IMPLEMENTATION_CHECKLIST.md, and PF-1 session logs. Grepped the codebase for evidence pointers on all ten findings. Wrote triage report to `docs/proposals/2026-04-27-cowork-triage.md`.

## Key findings

- **2 fence violations** (F1, F2): junk UI surfaces in Stroke Play (GameInstanceCard junk section has no game-type guard; ScoreRow DotButtons unconditional). New sub-items SP-UI-1 and SP-UI-2 required.
- **4 in-scope bugs** (F3, F4, F5, F6): F4 is the primary driver — `api/rounds/route.ts:66` hardcodes `playerIds: []`, causing `StrokePlayConfigError` in `computeAllPayouts` which crashes bets/results pages. F3 (PUT 503s) is a parallel server/DB issue — code path looks correct, root cause not locatable from code read alone.
- **F4 known-limitation re-assessment**: PF-1 closure note (checklist line 116) characterized `playerIds:[]` as suppressing only junk notices. Wrong: it crashes `computeAllPayouts` via `assertValidStrokePlayCfg` (`stroke_play.ts:82`), making bets and results pages non-functional for every Stroke Play round.
- **PF-1 closure**: holds for the persistence mechanism (smoke check evidence valid); does NOT hold for end-to-end correctness (`playerIds:[]` crash impact mischaracterized; SP-4 manual browser playthrough still unmet).
- **2 in-scope bugs** (F7, F9): F7 = UTC/local date shift (3-file fix); F9 = par-default not written to Zustand (already checklist line 74).
- **F8**: RSC 503s are independent of F3 score-PUT 503s (different code paths, different failure modes). Infrastructure backlog.
- **F10**: Insufficient coverage — existing checklist line 112 covers the only known bare template literal site.

## Evidence locations

- F1: `src/components/setup/GameInstanceCard.tsx:121-162`
- F2: `src/components/scorecard/ScoreRow.tsx:70-73`
- F3: `src/app/api/rounds/[id]/scores/hole/[hole]/route.ts` (code correct; 503 is runtime/DB)
- F4: `src/app/api/rounds/route.ts:66` (`playerIds: []`) → crash path through `src/games/stroke_play.ts:82`
- F5 null link: `src/app/bets/[roundId]/page.tsx:17`
- F6 generic content: `src/app/results/[roundId]/page.tsx:13`
- F7: `src/store/roundStore.ts:109`, `src/app/api/rounds/route.ts:52`, `src/app/page.tsx:88`
- F9: `src/app/scorecard/[roundId]/page.tsx:52`, `src/components/scorecard/ScoreRow.tsx:78`

## Output

`docs/proposals/2026-04-27-cowork-triage.md`

## Pushback responses (same turn, appended)

Six pushbacks addressed inline in `docs/proposals/2026-04-27-cowork-triage.md`:

| # | Topic | Status |
|---|---|---|
| 1 | PF-1/PF-2 framing | Accepted — third option (Option C) added to open question 3 |
| 2 | SP-UI-2 prop-vs-guard | Accepted — technical justification added; prop is correct boundary because ScoreRow has no game-type info; always-false in current phase noted |
| 3 | F4 type-contract risk | Accepted — PF-1-F4 restated as two phases; phase (b) blocked on phase (a) verification; dispatch order updated |
| 4 | F5A backHref direction | Accepted — fix restated as `useParams()` primary, not Zustand fallback |
| 5 | F7 fix path | Accepted — switched to option (a) single-file display boundary fix (`{ timeZone: 'UTC' }`); three-file approach dropped |
| 6 | F9 split | Accepted — split into F9-a (par-default write, folds into line 74) and F9-b (visual cue, conditional on F9-a evaluation) |

Sequencing constraint added as new "Dispatch Order" section. Plan-Document Impact section added at end.

## Deviations

None. No code changes, no plan/checklist edits, no remediation begun.
