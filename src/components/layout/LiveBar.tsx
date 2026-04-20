'use client'

import { useRoundStore } from '@/store/roundStore'
import { vsPar } from '@/lib/scoring'

export default function LiveBar() {
  const { players, holes } = useRoundStore()

  const playerTotals = players.map(p => {
    let totalVsPar = 0
    for (const h of holes) {
      const score = h.scores[p.id]
      if (score && score > 0) {
        totalVsPar += vsPar(score, h.par)
      }
    }
    return { name: p.name || `Golfer`, vsPar: totalVsPar }
  })

  return (
    <div
      className="px-4 py-2 flex gap-4 overflow-x-auto text-xs"
      style={{ background: 'var(--green-mid)' }}
    >
      {playerTotals.map((p, i) => (
        <span key={i} className="font-mono whitespace-nowrap" style={{ color: 'var(--sand-light)' }}>
          {p.name.split(' ')[0]}{' '}
          <span className="font-bold">
            {p.vsPar === 0 ? 'E' : p.vsPar > 0 ? `+${p.vsPar}` : p.vsPar}
          </span>
        </span>
      ))}
    </div>
  )
}
