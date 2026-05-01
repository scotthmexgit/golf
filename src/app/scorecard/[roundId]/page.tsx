'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useRoundStore } from '@/store/roundStore'
import Header from '@/components/layout/Header'
import LiveBar from '@/components/layout/LiveBar'
import BottomCta from '@/components/layout/BottomCta'
import HoleHeader from '@/components/scorecard/HoleHeader'
import HoleDots from '@/components/scorecard/HoleDots'
import ScoreRow from '@/components/scorecard/ScoreRow'
import BetDetailsSheet from '@/components/scorecard/BetDetailsSheet'
import WolfDeclare from '@/components/scorecard/WolfDeclare'
import PressConfirmationModal from '@/components/scorecard/PressConfirmationModal'
import Link from 'next/link'
import { hasGreenieJunk, hasAnyJunk } from '@/lib/junk'
import { vsPar } from '@/lib/scoring'
import { patchRoundComplete } from '@/lib/roundApi'
import { computePerHoleDeltas } from '@/lib/perHoleDeltas'
import { buildHoleDecisions } from '@/lib/holeDecisions'
import { detectNassauPressOffers } from '@/lib/nassauPressDetect'
import type { PressOffer } from '@/lib/nassauPressDetect'
import type { GameType } from '@/types'

export default function ScorecardPage() {
  const router = useRouter()
  const params = useParams()
  const store = useRoundStore()
  const { course, players, holes, currentHole, setCurrentHole, games, roundId, hydrateRound, setScore, sheetOpen, openSheet, closeSheet } = store
  const [showFinishConfirm, setShowFinishConfirm] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [notices, setNotices] = useState<string[]>([])
  const [hydrating, setHydrating] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [finishError, setFinishError] = useState<string | null>(null)
  const [pendingPressOffers, setPendingPressOffers] = useState<PressOffer[]>([])
  // SKINS-2: suppress Bet-row delta on fresh hole navigation until user edits a score.
  // Starts false (page load / hydration should show deltas immediately).
  const [suppressBetDelta, setSuppressBetDelta] = useState(false)
  const hydratedRef = useRef(false)

  // Step 3: Server-authoritative hydration on mount (Decision 1)
  useEffect(() => {
    // Derive roundId from URL param — handles page refresh case where Zustand is empty
    const urlRoundId = parseInt(params.roundId as string, 10)
    if (isNaN(urlRoundId) || hydratedRef.current) return
    hydratedRef.current = true
    setHydrating(true)
    fetch(`/golf/api/rounds/${urlRoundId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) hydrateRound(data)
      })
      .catch(() => { /* silent — Zustand state is used as fallback */ })
      .finally(() => setHydrating(false))
  }, [params.roundId, hydrateRound])

  const holeRange = store.holeRange()
  const holeData = holes.find(h => h.number === currentHole)
  const currentIdx = holeRange.indexOf(currentHole)
  const scoredHoles = new Set(
    holes.filter(h => players.every(p => (h.scores[p.id] || 0) > 0)).map(h => h.number)
  )

  const activeGameIds = games.map(g => g.id)
  const showJunkDots = games.some(g => activeGameIds.includes(g.id) && hasAnyJunk(g.junk))
  const wolfGame = games.find(g => g.type === 'wolf')

  // Per-hole monetary deltas across all active games. Recomputes whenever
  // any score changes (holes dep). Memoized to avoid re-running bridges on
  // every render (e.g. on each keystroke in the stepper).
  // SP contributes nothing to the per-hole map (StrokePlaySettled has hole:null);
  // all holes display "—" for SP-only rounds (Choice B, SKINS_PLAN.md §1B).
  const { totals: perHoleTotals } = useMemo(
    () => computePerHoleDeltas(holes, players, games),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [holes, players, games],
  )
  // Pass an empty map (rather than undefined) when games exist — this signals
  // ScoreRow to render the bet row even when a game produces no per-hole events.
  const holeTotalForCurrentHole = games.length > 0
    ? (perHoleTotals[currentHole] ?? {})
    : undefined
  const allScored = holeData ? players.every(p => (holeData.scores[p.id] || 0) > 0) : false
  const isLastHole = currentIdx === holeRange.length - 1

  // F9-a: write par to Zustand on hole mount so Save & Next is enabled at default scores
  useEffect(() => {
    if (!holeData) return
    for (const p of players) {
      if ((holeData.scores[p.id] || 0) === 0) {
        setScore(p.id, currentHole, holeData.par)
      }
    }
  }, [currentHole, holeData?.par, players, setScore])

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

  // Wraps setCurrentHole for navigation-triggered hole changes. Suppresses the
  // Bet-row delta (SKINS-2) until the user makes an intentional score edit on
  // the new hole. Page-load / hydration does NOT call this, so reloads show
  // deltas immediately (preserving the §2 carry check in skins-flow.spec.ts).
  const handleHoleChange = (h: number) => {
    setCurrentHole(h)
    setSuppressBetDelta(true)
    setNotices([])
  }

  // Step 4b: persist scores + decisions, then navigate. Called after all press
  // offers have been resolved (either from handleSaveNext directly or from the
  // modal's onComplete callback). Reads holeData fresh from the store so that
  // any presses confirmed via the modal are included in the decisions blob.
  const proceedSave = async () => {
    setPendingPressOffers([])
    setSaveError(null)

    const latestHoles = useRoundStore.getState().holes
    const latestHoleData = latestHoles.find(h => h.number === currentHole)
    if (!latestHoleData) return

    if (roundId) {
      const scorePayload = players.map(p => ({
        playerId: Number(p.id),
        gross: latestHoleData.scores[p.id] || 0,
        putts: null,
        fromBunker: false,
      }))
      const gameTypes = new Set(games.map(g => g.type as GameType))
      const decisionsBlob = buildHoleDecisions(latestHoleData, gameTypes)

      const body: Record<string, unknown> = { scores: scorePayload }
      if (decisionsBlob !== null) body.decisions = decisionsBlob

      let ok = false
      try {
        const res = await fetch(`/golf/api/rounds/${roundId}/scores/hole/${currentHole}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        ok = res.ok
      } catch {
        ok = false
      }
      if (!ok) {
        setSaveError('Failed to save scores. Try again.')
        return
      }
    }

    const isPar3 = latestHoleData.par === 3
    const anyGreenie = games.some(g => hasGreenieJunk(g.junk))
    const anyBBB = games.some(g => g.type === 'bingoBangoBongo')

    if (isPar3 && (anyGreenie || anyBBB)) {
      router.push(`/scorecard/${roundId}/resolve/${currentHole}`)
      return
    }

    if (isLastHole) {
      if (roundId) await patchRoundComplete(roundId)
      router.push(`/results/${roundId}`)
    } else {
      handleHoleChange(holeRange[currentIdx + 1])
    }
  }

  const handleSaveNext = async () => {
    if (!allScored || !holeData) return

    detectNotices()

    // Detect auto-mode press offers across ALL Nassau games. Collecting from all
    // games before showing the modal ensures no game's offers are silently dropped.
    const nassauGames = games.filter(g => g.type === 'nassau')
    const allOffers = nassauGames.flatMap(g =>
      detectNassauPressOffers(currentHole, holes, players, g)
    )
    if (allOffers.length > 0) {
      setPendingPressOffers(allOffers)
      return
    }

    await proceedSave()
  }

  const handleExit = () => {
    setShowExitConfirm(true)
  }

  const confirmExit = () => {
    setShowExitConfirm(false)
    router.push('/')
  }

  const handleFinish = () => {
    setShowFinishConfirm(true)
  }

  const confirmFinish = async () => {
    setShowFinishConfirm(false)
    setFinishError(null)
    if (roundId) {
      const { ok } = await patchRoundComplete(roundId)
      if (ok) {
        router.push(`/results/${roundId}`)
      } else {
        setShowFinishConfirm(true)
        setFinishError('Failed to finish round. Try again.')
      }
      return
    }
    router.push(`/results/${roundId}`)
  }

  // While hydrating from server, show a loading state instead of the empty-round fallback
  if (hydrating || !course || !holeData) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header title="Scorecard" backHref="/" />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center space-y-3">
            {hydrating ? (
              <p style={{ color: 'var(--muted)' }}>Loading round...</p>
            ) : (
              <>
                <p style={{ color: 'var(--muted)' }}>No active round found.</p>
                <Link href="/round/new" className="text-sm font-semibold" style={{ color: 'var(--green-soft)' }}>
                  Start a new round →
                </Link>
              </>
            )}
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
            {games.length > 0 && (
              <button
                type="button"
                onClick={openSheet}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: 'var(--green-mid)', color: 'var(--sand)' }}
                data-testid="open-bet-details-sheet"
                aria-label="Open round summary"
              >
                Summary
              </button>
            )}
            <Link href={`/bets/${roundId}`} className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--green-mid)', color: 'var(--sand)' }}>
              Bets
            </Link>
            {isLastHole && (
              <button
                type="button"
                onClick={handleFinish}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: 'var(--sand)', color: 'var(--green-deep)' }}
              >
                Finish
              </button>
            )}
          </div>
        }
      />
      <LiveBar />
      <HoleHeader hole={currentHole} par={holeData.par} index={holeData.index}
        onPrev={() => { currentIdx > 0 && handleHoleChange(holeRange[currentIdx - 1]) }}
        onNext={() => { currentIdx < holeRange.length - 1 && handleHoleChange(holeRange[currentIdx + 1]) }}
        hasPrev={currentIdx > 0} hasNext={currentIdx < holeRange.length - 1}
      />
      <HoleDots holes={holeRange} currentHole={currentHole} scoredHoles={scoredHoles} onSelect={(h) => handleHoleChange(h)} />

      <div className="flex-1 max-w-[480px] mx-auto w-full px-4 py-3 space-y-2">
        {wolfGame && (
          <WolfDeclare wolfGame={wolfGame} currentHole={currentHole} />
        )}

        {players.map(p => (
          <ScoreRow key={`${p.id}-${currentHole}`} player={p} hole={currentHole} par={holeData.par} holeIndex={holeData.index}
            score={holeData.scores[p.id] || 0}
            dots={holeData.dots[p.id] || { sandy: false, chipIn: false, threePutt: false, onePutt: false }}
            activeGames={activeGameIds}
            showJunkDots={showJunkDots}
            holeTotal={holeTotalForCurrentHole}
            showBetDelta={!suppressBetDelta}
            onScoreEdit={() => setSuppressBetDelta(false)}
            onOpenSheet={openSheet}
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

      {saveError && (
        <p className="text-center text-sm font-medium text-red-500 px-4 pb-1">{saveError}</p>
      )}
      <BottomCta label={isLastHole ? 'Finish Round →' : 'Save & Next Hole →'} onClick={handleSaveNext} disabled={!allScored} />

      {/* Bet details bottom sheet */}
      <BetDetailsSheet open={sheetOpen} onClose={closeSheet} onExit={handleExit} />

      {/* Nassau press confirmation modal */}
      {pendingPressOffers.length > 0 && (
        <PressConfirmationModal
          hole={currentHole}
          offers={pendingPressOffers}
          onComplete={proceedSave}
        />
      )}

      {/* Exit confirmation overlay */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="rounded-2xl p-5 w-full max-w-[340px] space-y-4" style={{ background: 'white' }}>
            <h3 className="font-display text-lg font-bold" style={{ color: 'var(--green-deep)' }}>
              Leave this round?
            </h3>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Your scores through hole {currentHole} are saved. You can return to this round later.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold"
                style={{ border: '1px solid var(--line)', color: 'var(--ink-soft)' }}
              >
                Keep Playing
              </button>
              <button
                type="button"
                onClick={confirmExit}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold"
                style={{ background: 'var(--red-card)', color: 'white' }}
                data-testid="confirm-exit"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

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
            {finishError && (
              <p className="text-sm font-medium text-red-500">{finishError}</p>
            )}
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
