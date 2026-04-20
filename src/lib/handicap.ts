/**
 * @deprecated Import from `src/games/handicap.ts`. This file remains during
 * the MIGRATION_NOTES.md item 11 transition and will be deleted after every
 * caller under src/app/, src/components/, and src/store/ has migrated.
 */

/** @deprecated Import from `src/games/handicap.ts`. */
export function calcCourseHcp(hcpIndex: number): number {
  return Math.round(hcpIndex)
}

/** @deprecated Import from `src/games/handicap.ts`. */
export function calcStrokes(courseHcp: number, fieldMinHcp: number): number {
  return courseHcp - fieldMinHcp
}

/** @deprecated Import from `src/games/handicap.ts`. */
export function strokesOnHole(strokes: number, holeIndex: number): number {
  if (strokes <= 0) return 0
  if (strokes >= 18 + holeIndex) return 2
  if (strokes >= holeIndex) return 1
  return 0
}
