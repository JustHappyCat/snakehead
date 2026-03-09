import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function clampLimit(rawLimit: string | null, fallback: number) {
  const parsed = parseInt(rawLimit || `${fallback}`, 10)
  if (Number.isNaN(parsed)) return fallback
  return Math.min(Math.max(parsed, 1), 10000)
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1)
    const limit = clampLimit(searchParams.get('limit'), 100)
    const search = searchParams.get('search') || ''
    const internal = searchParams.get('internal')

    const where: any = { crawlId: params.id }

    if (search) {
      where.OR = [
        { fromUrl: { contains: search, mode: 'insensitive' } },
        { toUrl: { contains: search, mode: 'insensitive' } },
        { anchorText: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (internal === 'true') {
      where.isInternal = true
    } else if (internal === 'false') {
      where.isInternal = false
    }

    const skip = (page - 1) * limit

    const [links, total, internalCount, externalCount, nofollowCount] = await Promise.all([
      prisma.link.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.link.count({ where }),
      prisma.link.count({ where: { crawlId: params.id, isInternal: true } }),
      prisma.link.count({ where: { crawlId: params.id, isInternal: false } }),
      prisma.link.count({ where: { crawlId: params.id, isNofollow: true } }),
    ])

    return NextResponse.json({
      links,
      summary: {
        total,
        internal: internalCount,
        external: externalCount,
        nofollow: nofollowCount,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Failed to fetch links:', error)
    return NextResponse.json(
      { error: 'Failed to fetch links' },
      { status: 500 }
    )
  }
}
