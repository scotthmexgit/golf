import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // Results computed client-side
  return NextResponse.json({ roundId: parseInt(id), message: 'Compute results client-side' })
}
