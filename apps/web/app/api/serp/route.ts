// SERP Data API - Fetch and manage SERP data for crawled pages
import { NextRequest, NextResponse } from 'next/server';
import { getSerpApiClient, getMockSerpResult, SerpFeature } from '@/lib/serp-api';
import serpParser from '@/lib/serp-parser';
import recommendationEngine from '@/lib/serp-recommendations';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/serp
 * Query parameters:
 * - crawlId: string (required)
 * - pageId?: string (optional, filter by page)
 * - query?: string (optional, custom query)
 * - useMock?: boolean (optional, use mock data for testing)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const crawlId = searchParams.get('crawlId');
    const pageId = searchParams.get('pageId');
    const query = searchParams.get('query');
    const useMock = searchParams.get('useMock') === 'true';

    if (!crawlId) {
      return NextResponse.json(
        { error: 'crawlId is required' },
        { status: 400 }
      );
    }

    // Check if crawl exists
    const crawl = await prisma.crawl.findUnique({
      where: { id: crawlId },
    });

    if (!crawl) {
      return NextResponse.json(
        { error: 'Crawl not found' },
        { status: 404 }
      );
    }

    // Get pages for SERP analysis
    let pages;
    if (pageId) {
      pages = await prisma.page.findMany({
        where: {
          id: pageId,
          crawlId,
        },
        take: 1,
      });
    } else {
      pages = await prisma.page.findMany({
        where: { crawlId },
        take: 50, // Limit to 50 pages per request
      });
    }

    const results = [];

    for (const page of pages) {
      // Generate query from page
      const searchQuery = query || generateQueryFromPage(page);

      // Check if SERP data already exists
      let serpData = await prisma.pageSerpData.findUnique({
        where: {
          pageId_crawlId_query: {
            pageId: page.id,
            crawlId,
            query: searchQuery,
          },
        },
      });

      if (serpData) {
        // Return existing data
        results.push({
          pageId: page.id,
          url: page.url,
          query: searchQuery,
          features: serpData.features,
          position: serpData.position,
          isFeatured: serpData.isFeatured,
          isTopResult: serpData.isTopResult,
          parsed: {
            featuredSnippet: serpData.featuredSnippet,
            localPack: serpData.localPack,
            knowledgePanel: serpData.knowledgePanel,
          },
          createdAt: serpData.createdAt,
        });
        continue;
      }

      // Fetch new SERP data
      let serpResult;
      if (useMock || !process.env.SERPAPI_API_KEY) {
        serpResult = getMockSerpResult(searchQuery);
      } else {
        try {
          serpResult = await getSerpApiClient().search({
            query: searchQuery,
            engine: 'google',
            location: 'United States',
            language: 'en',
            device: 'desktop',
          });
        } catch (error) {
          console.error('SERP API error:', error);
          // Fall back to mock data on error
          serpResult = getMockSerpResult(searchQuery);
        }
      }

      // Parse SERP result
      const parsed = serpParser.parse(serpResult, page.url);

      // Generate recommendations
      const recommendations = recommendationEngine.generateRecommendations(parsed);

      // Store SERP data
      serpData = await prisma.pageSerpData.create({
data: {
          pageId: page.id,
          crawlId,
          query: searchQuery,
          queryType: 'AUTO',
          features: parsed.features as unknown as SerpFeature[],
          position: parsed.pagePosition,
          isFeatured: parsed.isFeaturedSnippet,
          isTopResult: parsed.isTopResult,
          featuredSnippet: (parsed.featuredSnippet || null) as any,
          localPack: (parsed.localPack || null) as any,
          knowledgePanel: (parsed.knowledgePanel || null) as any,
          competitors: (parsed.competitors || null) as any,
          serpApiProvider: useMock || !process.env.SERPAPI_API_KEY ? 'mock' : 'serpapi',
          serpApiCost: serpResult.apiCost,
        },
      });

      // Create initial history record
      await prisma.serpHistory.create({
        data: {
          pageSerpDataId: serpData.id,
          featuresBefore: [],
          featuresAfter: parsed.features as unknown as SerpFeature[],
          featuresAdded: parsed.features as unknown as SerpFeature[],
          featuresRemoved: [],
          positionBefore: null,
          positionAfter: parsed.pagePosition,
          positionChange: parsed.pagePosition ? -(parsed.pagePosition - 100) : 0,
          wasFeaturedBefore: false,
          wasFeaturedAfter: parsed.isFeaturedSnippet,
          gainedSnippet: parsed.isFeaturedSnippet,
          lostSnippet: false,
          changeType: 'INITIAL',
          impact: 'NEUTRAL',
          crawlId,
        },
      });

      results.push({
        pageId: page.id,
        url: page.url,
        query: searchQuery,
        features: parsed.features,
        position: parsed.pagePosition,
        isFeatured: parsed.isFeaturedSnippet,
        isTopResult: parsed.isTopResult,
        parsed,
        recommendations,
        createdAt: serpData.createdAt,
      });
    }

    return NextResponse.json({
      success: true,
      crawlId,
      results,
      count: results.length,
    });
  } catch (error) {
    console.error('SERP API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SERP data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/serp
 * Trigger SERP analysis for a crawl
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { crawlId, pageIds, queryType, customQueries } = body;

    if (!crawlId) {
      return NextResponse.json(
        { error: 'crawlId is required' },
        { status: 400 }
      );
    }

    // Check if crawl exists
    const crawl = await prisma.crawl.findUnique({
      where: { id: crawlId },
    });

    if (!crawl) {
      return NextResponse.json(
        { error: 'Crawl not found' },
        { status: 404 }
      );
    }

    // Get pages to analyze
    let pages;
    if (pageIds && pageIds.length > 0) {
      pages = await prisma.page.findMany({
        where: {
          id: { in: pageIds },
          crawlId,
        },
      });
    } else {
      pages = await prisma.page.findMany({
        where: { crawlId },
        take: 100, // Limit batch size
      });
    }

    // Queue SERP analysis jobs
    const jobIds = [];

    for (const page of pages) {
      const query = generateQueryFromPage(page, queryType, customQueries);

      // Create pending SERP data record
      const serpData = await prisma.pageSerpData.create({
        data: {
          pageId: page.id,
          crawlId,
          query,
          queryType: queryType || 'AUTO',
          features: [],
          serpApiProvider: 'pending',
          serpApiCost: 0,
        },
      });

      jobIds.push(serpData.id);
    }

    return NextResponse.json({
      success: true,
      message: `SERP analysis queued for ${pages.length} pages`,
      jobIds,
    });
  } catch (error) {
    console.error('SERP POST error:', error);
    return NextResponse.json(
      { error: 'Failed to queue SERP analysis', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Generate search query from page
 */
function generateQueryFromPage(
  page: any,
  queryType: string = 'AUTO',
  customQueries?: Record<string, string>
): string {
  // Check for custom query
  if (customQueries && customQueries[page.id]) {
    return customQueries[page.id];
  }

  // Extract from page data
  const title = (page.title || '').trim();
  const urlPath = (() => {
    try {
      return new URL(page.url).pathname
        .split('/')
        .filter(Boolean)
        .pop()
        ?.replace(/[-_]+/g, ' ') || '';
    } catch {
      return '';
    }
  })();

  switch (queryType) {
    case 'TITLE':
      return title || urlPath || page.url.split('/').pop() || '';

    case 'H1':
      return title || urlPath || page.url.split('/').pop() || '';

    case 'CUSTOM':
      return ''; // Should be provided in customQueries

    case 'AUTO':
    default:
      return title || urlPath || page.url.split('/').pop() || '';
  }
}
