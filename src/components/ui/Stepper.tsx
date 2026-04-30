'use client'

interface StepperProps {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  // No-op: Stepper is controlled by value. Added for forward-compatibility.
  initialValue?: number
}

export default function Stepper({ value, onChange, min = 1, max = 15 }: StepperProps) {
  return (
    <div className="flex items-center gap-0">
      <button
        type="button"
        onClick={() => value > min && onChange(value - 1)}
        className="w-9 h-9 rounded-l-lg flex items-center justify-center text-lg font-bold"
        style={{ background: 'var(--green-deep)', color: 'var(--sand)' }}
        disabled={value <= min}
      >
        −
      </button>
      <div
        className="w-11 h-9 flex items-center justify-center font-mono text-lg font-bold"
        style={{ background: 'white', color: 'var(--ink)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}
      >
        {value}
      </div>
      <button
        type="button"
        onClick={() => value < max && onChange(value + 1)}
        className="w-9 h-9 rounded-r-lg flex items-center justify-center text-lg font-bold"
        style={{ background: 'var(--green-deep)', color: 'var(--sand)' }}
        disabled={value >= max}
      >
        +
      </button>
    </div>
  )
}
