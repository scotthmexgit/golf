import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { COURSES } from '@/types'

// GET /api/rounds/[id]
// Returns flat round data per spec:
// { round, course, players, games, scores }
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const roundId = parseInt(id, 10)

  if (isNaN(roundId)) {
    return NextResponse.json({ error: 'Invalid round id' }, { status: 400 })
  }

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: {
      course: {
        include: { holes: { orderBy: { number: 'asc' } } },
      },
      players: {
        include: { player: true },
        orderBy: { id: 'asc' },
      },
      scores: {
        orderBy: [{ hole: 'asc' }, { playerId: 'asc' }],
      },
      games: true,
      holeDecisions: {
        orderBy: { hole: 'asc' },
      },
    },
  })

  if (!round) {
    return NextResponse.json({ error: 'Round not found' }, { status: 404 })
  }

  // Build holes: prefer DB rows, fall back to static COURSES data
  let holes: { hole: number; par: number; index: number }[] = []
  if (round.course.holes.length > 0) {
    holes = round.course.holes.map((ch) => ({
      hole: ch.number,
      par: ch.par,
      index: ch.index,
    }))
  } else {
    const staticCourse = COURSES.find((c) => c.name === round.course.name)
    if (staticCourse) {
      holes = staticCourse.par.map((par, i) => ({
        hole: i + 1,
        par,
        index: staticCourse.hcpIndex[i],
      }))
    }
  }

  return NextResponse.json({
    round: {
      id: round.id,
      holesCount: round.holesCount,
      tee: round.tee,
      playedAt: round.playedAt,
      status: round.status,
      courseId: round.courseId,
    },
    course: {
      id: round.course.id,
      name: round.course.name,
      location: round.course.location,
      holes,
    },
    players: round.players.map((rp) => ({
      id: rp.id,
      playerId: rp.playerId,
      name: rp.player.name,
      handicapIdx: rp.player.handicapIdx,
      courseHcp: rp.courseHcp,
      betting: rp.betting,
      tee: rp.tee,
    })),
    games: round.games.map((g) => ({
      id: g.id,
      type: g.type,
      stake: g.stake,
      playerIds: g.playerIds,
      config: g.config ?? null,
    })),
    scores: round.scores.map((s) => ({
      playerId: s.playerId,
      hole: s.hole,
      gross: s.gross,
      putts: s.putts,
      fromBunker: s.fromBunker,
    })),
    holeDecisions: round.holeDecisions.map((hd) => ({
      hole: hd.hole,
      decisions: hd.decisions,
    })),
  })
}

// PATCH /api/rounds/[id]/status
// Body: { status: "Complete" }
// Only accepted value: "Complete" (forward-only lifecycle: InProgress → Complete).
// Returns 204 No Content on success.
// Returns 400 if status is not "Complete", 404 if round not found,
// 409 if round is already Complete (forward-only lifecycle).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const roundId = parseInt(id, 10)

  if (isNaN(roundId)) {
    return NextResponse.json({ error: 'Invalid round id' }, { status: 400 })
  }

  let body: { status?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed JSON' }, { status: 400 })
  }

  const newStatus = body?.status
  if (newStatus !== 'Complete') {
    return NextResponse.json(
      { error: 'status must be "Complete"' },
      { status: 400 }
    )
  }

  const round = await prisma.round.findUnique({ where: { id: roundId } })
  if (!round) {
    return NextResponse.json({ error: 'Round not found' }, { status: 404 })
  }

  // Forward-only lifecycle: only InProgress rounds may be completed.
  // If the round is already Complete, reject with 409.
  if (round.status !== 'InProgress') {
    return NextResponse.json(
      { error: 'Round is already Complete; this lifecycle is forward-only' },
      { status: 409 }
    )
  }

  await prisma.round.update({
    where: { id: roundId },
    data: { status: 'Complete' },
  })

  return new NextResponse(null, { status: 204 })
}
