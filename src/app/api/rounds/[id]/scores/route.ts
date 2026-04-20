import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  // Scores are managed client-side in Zustand for now
  return NextResponse.json({ roundId: parseInt(id), hole: body.hole, saved: true })
}
