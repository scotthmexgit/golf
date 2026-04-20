'use client'

import { useRoundStore } from '@/store/roundStore'
import Header from '@/components/layout/Header'
import { vsPar, parLabel, parColor, formatMoney } from '@/lib/scoring'
import { computeAllPayouts } from '@/lib/payouts'

export default function BetsPage() {
  const store = useRoundStore()
  const { players, holes, games, roundId } = store

  const payouts = computeAllPayouts(holes, players, games)
  const scoredHoles = holes.filter(h => players.every(p => (h.scores[p.id] || 0) > 0))

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Bet History" backHref={`/scorecard/${roundId}`} />

      <div className="px-4 py-3 flex gap-3 overflow-x-auto" style={{ background: 'var(--green-deep)' }}>
        {players.filter(p => p.betting).map(p => (
          <div key={p.id} className="flex-shrink-0 px-3 py-1.5 rounded-full font-mono text-xs"
            style={{ background: 'var(--green-mid)', color: 'var(--sand-light)' }}>
            {(p.name || 'Golfer').split(' ')[0]}{' '}
            <span className="font-bold" style={{ color: payouts[p.id] > 0 ? '#22c55e' : payouts[p.id] < 0 ? 'var(--red-card)' : 'var(--sand-light)' }}>
              {formatMoney(payouts[p.id] || 0)}
            </span>
          </div>
        ))}
      </div>

      <div className="flex-1 max-w-[480px] mx-auto w-full px-4 py-3 space-y-2">
        {scoredHoles.length === 0 && (
          <div className="text-center py-8" style={{ color: 'var(--muted)' }}>
            <p className="text-sm">No holes scored yet.</p>
          </div>
        )}
        {scoredHoles.map(h => (
          <div key={h.number} className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--line)', background: 'white' }}>
            <div className="flex items-start gap-3 p-3">
              <div className="w-10 h-10 rounded-lg flex flex-col items-center justify-center flex-shrink-0" style={{ background: 'var(--green-deep)' }}>
                <span className="font-display text-sm font-bold" style={{ color: 'var(--sand)' }}>{h.number}</span>
                <span className="text-[8px]" style={{ color: 'var(--sand-light)' }}>Par {h.par}</span>
              </div>
              <div className="flex-1 space-y-0.5">
                {players.map(p => {
                  const score = h.scores[p.id] || 0
                  const diff = vsPar(score, h.par)
                  return (
                    <div key={p.id} className="flex items-center justify-between text-xs">
                      <span style={{ color: 'var(--ink)' }}>{(p.name || 'Golfer').split(' ')[0]}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{score}</span>
                        <span className="font-mono w-12 text-right" style={{ color: parColor(diff) }}>{parLabel(diff)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
