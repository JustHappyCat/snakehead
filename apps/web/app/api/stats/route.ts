import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const authResponse = requireAuth(request)
    if (authResponse) return authResponse

    // Get all completed crawls
    const crawls = await prisma.crawl.findMany({
      where: { status: 'COMPLETED' },
      include: {
        pages: true,
        issues: true,
      },
    })

    // Calculate totals
    const totalPages = crawls.reduce((sum, crawl) => sum + crawl.pages.length, 0)
    const brokenPages = crawls.reduce(
      (sum, crawl) => sum + crawl.pages.filter(p => (p.statusCode ?? 0) >= 400).length,
      0
    )
    const notIndexable = crawls.reduce(
      (sum, crawl) => sum + crawl.pages.filter(p => 
        p.robotsMeta?.includes('noindex') || p.robotsMeta === 'none'
      ).length,
      0
    )
    const missingTitles = crawls.reduce(
      (sum, crawl) => sum + crawl.pages.filter(p => !p.title || p.title.trim() === '').length,
      0
    )
    const redirects = crawls.reduce(
      (sum, crawl) => sum + crawl.pages.filter(p => {
        const code = p.statusCode ?? 0
        return code >= 300 && code < 400
      }).length,
      0
    )

    return NextResponse.json({
      totalPages,
      brokenPages,
      notIndexable,
      missingTitles,
      redirects,
    })
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}