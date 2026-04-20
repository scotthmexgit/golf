'use client'

interface HoleHeaderProps {
  hole: number
  par: number
  index: number
  onPrev: () => void
  onNext: () => void
  hasPrev: boolean
  hasNext: boolean
}

export default function HoleHeader({ hole, par, index, onPrev, onNext, hasPrev, hasNext }: HoleHeaderProps) {
  const side = hole <= 9 ? 'Front' : 'Back'
  return (
    <div
      className="px-4 py-3 flex items-center justify-between"
      style={{ background: 'var(--green-deep)' }}
    >
      <button
        type="button"
        onClick={onPrev}
        disabled={!hasPrev}
        className="text-lg px-2"
        style={{ color: hasPrev ? 'var(--sand)' : 'var(--green-mid)', opacity: hasPrev ? 1 : 0.3 }}
      >
        ←
      </button>
      <div className="text-center">
        <div className="font-display text-2xl font-bold" style={{ color: 'var(--sand)' }}>
          Hole {hole}
        </div>
        <div className="text-[11px] font-mono" style={{ color: 'var(--sand-light)' }}>
          Par {par} · HCP {index} · {side}
        </div>
      </div>
      <button
        type="button"
        onClick={onNext}
        disabled={!hasNext}
        className="text-lg px-2"
        style={{ color: hasNext ? 'var(--sand)' : 'var(--green-mid)', opacity: hasNext ? 1 : 0.3 }}
      >
        →
      </button>
    </div>
  )
}
