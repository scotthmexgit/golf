import { create } from 'zustand'
import type {
  CourseData, TeeName, PlayerSetup, GameInstance, GameType,
  JunkConfig, HoleData, HoleDots, HoleResult, HolesCount,
} from '@/types'
import { GAME_DEFS } from '@/types'
import { calcCourseHcp, calcStrokes } from '@/lib/handicap'
import { defaultJunk, syncJunkAmounts } from '@/lib/junk'

function uuid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function defaultDots(): HoleDots {
  return { sandy: false, chipIn: false, threePutt: false, onePutt: false }
}

function makePlayer(index: number, isSelf: boolean): PlayerSetup {
  return {
    id: uuid(),
    name: '',
    hcpIndex: 0,
    tee: 'blue',
    isCourseHcp: false,
    courseHcp: 0,
    betting: true,
    isSelf,
    roundHandicap: 0,
  }
}

function recalcPlayers(players: PlayerSetup[]): PlayerSetup[] {
  const updated = players.map(p => ({
    ...p,
    courseHcp: calcCourseHcp(p.hcpIndex),
  }))
  const minHcp = Math.min(...updated.map(p => p.courseHcp))
  return updated.map(p => ({
    ...p,
    strokes: calcStrokes(p.courseHcp, minHcp),
  })) as PlayerSetup[]
}

function gameLabel(type: GameType, existing: GameInstance[]): string {
  const def = GAME_DEFS.find(d => d.key === type)
  const base = def?.label || type
  const sameType = existing.filter(g => g.type === type).length
  return sameType === 0 ? base : `${base} ${sameType + 1}`
}

export interface RoundStore {
  // Setup
  course: CourseData | null
  holesCount: HolesCount
  playDate: string
  selectedTee: TeeName
  players: PlayerSetup[]
  games: GameInstance[]
  setupStep: number

  // Active round
  roundId: number | null
  holes: HoleData[]
  currentHole: number
  holeResults: HoleResult[]

  // Setup actions
  setCourse: (c: CourseData | null) => void
  setHolesCount: (h: HolesCount) => void
  setPlayDate: (d: string) => void
  setSelectedTee: (t: TeeName) => void
  setSetupStep: (s: number) => void
  addPlayer: () => void
  removePlayer: (id: string) => void
  updatePlayer: (id: string, updates: Partial<PlayerSetup>) => void

  // Game instance actions
  addGame: (type: GameType) => void
  removeGame: (id: string) => void
  updateGame: (id: string, updates: Partial<GameInstance>) => void
  updateGameStake: (id: string, newStake: number) => void
  updateJunk: (gameId: string, updates: Partial<JunkConfig>) => void

  // Round actions
  setRoundId: (id: number) => void
  initHoles: () => void
  hydrateRound: (apiResponse: {
    round: { id: number; holesCount: number; tee: string; status: string }
    course: { name: string; location: string; holes: { hole: number; par: number; index: number }[] }
    players: { id: number; playerId: number; name: string; handicapIdx: number; courseHcp: number; betting: boolean; tee: string }[]
    games: { id: number; type: string; stake: number; playerIds: string[] }[]
    scores: { playerId: number; hole: number; gross: number; putts: number | null; fromBunker: boolean }[]
  }) => void
  setCurrentHole: (h: number) => void
  setScore: (playerId: string, hole: number, score: number) => void
  setDot: (playerId: string, hole: number, dot: keyof HoleDots, value: boolean) => void
  setWolfPick: (hole: number, partnerId: string | 'solo') => void
  setPress: (hole: number, gameKey: string) => void
  setGreenieWinner: (hole: number, gameId: string, playerId: string | null) => void
  setBangoWinner: (hole: number, playerId: string | null) => void
  addHoleResult: (result: HoleResult) => void

  // Sheet state
  sheetOpen: boolean
  openSheet: () => void
  closeSheet: () => void

  // Helpers
  bettingPlayers: () => PlayerSetup[]
  holeRange: () => number[]
  reset: () => void
}

const today = new Date().toISOString().slice(0, 10)

export const useRoundStore = create<RoundStore>((set, get) => ({
  course: null,
  holesCount: '18',
  playDate: today,
  selectedTee: 'blue',
  players: [makePlayer(0, true)],
  games: [],
  setupStep: 0,

  roundId: null,
  holes: [],
  currentHole: 1,
  holeResults: [],
  sheetOpen: false,

  setCourse: (c) => set({ course: c }),
  setHolesCount: (h) => set({ holesCount: h }),
  setPlayDate: (d) => set({ playDate: d }),
  setSelectedTee: (t) => set({ selectedTee: t }),
  setSetupStep: (s) => set({ setupStep: s }),

  addPlayer: () => set((state) => {
    if (state.players.length >= 5) return state
    const newPlayer = makePlayer(state.players.length, false)
    newPlayer.tee = state.selectedTee
    return { players: recalcPlayers([...state.players, newPlayer]) }
  }),

  removePlayer: (id) => set((state) => ({
    players: recalcPlayers(state.players.filter(p => p.id !== id)),
  })),

  updatePlayer: (id, updates) => set((state) => {
    const players = state.players.map(p =>
      p.id === id ? { ...p, ...updates } : p
    )
    return { players: recalcPlayers(players) }
  }),

  // ── Game instance actions ──

  addGame: (type) => set((state) => {
    const bettingIds = state.players.filter(p => p.betting).map(p => p.id)
    const inst: GameInstance = {
      id: uuid(),
      type,
      label: gameLabel(type, state.games),
      stake: 500,
      playerIds: bettingIds,
      junk: defaultJunk(500),
    }
    if (type === 'wolf') inst.loneWolfMultiplier = 2
    if (type === 'matchPlay') inst.matchFormat = 'singles'
    if (type === 'skins') inst.escalating = false
    if (type === 'vegas') inst.maxExposure = 50
    if (type === 'matchPlay' || type === 'nassau') inst.pressAmount = 5
    return { games: [...state.games, inst] }
  }),

  removeGame: (id) => set((state) => ({
    games: state.games.filter(g => g.id !== id),
  })),

  updateGame: (id, updates) => set((state) => ({
    games: state.games.map(g => g.id === id ? { ...g, ...updates } : g),
  })),

  updateGameStake: (id, newStake) => set((state) => ({
    games: state.games.map(g => {
      if (g.id !== id) return g
      return { ...g, stake: newStake, junk: syncJunkAmounts(g.junk, g.stake, newStake) }
    }),
  })),

  updateJunk: (gameId, updates) => set((state) => ({
    games: state.games.map(g => {
      if (g.id !== gameId) return g
      const newJunk = { ...g.junk, ...updates }
      // Garbage shortcut: when garbage is toggled on, enable greenie+sandy+birdie
      if (updates.garbage === true) {
        newJunk.greenie = false
        newJunk.sandy = false
        newJunk.birdie = false
      }
      return { ...g, junk: newJunk }
    }),
  })),

  setRoundId: (id) => set({ roundId: id }),

  hydrateRound: (apiResponse) => set((state) => {
    const { round, course: apiCourse, players: apiPlayers, games: apiGames, scores } = apiResponse

    // Rebuild CourseData shape for the store
    const courseData: CourseData = {
      name: apiCourse.name,
      location: apiCourse.location,
      par: apiCourse.holes.map(h => h.par),
      hcpIndex: apiCourse.holes.map(h => h.index),
    }

    // Determine holesCount string from the round
    // round.holesCount is an int (9 or 18); we default to '18' since
    // 9front/9back distinction is not stored — Turn 3 ships '18' only.
    const holesCount: HolesCount = round.holesCount === 9 ? '9front' : '18'

    // Rebuild PlayerSetup[]. id = String(playerId) per spec.
    const players: PlayerSetup[] = apiPlayers.map((rp, i) => ({
      id: String(rp.playerId),
      name: rp.name,
      hcpIndex: rp.handicapIdx,
      tee: (rp.tee as TeeName) || state.selectedTee,
      isCourseHcp: false,
      courseHcp: rp.courseHcp,
      betting: rp.betting,
      isSelf: i === 0,
      roundHandicap: 0,
    }))

    // Build a hole range from apiCourse.holes
    const holeNums = apiCourse.holes.map(h => h.hole)

    // Rebuild HoleData[]: one entry per hole in the range
    const holes: HoleData[] = holeNums.map((hNum, idx) => {
      const holeScores: Record<string, number> = {}
      const holeDots: Record<string, HoleDots> = {}
      for (const rp of apiPlayers) {
        const key = String(rp.playerId)
        holeDots[key] = defaultDots()
        const s = scores.find(sc => sc.playerId === rp.playerId && sc.hole === hNum)
        holeScores[key] = s ? s.gross : 0
      }
      return {
        number: hNum,
        par: apiCourse.holes[idx].par,
        index: apiCourse.holes[idx].index,
        scores: holeScores,
        dots: holeDots,
      }
    })

    // Determine currentHole: first hole with any missing score, or last hole
    const firstIncomplete = holes.find(h => players.some(p => (h.scores[p.id] || 0) === 0))
    const currentHole = firstIncomplete ? firstIncomplete.number : holes[holes.length - 1].number

    // Rebuild GameInstance[]. Games from API have numeric id; keep as string for store compat.
    // playerIds from DB are integers; map to strings to match PlayerSetup.id = String(playerId).
    const games: GameInstance[] = apiGames.map(g => ({
      id: String(g.id),
      type: g.type as GameType,
      label: GAME_DEFS.find(d => d.key === g.type)?.label ?? g.type,
      stake: g.stake,
      playerIds: g.playerIds.map(String),
      junk: defaultJunk(g.stake),
    }))

    return {
      roundId: round.id,
      course: courseData,
      holesCount,
      players,
      games,
      holes,
      currentHole,
    }
  }),

  initHoles: () => set((state) => {
    const course = state.course
    if (!course) return state
    const range = get().holeRange()
    const holes: HoleData[] = range.map(h => ({
      number: h,
      par: course.par[h - 1],
      index: course.hcpIndex[h - 1],
      scores: {},
      dots: Object.fromEntries(state.players.map(p => [p.id, defaultDots()])),
    }))
    return { holes, currentHole: range[0] }
  }),

  setCurrentHole: (h) => set({ currentHole: h }),

  setScore: (playerId, hole, score) => set((state) => ({
    holes: state.holes.map(h =>
      h.number === hole ? { ...h, scores: { ...h.scores, [playerId]: score } } : h
    ),
  })),

  setDot: (playerId, hole, dot, value) => set((state) => ({
    holes: state.holes.map(h => {
      if (h.number !== hole) return h
      const playerDots = { ...(h.dots[playerId] || defaultDots()) }
      if (dot === 'threePutt' && value) playerDots.onePutt = false
      if (dot === 'onePutt' && value) playerDots.threePutt = false
      playerDots[dot] = value
      return { ...h, dots: { ...h.dots, [playerId]: playerDots } }
    }),
  })),

  setWolfPick: (hole, partnerId) => set((state) => ({
    holes: state.holes.map(h => h.number === hole ? { ...h, wolfPick: partnerId } : h),
  })),

  setPress: (hole, gameKey) => set((state) => ({
    holes: state.holes.map(h =>
      h.number === hole ? { ...h, presses: [...(h.presses || []), gameKey] } : h
    ),
  })),

  setGreenieWinner: (hole, gameId, playerId) => set((state) => ({
    holes: state.holes.map(h =>
      h.number === hole
        ? { ...h, greenieWinners: { ...(h.greenieWinners || {}), [gameId]: playerId } }
        : h
    ),
  })),

  setBangoWinner: (hole, playerId) => set((state) => ({
    holes: state.holes.map(h => h.number === hole ? { ...h, bangoWinner: playerId } : h),
  })),

  addHoleResult: (result) => set((state) => ({
    holeResults: [
      ...state.holeResults.filter(r => r.hole !== result.hole),
      result,
    ].sort((a, b) => a.hole - b.hole),
  })),

  openSheet: () => set({ sheetOpen: true }),
  closeSheet: () => set({ sheetOpen: false }),

  bettingPlayers: () => get().players.filter(p => p.betting),

  holeRange: () => {
    const hc = get().holesCount
    if (hc === '9front') return [1,2,3,4,5,6,7,8,9]
    if (hc === '9back') return [10,11,12,13,14,15,16,17,18]
    return [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18]
  },

  reset: () => set({
    course: null, holesCount: '18', playDate: today, selectedTee: 'blue',
    players: [makePlayer(0, true)], games: [], setupStep: 0,
    roundId: null, holes: [], currentHole: 1, holeResults: [], sheetOpen: false,
  }),
}))
