'use client'

import Link from 'next/link'
import { useRoundStore } from '@/store/roundStore'
import Header from '@/components/layout/Header'
import { formatMoneyDecimal, vsPar } from '@/lib/scoring'
import { computeAllPayouts } from '@/lib/payouts'

export default function ResultsPage() {
  const store = useRoundStore()
  const { players, holes, games, course } = store

  const payouts = computeAllPayouts(holes, players, games)

  const sorted = [...players].filter(p => p.betting).sort((a, b) => (payouts[b.id] || 0) - (payouts[a.id] || 0))
  const winner = sorted[0]
  const winnerAmount = payouts[winner?.id] || 0

  const playerTotals = players.map(p => {
    let total = 0
    for (const h of holes) {
      const score = h.scores[p.id] || 0
      if (score > 0) total += vsPar(score, h.par)
    }
    return { ...p, totalVsPar: total }
  })

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Results" />

      <div className="px-4 py-8 text-center" style={{ background: 'var(--green-deep)' }}>
        <div className="text-3xl mb-2">🏆</div>
        <h2 className="font-display text-xl font-bold" style={{ color: 'var(--sand)' }}>
          {winner?.name || 'Winner'} wins!
        </h2>
        <p className="font-mono text-lg" style={{ color: '#22c55e' }}>{formatMoneyDecimal(winnerAmount)}</p>
      </div>

      <div className="flex-1 max-w-[480px] mx-auto w-full px-4 py-4 space-y-4">
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--line)', background: 'white' }}>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--green-soft)' }}>Money Summary</h3>
          {sorted.map(p => {
            const amt = payouts[p.id] || 0
            return (
              <div key={p.id} className="flex items-center justify-between py-1.5 border-b last:border-0" style={{ borderColor: 'var(--line)' }}>
                <div>
                  <span className="text-sm font-medium">{p.name || 'Golfer'}</span>
                  <span className="text-[10px] ml-2 capitalize" style={{ color: 'var(--muted)' }}>{p.tee} · Crs {p.courseHcp}</span>
                </div>
                <span className="font-mono text-sm font-bold" style={{ color: amt > 0 ? '#22c55e' : amt < 0 ? 'var(--red-card)' : 'var(--muted)' }}>
                  {formatMoneyDecimal(amt)}
                </span>
              </div>
            )
          })}
        </div>

        {/* Game Breakdown */}
        {games.length > 0 && (
          <div className="rounded-xl border p-4" style={{ borderColor: 'var(--line)', background: 'white' }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--green-soft)' }}>Game Breakdown</h3>
            {games.map(g => (
              <div key={g.id} className="flex items-center justify-between py-1.5 border-b last:border-0 text-sm" style={{ borderColor: 'var(--line)' }}>
                <span>{g.label}</span>
                <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>{formatMoneyDecimal(g.stake)}/hole</span>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--line)', background: 'white' }}>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--green-soft)' }}>Scorecard</h3>
          {playerTotals.map(p => {
            const totalGross = holes.reduce((sum, h) => sum + (h.scores[p.id] || 0), 0)
            return (
              <div key={p.id} className="flex items-center justify-between py-1.5 border-b last:border-0" style={{ borderColor: 'var(--line)' }}>
                <span className="text-sm">{p.name || 'Golfer'}</span>
                <div className="flex items-center gap-3 font-mono text-xs">
                  <span>{totalGross}</span>
                  <span style={{ color: p.totalVsPar > 0 ? 'var(--red-card)' : p.totalVsPar < 0 ? '#22c55e' : 'var(--ink)' }}>
                    {p.totalVsPar === 0 ? 'E' : p.totalVsPar > 0 ? `+${p.totalVsPar}` : p.totalVsPar}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="text-center pt-4 pb-8">
          <Link href="/" className="inline-block px-6 py-3 rounded-full text-sm font-semibold" style={{ background: 'var(--green-deep)', color: 'var(--sand)' }}>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
