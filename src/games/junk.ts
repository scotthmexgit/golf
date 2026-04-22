import type { BetSelection, HoleState, JunkKind, JunkRoundConfig, PlayerId, RoundConfig, ScoringEvent } from './types'

type JunkAwarded = Extract<ScoringEvent, { kind: 'JunkAwarded' }>

function isCTP(hole: HoleState, cfg: JunkRoundConfig): PlayerId | null {
  if (!cfg.ctpEnabled) return null
  if (hole.par !== 3) return null
  return hole.ctpWinner ?? null
}

function isLongestDrive(hole: HoleState, cfg: JunkRoundConfig): PlayerId | null {
  if (!cfg.longestDriveEnabled) return null
  if (hole.par < 4) return null
  if (!cfg.longestDriveHoles.includes(hole.hole)) return null
  return hole.longestDriveWinner ?? null
}

function isGreenie(hole: HoleState, cfg: JunkRoundConfig): PlayerId | null {
  if (!cfg.greenieEnabled) return null
  if (!cfg.girEnabled) return null
  const winner = isCTP(hole, cfg)
  if (winner === null) return null
  if (hole.gross[winner] > hole.par) return null
  return winner
}

function pushAward(
  events: JunkAwarded[],
  hole: HoleState,
  bet: BetSelection,
  kind: JunkKind,
  winner: PlayerId,
): void {
  if (!bet.participants.includes(winner)) return
  const N = bet.participants.length
  const points: Record<PlayerId, number> = {}
  for (const p of bet.participants) points[p] = p === winner ? N - 1 : -1
  events.push({
    kind: 'JunkAwarded',
    hole: hole.hole,
    junk: kind,
    winner,
    declaringBet: bet.id,
    points,
    actor: 'system',
    timestamp: hole.timestamp,
  })
}

export function settleJunkHole(
  hole: HoleState,
  roundCfg: RoundConfig,
  junkCfg: JunkRoundConfig,
): JunkAwarded[] {
  const events: JunkAwarded[] = []
  for (const bet of roundCfg.bets) {
    for (const kind of bet.junkItems) {
      if (kind === 'ctp') {
        const winner = isCTP(hole, junkCfg)
        if (winner !== null) pushAward(events, hole, bet, kind, winner)
      }

      if (kind === 'greenie') {
        const winner = isGreenie(hole, junkCfg)
        if (winner !== null) pushAward(events, hole, bet, kind, winner)
      }

      if (kind === 'longestDrive') {
        const winner = isLongestDrive(hole, junkCfg)
        if (winner !== null) pushAward(events, hole, bet, kind, winner)
      }
    }
  }
  return events
}
