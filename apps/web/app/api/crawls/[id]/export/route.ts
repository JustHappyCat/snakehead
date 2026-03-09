import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  streamPagesExport,
  streamIssuesExport,
  streamLinksExport,
  streamCompleteExport,
} from '@/lib/stream-export'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'

    const crawl = await prisma.crawl.findUnique({
      where: { id },
      select: { startUrl: true },
    })

    if (!crawl) {
      return NextResponse.json({ error: 'Crawl not found' }, { status: 404 })
    }

    const domain = new URL(crawl.startUrl).hostname
    const timestamp = new Date().toISOString().split('T')[0]
    
    let filename = ''
    let streamGenerator: AsyncGenerator<string, void, unknown>

    if (type === 'pages') {
      filename = `${domain}_pages_${timestamp}.csv`
      streamGenerator = streamPagesExport(id)
    } else if (type === 'issues') {
      filename = `${domain}_issues_${timestamp}.csv`
      streamGenerator = streamIssuesExport(id)
    } else if (type === 'links') {
      filename = `${domain}_links_${timestamp}.csv`
      streamGenerator = streamLinksExport(id)
    } else {
      filename = `${domain}_complete_export_${timestamp}.csv`
      streamGenerator = streamCompleteExport(id)
    }

    const encoder = new TextEncoder()
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamGenerator) {
            controller.enqueue(encoder.encode(chunk))
          }
          controller.close()
        } catch (error) {
          console.error('Stream error:', error)
          controller.error(error)
        }
      },
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (error) {
    console.error('Failed to start export:', error)
    return NextResponse.json(
      { error: 'Failed to start export' },
      { status: 500 }
    )
  }
}
