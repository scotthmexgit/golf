Session artifact 2026-04-21: parking-lot updates

- Combined dead-default entry (replaces prompt-021 skins-only entry):
  makeRoundCfg helpers in skins.test.ts, stroke_play.test.ts, and
  wolf.test.ts retain unused betId defaults after commit 3 drops
  their sole non-default callers — cosmetic cleanup deferred.
- Stress-test observation (prompt 033): end-to-end sample data run
  across refactored engines flagged for post-Phase-2-Turn-2 timing,
  to surface serialization-boundary and bet-id assumption issues
  that unit tests don't reach.
- Stroke Play multi-format UI investigation (prompt 001): Front 9 /
  Back 9 / Total 18 selector UX complexity deferred.
- Closest-to-the-Pin screen player-list scope (prompt 001): all
  players shown for Bingo Bango Bongo; other bet-type coverage
  unclear; deferred for investigation.

Four observations captured during today's session that fell outside
active scope. Untriaged; triage at EOD-FINAL.
