import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { COURSES } from '@/types'
import type { GameType, GameInstance } from '@/types'
import { buildGameConfig, validateGameConfig, validateGameConfigInput } from '@/lib/gameConfig'

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed JSON' }, { status: 400 })
  }
  const { courseName, courseLocation, holesCount, playedAt, players, gameInstances } = body as {
    courseName: string
    courseLocation?: string
    holesCount: string
    playedAt?: string
    players: Array<{ id?: string; name?: string; tee?: string; hcpIndex?: number; courseHcp?: number; betting?: boolean }>
    gameInstances: Array<GameInstance>
  }

  try {
    // Find or create course
    let course = await prisma.course.findFirst({ where: { name: courseName } })
    if (!course) {
      course = await prisma.course.create({
        data: { name: courseName, location: courseLocation || '' },
      })
    }

    // Populate CourseHole rows on-demand if missing (Decision 4)
    const holeCountInt = holesCount === '9front' || holesCount === '9back' ? 9 : 18
    const existingHoleCount = await prisma.courseHole.count({ where: { courseId: course.id } })
    if (existingHoleCount < holeCountInt) {
      const courseData = COURSES.find(c => c.name === courseName)
      if (courseData) {
        const holeRows = Array.from({ length: holeCountInt }, (_, i) => ({
          courseId: course.id,
          number: i + 1,
          par: courseData.par[i],
          index: courseData.hcpIndex[i],
        }))
        await prisma.courseHole.createMany({ data: holeRows, skipDuplicates: true })
      }
    }

    // Create players first (find or create by name)
    const playerRecords: { id: number }[] = []
    for (const p of players || []) {
      let player = await prisma.player.findFirst({ where: { name: p.name || 'Golfer' } })
      if (!player) {
        player = await prisma.player.create({
          data: { name: p.name || 'Golfer', handicapIdx: p.hcpIndex || p.courseHcp || 0 },
        })
      }
      playerRecords.push(player)
    }

    // Map wizard player UUIDs (Zustand-local) to DB player IDs by position.
    // The wizard stores players positionally; the i-th player in the wizard
    // corresponds to the i-th playerRecord created above.
    const wizardIdToDbId = new Map<string, number>(
      (players || []).map((p, i) => [p.id ?? '', playerRecords[i]?.id ?? -1]),
    )

    // Validate and prepare game configs before the round.create transaction.
    const allBettingDbIds = playerRecords
      .filter((_, i) => players[i]?.betting !== false)
      .map(pr => pr.id)

    const processedGames: { type: string; stake: number; playerIds: number[]; config: Prisma.InputJsonValue | null }[] = []
    for (const g of (gameInstances || [])) {
      // Step 1: strict raw-input validation — catches misspelled/cross-type keys before buildGameConfig
      // silently drops them. See the POST-strict / hydrate-permissive asymmetry note in gameConfig.ts.
      const inputCheck = validateGameConfigInput(g.type as GameType, g)
      if (!inputCheck.ok) {
        return NextResponse.json({ error: `Invalid game config: ${inputCheck.reason}` }, { status: 400 })
      }

      // Step 2: derive blob from known typed fields.
      const config = buildGameConfig(g)

      // Step 3: enum validation on the derived blob.
      const v = validateGameConfig(g.type as GameType, config)
      if (!v.ok) {
        return NextResponse.json({ error: `Invalid config for ${g.type}: ${v.reason}` }, { status: 400 })
      }

      // Map wizard player UUIDs to DB IDs; fall back to all betting players
      // if the wizard used Zustand-local IDs that don't map (e.g., fresh round).
      const mappedIds = (g.playerIds || [])
        .map(wid => wizardIdToDbId.get(wid))
        .filter((id): id is number => id !== undefined && id >= 0)
      const gamePlayerIds = mappedIds.length > 0 ? mappedIds : allBettingDbIds

      processedGames.push({ type: g.type, stake: g.stake, playerIds: gamePlayerIds, config: config as unknown as Prisma.InputJsonValue | null })
    }

    // Create round
    const round = await prisma.round.create({
      data: {
        courseId: course.id,
        holesCount: holeCountInt,
        tee: players?.[0]?.tee || 'blue',
        playedAt: playedAt ? new Date(playedAt) : new Date(),
        players: {
          create: playerRecords.map((pr, i) => ({
            playerId: pr.id,
            tee: players[i]?.tee || 'blue',
            handicapIdx: players[i]?.hcpIndex || players[i]?.courseHcp || 0,
            courseHcp: players[i]?.courseHcp || 0,
            betting: players[i]?.betting ?? true,
          })),
        },
        games: {
          create: processedGames.map(g => ({
            type: g.type,
            stake: g.stake,
            playerIds: g.playerIds,
            ...(g.config !== null && g.config !== undefined ? { config: g.config } : {}),
          })),
        },
      },
    })

    return NextResponse.json({ roundId: round.id })
  } catch (error) {
    console.error('Failed to create round:', error)
    return NextResponse.json({ error: 'Failed to create round' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const rounds = await prisma.round.findMany({
      include: {
        course: true,
        players: { include: { player: true } },
      },
      orderBy: [{ playedAt: 'desc' }, { id: 'desc' }],
      take: 20,
    })
    return NextResponse.json({ rounds })
  } catch (error) {
    console.error('Failed to fetch rounds:', error)
    return NextResponse.json({ rounds: [] })
  }
}
