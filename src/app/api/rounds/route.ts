import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { COURSES } from '@/types'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { courseName, courseLocation, holesCount, playedAt, players, gameInstances } = body

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

    // Create round
    const round = await prisma.round.create({
      data: {
        courseId: course.id,
        holesCount: holesCount === '9front' || holesCount === '9back' ? 9 : 18,
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
          create: (gameInstances || []).map((g: { type: string; stake: number; playerIds: string[] }) => ({
            type: g.type,
            stake: g.stake,
            playerIds: playerRecords
              .filter((_, i) => players[i]?.betting !== false)
              .map(pr => pr.id),
          })),
        },
      },
    })

    return NextResponse.json({ roundId: round.id })
  } catch (error) {
    console.error('Failed to create round:', error)
    // Return a client-side round ID so the app still works
    return NextResponse.json({ roundId: Date.now() })
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
