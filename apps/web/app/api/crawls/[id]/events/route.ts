import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function clampLimit(rawLimit: string | null, fallback: number) {
  const parsed = parseInt(rawLimit || `${fallback}`, 10)
  if (Number.isNaN(parsed)) return fallback
  return Math.min(Math.max(parsed, 1), 1000)
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const limit = clampLimit(searchParams.get('limit'), 100)

    const where: any = { crawlId: params.id }
    if (search) {
      where.message = { contains: search, mode: 'insensitive' }
    }

    const events = await prisma.event.findMany({
      where,
      orderBy: { ts: 'desc' },
      take: limit,
    })

    return NextResponse.json({ events })
  } catch (error) {
    console.error('Failed to fetch crawl events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch crawl events' },
      { status: 500 }
    )
  }
}
