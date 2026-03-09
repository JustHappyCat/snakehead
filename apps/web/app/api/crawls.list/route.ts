import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request
) {
  try {
    const crawls = await prisma.crawl.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    })

    return NextResponse.json(crawls)
  } catch (error) {
    console.error('Failed to fetch crawls:', error)
    return NextResponse.json(
      { error: 'Failed to fetch crawls' },
      { status: 500 }
    )
  }
}
