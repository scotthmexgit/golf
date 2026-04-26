---
prompt_id: BRIDGE_STRUCTURE_SURVEY
timestamp: 2026-04-25T20:15:00Z
checklist_item_ref: "Off-queue scope survey — Skins bridge architecture"
tags: [researcher, bridge, skins, architecture, scope-survey]
---

## Prompt

Read-only survey: should the Skins bridge extend stroke_play_bridge.ts or live in a new skins_bridge.ts? Produce an architectural recommendation memo.

## Action

Read `src/bridge/stroke_play_bridge.ts` (full), `src/bridge/stroke_play_bridge.test.ts` (first 50 lines for structure), `src/games/skins.ts` (exports + signatures + SkinsCfg type), `src/games/types.ts` (SkinsCfg), and sampled signatures from `match_play.ts`, `wolf.ts`, `nassau.ts`.

## Key findings

1. Three items in stroke_play_bridge.ts are genuinely generic: `buildStrokePlayHoleState`, `EMPTY_JUNK`, `payoutMapFromLedger`.
2. Skins reads the same 5 HoleState fields as Stroke Play — `buildStrokePlayHoleState` is directly reusable.
3. Skins finalization pattern (stateless per hole → finalize → reduce) is identical to Stroke Play. Bridge code is analogous but distinct.
4. Match Play and Nassau are structurally different (MatchState threading per hole; Match Play also reads `pickedUp`/`conceded`/`withdrew` from HoleState).
5. Wolf follows the same stateless pattern as Skins + Stroke Play.

## Recommendation

**Option 1: per-bet files + shared.ts extraction.** Extract the 3 generic items to `src/bridge/shared.ts` now; update `stroke_play_bridge.ts` and `payouts.ts` imports; create `skins_bridge.ts` for Skins-specific orchestration. Extraction cost is low today; duplication cost across 5 bets if deferred is non-trivial.

## Result

- **Files created:** `docs/proposals/bridge-file-structure.md`
- **Files modified:** none
