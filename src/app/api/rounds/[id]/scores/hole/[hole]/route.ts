import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

interface ScoreInput {
  playerId: number
  gross: number
  putts: number | null
  fromBunker: boolean
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; hole: string }> }
) {
  const { id, hole } = await params

  const roundId = parseInt(id, 10)
  const holeNum = parseInt(hole, 10)

  if (isNaN(roundId) || isNaN(holeNum)) {
    return NextResponse.json({ error: 'Invalid path params' }, { status: 400 })
  }

  // 1. Fetch round — 404 if not found
  const round = await prisma.round.findUnique({ where: { id: roundId } })
  if (!round) {
    return NextResponse.json({ error: 'Round not found' }, { status: 404 })
  }

  // 2. Validate hole is 1..holesCount
  if (holeNum < 1 || holeNum > round.holesCount) {
    return NextResponse.json(
      { error: `Hole must be between 1 and ${round.holesCount}` },
      { status: 400 }
    )
  }

  // 3. Parse and validate body
  let body: { scores: ScoreInput[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed JSON' }, { status: 400 })
  }

  if (!Array.isArray(body?.scores)) {
    return NextResponse.json({ error: 'scores must be an array' }, { status: 400 })
  }

  // 4. Validate each playerId belongs to this round
  const roundPlayers = await prisma.roundPlayer.findMany({
    where: { roundId },
    select: { playerId: true },
  })
  const validPlayerIds = new Set(roundPlayers.map(rp => rp.playerId))

  for (const score of body.scores) {
    if (!validPlayerIds.has(score.playerId)) {
      return NextResponse.json(
        { error: `Player ${score.playerId} does not belong to round ${roundId}` },
        { status: 400 }
      )
    }
  }

  // 5. Wrap all upserts in a single Prisma transaction
  await prisma.$transaction(
    body.scores.map(score =>
      prisma.score.upsert({
        where: {
          roundId_playerId_hole: {
            roundId,
            playerId: score.playerId,
            hole: holeNum,
          },
        },
        update: {
          gross: score.gross,
          putts: score.putts ?? null,
          fromBunker: score.fromBunker,
        },
        create: {
          roundId,
          playerId: score.playerId,
          hole: holeNum,
          gross: score.gross,
          putts: score.putts ?? null,
          fromBunker: score.fromBunker,
        },
      })
    )
  )

  // 6. Return 204 No Content
  return new NextResponse(null, { status: 204 })
}
