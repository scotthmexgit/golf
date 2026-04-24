// src/games/junk.ts — Junk scoring engine.
//
// Phase 1: dispatch scaffold. resolveJunkWinner switch present with all 7 arms.
// settleJunkHole signature stable. Phase 2 fills in CTP, Greenie, Longest Drive.
// #7b fills in Sandy, Barkie, Polie, Arnie after rules-pass 2026-04-24.

import type { HoleState, JunkKind, JunkRoundConfig, PlayerId, RoundConfig, ScoringEvent } from './types'

// ─── Dispatch switch ─────────────────────────────────────────────────────────

export function resolveJunkWinner(
  kind: JunkKind,
  hole: HoleState,
  junkCfg: JunkRoundConfig,
): PlayerId | null {
  void hole
  void junkCfg
  switch (kind) {
    case 'ctp':
      return null // Phase 2 — full implementation
    case 'longestDrive':
      return null // Phase 2 — full implementation
    case 'greenie':
      return null // Phase 2 — full implementation
    case 'sandy':
      return null // #7b — rules pass 2026-04-24 pending
    case 'barkie':
      return null // #7b — rules pass 2026-04-24 pending
    case 'polie':
      return null // #7b — rules pass 2026-04-24 pending
    case 'arnie':
      return null // #7b — rules pass 2026-04-24 pending
    default: {
      const _exhaustive: never = kind
      return null
    }
  }
}

// ─── Hole settler ────────────────────────────────────────────────────────────

export function settleJunkHole(
  hole: HoleState,
  roundCfg: RoundConfig,
  junkCfg: JunkRoundConfig,
): ScoringEvent[] {
  // Phase 2 will implement CTP, Greenie, Longest Drive with bookkeeping events.
  // #7b will implement Sandy, Barkie, Polie, Arnie.
  void hole
  void roundCfg
  void junkCfg
  return []
}
