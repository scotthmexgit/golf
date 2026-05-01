export interface CourseData {
  name: string
  location: string
  par: number[]
  hcpIndex: number[]
}

export interface TeeData {
  label: string
  rating: number
  slope: number
}

export const TEES: Record<string, TeeData> = {
  black: { label: 'Black', rating: 74.1, slope: 148 },
  blue:  { label: 'Blue',  rating: 72.2, slope: 138 },
  white: { label: 'White', rating: 70.1, slope: 127 },
  gold:  { label: 'Gold',  rating: 68.4, slope: 118 },
  red:   { label: 'Red',   rating: 66.2, slope: 112 },
}

export type TeeName = 'black' | 'blue' | 'white' | 'gold' | 'red'

export interface PlayerSetup {
  id: string
  name: string
  hcpIndex: number
  tee: TeeName
  isCourseHcp: boolean
  courseHcp: number
  betting: boolean
  isSelf: boolean
  roundHandicap: number
}

// ── Game types ──────────────────────────────────────────

export type GameType =
  | 'strokePlay' | 'matchPlay' | 'stableford' | 'skins'
  | 'nassau' | 'bestBall' | 'bingoBangoBongo' | 'wolf' | 'vegas'

export interface JunkConfig {
  greenie: boolean
  greenieAmount: number
  sandy: boolean
  sandyAmount: number
  birdie: boolean
  birdieAmount: number
  eagle: boolean
  eagleAmount: number
  garbage: boolean
  garbageAmount: number
  hammer: boolean
  snake: boolean
  snakeAmount: number
  lowball: boolean
  lowballAmount: number
}

export interface GameInstance {
  id: string
  type: GameType
  label: string
  stake: number
  playerIds: string[]
  // game-specific config
  pressAmount?: number
  escalating?: boolean
  loneWolfMultiplier?: number
  matchFormat?: 'singles' | 'best-ball'
  maxExposure?: number
  settlePer9?: boolean
  partnerIds?: [string, string][]
  // Nassau-specific fields (surfaced by NA-2 wizard; bridged with defaults until then)
  pressRule?: 'manual' | 'auto-2-down' | 'auto-1-down'
  pressScope?: 'nine' | 'match'
  pairingMode?: 'singles' | 'allPairs'
  // junk config
  junk: JunkConfig
}

// legacy — kept for compat but no longer primary
export interface GameConfig {
  active: boolean
  stake: number
  playerIds: string[]
  pressAmount?: number
  escalating?: boolean
  loneWolfMultiplier?: number
  wolfOrder?: string[]
  maxExposure?: number
  settlePer9?: boolean
  partnerIds?: [string, string][]
}

export interface SideBetConfig {
  active: boolean
  stake: number
  playerIds: string[]
}

export interface HoleDots {
  sandy: boolean
  chipIn: boolean
  threePutt: boolean
  onePutt: boolean
}

export interface HoleData {
  number: number
  par: number
  index: number
  scores: Record<string, number>
  dots: Record<string, HoleDots>
  wolfPick?: 'solo' | 'blind' | string
  presses?: string[]
  greenieWinners?: Record<string, string | null>  // keyed by gameInstance.id
  bangoWinner?: string | null
}

export interface GameHoleResult {
  winner?: string
  tied?: boolean
  net?: number
  carry?: number
  amount?: number
  wolfPick?: string
  seg?: string
  detail?: Record<string, number>
}

export interface SideBetHoleResult {
  birdie?: { winners: string[]; stake: number; count: number }
  eagle?: { winners: string[]; stake: number; count: number }
  greenie?: { eligible: string[]; confirmed: string | null; stake: number; betKey: string }
  sandy?: { winners: string[]; stake: number }
  bango?: { winner: string | null; stake: number }
}

export interface HoleResult {
  hole: number
  games: Record<string, GameHoleResult>       // keyed by GameInstance.id
  sideBets: Record<string, SideBetHoleResult>
}

export type PayoutMap = Record<string, number>

export type HolesCount = '18' | '9front' | '9back'

// disabled?: true — UI park flag. Entries marked disabled are hidden from the game picker
// (GameList.tsx) during the Stroke-Play-only phase. Engine files and tests are unaffected.
export const GAME_DEFS: { key: GameType; label: string; description: string; minPlayers?: number; maxPlayers?: number; requirementText?: string; disabled?: boolean }[] = [
  { key: 'strokePlay', label: 'Stroke Play', description: 'Lowest net score wins' },
  { key: 'matchPlay', label: 'Match Play', description: 'Win holes head-to-head — works with 2–5 players', minPlayers: 2, disabled: true },
  { key: 'stableford', label: 'Stableford', description: 'Points per hole based on net score', disabled: true },
  { key: 'skins', label: 'Skins', description: 'Win the hole outright to win the skin' },
  { key: 'nassau', label: 'Nassau', description: 'Three bets: front 9, back 9, overall' },
  { key: 'bestBall', label: 'Best Ball', description: 'Team best net score per hole', minPlayers: 4, maxPlayers: 4, requirementText: 'Requires exactly 4 betting players', disabled: true },
  { key: 'bingoBangoBongo', label: 'Bingo Bango Bongo', description: 'First on, closest, first in — one point each', disabled: true },
  { key: 'wolf', label: 'Wolf', description: 'Pick your partner or go solo', minPlayers: 4, maxPlayers: 5, requirementText: 'Requires 4–5 betting players' },
  { key: 'vegas', label: 'Vegas', description: 'Team scores combine as a 2-digit number', disabled: true },
]

export const COURSES: CourseData[] = [
  {
    name: 'Shadow Hills',
    location: 'Junction City, OR',
    par: [4,4,3,5,4,3,4,5,4, 4,3,5,4,4,3,4,5,4],
    hcpIndex: [7,3,15,1,11,17,5,9,13, 8,16,2,6,12,18,4,10,14],
  },
  {
    name: 'Newcastle - Coal Creek',
    location: 'Newcastle, WA',
    par: [4,4,5,3,4,4,3,5,4, 4,3,4,5,4,3,4,4,5],
    hcpIndex: [5,9,1,15,7,3,17,11,13, 6,16,4,2,10,18,8,12,14],
  },
  {
    name: 'Newcastle - China Creek',
    location: 'Newcastle, WA',
    par: [5,3,4,4,4,3,4,5,4, 4,4,5,3,4,4,3,5,4],
    hcpIndex: [3,13,7,1,11,15,5,9,17, 4,10,2,16,8,6,18,12,14],
  },
  {
    name: 'Chambers Bay',
    location: 'University Place, WA',
    par: [4,4,3,4,5,3,5,4,4, 4,3,5,4,4,5,4,3,4],
    hcpIndex: [9,5,17,1,13,15,3,7,11, 6,18,2,10,8,4,12,16,14],
  },
  {
    name: 'Bear Mountain Ranch',
    location: 'Chelan, WA',
    par: [5,3,4,4,4,3,5,4,4, 4,5,4,3,4,4,5,3,4],
    hcpIndex: [1,11,3,7,13,17,5,9,15, 2,6,8,18,4,12,10,16,14],
  },
  {
    name: 'Camas Meadows',
    location: 'Camas, WA',
    par: [4,3,4,5,4,3,4,4,5, 4,5,3,4,4,4,3,5,4],
    hcpIndex: [7,15,3,1,9,17,5,11,13, 8,2,16,6,4,10,18,12,14],
  },
  {
    name: 'Trophy Lake',
    location: 'Port Orchard, WA',
    par: [5,4,3,4,4,3,4,5,4, 4,3,5,4,4,3,4,5,4],
    hcpIndex: [5,1,13,9,3,17,7,11,15, 4,18,6,2,10,16,8,12,14],
  },
  {
    name: 'The Home Course',
    location: 'DuPont, WA',
    par: [4,4,3,5,4,4,3,5,4, 4,3,4,5,4,3,4,4,5],
    hcpIndex: [9,3,15,1,7,5,17,11,13, 6,18,8,2,12,16,4,10,14],
  },
]
