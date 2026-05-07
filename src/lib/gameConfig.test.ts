import { describe, it, expect, vi } from 'vitest'
import { buildGameConfig, validateGameConfig, hydrateGameConfig, validateGameConfigInput } from './gameConfig'
import type { GameInstance, JunkConfig } from '../types'

const EMPTY_JUNK: JunkConfig = {
  greenie: false, greenieAmount: 0, sandy: false, sandyAmount: 0,
  birdie: false, birdieAmount: 0, eagle: false, eagleAmount: 0,
  garbage: false, garbageAmount: 0, hammer: false,
  snake: false, snakeAmount: 0, lowball: false, lowballAmount: 0,
}

function makeGame(type: GameInstance['type'], overrides: Partial<GameInstance> = {}): GameInstance {
  return { id: 'g1', type, label: type, stake: 100, playerIds: ['p1', 'p2'], junk: EMPTY_JUNK, ...overrides }
}

// ── buildGameConfig ───────────────────────────────────────────────────────────

describe('buildGameConfig — nassau', () => {
  it('returns null when no Nassau fields set', () => {
    expect(buildGameConfig(makeGame('nassau'))).toBeNull()
  })
  it('returns only set fields', () => {
    const cfg = buildGameConfig(makeGame('nassau', { pressRule: 'auto-2-down' }))
    expect(cfg).toEqual({ pressRule: 'auto-2-down' })
  })
  it('returns all three when all set', () => {
    const cfg = buildGameConfig(makeGame('nassau', {
      pressRule: 'manual', pressScope: 'nine', pairingMode: 'allPairs',
    }))
    expect(cfg).toEqual({ pressRule: 'manual', pressScope: 'nine', pairingMode: 'allPairs' })
  })
  it('includes appliesHandicap when set', () => {
    const cfg = buildGameConfig(makeGame('nassau', { appliesHandicap: false }))
    expect(cfg).toEqual({ appliesHandicap: false })
  })
  it('includes appliesHandicap=true in full config', () => {
    const cfg = buildGameConfig(makeGame('nassau', {
      pressRule: 'manual', pressScope: 'nine', pairingMode: 'allPairs', appliesHandicap: true,
    }))
    expect(cfg).toEqual({ pressRule: 'manual', pressScope: 'nine', pairingMode: 'allPairs', appliesHandicap: true })
  })
})

describe('buildGameConfig — wolf', () => {
  it('returns null when no Wolf fields set', () => {
    expect(buildGameConfig(makeGame('wolf'))).toBeNull()
  })
  it('returns set fields', () => {
    const cfg = buildGameConfig(makeGame('wolf', { loneWolfMultiplier: 3, escalating: true }))
    expect(cfg).toEqual({ loneWolfMultiplier: 3, escalating: true })
  })
  it('serializes wolfTieRule: no-points', () => {
    const cfg = buildGameConfig(makeGame('wolf', { wolfTieRule: 'no-points' }))
    expect(cfg).toEqual({ wolfTieRule: 'no-points' })
  })
  it('serializes wolfTieRule: carryover', () => {
    const cfg = buildGameConfig(makeGame('wolf', { wolfTieRule: 'carryover' }))
    expect(cfg).toEqual({ wolfTieRule: 'carryover' })
  })
  it('omits wolfTieRule when undefined', () => {
    const cfg = buildGameConfig(makeGame('wolf', { loneWolfMultiplier: 2 }))
    expect(cfg).toEqual({ loneWolfMultiplier: 2 })
    expect(cfg).not.toHaveProperty('wolfTieRule')
  })
})

describe('buildGameConfig — skins', () => {
  it('returns null when escalating undefined', () => {
    expect(buildGameConfig(makeGame('skins'))).toBeNull()
  })
  it('returns escalating when set', () => {
    expect(buildGameConfig(makeGame('skins', { escalating: false }))).toEqual({ escalating: false })
    expect(buildGameConfig(makeGame('skins', { escalating: true }))).toEqual({ escalating: true })
  })
})

describe('buildGameConfig — other types return null', () => {
  it('strokePlay returns null', () => expect(buildGameConfig(makeGame('strokePlay'))).toBeNull())
  it('matchPlay returns null', () => expect(buildGameConfig(makeGame('matchPlay'))).toBeNull())
})

// ── validateGameConfig ────────────────────────────────────────────────────────

describe('validateGameConfig — accepts valid inputs', () => {
  it('null config always passes', () => expect(validateGameConfig('nassau', null).ok).toBe(true))
  it('undefined config always passes', () => expect(validateGameConfig('nassau', undefined).ok).toBe(true))
  it('empty object passes for any known type', () => {
    expect(validateGameConfig('nassau', {}).ok).toBe(true)
    expect(validateGameConfig('wolf', {}).ok).toBe(true)
    expect(validateGameConfig('skins', {}).ok).toBe(true)
  })
  it('Nassau full valid config passes', () => {
    expect(validateGameConfig('nassau', { pressRule: 'manual', pressScope: 'nine', pairingMode: 'allPairs' }).ok).toBe(true)
  })
  it('Nassau auto-2-down + match scope + singles passes', () => {
    expect(validateGameConfig('nassau', { pressRule: 'auto-2-down', pressScope: 'match', pairingMode: 'singles' }).ok).toBe(true)
  })
  it('Wolf valid config passes', () => {
    expect(validateGameConfig('wolf', { loneWolfMultiplier: 2, escalating: false }).ok).toBe(true)
  })
  it('Wolf wolfTieRule: no-points passes', () => {
    expect(validateGameConfig('wolf', { wolfTieRule: 'no-points' }).ok).toBe(true)
  })
  it('Wolf wolfTieRule: carryover passes', () => {
    expect(validateGameConfig('wolf', { wolfTieRule: 'carryover' }).ok).toBe(true)
  })
  it('Skins valid escalating passes', () => {
    expect(validateGameConfig('skins', { escalating: true }).ok).toBe(true)
  })
})

describe('validateGameConfig — rejects unknown keys (rule #7)', () => {
  it('Nassau unknown key rejected', () => {
    const r = validateGameConfig('nassau', { pressRule: 'manual', xFactor: true })
    expect(r.ok).toBe(false)
    expect((r as { reason: string }).reason).toMatch(/unknown key/)
  })
  it('Wolf unknown key rejected', () => {
    const r = validateGameConfig('wolf', { blindMultiplier: 4 })
    expect(r.ok).toBe(false)
  })
  it('Skins unknown key rejected', () => {
    const r = validateGameConfig('skins', { carryover: true })
    expect(r.ok).toBe(false)
  })
  it('Non-configurable type (strokePlay) rejects any key', () => {
    const r = validateGameConfig('strokePlay', { stake: 100 })
    expect(r.ok).toBe(false)
  })
})

describe('validateGameConfig — rejects invalid enum values', () => {
  it('invalid pressRule rejected', () => {
    const r = validateGameConfig('nassau', { pressRule: 'always' })
    expect(r.ok).toBe(false)
    expect((r as { reason: string }).reason).toMatch(/pressRule/)
  })
  it('invalid pressScope rejected', () => {
    expect(validateGameConfig('nassau', { pressScope: 'eighteen' }).ok).toBe(false)
  })
  it('invalid pairingMode rejected', () => {
    expect(validateGameConfig('nassau', { pairingMode: 'teams' }).ok).toBe(false)
  })
  it('non-boolean escalating rejected for wolf', () => {
    expect(validateGameConfig('wolf', { escalating: 'yes' }).ok).toBe(false)
  })
  it('non-number loneWolfMultiplier rejected', () => {
    expect(validateGameConfig('wolf', { loneWolfMultiplier: '3' }).ok).toBe(false)
  })
  it('float loneWolfMultiplier rejected (wolf engine requires integer)', () => {
    expect(validateGameConfig('wolf', { loneWolfMultiplier: 2.5 }).ok).toBe(false)
  })
  it('invalid wolfTieRule rejected', () => {
    expect(validateGameConfig('wolf', { wolfTieRule: 'split' }).ok).toBe(false)
    expect(validateGameConfig('wolf', { wolfTieRule: 123 }).ok).toBe(false)
    expect(validateGameConfig('wolf', { wolfTieRule: ['carryover'] }).ok).toBe(false)
  })
  it('non-boolean escalating rejected for skins', () => {
    expect(validateGameConfig('skins', { escalating: 1 }).ok).toBe(false)
  })
  it('non-boolean appliesHandicap rejected for nassau', () => {
    expect(validateGameConfig('nassau', { appliesHandicap: 1 }).ok).toBe(false)
    expect(validateGameConfig('nassau', { appliesHandicap: 'yes' }).ok).toBe(false)
  })
})

// ── hydrateGameConfig ─────────────────────────────────────────────────────────

describe('hydrateGameConfig — round-trip fidelity', () => {
  it('nassau: round-trips pressRule + pressScope + pairingMode', () => {
    const config = { pressRule: 'auto-1-down', pressScope: 'match', pairingMode: 'singles' }
    const hydrated = hydrateGameConfig('nassau', config)
    expect(hydrated.pressRule).toBe('auto-1-down')
    expect(hydrated.pressScope).toBe('match')
    expect(hydrated.pairingMode).toBe('singles')
  })
  it('nassau: round-trips appliesHandicap=false', () => {
    const hydrated = hydrateGameConfig('nassau', { appliesHandicap: false })
    expect(hydrated.appliesHandicap).toBe(false)
  })
  it('nassau: round-trips appliesHandicap=true', () => {
    const hydrated = hydrateGameConfig('nassau', { appliesHandicap: true })
    expect(hydrated.appliesHandicap).toBe(true)
  })
  it('wolf: round-trips loneWolfMultiplier + escalating', () => {
    const hydrated = hydrateGameConfig('wolf', { loneWolfMultiplier: 3, escalating: true })
    expect(hydrated.loneWolfMultiplier).toBe(3)
    expect(hydrated.escalating).toBe(true)
  })
  it('wolf: round-trips wolfTieRule: no-points', () => {
    expect(hydrateGameConfig('wolf', { wolfTieRule: 'no-points' }).wolfTieRule).toBe('no-points')
  })
  it('wolf: round-trips wolfTieRule: carryover', () => {
    expect(hydrateGameConfig('wolf', { wolfTieRule: 'carryover' }).wolfTieRule).toBe('carryover')
  })
  it('wolf: absent wolfTieRule → undefined (bridge supplies no-points default)', () => {
    const hydrated = hydrateGameConfig('wolf', { loneWolfMultiplier: 2 })
    expect(hydrated.wolfTieRule).toBeUndefined()
  })
  it('skins: round-trips escalating=false', () => {
    expect(hydrateGameConfig('skins', { escalating: false }).escalating).toBe(false)
  })
  it('null config returns empty partial', () => {
    expect(hydrateGameConfig('nassau', null)).toEqual({})
  })
  it('corrupt config logs warning and returns empty', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = hydrateGameConfig('nassau', { pressRule: 'INVALID' })
    expect(result).toEqual({})
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
  it('nassau: undefined fields are omitted (not set to undefined)', () => {
    // Only pressRule set — pairingMode absent from blob → undefined in result
    const hydrated = hydrateGameConfig('nassau', { pressRule: 'manual' })
    expect(hydrated.pressRule).toBe('manual')
    expect(hydrated.pressScope).toBeUndefined()
    expect(hydrated.pairingMode).toBeUndefined()
  })
})

// ── Full round-trip via build → validate → hydrate ────────────────────────────

describe('buildGameConfig → validateGameConfig → hydrateGameConfig round-trip', () => {
  it('Nassau non-default config survives round-trip', () => {
    const game = makeGame('nassau', { pressRule: 'auto-2-down', pressScope: 'nine', pairingMode: 'allPairs' })
    const blob = buildGameConfig(game)
    expect(validateGameConfig('nassau', blob).ok).toBe(true)
    const hydrated = hydrateGameConfig('nassau', blob)
    expect(hydrated.pressRule).toBe('auto-2-down')
    expect(hydrated.pressScope).toBe('nine')
    expect(hydrated.pairingMode).toBe('allPairs')
  })
  it('Wolf non-default loneWolfMultiplier survives round-trip', () => {
    const game = makeGame('wolf', { loneWolfMultiplier: 4, escalating: false })
    const blob = buildGameConfig(game)
    const hydrated = hydrateGameConfig('wolf', blob)
    expect(hydrated.loneWolfMultiplier).toBe(4)
    expect(hydrated.escalating).toBe(false)
  })
  it('Wolf wolfTieRule: carryover survives round-trip', () => {
    const game = makeGame('wolf', { wolfTieRule: 'carryover' })
    const blob = buildGameConfig(game)
    expect(validateGameConfig('wolf', blob).ok).toBe(true)
    const hydrated = hydrateGameConfig('wolf', blob)
    expect(hydrated.wolfTieRule).toBe('carryover')
  })
  it('Wolf wolfTieRule: no-points survives round-trip', () => {
    const game = makeGame('wolf', { wolfTieRule: 'no-points' })
    const blob = buildGameConfig(game)
    expect(validateGameConfig('wolf', blob).ok).toBe(true)
    const hydrated = hydrateGameConfig('wolf', blob)
    expect(hydrated.wolfTieRule).toBe('no-points')
  })
  it('Skins escalating=true survives round-trip', () => {
    const game = makeGame('skins', { escalating: true })
    const blob = buildGameConfig(game)
    const hydrated = hydrateGameConfig('skins', blob)
    expect(hydrated.escalating).toBe(true)
  })
  it('null blob → empty hydrate (use bridge defaults)', () => {
    const blob = buildGameConfig(makeGame('nassau'))  // no fields set → null
    expect(blob).toBeNull()
    const hydrated = hydrateGameConfig('nassau', blob)
    expect(hydrated).toEqual({})
    // buildNassauCfg will apply its own defaults when called with these
  })
})

// ── validateGameConfigInput ───────────────────────────────────────────────────
// Strict POST-boundary validator. Catches misspelled/cross-type keys before
// buildGameConfig silently drops them (closes rule #7 loophole at write boundary).

const BASE_NASSAU_GAME = { id: 'g1', type: 'nassau', label: 'Nassau', stake: 100, playerIds: ['p1', 'p2'], junk: EMPTY_JUNK }
const BASE_WOLF_GAME   = { id: 'g2', type: 'wolf',   label: 'Wolf',   stake: 100, playerIds: ['p1', 'p2', 'p3', 'p4'], junk: EMPTY_JUNK }

describe('validateGameConfigInput — accepts valid inputs', () => {
  it('base fields only → valid for any type', () => {
    expect(validateGameConfigInput('nassau', BASE_NASSAU_GAME).ok).toBe(true)
    expect(validateGameConfigInput('wolf',   BASE_WOLF_GAME).ok).toBe(true)
  })
  it('nassau with valid config fields → valid', () => {
    expect(validateGameConfigInput('nassau', { ...BASE_NASSAU_GAME, pressRule: 'manual', pressScope: 'nine', pairingMode: 'allPairs' }).ok).toBe(true)
  })
  it('wolf with valid config fields → valid', () => {
    expect(validateGameConfigInput('wolf', { ...BASE_WOLF_GAME, loneWolfMultiplier: 2, escalating: false }).ok).toBe(true)
  })
  it('skins with escalating → valid', () => {
    expect(validateGameConfigInput('skins', { ...BASE_NASSAU_GAME, type: 'skins', escalating: true }).ok).toBe(true)
  })
  it('pressAmount on nassau is a base GameInstance field → valid', () => {
    expect(validateGameConfigInput('nassau', { ...BASE_NASSAU_GAME, pressAmount: 5 }).ok).toBe(true)
  })
})

describe('validateGameConfigInput — rejects misspelled config keys (POST boundary)', () => {
  it('presRule (misspelled pressRule) on nassau → rejected', () => {
    const r = validateGameConfigInput('nassau', { ...BASE_NASSAU_GAME, presRule: 'manual' })
    expect(r.ok).toBe(false)
    expect((r as { reason: string }).reason).toMatch(/Unknown game config key "presRule"/)
  })
  it('pressRulee (another typo) on nassau → rejected', () => {
    const r = validateGameConfigInput('nassau', { ...BASE_NASSAU_GAME, pressRulee: 'manual' })
    expect(r.ok).toBe(false)
    expect((r as { reason: string }).reason).toMatch(/Unknown/)
  })
  it('loneWolfMultiplier on nassau (cross-type key) → rejected', () => {
    const r = validateGameConfigInput('nassau', { ...BASE_NASSAU_GAME, loneWolfMultiplier: 2 })
    expect(r.ok).toBe(false)
    expect((r as { reason: string }).reason).toMatch(/not valid for game type/)
  })
  it('pressRule on wolf (nassau key on wolf) → rejected', () => {
    const r = validateGameConfigInput('wolf', { ...BASE_WOLF_GAME, pressRule: 'manual' })
    expect(r.ok).toBe(false)
    expect((r as { reason: string }).reason).toMatch(/not valid for game type/)
  })
  it('pairingMode on skins (nassau key on skins) → rejected', () => {
    const r = validateGameConfigInput('skins', { ...BASE_NASSAU_GAME, type: 'skins', pairingMode: 'allPairs' })
    expect(r.ok).toBe(false)
  })
  it('escalating on nassau (wolf/skins key on nassau) → rejected', () => {
    const r = validateGameConfigInput('nassau', { ...BASE_NASSAU_GAME, escalating: true })
    expect(r.ok).toBe(false)
    expect((r as { reason: string }).reason).toMatch(/not valid for game type/)
  })
  it('completely unknown key on any type → rejected', () => {
    expect(validateGameConfigInput('nassau', { ...BASE_NASSAU_GAME, xFactor: 42 }).ok).toBe(false)
    expect(validateGameConfigInput('wolf',   { ...BASE_WOLF_GAME,   xFactor: 42 }).ok).toBe(false)
  })
})

describe('hydrateGameConfig — permissive on unknown keys in DB blob (asymmetry test)', () => {
  it('otherwise-valid nassau config with unknown key → logs + returns {}', () => {
    // Simulates a blob written before strict validation existed (legacy data).
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = hydrateGameConfig('nassau', { pressRule: 'manual', unknownField: true })
    expect(result).toEqual({})  // graceful default, no crash
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
  it('wolf blob with unknown key → logs + returns {}', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = hydrateGameConfig('wolf', { loneWolfMultiplier: 2, extraKey: 'oops' })
    expect(result).toEqual({})
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
  it('valid nassau blob (no unknown keys) still hydrates correctly', () => {
    // Confirm the asymmetry does not break valid DB blobs.
    const result = hydrateGameConfig('nassau', { pressRule: 'auto-2-down', pressScope: 'nine' })
    expect(result.pressRule).toBe('auto-2-down')
    expect(result.pressScope).toBe('nine')
  })
})
