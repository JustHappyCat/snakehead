import { prisma } from '@/lib/prisma'
import { getFixOrderedIssues } from '@/lib/fix-order'

function hasNoindexDirective(value?: string | null): boolean {
  return (value || '').toLowerCase().includes('noindex')
}

export async function getCrawlSummary(crawlId: string) {
  const crawl = await prisma.crawl.findUnique({
    where: { id: crawlId },
    select: {
      id: true,
      startUrl: true,
      status: true,
      createdAt: true,
      startedAt: true,
      finishedAt: true,
      settingsJson: true,
    },
  })

  if (!crawl) {
    return null
  }

  const [
    pagesCount,
    issuesCount,
    linksCount,
    pageAverages,
    statusCodeGroups,
    depthGroups,
    severityGroups,
    issueTypeGroups,
    recentEvents,
    linkGroups,
    nofollowLinks,
    pagesForIndexability,
    pagesWithTitles,
    pagesWithMetaDescriptions,
    pagesWithCanonicals,
    pagesWithH1,
    pagesWithImages,
    pagesWithMissingAlt,
    pagesWithStructuredData,
    pagesWithOpenGraph,
    pagesWithTwitterCards,
    pagesWithViewport,
    pagesWithHreflang,
    topSlowPages,
    topIssues,
    serpRecords,
    errorEvents,
  ] = await Promise.all([
    prisma.page.count({ where: { crawlId } }),
    prisma.issue.count({ where: { crawlId } }),
    prisma.link.count({ where: { crawlId } }),
    prisma.page.aggregate({
      where: { crawlId },
      _avg: {
        loadTimeMs: true,
        wordCount: true,
        internalLinkCount: true,
        imageCount: true,
        imagesWithoutAlt: true,
      },
      _max: {
        depth: true,
      },
    }),
    prisma.page.groupBy({
      by: ['statusCode'],
      where: { crawlId },
      _count: { _all: true },
    }),
    prisma.page.groupBy({
      by: ['depth'],
      where: { crawlId },
      _count: { _all: true },
    }),
    prisma.issue.groupBy({
      by: ['severity'],
      where: { crawlId },
      _count: { _all: true },
    }),
    prisma.issue.groupBy({
      by: ['issueType'],
      where: { crawlId },
      _count: { _all: true },
    }),
    prisma.event.findMany({
      where: { crawlId },
      orderBy: { ts: 'desc' },
      take: 8,
    }),
    prisma.link.groupBy({
      by: ['isInternal'],
      where: { crawlId },
      _count: { _all: true },
    }),
    prisma.link.count({
      where: {
        crawlId,
        isNofollow: true,
      },
    }),
    prisma.page.findMany({
      where: { crawlId },
      select: {
        robotsMeta: true,
        xRobotsTag: true,
      },
    }),
    prisma.page.count({
      where: {
        crawlId,
        AND: [{ title: { not: null } }, { title: { not: '' } }],
      },
    }),
    prisma.page.count({
      where: {
        crawlId,
        AND: [{ metaDescription: { not: null } }, { metaDescription: { not: '' } }],
      },
    }),
    prisma.page.count({
      where: {
        crawlId,
        AND: [{ canonical: { not: null } }, { canonical: { not: '' } }],
      },
    }),
    prisma.page.count({
      where: {
        crawlId,
        h1Count: {
          gt: 0,
        },
      },
    }),
    prisma.page.count({
      where: {
        crawlId,
        imageCount: {
          gt: 0,
        },
      },
    }),
    prisma.page.count({
      where: {
        crawlId,
        imagesWithoutAlt: {
          gt: 0,
        },
      },
    }),
    prisma.page.count({
      where: {
        crawlId,
        hasStructuredData: true,
      },
    }),
    prisma.page.count({
      where: {
        crawlId,
        hasOpenGraph: true,
      },
    }),
    prisma.page.count({
      where: {
        crawlId,
        hasTwitterCard: true,
      },
    }),
    prisma.page.count({
      where: {
        crawlId,
        hasViewport: true,
      },
    }),
    prisma.page.count({
      where: {
        crawlId,
        hasHreflang: true,
      },
    }),
    prisma.page.findMany({
      where: { crawlId },
      orderBy: { loadTimeMs: 'desc' },
      take: 5,
      select: {
        id: true,
        url: true,
        title: true,
        loadTimeMs: true,
        statusCode: true,
        depth: true,
      },
    }),
    getFixOrderedIssues(crawlId, 8),
    prisma.pageSerpData.count({ where: { crawlId } }),
    prisma.event.count({
      where: {
        crawlId,
        level: 'ERROR',
      },
    }),
  ])

  const internalLinks = linkGroups.find((group) => group.isInternal)?._count._all || 0
  const externalLinks = linkGroups.find((group) => !group.isInternal)?._count._all || 0
  const notIndexablePages = pagesForIndexability.filter(
    (page) => hasNoindexDirective(page.robotsMeta) || hasNoindexDirective(page.xRobotsTag)
  ).length
  const indexablePages = Math.max(0, pagesCount - notIndexablePages)

  return {
    crawl,
    stats: {
      pages: pagesCount,
      issues: issuesCount,
      links: linksCount,
      internalLinks,
      externalLinks,
      nofollowLinks,
      indexablePages,
      notIndexablePages,
      avgLoadTimeMs: Math.round(pageAverages._avg.loadTimeMs || 0),
      avgWordCount: Math.round(pageAverages._avg.wordCount || 0),
      avgInternalLinks: Math.round(pageAverages._avg.internalLinkCount || 0),
      avgImagesPerPage: Math.round(pageAverages._avg.imageCount || 0),
      avgImagesMissingAlt: Math.round(pageAverages._avg.imagesWithoutAlt || 0),
      maxDepth: pageAverages._max.depth || 0,
      pagesWithTitles,
      pagesWithMetaDescriptions,
      pagesWithCanonicals,
      pagesWithH1,
      pagesWithImages,
      pagesWithMissingAlt,
      pagesWithStructuredData,
      pagesWithOpenGraph,
      pagesWithTwitterCards,
      pagesWithViewport,
      pagesWithHreflang,
      pagesWithoutTitles: Math.max(0, pagesCount - pagesWithTitles),
      pagesWithoutMetaDescriptions: Math.max(0, pagesCount - pagesWithMetaDescriptions),
      pagesWithoutCanonicals: Math.max(0, pagesCount - pagesWithCanonicals),
      pagesWithoutH1: Math.max(0, pagesCount - pagesWithH1),
      pagesWithoutStructuredData: Math.max(0, pagesCount - pagesWithStructuredData),
      pagesWithoutOpenGraph: Math.max(0, pagesCount - pagesWithOpenGraph),
      pagesWithoutTwitterCards: Math.max(0, pagesCount - pagesWithTwitterCards),
      pagesWithoutViewport: Math.max(0, pagesCount - pagesWithViewport),
      pagesWithoutHreflang: Math.max(0, pagesCount - pagesWithHreflang),
      errorEvents,
      serpRecords,
    },
    distributions: {
      statusCodes: statusCodeGroups
        .filter((group) => group.statusCode !== null)
        .map((group) => ({
          code: group.statusCode as number,
          count: group._count._all,
        }))
        .sort((a, b) => a.code - b.code),
      depth: depthGroups
        .map((group) => ({
          depth: group.depth,
          count: group._count._all,
        }))
        .sort((a, b) => a.depth - b.depth),
      severity: severityGroups.map((group) => ({
        severity: group.severity,
        count: group._count._all,
      })),
      issueTypes: issueTypeGroups
        .map((group) => ({
          issueType: group.issueType,
          count: group._count._all,
        }))
        .sort((a, b) => b.count - a.count),
    },
    topSlowPages,
    topIssues,
    recentEvents,
  }
}
