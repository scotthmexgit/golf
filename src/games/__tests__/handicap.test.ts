import { describe, it, expect } from 'vitest'
import {
  effectiveCourseHcp,
  validatePlayerSetup,
  PlayerSetupError,
} from '../handicap'
import type { PlayerSetup } from '../../types'

function makePlayer(overrides: Partial<PlayerSetup> = {}): PlayerSetup {
  return {
    id: 'p1',
    name: 'Player',
    hcpIndex: 10,
    tee: 'white',
    isCourseHcp: true,
    courseHcp: 12,
    betting: true,
    isSelf: false,
    roundHandicap: 0,
    ...overrides,
  }
}

describe('_ROUND_HANDICAP.md § 5 — PlayerSetup.roundHandicap field', () => {
  it('layers onto courseHcp via effectiveCourseHcp', () => {
    expect(effectiveCourseHcp(makePlayer({ courseHcp: 12, roundHandicap: 0 }))).toBe(12)
    expect(effectiveCourseHcp(makePlayer({ courseHcp: 12, roundHandicap: -2 }))).toBe(10)
    expect(effectiveCourseHcp(makePlayer({ courseHcp: 14, roundHandicap: 3 }))).toBe(17)
  })

  it('is a pure function (identical inputs → identical outputs)', () => {
    const p = makePlayer({ courseHcp: 12, roundHandicap: -2 })
    expect(effectiveCourseHcp(p)).toBe(effectiveCourseHcp(p))
  })
})

describe('_ROUND_HANDICAP.md § 7 — validatePlayerSetup', () => {
  it('accepts roundHandicap = 0 (default)', () => {
    expect(() => validatePlayerSetup(makePlayer({ roundHandicap: 0 }))).not.toThrow()
  })

  it('accepts roundHandicap = -10 (lower bound)', () => {
    expect(() => validatePlayerSetup(makePlayer({ roundHandicap: -10 }))).not.toThrow()
  })

  it('accepts roundHandicap = 10 (upper bound)', () => {
    expect(() => validatePlayerSetup(makePlayer({ roundHandicap: 10 }))).not.toThrow()
  })

  it('rejects roundHandicap = -11 with PlayerSetupError', () => {
    expect(() => validatePlayerSetup(makePlayer({ roundHandicap: -11 }))).toThrow(PlayerSetupError)
  })

  it('rejects roundHandicap = 11 with PlayerSetupError', () => {
    expect(() => validatePlayerSetup(makePlayer({ roundHandicap: 11 }))).toThrow(PlayerSetupError)
  })

  it('rejects roundHandicap = 0.5 with PlayerSetupError', () => {
    expect(() => validatePlayerSetup(makePlayer({ roundHandicap: 0.5 }))).toThrow(PlayerSetupError)
  })

  it('rejects a non-number roundHandicap', () => {
    const badPlayer = makePlayer({
      roundHandicap: 'zero' as unknown as number,
    })
    expect(() => validatePlayerSetup(badPlayer)).toThrow(PlayerSetupError)
  })

  it('attaches a readable field identifier to PlayerSetupError', () => {
    try {
      validatePlayerSetup(makePlayer({ roundHandicap: 11 }))
    } catch (e) {
      expect(e).toBeInstanceOf(PlayerSetupError)
      if (e instanceof PlayerSetupError) {
        expect(e.field).toBe('roundHandicap')
      }
    }
  })
})

