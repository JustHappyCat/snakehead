// SERP History API - Track SERP changes over time
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/serp/history
 * Query parameters:
 * - pageSerpDataId: string (required)
 * - limit?: number (default: 50)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pageSerpDataId = searchParams.get('pageSerpDataId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!pageSerpDataId) {
      return NextResponse.json(
        { error: 'pageSerpDataId is required' },
        { status: 400 }
      );
    }

    const history = await prisma.serpHistory.findMany({
      where: { pageSerpDataId },
      orderBy: { checkDate: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      history,
      count: history.length,
    });
  } catch (error) {
    console.error('SERP history API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SERP history', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/serp/history
 * Create a new history snapshot
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pageSerpDataId, crawlId } = body;

    if (!pageSerpDataId) {
      return NextResponse.json(
        { error: 'pageSerpDataId is required' },
        { status: 400 }
      );
    }

    // Get current SERP data
    const serpData = await prisma.pageSerpData.findUnique({
      where: { id: pageSerpDataId },
    });

    if (!serpData) {
      return NextResponse.json(
        { error: 'SERP data not found' },
        { status: 404 }
      );
    }

    // Get previous history
    const previousHistory = await prisma.serpHistory.findFirst({
      where: { pageSerpDataId },
      orderBy: { checkDate: 'desc' },
    });

// Calculate changes
    const featuresBefore = (previousHistory?.featuresAfter || []) as string[];
    const featuresAfter = (serpData.features || []) as string[];
    const featuresAdded = featuresAfter.filter((f: string) => !featuresBefore.includes(f));
    const featuresRemoved = featuresBefore.filter((f: string) => !featuresAfter.includes(f));

    const positionBefore = previousHistory?.positionAfter;
    const positionAfter = serpData.position;
    const positionChange = positionAfter && positionBefore
      ? positionBefore - positionAfter
      : null;

    const wasFeaturedBefore = previousHistory?.wasFeaturedAfter || false;
    const wasFeaturedAfter = serpData.isFeatured;

    // Determine change type
    let changeType = 'NO_CHANGE';
    if (!previousHistory) {
      changeType = 'INITIAL';
    } else if (featuresAdded.length > 0 && featuresRemoved.length === 0) {
      changeType = 'FEATURE_GAINED';
    } else if (featuresRemoved.length > 0 && featuresAdded.length === 0) {
      changeType = 'FEATURE_LOST';
    } else if (positionChange && positionChange > 0) {
      changeType = 'POSITION_GAINED';
    } else if (positionChange && positionChange < 0) {
      changeType = 'POSITION_LOST';
    } else if (wasFeaturedAfter && !wasFeaturedBefore) {
      changeType = 'SNIPPET_GAINED';
    } else if (!wasFeaturedAfter && wasFeaturedBefore) {
      changeType = 'SNIPPET_LOST';
    } else if (featuresAdded.length > 0 || featuresRemoved.length > 0) {
      changeType = 'MIXED';
    }

    // Determine impact
    let impact = 'NEUTRAL';
    if (changeType === 'SNIPPET_GAINED' || (positionChange && positionChange >= 5)) {
      impact = 'POSITIVE';
    } else if (changeType === 'SNIPPET_LOST' || (positionChange && positionChange <= -5)) {
      impact = 'NEGATIVE';
    } else if (featuresAdded.includes('FEATURED_SNIPPET') || featuresAdded.includes('LOCAL_PACK')) {
      impact = 'POSITIVE';
    } else if (featuresRemoved.includes('FEATURED_SNIPPET') || featuresRemoved.includes('LOCAL_PACK')) {
      impact = 'NEGATIVE';
    }

// Create history record
    const history = await prisma.serpHistory.create({
      data: {
        pageSerpDataId,
        featuresBefore: featuresBefore as any,
        featuresAfter: serpData.features as any,
        featuresAdded: featuresAdded as any,
        featuresRemoved: featuresRemoved as any,
        positionBefore,
        positionAfter,
        positionChange,
        wasFeaturedBefore,
        wasFeaturedAfter,
        gainedSnippet: wasFeaturedAfter && !wasFeaturedBefore,
        lostSnippet: !wasFeaturedAfter && wasFeaturedBefore,
        changeType: changeType as any,
        impact: impact as any,
        crawlId,
      },
    });

    return NextResponse.json({
      success: true,
      history,
    });
  } catch (error) {
    console.error('SERP history POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create SERP history', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
