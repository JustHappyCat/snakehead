import { NextResponse } from 'next/server'
import { getCrawlQueue } from '@/lib/redis'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { getCrawlQueueMode } from '@/lib/queue-mode'

export async function POST(request: Request) {
  try {
    const authResponse = requireAuth(request)
    if (authResponse) return authResponse
    const queueMode = getCrawlQueueMode()

    const body = await request.json()
    const { startUrl, settings, comparisonGroupName, competitorUrls = [] } = body

    if (!startUrl) {
      return NextResponse.json(
        { error: 'startUrl is required' },
        { status: 400 }
      )
    }

    const rawStartUrl = String(startUrl).trim()
    const normalizedStartUrl = /^https?:\/\//i.test(rawStartUrl)
      ? rawStartUrl
      : `https://${rawStartUrl}`

    try {
      new URL(normalizedStartUrl)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL. Please enter a full domain or URL.' },
        { status: 400 }
      )
    }

    // Get or create default tenant
    let tenant = await prisma.tenant.findFirst({
      where: { email: 'default@example.com' }
    })
    
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          name: 'Default Tenant',
          slug: 'default',
          email: 'default@example.com',
        },
      })
    }

    // Create comparison group if in comparison mode
    let comparisonGroupId: string | undefined
    if (comparisonGroupName && competitorUrls.length > 0) {
      const comparisonGroup = await prisma.comparisonGroup.create({
        data: {
          name: comparisonGroupName,
          tenantId: tenant.id,
        },
      })
      comparisonGroupId = comparisonGroup.id
    }

    // Create main crawl
    const crawl = await prisma.crawl.create({
      data: {
        startUrl: normalizedStartUrl,
        status: 'PENDING',
        tenantId: tenant.id,
        comparisonGroupId: comparisonGroupId || undefined,
        settingsJson: JSON.stringify(settings || {
          maxPages: 500,
          maxDepth: 5,
          concurrency: 5,
          respectRobots: true,
          securityAudit: false,
        }),
      },
    })

    let jobId: string | null = null
    if (queueMode === 'redis') {
      const job = await getCrawlQueue().add('run-crawl', { crawlId: crawl.id })
      jobId = typeof job.id === 'string' ? job.id : String(job.id)
    }

    // Create competitor crawls if provided
    const competitorCrawlIds: string[] = []
    for (const competitorUrl of competitorUrls) {
      if (!competitorUrl.trim()) continue

      const rawCompetitorUrl = String(competitorUrl).trim()
      const normalizedCompetitorUrl = /^https?:\/\//i.test(rawCompetitorUrl)
        ? rawCompetitorUrl
        : `https://${rawCompetitorUrl}`

      try {
        new URL(normalizedCompetitorUrl)
      } catch {
        continue // Skip invalid competitor URLs
      }

      const competitorCrawl = await prisma.crawl.create({
        data: {
          startUrl: normalizedCompetitorUrl,
          status: 'PENDING',
          tenantId: tenant.id,
          comparisonGroupId: comparisonGroupId || undefined,
          settingsJson: JSON.stringify(settings || {
            maxPages: 500,
            maxDepth: 5,
            concurrency: 5,
            respectRobots: true,
            securityAudit: false,
          }),
        },
      })

      if (queueMode === 'redis') {
        await getCrawlQueue().add('run-crawl', { crawlId: competitorCrawl.id })
      }
      competitorCrawlIds.push(competitorCrawl.id)
    }

    return NextResponse.json({
      crawlId: crawl.id,
      jobId,
      queueMode,
      status: crawl.status,
      comparisonGroupId,
      competitorCrawlIds,
    })
  } catch (error) {
    console.error('Failed to create crawl:', error)
    return NextResponse.json(
      { error: 'Failed to create crawl' },
      { status: 500 }
    )
  }
}
