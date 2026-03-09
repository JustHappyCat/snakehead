import { Prisma, PrismaClient, CrawlStatus, Severity, Impact, Difficulty } from '@prisma/client'
import { PageData, IssueData } from '../extract/page-extractor'

const prisma = new PrismaClient()

export class CrawlStorage {
  private crawlId: string

  constructor(crawlId: string) {
    this.crawlId = crawlId
  }

  async updateStatus(status: CrawlStatus, finishedAt?: Date): Promise<void> {
    await prisma.crawl.update({
      where: { id: this.crawlId },
      data: {
        status,
        finishedAt: finishedAt || new Date(),
      },
    })
  }

  async savePage(data: PageData): Promise<void> {
    const pageData = {
      crawlId: this.crawlId,
      url: data.url,
      finalUrl: data.finalUrl,
      statusCode: data.statusCode,
      contentType: data.contentType || '',
      title: data.title?.trim() || null,
      metaDescription: data.metaDescription?.trim() || null,
      metaKeywords: data.metaKeywords?.trim() || null,
      canonical: data.canonical?.trim() || null,
      robotsMeta: data.robotsMeta?.trim() || null,
      xRobotsTag: data.xRobotsTag?.trim() || null,
      viewport: data.viewport?.trim() || null,
      htmlLang: data.htmlLang?.trim() || null,
      wordCount: data.wordCount ?? null,
      loadTimeMs: data.loadTimeMs ?? null,
      depth: data.depth,
      isInternal: data.isInternal,
      h1Count: data.h1Count,
      h2Count: data.h2Count,
      internalLinkCount: data.internalLinkCount,
      externalLinkCount: data.externalLinkCount,
      imageCount: data.imageCount,
      imagesWithoutAlt: data.imagesWithoutAlt,
      hreflangCount: data.hreflangCount,
      hasStructuredData: data.hasStructuredData,
      structuredDataTypesJson: data.structuredDataTypesJson?.trim() || null,
      hasOpenGraph: data.hasOpenGraph,
      hasTwitterCard: data.hasTwitterCard,
      hasViewport: data.hasViewport,
      hasHreflang: data.hasHreflang,
    }

    try {
      await prisma.page.create({ data: pageData })
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        await prisma.page.updateMany({
          where: { crawlId: this.crawlId, url: data.url },
          data: {
            finalUrl: pageData.finalUrl,
            statusCode: pageData.statusCode,
            contentType: pageData.contentType,
            title: pageData.title,
            metaDescription: pageData.metaDescription,
            metaKeywords: pageData.metaKeywords,
            canonical: pageData.canonical,
            robotsMeta: pageData.robotsMeta,
            xRobotsTag: pageData.xRobotsTag,
            viewport: pageData.viewport,
            htmlLang: pageData.htmlLang,
            wordCount: pageData.wordCount,
            loadTimeMs: pageData.loadTimeMs,
            depth: pageData.depth,
            isInternal: pageData.isInternal,
            h1Count: pageData.h1Count,
            h2Count: pageData.h2Count,
            internalLinkCount: pageData.internalLinkCount,
            externalLinkCount: pageData.externalLinkCount,
            imageCount: pageData.imageCount,
            imagesWithoutAlt: pageData.imagesWithoutAlt,
            hreflangCount: pageData.hreflangCount,
            hasStructuredData: pageData.hasStructuredData,
            structuredDataTypesJson: pageData.structuredDataTypesJson,
            hasOpenGraph: pageData.hasOpenGraph,
            hasTwitterCard: pageData.hasTwitterCard,
            hasViewport: pageData.hasViewport,
            hasHreflang: pageData.hasHreflang,
          },
        })
        return
      }

      throw error
    }
  }

  async saveIssue(data: IssueData): Promise<void> {
    await prisma.issue.create({
      data: {
        crawlId: this.crawlId,
        issueType: data.issueType,
        url: data.url,
        severity: data.severity,
        impact: data.impact,
        difficulty: data.difficulty,
        title: data.title,
        explanation: data.explanation,
        fixStepsJson: JSON.stringify(data.fixSteps),
      },
    })
  }

  async saveLink(
    crawlId: string,
    fromUrl: string,
    toUrl: string,
    isInternal: boolean,
    anchorText?: string,
    isNofollow: boolean = false
  ): Promise<void> {
    await prisma.link.create({
      data: {
        crawlId,
        fromUrl,
        toUrl,
        isInternal,
        anchorText,
        isNofollow,
      },
    })
  }

  async saveBulkPages(pages: PageData[]): Promise<void> {
    await prisma.page.createMany({
      data: pages.map(p => ({
        crawlId: this.crawlId,
        url: p.url,
        finalUrl: p.finalUrl,
        statusCode: p.statusCode,
        contentType: p.contentType || '',
        title: p.title?.trim() || null,
        metaDescription: p.metaDescription?.trim() || null,
        metaKeywords: p.metaKeywords?.trim() || null,
        canonical: p.canonical?.trim() || null,
        robotsMeta: p.robotsMeta?.trim() || null,
        xRobotsTag: p.xRobotsTag?.trim() || null,
        viewport: p.viewport?.trim() || null,
        htmlLang: p.htmlLang?.trim() || null,
        wordCount: p.wordCount ?? null,
        loadTimeMs: p.loadTimeMs ?? null,
        depth: p.depth,
        isInternal: p.isInternal,
        h1Count: p.h1Count,
        h2Count: p.h2Count,
        internalLinkCount: p.internalLinkCount,
        externalLinkCount: p.externalLinkCount,
        imageCount: p.imageCount,
        imagesWithoutAlt: p.imagesWithoutAlt,
        hreflangCount: p.hreflangCount,
        hasStructuredData: p.hasStructuredData,
        structuredDataTypesJson: p.structuredDataTypesJson?.trim() || null,
        hasOpenGraph: p.hasOpenGraph,
        hasTwitterCard: p.hasTwitterCard,
        hasViewport: p.hasViewport,
        hasHreflang: p.hasHreflang,
      })),
      skipDuplicates: true,
    })
  }

  async saveBulkIssues(issues: IssueData[]): Promise<void> {
    await prisma.issue.createMany({
      data: issues.map(i => ({
        crawlId: this.crawlId,
        issueType: i.issueType,
        url: i.url,
        severity: i.severity,
        impact: i.impact,
        difficulty: i.difficulty,
        title: i.title,
        explanation: i.explanation,
        fixStepsJson: JSON.stringify(i.fixSteps),
      })),
    })
  }

  async saveBulkLinks(
    links: {
      fromUrl: string
      toUrl: string
      isInternal: boolean
      anchorText?: string
      isNofollow: boolean
    }[]
  ): Promise<void> {
    await prisma.link.createMany({
      data: links.map(l => ({
        crawlId: this.crawlId,
        fromUrl: l.fromUrl,
        toUrl: l.toUrl,
        isInternal: l.isInternal,
        anchorText: l.anchorText,
        isNofollow: l.isNofollow,
      })),
    })
  }

  async logEvent(level: any, message: string): Promise<void> {
    await prisma.event.create({
      data: {
        crawlId: this.crawlId,
        ts: new Date(),
        level: level as any,
        message,
      },
    })
  }

  async getCrawlStats() {
    const pages = await prisma.page.count({ where: { crawlId: this.crawlId } })
    const issues = await prisma.issue.count({ where: { crawlId: this.crawlId } })
    const links = await prisma.link.count({ where: { crawlId: this.crawlId } })

    return { pages, issues, links }
  }
}
