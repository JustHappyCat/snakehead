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
    const { id } = params
    const { searchParams } = new URL(request.url)
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1)
    const limit = clampLimit(searchParams.get('limit'), 100)
    const search = searchParams.get('search') || ''
    const statusCodes = (searchParams.get('statusCodes')?.split(',') || []).filter(Boolean)

    const skip = (page - 1) * limit

    const where: any = { crawlId: id }

    if (search) {
      where.OR = [
        { url: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { metaDescription: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (statusCodes.length > 0) {
      where.statusCode = { in: statusCodes.map(Number) }
    }

    const [pages, total] = await Promise.all([
      prisma.page.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ depth: 'asc' }, { url: 'asc' }],
      }),
      prisma.page.count({ where }),
    ])

    return NextResponse.json({
      pages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Failed to fetch pages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pages' },
      { status: 500 }
    )
  }
}
