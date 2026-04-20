import type { JunkConfig, HoleData, PlayerSetup, PayoutMap } from '@/types'
import { vsPar } from './scoring'

export function defaultJunk(stake: number): JunkConfig {
  return {
    greenie: false, greenieAmount: stake,
    sandy: false, sandyAmount: stake,
    birdie: false, birdieAmount: stake,
    eagle: false, eagleAmount: stake,
    garbage: false, garbageAmount: stake,
    hammer: false,
    snake: false, snakeAmount: stake,
    lowball: false, lowballAmount: stake,
  }
}

export function syncJunkAmounts(junk: JunkConfig, oldStake: number, newStake: number): JunkConfig {
  const updated = { ...junk }
  const fields: (keyof JunkConfig)[] = [
    'greenieAmount', 'sandyAmount', 'birdieAmount', 'eagleAmount',
    'garbageAmount', 'snakeAmount', 'lowballAmount',
  ]
  for (const f of fields) {
    if (updated[f] === oldStake) (updated as unknown as Record<string, number>)[f] = newStake
  }
  return updated
}

export function hasAnyJunk(junk: JunkConfig): boolean {
  return junk.greenie || junk.sandy || junk.birdie || junk.eagle ||
    junk.garbage || junk.hammer || junk.snake || junk.lowball
}

export function hasGreenieJunk(junk: JunkConfig): boolean {
  return junk.greenie || junk.garbage
}

export function computeJunkPayouts(
  holes: HoleData[],
  gameId: string,
  junk: JunkConfig,
  players: PlayerSetup[],
  playerIds: string[],
): PayoutMap {
  const ing = players.filter(p => playerIds.includes(p.id))
  const payouts: PayoutMap = {}
  ing.forEach(p => { payouts[p.id] = 0 })

  for (const hole of holes) {
    // Birdie
    if (junk.birdie || junk.garbage) {
      const amount = junk.garbage ? junk.garbageAmount : junk.birdieAmount
      for (const p of ing) {
        const score = hole.scores[p.id] ?? 0
        if (score > 0 && vsPar(score, hole.par) === -1) {
          payouts[p.id] += amount * (ing.length - 1)
          ing.filter(o => o.id !== p.id).forEach(o => { payouts[o.id] -= amount })
        }
      }
    }

    // Eagle
    if (junk.eagle || junk.garbage) {
      const amount = junk.garbage ? junk.garbageAmount * 2 : junk.eagleAmount
      for (const p of ing) {
        const score = hole.scores[p.id] ?? 0
        if (score > 0 && vsPar(score, hole.par) <= -2) {
          payouts[p.id] += amount * (ing.length - 1)
          ing.filter(o => o.id !== p.id).forEach(o => { payouts[o.id] -= amount })
        }
      }
    }

    // Sandy
    if (junk.sandy || junk.garbage) {
      const amount = junk.garbage ? junk.garbageAmount : junk.sandyAmount
      for (const p of ing) {
        const dots = hole.dots?.[p.id]
        if (dots?.sandy && (hole.scores[p.id] ?? 99) <= hole.par) {
          payouts[p.id] += amount * (ing.length - 1)
          ing.filter(o => o.id !== p.id).forEach(o => { payouts[o.id] -= amount })
        }
      }
    }

    // Greenie — from hole.greenieWinners keyed by gameId
    if (junk.greenie || junk.garbage) {
      const amount = junk.garbage ? junk.garbageAmount : junk.greenieAmount
      if (hole.par === 3) {
        const winnerId = hole.greenieWinners?.[gameId]
        if (winnerId && ing.find(p => p.id === winnerId)) {
          payouts[winnerId] += amount * (ing.length - 1)
          ing.filter(o => o.id !== winnerId).forEach(o => { payouts[o.id] -= amount })
        }
      }
    }
  }

  // Snake — last 3-putt holder pays everyone
  if (junk.snake) {
    let snakeHolder: string | null = null
    for (const hole of holes) {
      for (const p of ing) {
        if (hole.dots?.[p.id]?.threePutt) snakeHolder = p.id
      }
    }
    if (snakeHolder) {
      payouts[snakeHolder] -= junk.snakeAmount * (ing.length - 1)
      ing.filter(p => p.id !== snakeHolder).forEach(p => { payouts[p.id] += junk.snakeAmount })
    }
  }

  // Low Ball — lowest gross for the round
  if (junk.lowball && holes.length > 0) {
    const totals = ing.map(p => ({
      id: p.id,
      gross: holes.reduce((s, h) => s + (h.scores[p.id] ?? h.par), 0),
    })).sort((a, b) => a.gross - b.gross)
    if (totals.length >= 2 && totals[0].gross < totals[1].gross) {
      payouts[totals[0].id] += junk.lowballAmount * (ing.length - 1)
      ing.filter(p => p.id !== totals[0].id).forEach(p => { payouts[p.id] -= junk.lowballAmount })
    }
  }

  return payouts
}
