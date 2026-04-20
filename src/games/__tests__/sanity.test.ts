import { describe, it, expect } from 'vitest'

describe('vitest sanity', () => {
  it('runs under Vitest with integer math', () => {
    expect(1 + 1).toBe(2)
    expect(Number.isInteger(3 - 1)).toBe(true)
  })
})
