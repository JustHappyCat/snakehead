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
    const types = (searchParams.get('types')?.split(',') || []).filter(Boolean)
    const severity = (searchParams.get('severity')?.split(',') || []).filter(Boolean)

    const skip = (page - 1) * limit

    const where: any = { crawlId: id }

    if (search) {
      where.OR = [
        { url: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (types.length > 0) {
      where.issueType = { in: types }
    }

    if (severity.length > 0) {
      where.severity = { in: severity }
    }

    const [issues, total] = await Promise.all([
      prisma.issue.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.issue.count({ where }),
    ])

    return NextResponse.json({
      issues,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Failed to fetch issues:', error)
    return NextResponse.json(
      { error: 'Failed to fetch issues' },
      { status: 500 }
    )
  }
}
