import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const crawl = await prisma.crawl.findUnique({
      where: { id },
    })

    if (!crawl) {
      return NextResponse.json({ error: 'Crawl not found' }, { status: 404 })
    }

    const pagesCount = await prisma.page.count({ where: { crawlId: id } })
    const issuesCount = await prisma.issue.count({ where: { crawlId: id } })
    const linksCount = await prisma.link.count({ where: { crawlId: id } })

    const events = await prisma.event.findMany({
      where: { crawlId: id },
      orderBy: { ts: 'desc' },
      take: 5,
    })

    return NextResponse.json({
      status: crawl.status,
      startedAt: crawl.startedAt,
      finishedAt: crawl.finishedAt,
      stats: {
        pages: pagesCount,
        issues: issuesCount,
        links: linksCount,
      },
      recentEvents: events,
    })
  } catch (error) {
    console.error('Failed to fetch crawl progress:', error)
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    )
  }
}
