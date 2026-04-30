# Report: WF-3 Skins accordion → pop-up migration + console-exception triage

## Header
- **Date:** 2026-05-01
- **Number:** 01
- **Type:** prompt
- **Title slug:** wf3-skins-accordion-migration
- **Linked issues:** CONSOLE-EXCEPTION-SCORECARD-LOAD (filed this prompt)
- **Pipeline item:** Today #1 (SOD 2026-05-01)

## Prompt (verbatim)

> Objective: Implement WF-3 per docs/plans/WOLF_PLAN.md. Remove inline accordion from ScoreRow.tsx; route Bet-row tap to openSheet(). Update skins-flow.spec.ts assertion group 4 in the same commit. Side-task: triage console-exception from Cowork findings-2026-04-30-0246.md. [Full prompt as received from GM.]

## Scope boundaries
- **In scope:** `ScoreRow.tsx` (accordion removal, onOpenSheet prop), `scorecard/[roundId]/page.tsx` (drop holeBreakdown, pass onOpenSheet), `skins-flow.spec.ts` (§4 + §8 update), `stroke-play-finish-flow.spec.ts` (§8 fence update), `IMPLEMENTATION_CHECKLIST.md` (console-exception parking-lot item), AGENTS.md + IMPLEMENTATION_CHECKLIST.md pointer updates
- **Out of scope:** BetDetailsSheet content, Wolf declaration, Exit Round, bridge/engine files
- **Deferred:** console-exception actual fix — triage only; text must be retrieved from operator before a fix prompt can be issued

## 1. Explore

- Files read: `ScoreRow.tsx` (exact lines confirmed), `scorecard/[roundId]/page.tsx` (holeBreakdown/perHoleByGame locations confirmed), `skins-flow.spec.ts` (§4 and §8 assertion groups confirmed), `stroke-play-finish-flow.spec.ts` (§8 fence check confirmed), `006_sk5_closeout.md` (console-exception fallback)
- Grep: `holeBreakdown` consumers — only 3 locations, all within scope fence. No unexpected consumers.
- Cowork findings file: not accessible from dev server (~/Desktop path not mounted). Fall back confirmed.
- `006_sk5_closeout.md` line 52: *"findings-2026-04-30-0246.md §parking-lot #3 (console exception on scorecard load) was not included above — the dispatch did not include it in the filing list. If GM wishes to file it, triage separately."* — console exception was observed; not filed. Text of exception unknown from Code-accessible files.
- E2E: Playwright fence checks in both specs asserted Wolf absent from picker. Wolf was unparked in WF-1 (2026-04-30) but PM2 hadn't been rebuilt — fence assertions masked the needed spec update. Required fixing both specs.
- Constraints: PM2 rebuild required mid-Develop (old build masked WF-1 Wolf unpark in picker). Rebuilt as part of this prompt.

## 2. Plan

- **Approach:** Three-step removal in ScoreRow: (1) remove imports, (2) remove prop + add onOpenSheet, (3) remove isExpanded/useEffect/playerGames/accordion JSX. Parent: remove holeBreakdownForCurrentHole + byGame from destructure; add onOpenSheet prop. Playwright: migrate §4 assertions; update §8 fence for both specs.
- **Files to change:** ScoreRow.tsx, scorecard/[roundId]/page.tsx, skins-flow.spec.ts, stroke-play-finish-flow.spec.ts, IMPLEMENTATION_CHECKLIST.md
- **Files to create:** none
- **Risks:** R2 (ScoreRow hot path) — mitigated by Playwright regression; R6 (spec must be in same commit) — honored
- **Open questions for GM:** console-exception text needed from operator (see console-exception section below)
- **Approval gate:** auto-proceed

## 3. Develop

- **Commands run:**
  - `npm run test:run`: exit 0 — 441/441 (no TS files touched in ScoreRow core; confirmed types clean)
  - `npx tsc --noEmit`: exit 0 (clean)
  - `npx playwright test` (first run, old PM2 build): skins-flow FAIL — `sheet-breakdown-6-*` not found (old build served inline accordion)
  - PM2 rebuild: `pm2 stop golf && npm run build && pm2 start golf` (new PID 2552436)
  - `npx playwright test` (second run, old PM2 build post-rebuild): 2 FAIL — §8 fence "Wolf must not appear in picker" — Wolf now visible since WF-1 unpack; both specs needed fence update
  - Updated both spec §8 fence assertions: removed Wolf from "must not appear" list, added Wolf to "must appear" alongside Skins
  - `npx playwright test` (third run): 2/2 pass
- **Files changed:**
  - `src/components/scorecard/ScoreRow.tsx` — removed `useState`/`useEffect` imports; removed `isExpanded`, `useEffect`, `playerGames`, accordion JSX (11 lines removed); removed `holeBreakdown` prop; added `onOpenSheet?: () => void`; changed Bet-row onClick and text to static `Bet ▾`
  - `src/app/scorecard/[roundId]/page.tsx` — removed `byGame: perHoleByGame` from useMemo destructure; removed `holeBreakdownForCurrentHole` variable (4 lines); replaced `holeBreakdown={...}` with `onOpenSheet={openSheet}` on each ScoreRow render
  - `tests/playwright/skins-flow.spec.ts` — removed skinsGameId discovery block (6 lines); §4 migrated from inline accordion to sheet testids (`sheet-row-*`, `sheet-breakdown-*`); §8 fence updated (Nassau+Match Play absent; Skins+Wolf present)
  - `tests/playwright/stroke-play-finish-flow.spec.ts` — §8 fence updated identically
  - `IMPLEMENTATION_CHECKLIST.md` — CONSOLE-EXCEPTION-SCORECARD-LOAD parking-lot item filed
- **Test results:** 441/441 vitest + 2/2 Playwright
- **Commits:** uncommitted working tree (commit at EOD)

## 4. Outcome

- **Status:** complete
- **Summary:** ScoreRow.tsx is clean of the inline accordion; BetDetailsSheet is now the sole path to per-game per-hole breakdown; both E2E specs pass with updated assertions.
- **For GM:** Console-exception triage below — operator needs to retrieve text from findings-2026-04-30-0246.md §parking-lot #3. WF-4 ready when GM issues prompt.
- **For Cowork to verify:** Tapping the "Bet ▾" row on any player now opens the BetDetailsSheet (not an inline expansion). The inline accordion is gone. Cowork should verify: (1) Bet-row tap opens the sheet; (2) sheet shows correct per-hole data; (3) ScoreRow no longer has any inline expand.
- **Follow-ups created:** CONSOLE-EXCEPTION-SCORECARD-LOAD filed to IMPLEMENTATION_CHECKLIST.md parking lot.

## Console-exception triage

**Primary source (Cowork findings-2026-04-30-0246.md):** Not accessible from the dev server. `~/Desktop/` is the operator's Windows desktop, not mounted on the Linux dev environment.

**Fallback source (006_sk5_closeout.md line 52):**

> *"Note: findings-2026-04-30-0246.md §parking-lot #3 (console exception on scorecard load) was not included above — the dispatch did not include it in the filing list. If GM wishes to file it, triage separately."*

**Triage outcome:** (a) Console exception was observed during Skins Cowork verification (2026-04-30). (b) It was deliberately not filed in the SK-5 parking-lot dispatch — likely considered low-priority at the time (zero blocking findings). (c) Exact exception text is unknown from Code-accessible files.

**Filed:** `CONSOLE-EXCEPTION-SCORECARD-LOAD` parking-lot item added to IMPLEMENTATION_CHECKLIST.md with a pointer to the source and a note that operator must retrieve the text.

**Next step for GM:** Ask the operator to open findings-2026-04-30-0246.md on their desktop and copy the §parking-lot #3 entry. Once Code has the text, it can identify the throwing file/hook and propose a fix or scope it to a WF-N slot.

**Triage proposal (once text is known):**
- If the exception is from a React hook (e.g., `useEffect` dependency mismatch, hydration boundary error): likely a 1-line fix; own slot or bundle with the next WF touching that file.
- If the exception is from the bridge (e.g., an unhandled edge case in `computePerHoleDeltas` on mount): investigate in isolation; bundle with a bridge maintenance prompt.
- If the exception is from Next.js framework (e.g., prefetch 503, RSC boundary): likely operational/infrastructure, not a code bug.

## AC checklist

- [x] ScoreRow.tsx has no `isExpanded`, no `useEffect` for accordion, no accordion JSX, no `holeBreakdown` prop
- [x] `onOpenSheet?: () => void` added to ScoreRowProps; Bet-row onClick calls `onOpenSheet?.()`
- [x] Scorecard page: `holeBreakdownForCurrentHole` removed; `byGame` removed from destructure; `onOpenSheet={openSheet}` passed
- [x] `skins-flow.spec.ts` §4: sheet-based interaction (sheet-row-*/sheet-breakdown-* testids)
- [x] `skins-flow.spec.ts` §8: Wolf listed as live; Nassau+Match Play listed as parked
- [x] `stroke-play-finish-flow.spec.ts` §8: fence updated identically
- [x] PM2 rebuilt with WF-1/WF-2/WF-3 changes (new PID 2552436)
- [x] 441/441 vitest; tsc clean; Playwright 2/2
- [x] Reviewer: APPROVED
- [x] Console-exception: triage outcome documented; CONSOLE-EXCEPTION-SCORECARD-LOAD filed
