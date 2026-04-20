import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // For now, round data lives in client Zustand store
  return NextResponse.json({ roundId: parseInt(id), message: 'Round data managed client-side' })
}
