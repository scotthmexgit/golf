import { describe, it, expect } from 'vitest'
import { computePerHoleDeltas } from './perHoleDeltas'
import type { HoleData, GameInstance, JunkConfig, PlayerSetup } from '../types'

// ── Fixtures ────────────────────────────────────────────────────────────────

const EMPTY_JUNK: JunkConfig = {
  greenie: false, greenieAmount: 0,
  sandy: false, sandyAmount: 0,
  birdie: false, birdieAmount: 0,
  eagle: false, eagleAmount: 0,
  garbage: false, garbageAmount: 0,
  hammer: false,
  snake: false, snakeAmount: 0,
  lowball: false, lowballAmount: 0,
}

function makePlayer(id: string, courseHcp = 0): PlayerSetup {
  return {
    id, name: id, hcpIndex: courseHcp, tee: 'white',
    isCourseHcp: true, courseHcp, betting: true, isSelf: false, roundHandicap: 0,
  }
}

function makeHole(num: number, scores: Record<string, number>): HoleData {
  return { number: num, par: 4, index: num, scores, dots: {} }
}

function makeSpGame(playerIds: string[], stake = 500): GameInstance {
  return { id: 'sp-1', type: 'strokePlay', label: 'Stroke Play', stake, playerIds, junk: EMPTY_JUNK }
}

// ── totals field — Stroke Play (Choice B: no per-hole entries) ───────────────

describe('computePerHoleDeltas — totals: Stroke Play produces no per-hole entries', () => {
  it('totals is {} for a 3-player 2-hole SP round', () => {
    const players = [makePlayer('A'), makePlayer('B'), makePlayer('C')]
    const holes = [
      makeHole(1, { A: 3, B: 5, C: 5 }),
      makeHole(2, { A: 5, B: 3, C: 5 }),
    ]
    const { totals } = computePerHoleDeltas(holes, players, [makeSpGame(['A', 'B', 'C'])])
    expect(totals).toEqual({})
  })

  it('totals is {} for all-tied 18-hole SP round', () => {
    const players = [makePlayer('A'), makePlayer('B'), makePlayer('C')]
    const holes = Array.from({ length: 18 }, (_, i) => makeHole(i + 1, { A: 4, B: 4, C: 4 }))
    const { totals } = computePerHoleDeltas(holes, players, [makeSpGame(['A', 'B', 'C'])])
    expect(totals).toEqual({})
  })
})

// ── byGame field — Stroke Play ────────────────────────────────────────────────

describe('computePerHoleDeltas — byGame: Stroke Play produces no per-hole entries', () => {
  it('byGame is {} for a SP round (StrokePlaySettled has hole: null)', () => {
    const players = [makePlayer('A'), makePlayer('B'), makePlayer('C')]
    const holes = [makeHole(1, { A: 3, B: 5, C: 5 }), makeHole(2, { A: 5, B: 3, C: 5 })]
    const { byGame } = computePerHoleDeltas(holes, players, [makeSpGame(['A', 'B', 'C'])])
    expect(byGame).toEqual({})
  })
})

// ── Edge cases: both totals and byGame ───────────────────────────────────────

describe('computePerHoleDeltas — edge cases', () => {
  it('returns {totals:{}, byGame:{}} when games array is empty', () => {
    const players = [makePlayer('A'), makePlayer('B'), makePlayer('C')]
    const holes = [makeHole(1, { A: 3, B: 5, C: 5 })]
    const result = computePerHoleDeltas(holes, players, [])
    expect(result.totals).toEqual({})
    expect(result.byGame).toEqual({})
  })

  it('returns empty maps for a still-parked game type (wolf)', () => {
    // Skins is wired as of SK-2. Wolf remains parked (default branch → []).
    const players = [makePlayer('A'), makePlayer('B'), makePlayer('C'), makePlayer('D')]
    const holes = [makeHole(1, { A: 3, B: 5, C: 5, D: 5 })]
    const wolfGame: GameInstance = {
      id: 'wolf-1', type: 'wolf', label: 'Wolf',
      stake: 500, playerIds: ['A', 'B', 'C', 'D'], junk: EMPTY_JUNK,
    }
    const result = computePerHoleDeltas(holes, players, [wolfGame])
    expect(result.totals).toEqual({})
    expect(result.byGame).toEqual({})
  })

  it('returns empty maps when holes array is empty', () => {
    const players = [makePlayer('A'), makePlayer('B'), makePlayer('C')]
    const result = computePerHoleDeltas([], players, [makeSpGame(['A', 'B', 'C'])])
    expect(result.totals).toEqual({})
    expect(result.byGame).toEqual({})
  })

  it('SP + parked wolf — only SP contributes (totals and byGame both empty, since SP has no per-hole events)', () => {
    // SP produces no per-hole events (StrokePlaySettled.hole = null).
    // Wolf is parked (default branch → []). Neither contributes to per-hole maps.
    const players = [makePlayer('A'), makePlayer('B'), makePlayer('C'), makePlayer('D')]
    const holes = [makeHole(1, { A: 3, B: 5, C: 5, D: 5 })]
    const games: GameInstance[] = [
      makeSpGame(['A', 'B', 'C', 'D']),
      { id: 'wolf-1', type: 'wolf', label: 'Wolf', stake: 500, playerIds: ['A', 'B', 'C', 'D'], junk: EMPTY_JUNK },
    ]
    const result = computePerHoleDeltas(holes, players, games)
    expect(result.totals).toEqual({})
    expect(result.byGame).toEqual({})
  })
})

// ── byGame structural contract — now tested with live Skins (SK-2) ───────────

describe('computePerHoleDeltas — byGame structural contract with live Skins', () => {
  it('Skins decisive hole: totals and byGame both have an entry for that hole', () => {
    // A wins hole 1 outright (stake 500, 2 losers). SkinWon event has hole:1 and points.
    const players = [makePlayer('A'), makePlayer('B'), makePlayer('C')]
    const holes = [makeHole(1, { A: 3, B: 5, C: 5 })]
    const skinsGame: GameInstance = {
      id: 'sk-1', type: 'skins', label: 'Skins',
      stake: 500, playerIds: ['A', 'B', 'C'], junk: EMPTY_JUNK,
    }
    const { totals, byGame } = computePerHoleDeltas(holes, players, [skinsGame])
    // totals[1] has per-player net deltas summed across games
    expect(totals[1]).toBeDefined()
    expect(totals[1]['A']).toBe(1000)   // wins 2 × stake=500
    expect(totals[1]['B']).toBe(-500)
    expect(totals[1]['C']).toBe(-500)
    // byGame[1]['sk-1'] has the per-game breakdown
    expect(byGame[1]).toBeDefined()
    expect(byGame[1]['sk-1']).toBeDefined()
    expect(byGame[1]['sk-1']['A']).toBe(1000)
    expect(byGame[1]['sk-1']['B']).toBe(-500)
  })

  it('Skins tied hole: no totals or byGame entry (SkinCarried has no points)', () => {
    const players = [makePlayer('A'), makePlayer('B'), makePlayer('C')]
    const holes = [makeHole(1, { A: 4, B: 4, C: 4 })]  // all tie
    const skinsGame: GameInstance = {
      id: 'sk-1', type: 'skins', label: 'Skins',
      stake: 500, playerIds: ['A', 'B', 'C'], junk: EMPTY_JUNK,
    }
    const { totals, byGame } = computePerHoleDeltas(holes, players, [skinsGame])
    // SkinCarried has no 'points' field → not accumulated
    expect(totals[1]).toBeUndefined()
    expect(byGame[1]).toBeUndefined()
  })

  it('SP + Skins round: totals accumulates both; byGame separates them', () => {
    // 3-player round. Hole 1: Skins (A wins), SP ($0 per hole).
    const players = [makePlayer('A'), makePlayer('B'), makePlayer('C')]
    const holes = [makeHole(1, { A: 3, B: 5, C: 5 })]
    const spGame = makeSpGame(['A', 'B', 'C'], 500)
    const skinsGame: GameInstance = {
      id: 'sk-1', type: 'skins', label: 'Skins',
      stake: 500, playerIds: ['A', 'B', 'C'], junk: EMPTY_JUNK,
    }
    const { totals, byGame } = computePerHoleDeltas(holes, players, [spGame, skinsGame])
    // totals[1] reflects Skins only (SP contributes 0 per hole)
    expect(totals[1]['A']).toBe(1000)
    // byGame[1] has Skins entry but no SP entry (SP has no per-hole events)
    expect(byGame[1]['sk-1']).toBeDefined()
    expect(byGame[1][spGame.id]).toBeUndefined()
  })

  it('totals and byGame have the same hole keys', () => {
    const players = [makePlayer('A'), makePlayer('B'), makePlayer('C')]
    const holes = [
      makeHole(1, { A: 3, B: 4, C: 4 }),  // A wins (skin)
      makeHole(2, { A: 4, B: 4, C: 4 }),  // all tie (no entry)
    ]
    const skinsGame: GameInstance = {
      id: 'sk-1', type: 'skins', label: 'Skins',
      stake: 500, playerIds: ['A', 'B', 'C'], junk: EMPTY_JUNK,
    }
    const { totals, byGame } = computePerHoleDeltas(holes, players, [skinsGame])
    expect(Object.keys(totals).sort()).toEqual(Object.keys(byGame).sort())
  })
})
