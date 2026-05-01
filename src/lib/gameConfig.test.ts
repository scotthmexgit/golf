import { describe, it, expect, vi } from 'vitest'
import { buildGameConfig, validateGameConfig, hydrateGameConfig } from './gameConfig'
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
})

describe('buildGameConfig — wolf', () => {
  it('returns null when no Wolf fields set', () => {
    expect(buildGameConfig(makeGame('wolf'))).toBeNull()
  })
  it('returns set fields', () => {
    const cfg = buildGameConfig(makeGame('wolf', { loneWolfMultiplier: 3, escalating: true }))
    expect(cfg).toEqual({ loneWolfMultiplier: 3, escalating: true })
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
  it('non-boolean escalating rejected for skins', () => {
    expect(validateGameConfig('skins', { escalating: 1 }).ok).toBe(false)
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
  it('wolf: round-trips loneWolfMultiplier + escalating', () => {
    const hydrated = hydrateGameConfig('wolf', { loneWolfMultiplier: 3, escalating: true })
    expect(hydrated.loneWolfMultiplier).toBe(3)
    expect(hydrated.escalating).toBe(true)
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
