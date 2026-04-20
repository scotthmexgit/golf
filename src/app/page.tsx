'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Header from '@/components/layout/Header'

interface RecentRound {
  id: number
  playedAt: string
  holesCount: number
  course: { name: string; location: string }
  players: { player: { name: string } }[]
}

export default function HomePage() {
  const [rounds, setRounds] = useState<RecentRound[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/golf/api/rounds')
      .then(r => r.json())
      .then(data => { setRounds(data.rounds || []); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [])

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 flex flex-col items-center px-4 pt-16 pb-8 max-w-[480px] mx-auto w-full">
        <div className="text-center space-y-2 mb-10">
          <h2 className="font-display text-3xl font-bold" style={{ color: 'var(--green-deep)' }}>
            Ready to play?
          </h2>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Set up your round, track scores, settle bets.
          </p>
        </div>

        <Link
          href="/round/new"
          className="w-full py-3.5 rounded-full text-center text-sm font-semibold transition-opacity"
          style={{ background: 'var(--green-deep)', color: 'var(--sand)' }}
        >
          Start New Round
        </Link>

        <div className="mt-12 w-full">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>
            Recent Rounds
          </h3>

          {!loaded && (
            <div className="text-center py-6" style={{ color: 'var(--muted)' }}>
              <p className="text-sm">Loading...</p>
            </div>
          )}

          {loaded && rounds.length === 0 && (
            <div className="rounded-xl border p-6 text-center" style={{ borderColor: 'var(--line)', background: 'white' }}>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>No rounds yet — tee it up!</p>
            </div>
          )}

          {loaded && rounds.length > 0 && (
            <div className="space-y-2">
              {rounds.map(r => (
                <Link
                  key={r.id}
                  href={`/results/${r.id}`}
                  className="block rounded-xl border p-3 transition-colors"
                  style={{ borderColor: 'var(--line)', background: 'white' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                      {r.course?.name || 'Unknown Course'}
                    </div>
                    <div className="text-[10px] font-mono" style={{ color: 'var(--muted)' }}>
                      {new Date(r.playedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                    {r.players?.map(p => p.player?.name).filter(Boolean).join(', ') || 'No players'}
                    {' · '}{r.holesCount} holes
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
