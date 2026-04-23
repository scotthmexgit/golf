import { describe, it, expect } from 'vitest'
import type { ScoringEvent, ScoringEventKind } from '../events'

// Exhaustive narrowing check. If a new ScoringEvent variant is introduced
// without adding a case below, `const _never: never = e` fails to type-check
// with a readable error naming the missing variant. The runtime body is a
// tautology — the type-check is the real test.

function exhaustive(e: ScoringEvent): ScoringEventKind {
  switch (e.kind) {
    case 'SkinWon': return 'SkinWon'
    case 'SkinCarried': return 'SkinCarried'
    case 'SkinVoid': return 'SkinVoid'
    case 'SkinCarryForfeit': return 'SkinCarryForfeit'
    case 'WolfHoleResolved': return 'WolfHoleResolved'
    case 'LoneWolfResolved': return 'LoneWolfResolved'
    case 'BlindLoneResolved': return 'BlindLoneResolved'
    case 'BlindLoneDeclared': return 'BlindLoneDeclared'
    case 'WolfHoleTied': return 'WolfHoleTied'
    case 'WolfCarryApplied': return 'WolfCarryApplied'
    case 'WolfDecisionMissing': return 'WolfDecisionMissing'
    case 'WolfHoleInvalid': return 'WolfHoleInvalid'
    case 'WolfCaptainReassigned': return 'WolfCaptainReassigned'
    case 'WolfCaptainTiebreak': return 'WolfCaptainTiebreak'
    case 'NassauHoleResolved': return 'NassauHoleResolved'
    case 'PressOffered': return 'PressOffered'
    case 'PressOpened': return 'PressOpened'
    case 'PressVoided': return 'PressVoided'
    case 'NassauHoleForfeited': return 'NassauHoleForfeited'
    case 'NassauWithdrawalSettled': return 'NassauWithdrawalSettled'
    case 'HoleResolved': return 'HoleResolved'
    case 'HoleHalved': return 'HoleHalved'
    case 'MatchClosedOut': return 'MatchClosedOut'
    case 'MatchTied': return 'MatchTied'
    case 'MatchHalved': return 'MatchHalved'
    case 'MatchConfigInvalid': return 'MatchConfigInvalid'
    case 'ExtraHoleResolved': return 'ExtraHoleResolved'
    case 'ConcessionRecorded': return 'ConcessionRecorded'
    case 'HoleForfeited': return 'HoleForfeited'
    case 'TeamSizeReduced': return 'TeamSizeReduced'
    case 'StrokePlayHoleRecorded': return 'StrokePlayHoleRecorded'
    case 'StrokePlaySettled': return 'StrokePlaySettled'
    case 'CardBackResolved': return 'CardBackResolved'
    case 'ScorecardPlayoffResolved': return 'ScorecardPlayoffResolved'
    case 'TieFallthrough': return 'TieFallthrough'
    case 'IncompleteCard': return 'IncompleteCard'
    case 'RoundingAdjustment': return 'RoundingAdjustment'
    case 'FieldTooSmall': return 'FieldTooSmall'
    case 'JunkAwarded': return 'JunkAwarded'
    case 'CTPWinnerSelected': return 'CTPWinnerSelected'
    case 'CTPCarried': return 'CTPCarried'
    case 'LongestDriveWinnerSelected': return 'LongestDriveWinnerSelected'
    case 'RoundConfigLocked': return 'RoundConfigLocked'
    case 'ConfigUnlocked': return 'ConfigUnlocked'
    case 'RoundStarted': return 'RoundStarted'
    case 'RoundClosed': return 'RoundClosed'
    case 'PlayerPickedUp': return 'PlayerPickedUp'
    case 'PlayerConceded': return 'PlayerConceded'
    case 'PlayerWithdrew': return 'PlayerWithdrew'
    case 'HoleReopened': return 'HoleReopened'
    case 'FinalAdjustmentApplied': return 'FinalAdjustmentApplied'
    case 'AdjustmentProposed': return 'AdjustmentProposed'
    case 'AdjustmentApproved': return 'AdjustmentApproved'
    case 'AdjustmentRejected': return 'AdjustmentRejected'
    case 'RoundControlTransferred': return 'RoundControlTransferred'
    default: {
      const _never: never = e
      throw new Error(`unhandled ScoringEvent variant: ${JSON.stringify(_never)}`)
    }
  }
}

// One representative event per variant (compile-time coverage mirror).
// Every entry below compiles only if its kind is a member of ScoringEvent,
// providing a second guard against drift between events.ts and this file.
const sampleEvents: ScoringEvent[] = [
  { kind: 'SkinWon', timestamp: 't', hole: 1, actor: 'system', declaringBet: 'b', winner: 'p', points: { p: 3 } },
  { kind: 'SkinCarried', timestamp: 't', hole: 2, actor: 'system', declaringBet: 'b', carryPoints: 1 },
  { kind: 'SkinVoid', timestamp: 't', hole: 3, actor: 'system', declaringBet: 'b' },
  { kind: 'SkinCarryForfeit', timestamp: 't', hole: 18, actor: 'system', declaringBet: 'b', carryPoints: 2 },
  { kind: 'WolfHoleResolved', timestamp: 't', hole: 1, actor: 'p', declaringBet: 'b', winners: ['p'], losers: [], points: { p: 3 } },
  { kind: 'LoneWolfResolved', timestamp: 't', hole: 5, actor: 'p', declaringBet: 'b', captain: 'p', won: true, points: { p: 9 } },
  { kind: 'BlindLoneResolved', timestamp: 't', hole: 5, actor: 'p', declaringBet: 'b', captain: 'p', won: true, points: { p: 12 } },
  { kind: 'BlindLoneDeclared', timestamp: 't', hole: 5, actor: 'p', declaringBet: 'b', captain: 'p' },
  { kind: 'WolfHoleTied', timestamp: 't', hole: 7, actor: 'system', declaringBet: 'b' },
  { kind: 'WolfCarryApplied', timestamp: 't', hole: 8, actor: 'system', declaringBet: 'b', multiplier: 2 },
  { kind: 'WolfDecisionMissing', timestamp: 't', hole: 9, actor: 'system', declaringBet: 'b', captain: 'p' },
  { kind: 'WolfHoleInvalid', timestamp: 't', hole: 10, actor: 'system', declaringBet: 'b', reason: 'missing-score' },
  { kind: 'WolfCaptainReassigned', timestamp: 't', hole: 11, actor: 'system', declaringBet: 'b', from: 'a', to: 'b' },
  { kind: 'WolfCaptainTiebreak', timestamp: 't', hole: 17, actor: 'system', declaringBet: 'b', candidates: ['a', 'b'], chosen: 'a' },
  { kind: 'NassauHoleResolved', timestamp: 't', hole: 1, actor: 'system', declaringBet: 'b', matchId: 'front', winner: 'A' },
  { kind: 'PressOffered', timestamp: 't', hole: 12, actor: 'p', declaringBet: 'b', parentMatchId: 'back', downPlayer: 'p' },
  { kind: 'PressOpened', timestamp: 't', hole: 12, actor: 'p', declaringBet: 'b', parentMatchId: 'back', pressMatchId: 'back-press-1' },
  { kind: 'PressVoided', timestamp: 't', hole: 18, actor: 'system', declaringBet: 'b', parentMatchId: 'back-press-1', reason: 'no-holes-remain' },
  { kind: 'NassauHoleForfeited', timestamp: 't', hole: 5, actor: 'system', declaringBet: 'b', matchId: 'front', forfeiter: 'p' },
  { kind: 'NassauWithdrawalSettled', timestamp: 't', hole: 13, actor: 'system', declaringBet: 'b', matchId: 'back', withdrawer: 'p', points: { p: -1 } },
  { kind: 'HoleResolved', timestamp: 't', hole: 1, actor: 'system', declaringBet: 'b', winner: 'team1' },
  { kind: 'HoleHalved', timestamp: 't', hole: 2, actor: 'system', declaringBet: 'b' },
  { kind: 'MatchClosedOut', timestamp: 't', hole: 14, actor: 'system', declaringBet: 'b', matchId: 'm', holesUp: 6, holesRemaining: 4, points: { p: 1 } },
  { kind: 'MatchTied', timestamp: 't', hole: 18, actor: 'system', declaringBet: 'b', matchId: 'm' },
  { kind: 'MatchHalved', timestamp: 't', hole: 18, actor: 'system', declaringBet: 'b', matchId: 'm' },
  { kind: 'MatchConfigInvalid', timestamp: 't', hole: null, actor: 'system', declaringBet: 'b', reason: 'no-teams' },
  { kind: 'ExtraHoleResolved', timestamp: 't', hole: 19, actor: 'system', declaringBet: 'b', extraHoleIndex: 1, points: { p: 1 } },
  { kind: 'ConcessionRecorded', timestamp: 't', hole: 10, actor: 'p', declaringBet: 'b', conceder: 'p', unit: 'match' },
  { kind: 'HoleForfeited', timestamp: 't', hole: 6, actor: 'system', declaringBet: 'b', forfeiter: 'p' },
  { kind: 'TeamSizeReduced', timestamp: 't', hole: 9, actor: 'system', declaringBet: 'b', teamId: 'A', remainingSize: 1 },
  { kind: 'StrokePlayHoleRecorded', timestamp: 't', hole: 1, actor: 'system', declaringBet: 'b', nets: { p: 4 } },
  { kind: 'StrokePlaySettled', timestamp: 't', hole: null, actor: 'system', declaringBet: 'b', mode: 'winner-takes-pot', points: { p: 3 } },
  { kind: 'CardBackResolved', timestamp: 't', hole: null, actor: 'system', declaringBet: 'b', segment: 9, tiedPlayers: ['a', 'b'], winner: 'a' },
  { kind: 'ScorecardPlayoffResolved', timestamp: 't', hole: null, actor: 'system', declaringBet: 'b', tiedPlayers: ['a', 'b'], winner: 'a' },
  { kind: 'TieFallthrough', timestamp: 't', hole: null, actor: 'system', declaringBet: 'b', from: 'card-back', to: 'split' },
  { kind: 'IncompleteCard', timestamp: 't', hole: 7, actor: 'system', declaringBet: 'b', player: 'p' },
  { kind: 'RoundingAdjustment', timestamp: 't', hole: null, actor: 'system', declaringBet: 'b', absorbingPlayer: 'a', points: { a: -1 } },
  { kind: 'FieldTooSmall', timestamp: 't', hole: null, actor: 'system', declaringBet: 'b' },
  { kind: 'JunkAwarded', timestamp: 't', hole: 4, actor: 'system', declaringBet: 'b', junk: 'greenie', winner: 'p', points: { p: 3 } },
  { kind: 'CTPWinnerSelected', timestamp: 't', hole: 4, actor: 'system', winner: 'p', gir: true },
  { kind: 'CTPCarried', timestamp: 't', hole: 7, actor: 'system', fromHole: 4, carryPoints: 1 },
  { kind: 'LongestDriveWinnerSelected', timestamp: 't', hole: 5, actor: 'system', winner: 'p' },
  { kind: 'RoundConfigLocked', timestamp: 't', hole: null, actor: 'p', config: { roundId: 'r', courseName: 'c', players: [], bets: [], junk: { girEnabled: true, longestDriveHoles: [], ctpEnabled: true, longestDriveEnabled: true, greenieEnabled: true, sandyEnabled: true, barkieEnabled: true, polieEnabled: true, arnieEnabled: true, polieMode: 'automatic', barkieStrict: true, superSandyEnabled: false }, longestDriveHoles: [], locked: true, unitSize: 100 } },
  { kind: 'ConfigUnlocked', timestamp: 't', hole: null, actor: 'p', reason: 'edit' },
  { kind: 'RoundStarted', timestamp: 't', hole: null, actor: 'system' },
  { kind: 'RoundClosed', timestamp: 't', hole: null, actor: 'system' },
  { kind: 'PlayerPickedUp', timestamp: 't', hole: 8, actor: 'p', player: 'p' },
  { kind: 'PlayerConceded', timestamp: 't', hole: 8, actor: 'p', player: 'p' },
  { kind: 'PlayerWithdrew', timestamp: 't', hole: 13, actor: 'p', player: 'p', fromHole: 13 },
  { kind: 'HoleReopened', timestamp: 't', hole: 7, actor: 'p', supersedes: ['e1', 'e2'] },
  { kind: 'FinalAdjustmentApplied', timestamp: 't', hole: null, actor: 'role-holder', targetPlayers: [{ playerId: 'a', points: 1 }, { playerId: 'b', points: -1 }], targetBet: 'nassau-front-9', reason: 'Scorecard error on hole 4', points: { a: 1, b: -1 } },
  { kind: 'AdjustmentProposed', timestamp: 't', hole: null, actor: 'c', targetPlayers: [{ playerId: 'c', points: 1 }, { playerId: 'd', points: -1 }], targetBet: 'nassau-back-9', reason: 'missed putt concession', proposalId: 'prop-1' },
  { kind: 'AdjustmentApproved', timestamp: 't', hole: null, actor: 'role-holder', proposalId: 'prop-1', appliedEventId: 'evt-42' },
  { kind: 'AdjustmentRejected', timestamp: 't', hole: null, actor: 'role-holder', proposalId: 'prop-2', reason: 'insufficient evidence' },
  { kind: 'RoundControlTransferred', timestamp: 't', hole: null, actor: 'a', fromPlayer: 'a', toPlayer: 'b' },
]

describe('ScoringEvent exhaustive narrowing', () => {
  it('compiles with every variant covered by the switch', () => {
    expect(typeof exhaustive).toBe('function')
  })

  it('discriminates every variant to its kind at runtime', () => {
    for (const event of sampleEvents) {
      expect(exhaustive(event)).toBe(event.kind)
    }
  })

  it('has 55 distinct variants', () => {
    const kinds = new Set(sampleEvents.map((e) => e.kind))
    expect(kinds.size).toBe(55)
  })

  it('narrows each of the five Final Adjustment variants via the exhaustive switch', () => {
    const kinds: ReadonlyArray<ScoringEventKind> = [
      'FinalAdjustmentApplied',
      'AdjustmentProposed',
      'AdjustmentApproved',
      'AdjustmentRejected',
      'RoundControlTransferred',
    ]
    for (const k of kinds) {
      const sample = sampleEvents.find((e) => e.kind === k)
      expect(sample).toBeDefined()
      if (sample) expect(exhaustive(sample)).toBe(k)
    }
  })
})
