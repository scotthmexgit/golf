'use client'

interface ProgressBarProps {
  step: number
  total: number
}

export default function ProgressBar({ step, total }: ProgressBarProps) {
  const pct = ((step + 1) / total) * 100
  return (
    <div className="h-[3px] w-full" style={{ background: 'var(--line)' }}>
      <div
        className="h-full transition-all duration-300"
        style={{ width: `${pct}%`, background: 'var(--fairway)' }}
      />
    </div>
  )
}
