import { describe, it, expect } from 'vitest'
import { stakeUnitLabel } from './scoring'

describe('stakeUnitLabel', () => {
  it('returns /round for strokePlay', () => {
    expect(stakeUnitLabel('strokePlay')).toBe('/round')
  })

  it('returns /hole for skins', () => {
    expect(stakeUnitLabel('skins')).toBe('/hole')
  })

  it('returns /hole for wolf', () => {
    expect(stakeUnitLabel('wolf')).toBe('/hole')
  })

  it('returns /hole for nassau', () => {
    expect(stakeUnitLabel('nassau')).toBe('/hole')
  })

  it('returns /hole for matchPlay', () => {
    expect(stakeUnitLabel('matchPlay')).toBe('/hole')
  })

  it('returns /hole for unknown game types', () => {
    expect(stakeUnitLabel('unknown')).toBe('/hole')
  })
})
