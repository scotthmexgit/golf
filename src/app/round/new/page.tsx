'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRoundStore } from '@/store/roundStore'
import Header from '@/components/layout/Header'
import ProgressBar from '@/components/layout/ProgressBar'
import BottomCta from '@/components/layout/BottomCta'
import CourseSearch from '@/components/setup/CourseSearch'
import PlayerList from '@/components/setup/PlayerList'
import GameList from '@/components/setup/GameList'
import { hasAnyJunk } from '@/lib/junk'
import { formatMoneyDecimal, stakeUnitLabel } from '@/lib/scoring'
import { hasInvalidGames } from '@/lib/gameGuards'

const STEP_LABELS = ['Course', 'Players', 'Games', 'Review']

function ReviewStep() {
  const { course, holesCount, players, games } = useRoundStore()

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-3" style={{ borderColor: 'var(--line)', background: 'white' }}>
        <h4 className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--green-soft)' }}>Course</h4>
        <div className="text-sm font-semibold">{course?.name}</div>
        <div className="text-xs" style={{ color: 'var(--muted)' }}>
          {course?.location} · {holesCount === '18' ? '18 holes' : holesCount === '9front' ? 'Front 9' : 'Back 9'}
        </div>
      </div>

      <div className="rounded-xl border p-3" style={{ borderColor: 'var(--line)', background: 'white' }}>
        <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--green-soft)' }}>Players</h4>
        {players.map((p, i) => (
          <div key={p.id} className="flex items-center justify-between text-sm py-1">
            <span>{p.name || `Golfer ${i + 1}`}</span>
            <span className="font-mono text-xs capitalize" style={{ color: 'var(--muted)' }}>
              {p.tee} tees · Crs hcp {p.courseHcp} {!p.betting && '(not betting)'}
            </span>
          </div>
        ))}
      </div>

      {games.length > 0 && (
        <div className="rounded-xl border p-3" style={{ borderColor: 'var(--line)', background: 'white' }}>
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--green-soft)' }}>Games</h4>
          {games.map(g => (
            <div key={g.id} className="py-1">
              <div className="flex items-center justify-between text-sm">
                <span>{g.label}</span>
                <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>{formatMoneyDecimal(g.stake)}{stakeUnitLabel(g.type)}</span>
              </div>
              {hasAnyJunk(g.junk) && (
                <div className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>
                  Junk: {[
                    g.junk.garbage && 'Garbage',
                    !g.junk.garbage && g.junk.greenie && 'Greenie',
                    !g.junk.garbage && g.junk.sandy && 'Sandy',
                    !g.junk.garbage && g.junk.birdie && 'Birdie',
                    g.junk.eagle && 'Eagle',
                    g.junk.hammer && 'Hammer',
                    g.junk.snake && 'Snake',
                    g.junk.lowball && 'Low Ball',
                  ].filter(Boolean).join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function NewRoundPage() {
  const router = useRouter()
  const store = useRoundStore()
  const { setupStep, setSetupStep, course } = store
  const [loading, setLoading] = useState(false)

  const canContinue = () => {
    if (setupStep === 0) return !!course
    if (setupStep === 1) return store.players.length >= 1
    // Steps 2 (Games) and 3 (Review): block if any game instance is invalid.
    // Currently: Skins with fewer than 3 players.
    return !hasInvalidGames(store.games)
  }

  const handleNext = async () => {
    if (setupStep < STEP_LABELS.length - 1) {
      setSetupStep(setupStep + 1)
    } else {
      // Belt-and-suspenders: re-check game validity at submit time in case
      // canContinue was bypassed or state changed between steps.
      if (hasInvalidGames(store.games)) return
      setLoading(true)
      try {
        const res = await fetch('/golf/api/rounds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseName: store.course?.name,
            courseLocation: store.course?.location,
            holesCount: store.holesCount,
            playedAt: store.playDate,
            players: store.players,
            gameInstances: store.games,
          }),
        })
        const data = await res.json()
        store.setRoundId(data.roundId)
        store.initHoles()
        router.push(`/scorecard/${data.roundId}`)
      } catch {
        // Fallback: client-only round
        store.setRoundId(Date.now())
        store.initHoles()
        router.push(`/scorecard/${store.roundId}`)
      } finally {
        setLoading(false)
      }
    }
  }

  const handleBack = () => {
    if (setupStep > 0) setSetupStep(setupStep - 1)
  }

  const isReview = setupStep === STEP_LABELS.length - 1

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <Header
        title="New Round"
        backHref={setupStep > 0 ? undefined : '/'}
        rightAction={
          setupStep > 0 ? (
            <button type="button" onClick={handleBack} className="text-xs font-semibold" style={{ color: 'var(--sand)' }}>
              ← Back
            </button>
          ) : undefined
        }
      />
      <ProgressBar step={setupStep} total={STEP_LABELS.length} />

      <div className="flex-1 max-w-[480px] mx-auto w-full px-4 py-4">
        <h2 className="font-display text-xl font-bold mb-4" style={{ color: 'var(--green-deep)' }}>
          {STEP_LABELS[setupStep]}
        </h2>

        {setupStep === 0 && <CourseSearch />}
        {setupStep === 1 && <PlayerList />}
        {setupStep === 2 && <GameList />}
        {setupStep === 3 && <ReviewStep />}
      </div>

      <BottomCta
        label={loading ? 'Starting round...' : isReview ? 'Tee It Up ⛳' : 'Continue →'}
        onClick={handleNext}
        disabled={!canContinue() || loading}
      />
    </div>
  )
}
