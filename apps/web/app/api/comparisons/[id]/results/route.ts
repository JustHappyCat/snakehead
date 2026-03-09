import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authResponse = requireAuth(request)
    if (authResponse) return authResponse

    const comparisonGroupId = params.id

    const comparisonGroup = await prisma.comparisonGroup.findUnique({
      where: { id: comparisonGroupId },
      include: {
        crawls: {
          orderBy: { createdAt: 'asc' },
        },
        results: true,
      },
    })

    if (!comparisonGroup) {
      return NextResponse.json({ error: 'Comparison group not found' }, { status: 404 })
    }

    // For now, skip tenant check since we don't have proper session management
    // TODO: Add proper tenant check when auth is fully implemented

    // Group results by metric type
    const resultsByMetric: Record<string, any[]> = {}
    comparisonGroup.results.forEach(result => {
      if (!resultsByMetric[result.metricType]) {
        resultsByMetric[result.metricType] = []
      }
      resultsByMetric[result.metricType].push(result)
    })

    return NextResponse.json({
      comparisonGroup,
      resultsByMetric,
    })
  } catch (error) {
    console.error('Failed to fetch comparison results:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comparison results' },
      { status: 500 }
    )
  }
}
