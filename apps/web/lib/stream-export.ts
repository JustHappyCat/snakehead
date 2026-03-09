import { prisma } from './prisma'

export interface ExportOptions {
  crawlId: string
  type: 'pages' | 'issues' | 'all'
  filters?: Record<string, any>
}

export class CsvStreamWriter {
  private buffer: string[] = []
  private bufferSize = 0
  private readonly maxBufferSize = 1024 * 1024

  constructor() {}

  addLine(line: string) {
    this.buffer.push(line)
    this.bufferSize += line.length

    if (this.bufferSize >= this.maxBufferSize) {
      const chunk = this.buffer.join('')
      this.buffer = []
      this.bufferSize = 0
      return chunk
    }
    return null
  }

  flush(): string {
    const chunk = this.buffer.join('')
    this.buffer = []
    this.bufferSize = 0
    return chunk
  }
}

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) {
    return '""'
  }

  return `"${String(value).replace(/"/g, '""')}"`
}

export async function* streamPagesExport(
  crawlId: string,
  filters?: Record<string, any>
): AsyncGenerator<string, void, unknown> {
  const writer = new CsvStreamWriter()
  const header = 'URL,Final URL,Status Code,Title,Meta Description,Canonical,Word Count,Load Time (ms),Depth,H1 Count,Internal Links,External Links,Images,Images Missing Alt,Open Graph,Twitter Card,Structured Data,Viewport,Hreflang Count\n'
  yield header

  const where: any = { crawlId }
  
  if (filters?.statusCode) {
    where.statusCode = filters.statusCode
  }

  let cursor: any = null
  const batchSize = 100

  while (true) {
    const pages = await prisma.page.findMany({
      where,
      take: batchSize,
      ...(cursor && { skip: 1, cursor }),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        url: true,
        finalUrl: true,
        statusCode: true,
        title: true,
        metaDescription: true,
        canonical: true,
        wordCount: true,
        loadTimeMs: true,
        depth: true,
        h1Count: true,
        internalLinkCount: true,
        externalLinkCount: true,
        imageCount: true,
        imagesWithoutAlt: true,
        hasOpenGraph: true,
        hasTwitterCard: true,
        hasStructuredData: true,
        hasViewport: true,
        hreflangCount: true,
      },
    })

    if (pages.length === 0) {
      break
    }

    for (const page of pages) {
      const line = [
        escapeCsv(page.url),
        escapeCsv(page.finalUrl ?? ''),
        escapeCsv(page.statusCode),
        escapeCsv(page.title ?? ''),
        escapeCsv(page.metaDescription ?? ''),
        escapeCsv(page.canonical ?? ''),
        escapeCsv(page.wordCount ?? 0),
        escapeCsv(page.loadTimeMs ?? 0),
        escapeCsv(page.depth),
        escapeCsv(page.h1Count ?? 0),
        escapeCsv(page.internalLinkCount ?? 0),
        escapeCsv(page.externalLinkCount ?? 0),
        escapeCsv(page.imageCount ?? 0),
        escapeCsv(page.imagesWithoutAlt ?? 0),
        escapeCsv(page.hasOpenGraph),
        escapeCsv(page.hasTwitterCard),
        escapeCsv(page.hasStructuredData),
        escapeCsv(page.hasViewport),
        escapeCsv(page.hreflangCount ?? 0),
      ].join(',') + '\n'
      const chunk = writer.addLine(line)
      if (chunk) yield chunk
    }

    cursor = { id: pages[pages.length - 1].id }
  }

  const finalChunk = writer.flush()
  if (finalChunk) yield finalChunk
}

export async function* streamIssuesExport(
  crawlId: string,
  severity?: string,
  issueType?: string
): AsyncGenerator<string, void, unknown> {
  const writer = new CsvStreamWriter()
  const header = 'URL,Issue Type,Severity,Impact,Difficulty,Title,Explanation\n'
  yield header

  const where: any = { crawlId }
  
  if (severity) {
    where.severity = severity
  }
  
  if (issueType) {
    where.issueType = issueType
  }

  let cursor: any = null
  const batchSize = 100

  while (true) {
    const issues = await prisma.issue.findMany({
      where,
      take: batchSize,
      ...(cursor && { skip: 1, cursor }),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        url: true,
        issueType: true,
        severity: true,
        impact: true,
        difficulty: true,
        title: true,
        explanation: true,
      },
    })

    if (issues.length === 0) {
      break
    }

    for (const issue of issues) {
      const line = [
        escapeCsv(issue.url),
        escapeCsv(issue.issueType),
        escapeCsv(issue.severity),
        escapeCsv(issue.impact),
        escapeCsv(issue.difficulty),
        escapeCsv(issue.title),
        escapeCsv(issue.explanation),
      ].join(',') + '\n'
      const chunk = writer.addLine(line)
      if (chunk) yield chunk
    }

    cursor = { id: issues[issues.length - 1].id }
  }

  const finalChunk = writer.flush()
  if (finalChunk) yield finalChunk
}

export async function* streamLinksExport(
  crawlId: string
): AsyncGenerator<string, void, unknown> {
  const writer = new CsvStreamWriter()
  const header = 'From URL,To URL,Internal,Anchor Text,Nofollow\n'
  yield header

  let cursor: any = null
  const batchSize = 100

  while (true) {
    const links = await prisma.link.findMany({
      where: { crawlId },
      take: batchSize,
      ...(cursor && { skip: 1, cursor }),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        fromUrl: true,
        toUrl: true,
        isInternal: true,
        anchorText: true,
        isNofollow: true,
      },
    })

    if (links.length === 0) {
      break
    }

    for (const link of links) {
      const line = [
        escapeCsv(link.fromUrl),
        escapeCsv(link.toUrl),
        escapeCsv(link.isInternal),
        escapeCsv(link.anchorText ?? ''),
        escapeCsv(link.isNofollow),
      ].join(',') + '\n'
      const chunk = writer.addLine(line)
      if (chunk) yield chunk
    }

    cursor = { id: links[links.length - 1].id }
  }

  const finalChunk = writer.flush()
  if (finalChunk) yield finalChunk
}

export async function* streamCompleteExport(
  crawlId: string
): AsyncGenerator<string, void, unknown> {
  const writer = new CsvStreamWriter()
  const header = 'URL,Final URL,Status Code,Title,Meta Description,Word Count,Load Time (ms),Depth,H1 Count,Internal Links,External Links,Images Missing Alt,Open Graph,Structured Data,Issues\n'
  yield header

  const issuesMap = new Map<string, any[]>()

  let cursor: any = null
  const batchSize = 100

  while (true) {
    const issues = await prisma.issue.findMany({
      where: { crawlId },
      take: batchSize,
      ...(cursor && { skip: 1, cursor }),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        url: true,
        issueType: true,
        severity: true,
      },
    })

    if (issues.length === 0) {
      break
    }

    for (const issue of issues) {
      const urlIssues = issuesMap.get(issue.url) || []
      urlIssues.push(issue)
      issuesMap.set(issue.url, urlIssues)
    }

    cursor = { id: issues[issues.length - 1].id }
  }

  cursor = null

  while (true) {
    const pages = await prisma.page.findMany({
      where: { crawlId },
      take: batchSize,
      ...(cursor && { skip: 1, cursor }),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        url: true,
        finalUrl: true,
        statusCode: true,
        title: true,
        metaDescription: true,
        wordCount: true,
        loadTimeMs: true,
        depth: true,
        h1Count: true,
        internalLinkCount: true,
        externalLinkCount: true,
        imagesWithoutAlt: true,
        hasOpenGraph: true,
        hasStructuredData: true,
      },
    })

    if (pages.length === 0) {
      break
    }

    for (const page of pages) {
      const urlIssues = issuesMap.get(page.url) || []
      const issueSummary = urlIssues
        .map((i) => `${i.issueType} (${i.severity})`)
        .join('; ')
      
      const line = [
        escapeCsv(page.url),
        escapeCsv(page.finalUrl ?? ''),
        escapeCsv(page.statusCode),
        escapeCsv(page.title ?? ''),
        escapeCsv(page.metaDescription ?? ''),
        escapeCsv(page.wordCount ?? 0),
        escapeCsv(page.loadTimeMs ?? 0),
        escapeCsv(page.depth),
        escapeCsv(page.h1Count ?? 0),
        escapeCsv(page.internalLinkCount ?? 0),
        escapeCsv(page.externalLinkCount ?? 0),
        escapeCsv(page.imagesWithoutAlt ?? 0),
        escapeCsv(page.hasOpenGraph),
        escapeCsv(page.hasStructuredData),
        escapeCsv(issueSummary),
      ].join(',') + '\n'
      const chunk = writer.addLine(line)
      if (chunk) yield chunk
    }

    cursor = { id: pages[pages.length - 1].id }
  }

  const finalChunk = writer.flush()
  if (finalChunk) yield finalChunk
}
