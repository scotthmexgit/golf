import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import type { GameType } from '@/types'
import { validateHoleDecisions } from '@/lib/holeDecisions'

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
  let body: { scores: ScoreInput[]; decisions?: Record<string, unknown> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed JSON' }, { status: 400 })
  }

  if (!Array.isArray(body?.scores)) {
    return NextResponse.json({ error: 'scores must be an array' }, { status: 400 })
  }

  // 4. Validate each playerId belongs to this round; fetch game types for decisions validation
  const [roundPlayers, roundGames] = await Promise.all([
    prisma.roundPlayer.findMany({ where: { roundId }, select: { playerId: true } }),
    prisma.game.findMany({ where: { roundId }, select: { type: true } }),
  ])
  const validPlayerIds = new Set(roundPlayers.map(rp => rp.playerId))
  const gameTypes = new Set(roundGames.map(g => g.type as GameType))

  for (const score of body.scores) {
    if (!validPlayerIds.has(score.playerId)) {
      return NextResponse.json(
        { error: `Player ${score.playerId} does not belong to round ${roundId}` },
        { status: 400 }
      )
    }
  }

  // 5. Validate decisions blob if provided
  if (body.decisions !== undefined && body.decisions !== null) {
    const dv = validateHoleDecisions(gameTypes, body.decisions)
    if (!dv.ok) {
      return NextResponse.json({ error: `Invalid decisions: ${dv.reason}` }, { status: 400 })
    }
  }

  // 6. Wrap all upserts (scores + optional decisions) in a single Prisma transaction
  const scoreOps = body.scores.map(score =>
    prisma.score.upsert({
      where: { roundId_playerId_hole: { roundId, playerId: score.playerId, hole: holeNum } },
      update: { gross: score.gross, putts: score.putts ?? null, fromBunker: score.fromBunker },
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

  const hasDecisions = body.decisions !== undefined && body.decisions !== null && Object.keys(body.decisions).length > 0
  if (hasDecisions) {
    const decisionsJson = body.decisions as unknown as Prisma.InputJsonValue
    await prisma.$transaction([
      ...scoreOps,
      prisma.holeDecision.upsert({
        where: { roundId_hole: { roundId, hole: holeNum } },
        update: { decisions: decisionsJson },
        create: { roundId, hole: holeNum, decisions: decisionsJson },
      }),
    ])
  } else {
    await prisma.$transaction(scoreOps)
  }

  // 7. Return 204 No Content
  return new NextResponse(null, { status: 204 })
}
