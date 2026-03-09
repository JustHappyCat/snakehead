import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const [
      totalCrawls,
      activeCrawls,
      completedCrawls,
      totalPages,
      totalIssues,
      recentCrawls,
    ] = await Promise.all([
      prisma.crawl.count(),
      prisma.crawl.count({ where: { status: 'RUNNING' } }),
      prisma.crawl.count({ where: { status: 'COMPLETED' } }),
      prisma.page.count(),
      prisma.issue.count(),
      prisma.crawl.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          startUrl: true,
          status: true,
          createdAt: true,
          startedAt: true,
          finishedAt: true,
        },
      }),
    ])

    const metrics = {
      system: {
        uptime: process.uptime(),
        memory: {
          used: process.memoryUsage().heapUsed / 1024 / 1024,
          total: process.memoryUsage().heapTotal / 1024 / 1024,
          rss: process.memoryUsage().rss / 1024 / 1024,
        },
        timestamp: new Date().toISOString(),
      },
      data: {
        totalCrawls,
        activeCrawls,
        completedCrawls,
        totalPages,
        totalIssues,
      },
      recentActivity: recentCrawls,
    }

    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Failed to fetch metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}
