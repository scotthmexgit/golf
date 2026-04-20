'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRoundStore } from '@/store/roundStore'
import Header from '@/components/layout/Header'
import LiveBar from '@/components/layout/LiveBar'
import BottomCta from '@/components/layout/BottomCta'
import HoleHeader from '@/components/scorecard/HoleHeader'
import HoleDots from '@/components/scorecard/HoleDots'
import ScoreRow from '@/components/scorecard/ScoreRow'
import Link from 'next/link'
import { hasGreenieJunk } from '@/lib/junk'
import { vsPar } from '@/lib/scoring'

export default function ScorecardPage() {
  const router = useRouter()
  const store = useRoundStore()
  const { course, players, holes, currentHole, setCurrentHole, games, roundId } = store
  const [showFinishConfirm, setShowFinishConfirm] = useState(false)
  const [notices, setNotices] = useState<string[]>([])

  const holeRange = store.holeRange()
  const holeData = holes.find(h => h.number === currentHole)
  const currentIdx = holeRange.indexOf(currentHole)
  const scoredHoles = new Set(
    holes.filter(h => players.every(p => (h.scores[p.id] || 0) > 0)).map(h => h.number)
  )

  const activeGameIds = games.map(g => g.id)
  const allScored = holeData ? players.every(p => (holeData.scores[p.id] || 0) > 0) : false
  const isLastHole = currentIdx === holeRange.length - 1

  const detectNotices = () => {
    if (!holeData) return
    const n: string[] = []
    for (const p of players) {
      const score = holeData.scores[p.id] || 0
      if (score <= 0) continue
      const diff = vsPar(score, holeData.par)
      const name = p.name || 'Golfer'

      // Birdie detection
      if (diff === -1) {
        for (const g of games) {
          if ((g.junk.birdie || g.junk.garbage) && g.playerIds.includes(p.id)) {
            const amt = g.junk.garbage ? g.junk.garbageAmount : g.junk.birdieAmount
            n.push(`${name} made birdie · +$${amt} (${g.label})`)
          }
        }
      }
      // Eagle detection
      if (diff <= -2) {
        for (const g of games) {
          if ((g.junk.eagle || g.junk.garbage) && g.playerIds.includes(p.id)) {
            const amt = g.junk.garbage ? g.junk.garbageAmount * 2 : g.junk.eagleAmount
            n.push(`${name} made eagle · +$${amt} (${g.label})`)
          }
        }
      }
      // Snake detection (3-putt)
      if (holeData.dots[p.id]?.threePutt) {
        for (const g of games) {
          if (g.junk.snake && g.playerIds.includes(p.id)) {
            n.push(`${name} now holds the snake`)
          }
        }
      }
    }
    setNotices(n)
  }

  const handleSaveNext = () => {
    if (!allScored) return

    detectNotices()

    // Check if par 3 with any game that has greenie junk
    const isPar3 = holeData?.par === 3
    const anyGreenie = games.some(g => hasGreenieJunk(g.junk))
    const anyBBB = games.some(g => g.type === 'bingoBangoBongo')

    if (isPar3 && (anyGreenie || anyBBB)) {
      router.push(`/scorecard/${roundId}/resolve/${currentHole}`)
      return
    }

    if (isLastHole) {
      router.push(`/results/${roundId}`)
    } else {
      setCurrentHole(holeRange[currentIdx + 1])
      setNotices([])
    }
  }

  const handleFinish = () => {
    setShowFinishConfirm(true)
  }

  const confirmFinish = () => {
    setShowFinishConfirm(false)
    router.push(`/results/${roundId}`)
  }

  if (!course || !holeData) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header title="Scorecard" backHref="/" />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center space-y-3">
            <p style={{ color: 'var(--muted)' }}>No active round found.</p>
            <Link href="/round/new" className="text-sm font-semibold" style={{ color: 'var(--green-soft)' }}>
              Start a new round →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <Header
        title={course.name}
        rightAction={
          <div className="flex gap-2">
            <Link href={`/bets/${roundId}`} className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--green-mid)', color: 'var(--sand)' }}>
              Bets
            </Link>
            <button
              type="button"
              onClick={handleFinish}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'var(--sand)', color: 'var(--green-deep)' }}
            >
              Finish
            </button>
          </div>
        }
      />
      <LiveBar />
      <HoleHeader hole={currentHole} par={holeData.par} index={holeData.index}
        onPrev={() => { currentIdx > 0 && setCurrentHole(holeRange[currentIdx - 1]); setNotices([]) }}
        onNext={() => { currentIdx < holeRange.length - 1 && setCurrentHole(holeRange[currentIdx + 1]); setNotices([]) }}
        hasPrev={currentIdx > 0} hasNext={currentIdx < holeRange.length - 1}
      />
      <HoleDots holes={holeRange} currentHole={currentHole} scoredHoles={scoredHoles} onSelect={(h) => { setCurrentHole(h); setNotices([]) }} />

      <div className="flex-1 max-w-[480px] mx-auto w-full px-4 py-3 space-y-2">
        {players.map(p => (
          <ScoreRow key={p.id} player={p} hole={currentHole} par={holeData.par} holeIndex={holeData.index}
            score={holeData.scores[p.id] || 0}
            dots={holeData.dots[p.id] || { sandy: false, chipIn: false, threePutt: false, onePutt: false }}
            activeGames={activeGameIds}
          />
        ))}

        {/* Auto-detect notices */}
        {notices.length > 0 && (
          <div className="space-y-1 pt-1">
            {notices.map((n, i) => (
              <div key={i} className="text-[11px] px-3 py-1.5 rounded-lg" style={{ background: 'var(--sky)', color: 'var(--green-deep)' }}>
                {n}
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomCta label={isLastHole ? 'Finish Round →' : 'Save & Next Hole →'} onClick={handleSaveNext} disabled={!allScored} />

      {/* Finish confirmation overlay */}
      {showFinishConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="rounded-2xl p-5 w-full max-w-[340px] space-y-4" style={{ background: 'white' }}>
            <h3 className="font-display text-lg font-bold" style={{ color: 'var(--green-deep)' }}>
              End round after hole {currentHole}?
            </h3>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Scores through hole {currentHole} will be used for final results.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowFinishConfirm(false)}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold"
                style={{ border: '1px solid var(--line)', color: 'var(--ink-soft)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmFinish}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold"
                style={{ background: 'var(--green-deep)', color: 'var(--sand)' }}
              >
                Finish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
