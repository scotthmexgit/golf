@AGENTS.md

## Session logging

After every substantive prompt, append:
- per-prompt summary → `/home/seadmin/golf/YYYY-MM-DD/NNN_<slug>.md`
- one line → `/home/seadmin/golf/EOD_DD-Month-YYYY.md`

`EOD-FINAL_DD-Month-YYYY.md` only on explicit user request.

Format and edge cases: `.claude/skills/session-logging/SKILL.md`. Skip logging for trivial clarifications (single-sentence Q&A with no artifact).

## Implementation checklist

`./IMPLEMENTATION_CHECKLIST.md` is the single source of truth for scope. Before starting any task, read the current **Active item**. Do not drift into adjacent work without logging a deferral entry in the Parking Lot.

## Focus discipline

One active task at a time. New ideas, bugs, "while we're here" thoughts → Parking Lot in `IMPLEMENTATION_CHECKLIST.md`, never into the current work. Scope creep requires explicit user approval.

Procedure: `.claude/skills/focus-discipline/SKILL.md`. At the start of each session and after any context switch, state the active checklist item verbatim before doing work.

## Rebuild context (temporary — remove when stable)

**Preserved, do not touch:** `CLAUDE.md` structure, `AGENTS.md`, `.claude/agents/`, `.claude/skills/golf-betting-rules/`, `docs/games/` (9 rule files), `README.md`, `.gitignore`, `package.json`.

**To rebuild (awaiting explicit go-ahead):** `src/games/` (3 engines + tests), `prisma/` schema and seeds, app routes / UI that depend on the above.

**MIGRATION_NOTES.md status is unaudited.** Treat as lessons-learned minimum; potentially holds open bugs. **First rebuild task is the audit** — see `IMPLEMENTATION_CHECKLIST.md` Active item. No deletions until that audit completes and the user approves the deletion plan.

Safety branch: `pre-rebuild-snapshot` (marker only; does not preserve uncommitted working-tree state).

● Here are the four answers, all sourced from the rule file and events.ts.

  ---
  1. §5 isLongestDrive — exact pseudocode

  function isLongestDrive(state: HoleState, cfg: JunkRoundConfig): PlayerId | null {
    // Par-4 or par-5 only. Hole must appear in cfg.longestDriveHoles.
    // Winner: longest measured tee shot coming to rest in the fairway.
    if (!cfg.longestDriveEnabled) return null
    if (state.par < 4) return null
    if (!cfg.longestDriveHoles.includes(state.hole)) return null
    return state.longestDriveWinner ?? null
  }

  Four conditions in order:
  1. cfg.longestDriveEnabled
  2. state.par >= 4 (par-4 or par-5 only)
  3. cfg.longestDriveHoles.includes(state.hole) — hole number in the designated list
  4. state.longestDriveWinner non-null

  ---
  2. §6 tie handling for Longest Drive — quoted

  ▎ "Split evenly among tied winners. With N bettors, w tied winners, each winner's points = N − w, each loser's
  ▎ points = −w. When (N − w) is not divisible by w in the split computation (here w ≥ 2, so each winner receives N −
  ▎  w flat), integer cleanness holds for LD — but when the downstream money math (points × stake × multiplier)
  ▎ leaves a per-winner cent remainder, the remainder absorbs into the tied winner with the lowest playerId via a
  ▎ RoundingAdjustment event."

  Key clarification: the points values in JunkAwarded are always integers (N−w per winner, −w per loser). Rounding
  only occurs at the money-math layer (points × stake × multiplier), not in the event's points field.

  ---
  3. Designated-hole mechanism — quoted

  From §5 pseudocode:

  ▎ if (!cfg.longestDriveHoles.includes(state.hole)) return null

  From §4:

  ▎ longestDriveHoles: number[] // default [] — holes (1..18) designated for LD; par-4 and par-5 only

  It is entirely driven by cfg.longestDriveHoles: number[] matching hole.hole. There is no hole-level state field for
   this; the engine consults only the config array.

  ---
  4. RoundingAdjustment — separate event, not folded

  From §6 (quoted above): the remainder "absorbs into the tied winner with the lowest playerId via a
  RoundingAdjustment event" — it is a separate emitted event alongside the JunkAwarded events.

  RoundingAdjustment is already in events.ts (lines 238–242):
  type RoundingAdjustment = EventBase & WithPoints & WithBet & {
    kind: 'RoundingAdjustment'
    hole: number | null
    absorbingPlayer: PlayerId
  }
  No new variant is needed. The LD no-tie scenario (turn 3a/3b) never touches RoundingAdjustment; the tie-split
  scenario is deferred.

  ---
  Fixture extension — two gaps, both require decision before 3a

  Gap 1 — makeHole hardcodes longestDriveWinner: null (line 97 of junk.test.ts):
  longestDriveWinner: null,
  An LD test needs longestDriveWinner set to a winner. The current positional signature makeHole(holeNum, par, gross,
   ctpWinner) has no slot for it. Options: add a fifth positional parameter (worsens the crowding already noted in
  the parking lot), add an overrides-bag fifth parameter, or build the HoleState inline in the test.

  Gap 2 — defaultJunkCfg.longestDriveHoles = [] (line 16 of junk.test.ts):
  The test hole must appear in longestDriveHoles or isLongestDrive returns null. The default config cannot be used
  as-is; the LD test needs a local junkCfg override with the test hole number included.

  Both gaps need resolution before 3a starts. Awaiting your decision on how to handle makeHole (fifth param,
  overrides bag, or inline) — confirm and I'll proceed to 3a.

