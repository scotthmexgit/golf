// src/lib/holeDecisions.ts — Per-hole decision persistence helpers.
//
// Three-function contract:
//   buildHoleDecisions   — HoleData + active game types → DB-safe JSON blob (null if empty)
//   validateHoleDecisions — blob → ValidationResult (reject unknown keys at PUT boundary)
//   hydrateHoleDecisions  — blob → Partial<HoleData> (log on failure, return {})
//
// Decision fields are per-hole (not per-player), stored in HoleDecision.decisions.
// Rule #7: unknown keys at PUT boundary → HTTP 400. At hydration → logged + ignored.

import type { GameType, HoleData, HoleDots } from '../types'

export type ValidationResult = { ok: true } | { ok: false; reason: string }

// Known decision keys — superset of all game types + junk.
const KNOWN_DECISION_KEYS = new Set([
  'wolfPick',        // wolf: 'solo' | 'blind' | playerId
  'presses',         // nassau: string[] of confirmed match IDs
  'withdrew',        // nassau: string[] of player IDs who withdrew on this hole
  'greenieWinners',  // junk greenie: Record<gameInstanceId, playerId | null>
  'bangoWinner',     // junk bingo: playerId | null
  'dots',            // per-player dot state: Record<playerId, HoleDots>
])

// ── buildHoleDecisions ────────────────────────────────────────────────────────
//
// Returns a blob of the decision fields that are set on this hole.
// Only includes fields relevant to the active game types.
// Returns null when nothing is set (saves an upsert).

export function buildHoleDecisions(
  holeData: HoleData,
  gameTypes: Set<GameType>,
): Record<string, unknown> | null {
  const out: Record<string, unknown> = {}

  if (gameTypes.has('wolf') && holeData.wolfPick !== undefined) {
    out.wolfPick = holeData.wolfPick
  }
  if (gameTypes.has('nassau') && Array.isArray(holeData.presses) && holeData.presses.length > 0) {
    out.presses = holeData.presses
  }
  if (gameTypes.has('nassau') && Array.isArray(holeData.withdrew) && holeData.withdrew.length > 0) {
    out.withdrew = holeData.withdrew
  }
  if (holeData.greenieWinners !== undefined && Object.keys(holeData.greenieWinners).length > 0) {
    out.greenieWinners = holeData.greenieWinners
  }
  if (holeData.bangoWinner !== undefined) {
    out.bangoWinner = holeData.bangoWinner
  }
  // Persist non-default dots: only when at least one dot is true for any player.
  if (holeData.dots && Object.keys(holeData.dots).length > 0) {
    const anyDot = Object.values(holeData.dots).some(
      d => d.sandy || d.chipIn || d.threePutt || d.onePutt,
    )
    if (anyDot) out.dots = holeData.dots
  }

  return Object.keys(out).length > 0 ? out : null
}

// ── validateHoleDecisions ─────────────────────────────────────────────────────
//
// Validates at PUT boundary. Rejects unknown keys (rule #7).

export function validateHoleDecisions(
  gameTypes: Set<GameType>,
  decisions: unknown,
): ValidationResult {
  if (decisions === null || decisions === undefined) return { ok: true }
  if (typeof decisions !== 'object' || Array.isArray(decisions)) {
    return { ok: false, reason: 'decisions must be a plain object' }
  }
  const obj = decisions as Record<string, unknown>

  for (const k of Object.keys(obj)) {
    if (!KNOWN_DECISION_KEYS.has(k)) {
      return { ok: false, reason: `decisions: unknown key "${k}"` }
    }
  }

  // Per-type gating: only enforced when gameTypes is non-empty (empty Set = structural check only,
  // used at hydration time where game types are not available).
  if (gameTypes.size > 0) {
    if ('wolfPick' in obj && !gameTypes.has('wolf')) {
      return { ok: false, reason: 'decisions: wolfPick requires wolf game type' }
    }
    if ('presses' in obj && !gameTypes.has('nassau')) {
      return { ok: false, reason: 'decisions: presses requires nassau game type' }
    }
    if ('withdrew' in obj && !gameTypes.has('nassau')) {
      return { ok: false, reason: 'decisions: withdrew requires nassau game type' }
    }
  }

  if ('wolfPick' in obj && typeof obj.wolfPick !== 'string') {
    return { ok: false, reason: 'decisions: wolfPick must be a string' }
  }
  if ('presses' in obj) {
    if (!Array.isArray(obj.presses) || !obj.presses.every(p => typeof p === 'string')) {
      return { ok: false, reason: 'decisions: presses must be string[]' }
    }
  }
  if ('withdrew' in obj) {
    if (!Array.isArray(obj.withdrew) || !obj.withdrew.every(p => typeof p === 'string')) {
      return { ok: false, reason: 'decisions: withdrew must be string[]' }
    }
  }
  return { ok: true }
}

// ── hydrateHoleDecisions ──────────────────────────────────────────────────────
//
// Maps a DB decisions blob back to Partial<HoleData>.
// Permissive: validation failures are logged and return {}.

export function hydrateHoleDecisions(decisions: unknown): Partial<HoleData> {
  if (decisions === null || decisions === undefined) return {}

  const validation = validateHoleDecisions(new Set<GameType>(), decisions)
  if (!validation.ok) {
    console.warn(`[hydrateHoleDecisions] ${validation.reason} — ignoring`)
    return {}
  }

  const obj = decisions as Record<string, unknown>
  const result: Partial<HoleData> = {}

  if (typeof obj.wolfPick === 'string') {
    result.wolfPick = obj.wolfPick
  }
  if (Array.isArray(obj.presses) && obj.presses.every(p => typeof p === 'string')) {
    result.presses = obj.presses as string[]
  }
  if (Array.isArray(obj.withdrew) && obj.withdrew.every(p => typeof p === 'string')) {
    result.withdrew = obj.withdrew as string[]
  }
  if (
    obj.greenieWinners !== null &&
    obj.greenieWinners !== undefined &&
    typeof obj.greenieWinners === 'object' &&
    !Array.isArray(obj.greenieWinners)
  ) {
    result.greenieWinners = obj.greenieWinners as Record<string, string | null>
  }
  if (obj.bangoWinner !== undefined) {
    result.bangoWinner = obj.bangoWinner === null ? null
      : typeof obj.bangoWinner === 'string' ? obj.bangoWinner
      : undefined
  }
  if (
    obj.dots !== null &&
    obj.dots !== undefined &&
    typeof obj.dots === 'object' &&
    !Array.isArray(obj.dots)
  ) {
    // Validate HoleDots shape per player — skip malformed entries
    const dotsIn = obj.dots as Record<string, unknown>
    const validDots: Record<string, HoleDots> = {}
    for (const [pid, d] of Object.entries(dotsIn)) {
      if (typeof d === 'object' && d !== null && !Array.isArray(d)) {
        const dotObj = d as Record<string, unknown>
        validDots[pid] = {
          sandy:     typeof dotObj.sandy     === 'boolean' ? dotObj.sandy     : false,
          chipIn:    typeof dotObj.chipIn    === 'boolean' ? dotObj.chipIn    : false,
          threePutt: typeof dotObj.threePutt === 'boolean' ? dotObj.threePutt : false,
          onePutt:   typeof dotObj.onePutt   === 'boolean' ? dotObj.onePutt   : false,
        }
      }
    }
    if (Object.keys(validDots).length > 0) result.dots = validDots
  }

  return result
}
