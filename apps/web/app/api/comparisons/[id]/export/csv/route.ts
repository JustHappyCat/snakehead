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
        results: {
          include: {
            crawl: true,
          },
        },
      },
    })

    if (!comparisonGroup) {
      return NextResponse.json({ error: 'Comparison group not found' }, { status: 404 })
    }

    // For now, skip tenant check since we don't have proper session management
    // TODO: Add proper tenant check when auth is fully implemented

    // Generate CSV content
    const headers = ['Metric', ...comparisonGroup.crawls.map(c => {
      try {
        return new URL(c.startUrl).hostname
      } catch {
        return c.startUrl
      }
    }), 'Gap']

    const metricNames: Record<string, string> = {
      totalPages: 'Total Pages',
      totalIssues: 'Total Issues',
      criticalIssues: 'Critical Issues',
      highIssues: 'High Issues',
      mediumIssues: 'Medium Issues',
      lowIssues: 'Low Issues',
      avgLoadTime: 'Avg Load Time (ms)',
      avgWordCount: 'Avg Word Count',
      indexablePages: 'Indexable Pages',
      nonIndexablePages: 'Non-Indexable Pages',
      totalPagesWithTitles: 'Pages with Titles',
      totalPagesWithMetaDescriptions: 'Pages with Meta Descriptions',
      totalPagesWithCanonicals: 'Pages with Canonicals',
    }

    const rows: string[][] = [headers]

    // Group results by metric type
    const resultsByMetric: Record<string, any[]> = {}
    comparisonGroup.results.forEach(result => {
      if (!resultsByMetric[result.metricType]) {
        resultsByMetric[result.metricType] = []
      }
      resultsByMetric[result.metricType].push(result)
    })

    // Create rows for each metric
    Object.keys(resultsByMetric).forEach(metricType => {
      const results = resultsByMetric[metricType]
      const metricName = metricNames[metricType] || metricType
      
      const row = [metricName]
      
      comparisonGroup.crawls.forEach(crawl => {
        const result = results.find(r => r.crawlId === crawl.id)
        row.push(result?.value?.toString() || '0')
      })
      
      // Add gap (difference from baseline)
      const baselineValue = results[0]?.value || 0
      const lastValue = results[results.length - 1]?.value || 0
      const gap = lastValue - baselineValue
      row.push(gap.toString())
      
      rows.push(row)
    })

    const csvContent = rows.map(row => row.join(',')).join('\n')

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="comparison-${comparisonGroupId}.csv"`,
      },
    })
  } catch (error) {
    console.error('Failed to export comparison as CSV:', error)
    return NextResponse.json(
      { error: 'Failed to export comparison' },
      { status: 500 }
    )
  }
}
