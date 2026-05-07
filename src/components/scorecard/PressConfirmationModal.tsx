'use client'

import { useState } from 'react'
import { useRoundStore } from '@/store/roundStore'
import type { PressOffer } from '@/lib/nassauPressDetect'

interface PressConfirmationModalProps {
  hole: number
  offers: PressOffer[]
  onComplete: () => void
}

/**
 * PressConfirmationModal — queues press offers one at a time.
 *
 * Shown after scoring a hole when auto-press rules detect a down player.
 * Each offer: the down player may Accept (adds matchId to hd.presses via
 * setPressConfirmation) or Decline. After all offers are resolved, onComplete
 * fires so the caller can proceed with PUT + hole advance.
 */
export default function PressConfirmationModal({ hole, offers, onComplete }: PressConfirmationModalProps) {
  const [idx, setIdx] = useState(0)
  const { players, setPressConfirmation } = useRoundStore()

  const current = offers[idx]
  if (!current) return null

  const playerName = (id: string) => players.find(p => p.id === id)?.name || id

  const matchLabel = (matchId: string): string => {
    if (matchId === 'front') return 'Front 9'
    if (matchId === 'back') return 'Back 9'
    if (matchId === 'overall') return 'Overall'
    const pm = matchId.match(/^press-(\d+)$/)
    if (pm) return `Press #${pm[1]}`
    if (matchId.startsWith('front-')) return 'Front 9'
    if (matchId.startsWith('back-')) return 'Back 9'
    if (matchId.startsWith('overall-')) return 'Overall'
    return matchId
  }

  const advance = () => {
    if (idx + 1 >= offers.length) {
      onComplete()
    } else {
      setIdx(idx + 1)
    }
  }

  const handleAccept = () => {
    setPressConfirmation(hole, current.gameId, current.matchId)
    advance()
  }

  const handleDecline = () => {
    advance()
  }

  const queueLabel = offers.length > 1
    ? ` (${idx + 1} of ${offers.length})`
    : ''

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      data-testid="press-confirmation-modal"
    >
      <div
        className="rounded-2xl p-5 w-full max-w-[340px] space-y-4"
        style={{ background: 'white' }}
      >
        <div>
          <h3
            className="font-display text-lg font-bold"
            style={{ color: 'var(--green-deep)' }}
          >
            {'Press?'}{queueLabel}
          </h3>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            {'Hole '}{hole}{' · '}
            <span style={{ color: 'var(--ink)' }} data-testid="press-down-player">
              {playerName(current.downPlayer)}
            </span>
            {' is down · '}
            <span style={{ color: 'var(--ink)' }}>{matchLabel(current.matchId)}</span>
            {' · '}
            <span style={{ color: 'var(--ink)' }}>{playerName(current.pair[0])} vs {playerName(current.pair[1])}</span>
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleDecline}
            className="flex-1 py-2.5 rounded-full text-sm font-semibold"
            style={{ border: '1px solid var(--line)', color: 'var(--ink-soft)' }}
            data-testid="press-decline"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="flex-1 py-2.5 rounded-full text-sm font-semibold"
            style={{ background: 'var(--green-deep)', color: 'var(--sand)' }}
            data-testid="press-accept"
          >
            Accept Press
          </button>
        </div>
      </div>
    </div>
  )
}
