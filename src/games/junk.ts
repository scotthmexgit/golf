import type { HoleState, JunkRoundConfig, PlayerId, RoundConfig, ScoringEvent } from './types'

type JunkAwarded = Extract<ScoringEvent, { kind: 'JunkAwarded' }>

function isCTP(hole: HoleState, cfg: JunkRoundConfig): PlayerId | null {
  if (!cfg.ctpEnabled) return null
  if (hole.par !== 3) return null
  return hole.ctpWinner ?? null
}

export function settleJunkHole(
  hole: HoleState,
  roundCfg: RoundConfig,
  junkCfg: JunkRoundConfig,
): JunkAwarded[] {
  const events: JunkAwarded[] = []
  for (const bet of roundCfg.bets) {
    for (const kind of bet.junkItems) {
      if (kind !== 'ctp') continue
      const winner = isCTP(hole, junkCfg)
      if (winner === null) continue
      if (!bet.participants.includes(winner)) continue
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
  }
  return events
}
