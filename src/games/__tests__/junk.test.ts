import { describe, it, expect } from 'vitest'
import { settleJunkHole } from '../junk'
import type {
  BetSelection,
  HoleState,
  JunkRoundConfig,
  PlayerId,
  PlayerSetup,
  RoundConfig,
} from '../types'

// ─── Shared fixtures ─────────────────────────────────────────────────────────

const defaultJunkCfg: JunkRoundConfig = {
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
  barkieStrict: true,
  superSandyEnabled: false,
  ctpTieRule: 'groupResolve',
}

function makePlayers(ids: PlayerId[]): PlayerSetup[] {
  return ids.map((id) => ({
    id,
    name: id,
    hcpIndex: 0,
    tee: 'white',
    isCourseHcp: true,
    courseHcp: 0,
    betting: true,
    isSelf: false,
    roundHandicap: 0,
  }))
}

function makeCtpBet(id: string, participants: PlayerId[]): BetSelection {
  return {
    id,
    type: 'skins',
    stake: 1,
    participants,
    config: {
      id,
      stake: 1,
      escalating: false,
      tieRuleFinalHole: 'carryover',
      appliesHandicap: false,
      playerIds: participants,
      junkItems: ['ctp'],
      junkMultiplier: 1,
    },
    junkItems: ['ctp'],
    junkMultiplier: 1,
  }
}

function makeRoundCfg(bets: BetSelection[], players: PlayerId[]): RoundConfig {
  return {
    roundId: 'r1',
    courseName: 'Test Course',
    players: makePlayers(players),
    bets,
    junk: defaultJunkCfg,
    longestDriveHoles: [],
    locked: true,
    unitSize: 100,
  }
}

function makeHole(
  holeNum: number,
  par: number,
  gross: Record<PlayerId, number>,
  ctpWinner: PlayerId | null = null,
): HoleState {
  const ids = Object.keys(gross) as PlayerId[]
  const zeroBool: Record<PlayerId, boolean> = {}
  const zeroInt: Record<PlayerId, number> = {}
  for (const p of ids) { zeroBool[p] = false; zeroInt[p] = 0 }
  return {
    hole: holeNum,
    par,
    holeIndex: 1,
    timestamp: `ts-${holeNum}`,
    gross,
    strokes: { ...zeroInt },
    status: 'Confirmed',
    ctpWinner,
    longestDriveWinner: null,
    bunkerVisited: { ...zeroBool },
    treeSolidHit: { ...zeroBool },
    treeAnyHit: { ...zeroBool },
    longPutt: { ...zeroBool },
    polieInvoked: { ...zeroBool },
    fairwayHit: { ...zeroBool },
    gir: { ...zeroBool },
    pickedUp: [],
    conceded: [],
    withdrew: [],
  }
}

// ─── isCTP ───────────────────────────────────────────────────────────────────

describe('settleJunkHole — isCTP', () => {
  it('awards one JunkAwarded event when a single player is closest on a par-3 hole and nobody makes par', () => {
    // Three players; p1 wins CTP; all score bogey (4 on par 3) so greenie cannot trigger
    const players: PlayerId[] = ['p1', 'p2', 'p3']
    const bet = makeCtpBet('junk-1', players)
    const round = makeRoundCfg([bet], players)
    const hole = makeHole(5, 3, { p1: 4, p2: 4, p3: 4 }, 'p1')

    const events = settleJunkHole(hole, round, defaultJunkCfg)

    expect(events).toHaveLength(1)

    const [event] = events
    expect(event.kind).toBe('JunkAwarded')
    expect(event.winner).toBe('p1')
    expect(event.junk).toBe('ctp')

    // Zero-sum within the declaring bettor set (N=3: winner +2, others −1 each)
    const pointSum = Object.values(event.points).reduce((acc, v) => acc + v, 0)
    expect(pointSum).toBe(0)

    // Integer-unit invariant
    for (const delta of Object.values(event.points)) {
      expect(Number.isInteger(delta)).toBe(true)
    }
  })
})
