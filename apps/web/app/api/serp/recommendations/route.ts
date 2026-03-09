// SERP Recommendations API - Get optimization recommendations based on SERP data
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import serpParser from '@/lib/serp-parser';
import recommendationEngine from '@/lib/serp-recommendations';
import { SerpFeature } from '@/lib/serp-api';

/**
 * GET /api/serp/recommendations
 * Query parameters:
 * - pageSerpDataId: string (required)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pageSerpDataId = searchParams.get('pageSerpDataId');

    if (!pageSerpDataId) {
      return NextResponse.json(
        { error: 'pageSerpDataId is required' },
        { status: 400 }
      );
    }

    // Get SERP data
    const serpData = await prisma.pageSerpData.findUnique({
      where: { id: pageSerpDataId },
      include: {
        page: true,
        crawl: true,
      },
    });

    if (!serpData) {
      return NextResponse.json(
        { error: 'SERP data not found' },
        { status: 404 }
      );
    }

// Parse SERP data
    const parsed = serpParser.parse(
      {
        query: serpData.query,
        features: serpData.features as unknown as SerpFeature[],
        organicResults: [],
        featuredSnippet: serpData.featuredSnippet as any,
        localPack: serpData.localPack as any,
        knowledgePanel: serpData.knowledgePanel as any,
        competitors: serpData.competitors as any,
        searchTime: 0,
        totalResults: 0,
        apiCost: serpData.serpApiCost,
        timestamp: serpData.createdAt,
      } as any,
      serpData.page.url
    );

    // Generate recommendations
    const recommendations = recommendationEngine.generateRecommendations(parsed);

    return NextResponse.json({
      success: true,
      pageId: serpData.pageId,
      query: serpData.query,
      recommendations,
      count: recommendations.length,
    });
  } catch (error) {
    console.error('SERP recommendations API error:', error);
    return NextResponse.json(
      { error: 'Failed to get recommendations', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
