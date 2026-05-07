import { describe, it, expect, vi } from 'vitest'
import { buildHoleDecisions, validateHoleDecisions, hydrateHoleDecisions } from './holeDecisions'
import type { HoleData, GameType } from '../types'

function makeHole(overrides: Partial<HoleData> = {}): HoleData {
  return {
    number: 1, par: 4, index: 1, scores: {}, dots: {}, ...overrides,
  }
}

const WOLF_SET: Set<GameType> = new Set(['wolf'])
const NASSAU_SET: Set<GameType> = new Set(['nassau'])
const BOTH_SET: Set<GameType> = new Set(['wolf', 'nassau'])
const EMPTY_SET: Set<GameType> = new Set()

// ── buildHoleDecisions ────────────────────────────────────────────────────────

describe('buildHoleDecisions — returns null when nothing to persist', () => {
  it('empty hole returns null', () => {
    expect(buildHoleDecisions(makeHole(), WOLF_SET)).toBeNull()
  })
  it('wolfPick excluded when wolf not in gameTypes', () => {
    expect(buildHoleDecisions(makeHole({ wolfPick: 'solo' }), EMPTY_SET)).toBeNull()
  })
  it('presses excluded when nassau not in gameTypes', () => {
    expect(buildHoleDecisions(makeHole({ presses: { 'g1': ['front'] } }), WOLF_SET)).toBeNull()
  })
  it('empty presses record returns null', () => {
    expect(buildHoleDecisions(makeHole({ presses: {} }), NASSAU_SET)).toBeNull()
  })
  it('all-false dots not included', () => {
    const hole = makeHole({ dots: { p1: { sandy: false, chipIn: false, threePutt: false, onePutt: false } } })
    expect(buildHoleDecisions(hole, EMPTY_SET)).toBeNull()
  })
})

describe('buildHoleDecisions — includes set fields', () => {
  it('wolfPick included when wolf active', () => {
    const blob = buildHoleDecisions(makeHole({ wolfPick: 'partner-p2' }), WOLF_SET)
    expect(blob).toEqual({ wolfPick: 'partner-p2' })
  })
  it('presses included when nassau active', () => {
    const blob = buildHoleDecisions(makeHole({ presses: { 'g1': ['front', 'back'] } }), NASSAU_SET)
    expect(blob).toEqual({ presses: { 'g1': ['front', 'back'] } })
  })
  it('wolfPick + presses when both game types active', () => {
    const blob = buildHoleDecisions(makeHole({ wolfPick: 'solo', presses: { 'g1': ['front'] } }), BOTH_SET)
    expect(blob).toEqual({ wolfPick: 'solo', presses: { 'g1': ['front'] } })
  })
  it('greenieWinners included even without specific game type gate', () => {
    const hole = makeHole({ greenieWinners: { 'g1': 'p1' } })
    const blob = buildHoleDecisions(hole, EMPTY_SET)
    expect(blob).toEqual({ greenieWinners: { 'g1': 'p1' } })
  })
  it('bangoWinner null included', () => {
    const blob = buildHoleDecisions(makeHole({ bangoWinner: null }), EMPTY_SET)
    expect(blob).toEqual({ bangoWinner: null })
  })
  it('dots with a true value included', () => {
    const hole = makeHole({ dots: { p1: { sandy: true, chipIn: false, threePutt: false, onePutt: false } } })
    const blob = buildHoleDecisions(hole, EMPTY_SET)
    expect(blob).not.toBeNull()
    expect((blob as Record<string, unknown>).dots).toBeDefined()
  })
})

// ── validateHoleDecisions ─────────────────────────────────────────────────────

describe('validateHoleDecisions — accepts valid inputs', () => {
  it('null passes', () => expect(validateHoleDecisions(WOLF_SET, null).ok).toBe(true))
  it('undefined passes', () => expect(validateHoleDecisions(WOLF_SET, undefined).ok).toBe(true))
  it('empty object passes', () => expect(validateHoleDecisions(WOLF_SET, {}).ok).toBe(true))
  it('wolfPick string passes', () => {
    expect(validateHoleDecisions(WOLF_SET, { wolfPick: 'solo' }).ok).toBe(true)
  })
  it('presses Record<gameId,string[]> passes', () => {
    expect(validateHoleDecisions(NASSAU_SET, { presses: { 'g1': ['front', 'press-1'] } }).ok).toBe(true)
  })
  it('greenieWinners passes', () => {
    expect(validateHoleDecisions(EMPTY_SET, { greenieWinners: { g1: 'p1' } }).ok).toBe(true)
  })
})

describe('validateHoleDecisions — per-type gating (active game types)', () => {
  it('wolfPick rejected when wolf not active', () => {
    const r = validateHoleDecisions(NASSAU_SET, { wolfPick: 'solo' })
    expect(r.ok).toBe(false)
    expect((r as { reason: string }).reason).toMatch(/wolfPick requires wolf/)
  })
  it('presses rejected when nassau not active', () => {
    const r = validateHoleDecisions(WOLF_SET, { presses: ['front'] })
    expect(r.ok).toBe(false)
    expect((r as { reason: string }).reason).toMatch(/presses requires nassau/)
  })
  it('wolfPick accepted when wolf is active', () => {
    expect(validateHoleDecisions(WOLF_SET, { wolfPick: 'p2' }).ok).toBe(true)
  })
  it('presses accepted when nassau is active (new Record shape)', () => {
    expect(validateHoleDecisions(NASSAU_SET, { presses: { 'g1': ['front'] } }).ok).toBe(true)
  })
  it('empty gameTypes set skips per-type gating (structural check only — used at hydration)', () => {
    // hydrateHoleDecisions uses empty set; should not reject wolfPick/presses structurally
    expect(validateHoleDecisions(EMPTY_SET, { wolfPick: 'blind' }).ok).toBe(true)
    expect(validateHoleDecisions(EMPTY_SET, { presses: { 'g1': ['front'] } }).ok).toBe(true)
  })
})

describe('validateHoleDecisions — rejects unknown keys (rule #7)', () => {
  it('unknown key rejected', () => {
    const r = validateHoleDecisions(WOLF_SET, { wolfPick: 'solo', holeInOne: true })
    expect(r.ok).toBe(false)
    expect((r as { reason: string }).reason).toMatch(/unknown key/)
  })
  it('invalid wolfPick type rejected', () => {
    const r = validateHoleDecisions(WOLF_SET, { wolfPick: 42 })
    expect(r.ok).toBe(false)
  })
  it('presses with non-string value element rejected', () => {
    const r = validateHoleDecisions(NASSAU_SET, { presses: { 'g1': ['front', 42] } })
    expect(r.ok).toBe(false)
  })
  it('presses flat array rejected (old shape no longer valid)', () => {
    const r = validateHoleDecisions(NASSAU_SET, { presses: ['front'] })
    expect(r.ok).toBe(false)
    expect((r as { reason: string }).reason).toMatch(/plain object/)
  })
})

// ── hydrateHoleDecisions ──────────────────────────────────────────────────────

describe('hydrateHoleDecisions — round-trip fidelity', () => {
  it('wolfPick survives round-trip', () => {
    const blob = buildHoleDecisions(makeHole({ wolfPick: 'blind' }), WOLF_SET)
    const result = hydrateHoleDecisions(blob)
    expect(result.wolfPick).toBe('blind')
  })
  it('presses survive round-trip (Record shape)', () => {
    const blob = buildHoleDecisions(makeHole({ presses: { 'game-a': ['front'] } }), NASSAU_SET)
    const result = hydrateHoleDecisions(blob)
    expect(result.presses).toEqual({ 'game-a': ['front'] })
  })
  it('presses flat array (old shape) silently discarded by hydrator', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const result = hydrateHoleDecisions({ presses: ['front'] })
    expect(result.presses).toBeUndefined()
    debugSpy.mockRestore()
  })
  it('null input returns empty partial', () => {
    expect(hydrateHoleDecisions(null)).toEqual({})
  })
  it('corrupt blob logs warning and returns empty', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = hydrateHoleDecisions({ unknownDecisionField: true })
    expect(result).toEqual({})
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
  it('dots survive round-trip with true value', () => {
    const hole = makeHole({ dots: { p1: { sandy: true, chipIn: false, threePutt: false, onePutt: false } } })
    const blob = buildHoleDecisions(hole, EMPTY_SET)
    const result = hydrateHoleDecisions(blob)
    expect(result.dots?.p1?.sandy).toBe(true)
  })
  it('bangoWinner null survives round-trip', () => {
    const blob = buildHoleDecisions(makeHole({ bangoWinner: null }), EMPTY_SET)
    const result = hydrateHoleDecisions(blob)
    expect(result.bangoWinner).toBeNull()
  })
})

// ── withdrew ──────────────────────────────────────────────────────────────────

describe('buildHoleDecisions — withdrew field', () => {
  it('withdrew included when nassau active and non-empty', () => {
    const blob = buildHoleDecisions(makeHole({ withdrew: ['p1'] }), NASSAU_SET)
    expect(blob).toEqual({ withdrew: ['p1'] })
  })
  it('withdrew excluded when nassau not in gameTypes', () => {
    expect(buildHoleDecisions(makeHole({ withdrew: ['p1'] }), WOLF_SET)).toBeNull()
  })
  it('withdrew empty array omitted', () => {
    expect(buildHoleDecisions(makeHole({ withdrew: [] }), NASSAU_SET)).toBeNull()
  })
  it('withdrew included alongside presses', () => {
    const hole = makeHole({ presses: { 'g1': ['front'] }, withdrew: ['p2'] })
    const blob = buildHoleDecisions(hole, NASSAU_SET)
    expect(blob).toEqual({ presses: { 'g1': ['front'] }, withdrew: ['p2'] })
  })
})

describe('validateHoleDecisions — withdrew field', () => {
  it('withdrew string[] passes with nassau active', () => {
    expect(validateHoleDecisions(NASSAU_SET, { withdrew: ['p1'] }).ok).toBe(true)
  })
  it('withdrew rejected when nassau not active', () => {
    const r = validateHoleDecisions(WOLF_SET, { withdrew: ['p1'] })
    expect(r.ok).toBe(false)
    expect((r as { reason: string }).reason).toMatch(/withdrew requires nassau/)
  })
  it('withdrew accepted when empty gameTypes (hydration path)', () => {
    expect(validateHoleDecisions(EMPTY_SET, { withdrew: ['p1'] }).ok).toBe(true)
  })
  it('withdrew with non-string element rejected', () => {
    const r = validateHoleDecisions(NASSAU_SET, { withdrew: [42] })
    expect(r.ok).toBe(false)
    expect((r as { reason: string }).reason).toMatch(/withdrew must be string\[\]/)
  })
})

describe('hydrateHoleDecisions — withdrew round-trip', () => {
  it('withdrew survives round-trip', () => {
    const blob = buildHoleDecisions(makeHole({ withdrew: ['p3'] }), NASSAU_SET)!
    expect(hydrateHoleDecisions(blob).withdrew).toEqual(['p3'])
  })
  it('withdrew multiple players survives round-trip', () => {
    const blob = buildHoleDecisions(makeHole({ withdrew: ['p1', 'p2'] }), NASSAU_SET)!
    expect(hydrateHoleDecisions(blob).withdrew).toEqual(['p1', 'p2'])
  })
})

// ── Full round-trip: wolfPick (Wolf round), presses (Nassau round) ────────────

describe('Full round-trip: build → validate → hydrate', () => {
  it('Wolf: wolfPick on hole 3 survives', () => {
    const hole = makeHole({ number: 3, wolfPick: 'p2' })
    const blob = buildHoleDecisions(hole, WOLF_SET)!
    expect(validateHoleDecisions(WOLF_SET, blob).ok).toBe(true)
    expect(hydrateHoleDecisions(blob).wolfPick).toBe('p2')
  })
  it('Nassau: press confirmation on hole 5 survives', () => {
    const hole = makeHole({ number: 5, presses: { 'game-1': ['front'] } })
    const blob = buildHoleDecisions(hole, NASSAU_SET)!
    expect(validateHoleDecisions(NASSAU_SET, blob).ok).toBe(true)
    expect(hydrateHoleDecisions(blob).presses).toEqual({ 'game-1': ['front'] })
  })
  it('Multiple decisions survive together', () => {
    const hole = makeHole({ wolfPick: 'solo', presses: { 'game-1': ['front'] }, bangoWinner: 'p3' })
    const blob = buildHoleDecisions(hole, BOTH_SET)!
    const result = hydrateHoleDecisions(blob)
    expect(result.wolfPick).toBe('solo')
    expect(result.presses).toEqual({ 'game-1': ['front'] })
    expect(result.bangoWinner).toBe('p3')
  })
})
