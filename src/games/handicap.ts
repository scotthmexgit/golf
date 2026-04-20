// src/games/handicap.ts — migration-target home for handicap utilities.
//
// Re-exports existing functions from src/lib/handicap.ts during the lib→games
// migration (MIGRATION_NOTES.md item 11). Adds net(), effectiveCourseHcp(),
// validatePlayerSetup(), and PlayerSetupError per _ROUND_HANDICAP.md (Round 3
// item 16). Once src/lib/handicap.ts is deleted post-cutover, this file
// becomes the sole source.
//
// Portability: imports nothing from next/*, react, react-dom, fs, or path.
// The src/lib/handicap.ts import is a transitional re-export; it contains
// only pure functions and will be inlined here once callers migrate.

import type { PlayerSetup } from '../types'
export type { PlayerSetup }
export { calcCourseHcp, calcStrokes, strokesOnHole } from '../lib/handicap'
import { strokesOnHole as _strokesOnHole } from '../lib/handicap'

/**
 * Net score for a single hole: gross minus allocated handicap strokes.
 * Pure function; no side effects; integer-in → integer-out.
 *
 * @param gross     integer strokes taken on the hole
 * @param courseHcp the player's course handicap for this round
 * @param hcpIndex  the hole's handicap index (1..18, where 1 is hardest)
 */
export function net(gross: number, courseHcp: number, hcpIndex: number): number {
  return gross - _strokesOnHole(courseHcp, hcpIndex)
}

/**
 * Effective course handicap: the player's courseHcp plus their Round Handicap
 * adjustment. Per _ROUND_HANDICAP.md § 3, this is computed once at the
 * handicap-computation boundary; every game reads it through strokesOnHole
 * without branching on the field.
 */
export function effectiveCourseHcp(player: PlayerSetup): number {
  return player.courseHcp + player.roundHandicap
}

export class PlayerSetupError extends Error {
  readonly code = 'PlayerSetupError' as const
  constructor(public readonly field: string, public readonly detail?: string) {
    super(
      detail
        ? `PlayerSetup field '${field}' is invalid: ${detail}`
        : `PlayerSetup field '${field}' is invalid`,
    )
    this.name = 'PlayerSetupError'
  }
}

/**
 * Validates a PlayerSetup per _ROUND_HANDICAP.md § 7: roundHandicap is an
 * integer in the inclusive range [-10, +10]. Throws PlayerSetupError on the
 * first violation. Pure function; no side effects.
 */
export function validatePlayerSetup(player: PlayerSetup): void {
  const rh = player.roundHandicap
  if (typeof rh !== 'number' || !Number.isInteger(rh)) {
    throw new PlayerSetupError('roundHandicap', 'must be an integer')
  }
  if (rh < -10 || rh > 10) {
    throw new PlayerSetupError('roundHandicap', 'must be within [-10, +10]')
  }
}
