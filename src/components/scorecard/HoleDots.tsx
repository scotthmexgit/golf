'use client'

interface HoleDotsProps {
  holes: number[]
  currentHole: number
  scoredHoles: Set<number>
  onSelect: (hole: number) => void
}

export default function HoleDots({ holes, currentHole, scoredHoles, onSelect }: HoleDotsProps) {
  return (
    <div
      className="px-4 py-2 flex gap-1.5 overflow-x-auto justify-center"
      style={{ background: 'var(--green-deep)' }}
    >
      {holes.map(h => {
        const isCurrent = h === currentHole
        const isScored = scoredHoles.has(h)
        return (
          <button
            key={h}
            type="button"
            onClick={() => onSelect(h)}
            className="w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center flex-shrink-0"
            style={{
              background: isCurrent ? 'var(--sand)' : isScored ? 'var(--fairway)' : 'var(--green-mid)',
              color: isCurrent ? 'var(--green-deep)' : isScored ? 'white' : 'var(--green-soft)',
            }}
          >
            {h}
          </button>
        )
      })}
    </div>
  )
}
