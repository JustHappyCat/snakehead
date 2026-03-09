import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface MetricData {
  crawlId: string
  totalPages: number
  totalIssues: number
  criticalIssues: number
  highIssues: number
  mediumIssues: number
  lowIssues: number
  avgLoadTime: number
  avgWordCount: number
  indexablePages: number
  nonIndexablePages: number
  totalPagesWithTitles: number
  totalPagesWithMetaDescriptions: number
  totalPagesWithCanonicals: number
}

async function getMetricsForCrawl(crawlId: string): Promise<MetricData> {
  const pages = await prisma.page.findMany({
    where: { crawlId },
  })

  const issues = await prisma.issue.findMany({
    where: { crawlId },
  })

  const totalPages = pages.length
  const totalIssues = issues.length
  const criticalIssues = issues.filter(i => i.severity === 'CRITICAL').length
  const highIssues = issues.filter(i => i.severity === 'HIGH').length
  const mediumIssues = issues.filter(i => i.severity === 'MEDIUM').length
  const lowIssues = issues.filter(i => i.severity === 'LOW').length
  
  const pagesWithLoadTime = pages.filter(p => p.loadTimeMs !== null)
  const avgLoadTime = pagesWithLoadTime.length > 0
    ? pagesWithLoadTime.reduce((sum, p) => sum + (p.loadTimeMs || 0), 0) / pagesWithLoadTime.length
    : 0
  
  const pagesWithWordCount = pages.filter(p => p.wordCount !== null)
  const avgWordCount = pagesWithWordCount.length > 0
    ? pagesWithWordCount.reduce((sum, p) => sum + (p.wordCount || 0), 0) / pagesWithWordCount.length
    : 0
  
  const indexablePages = pages.filter(p => {
    const robotsMeta = p.robotsMeta?.toLowerCase() || ''
    const xRobotsTag = p.xRobotsTag?.toLowerCase() || ''
    return !robotsMeta.includes('noindex') && !xRobotsTag.includes('noindex')
  }).length
  
  const nonIndexablePages = totalPages - indexablePages
  const totalPagesWithTitles = pages.filter(p => p.title && p.title.trim() !== '').length
  const totalPagesWithMetaDescriptions = pages.filter(p => p.metaDescription && p.metaDescription.trim() !== '').length
  const totalPagesWithCanonicals = pages.filter(p => p.canonical && p.canonical.trim() !== '').length

  return {
    crawlId,
    totalPages,
    totalIssues,
    criticalIssues,
    highIssues,
    mediumIssues,
    lowIssues,
    avgLoadTime,
    avgWordCount,
    indexablePages,
    nonIndexablePages,
    totalPagesWithTitles,
    totalPagesWithMetaDescriptions,
    totalPagesWithCanonicals,
  }
}

export async function POST(
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
        crawls: true,
      },
    })

    if (!comparisonGroup) {
      return NextResponse.json({ error: 'Comparison group not found' }, { status: 404 })
    }

    // For now, skip tenant check since we don't have proper session management
    // TODO: Add proper tenant check when auth is fully implemented

    if (comparisonGroup.crawls.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 crawls are required for comparison' },
        { status: 400 }
      )
    }

    // Check if all crawls are completed
    const incompleteCrawls = comparisonGroup.crawls.filter(c => c.status !== 'COMPLETED')
    if (incompleteCrawls.length > 0) {
      return NextResponse.json(
        { error: 'All crawls must be completed before generating comparison' },
        { status: 400 }
      )
    }

    // Get metrics for all crawls
    const metrics = await Promise.all(
      comparisonGroup.crawls.map(crawl => getMetricsForCrawl(crawl.id))
    )

    // Clear existing results
    await prisma.comparisonResult.deleteMany({
      where: { comparisonGroupId },
    })

    // Generate comparison results
    const metricTypes: (keyof MetricData)[] = [
      'totalPages',
      'totalIssues',
      'criticalIssues',
      'highIssues',
      'mediumIssues',
      'lowIssues',
      'avgLoadTime',
      'avgWordCount',
      'indexablePages',
      'nonIndexablePages',
      'totalPagesWithTitles',
      'totalPagesWithMetaDescriptions',
      'totalPagesWithCanonicals',
    ]

    for (const metricType of metricTypes) {
      if (metricType === 'crawlId') continue

      const values = metrics.map(m => m[metricType] as number)
      const baselineValue = values[0] // First crawl is the baseline (your site)

      for (let i = 0; i < metrics.length; i++) {
        const crawl = comparisonGroup.crawls[i]
        const value = values[i]
        const competitorValue = baselineValue
        const gap = value - competitorValue

        await prisma.comparisonResult.create({
          data: {
            comparisonGroupId,
            crawlId: crawl.id,
            metricType,
            value,
            competitorValue,
            gap,
          },
        })
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Comparison results generated successfully' 
    })
  } catch (error) {
    console.error('Failed to generate comparison:', error)
    return NextResponse.json(
      { error: 'Failed to generate comparison' },
      { status: 500 }
    )
  }
}
