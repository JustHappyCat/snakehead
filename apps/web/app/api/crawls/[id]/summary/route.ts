import { NextResponse } from 'next/server'
import { getCrawlSummary } from '@/lib/crawl-summary'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const summary = await getCrawlSummary(params.id)

    if (!summary) {
      return NextResponse.json({ error: 'Crawl not found' }, { status: 404 })
    }

    return NextResponse.json(summary)
  } catch (error) {
    console.error('Failed to fetch crawl summary:', error)
    return NextResponse.json(
      { error: 'Failed to fetch crawl summary' },
      { status: 500 }
    )
  }
}
