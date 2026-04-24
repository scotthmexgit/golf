// src/games/__tests__/junk.test.ts — Phase 1 scaffold tests for the junk engine.
//
// #7 Phase 1: verifies that all 7 JunkKind arms are present and do not throw,
// and that settleJunkHole returns an empty array.
// Phase 2 tests (CTP, Greenie, Longest Drive) and #7b tests (Sandy, Barkie,
// Polie, Arnie) will be added in subsequent items.

import { describe, it, expect } from 'vitest'
import { resolveJunkWinner, settleJunkHole } from '../junk'
import type { HoleState, JunkKind, JunkRoundConfig, RoundConfig } from '../types'

// ─── Minimal fixtures ────────────────────────────────────────────────────────

const minimalJunkCfg: JunkRoundConfig = {
  girEnabled: true,
  longestDriveHoles: [],
  ctpEnabled: true,
  longestDriveEnabled: true,
  greenieEnabled: true,
  sandyEnabled: true,
  barkieEnabled: true,
  polieEnabled: true,
  arnieEnabled: true,
  polieMode: 'automatic',
  barkieStrict: false,
  superSandyEnabled: false,
}

const minimalHole: HoleState = {
  hole: 1,
  par: 4,
  holeIndex: 1,
  timestamp: 'ts-1',
  gross: { A: 4 },
  strokes: { A: 0 },
  status: 'Confirmed',
  ctpWinner: null,
  longestDriveWinner: null,
  bunkerVisited: { A: false },
  treeSolidHit: { A: false },
  treeAnyHit: { A: false },
  longPutt: { A: false },
  polieInvoked: { A: false },
  fairwayHit: { A: false },
  gir: { A: false },
  pickedUp: [],
  conceded: [],
  withdrew: [],
}

const minimalRoundCfg: RoundConfig = {
  roundId: 'r1',
  courseName: 'Test Course',
  players: [],
  bets: [],
  junk: minimalJunkCfg,
  longestDriveHoles: [],
  locked: true,
  unitSize: 100,
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('#7 Phase 1 — dispatch scaffold', () => {
  it('resolveJunkWinner does not throw for any JunkKind', () => {
    const allKinds: JunkKind[] = [
      'ctp',
      'longestDrive',
      'greenie',
      'sandy',
      'barkie',
      'polie',
      'arnie',
    ]
    for (const kind of allKinds) {
      expect(() => resolveJunkWinner(kind, minimalHole, minimalJunkCfg)).not.toThrow()
    }
  })

  it('settleJunkHole returns empty array', () => {
    const result = settleJunkHole(minimalHole, minimalRoundCfg, minimalJunkCfg)
    expect(result).toEqual([])
  })
})
