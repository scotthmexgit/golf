export function netScore(gross: number, strokes: number): number {
  return gross - strokes
}

export function vsPar(score: number, par: number): number {
  return score - par
}

export function parLabel(diff: number): string {
  if (diff <= -3) return 'Albatross'
  if (diff === -2) return 'Eagle'
  if (diff === -1) return 'Birdie'
  if (diff === 0) return 'Par'
  if (diff === 1) return 'Bogey'
  if (diff === 2) return 'Double'
  return `+${diff}`
}

export function parColor(diff: number): string {
  if (diff <= -2) return '#f59e0b'
  if (diff === -1) return '#22c55e'
  if (diff === 0) return 'var(--ink)'
  if (diff === 1) return '#f97316'
  if (diff === 2) return 'var(--red-card)'
  return 'var(--red-card)'
}

export function formatMoneyDecimal(amount: number): string {
  if (amount === 0) return '—'
  const sign = amount > 0 ? '+' : '-'
  return `${sign}$${(Math.abs(amount) / 100).toFixed(2)}`
}

export function stakeUnitLabel(gameType: string): string {
  return gameType === 'strokePlay' ? '/round' : '/hole'
}
