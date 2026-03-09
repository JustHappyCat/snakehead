// SERP Usage API - Get SERP API usage statistics
import { NextRequest, NextResponse } from 'next/server';
import { getSerpApiClient } from '@/lib/serp-api';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/serp/usage
 * Get SERP API usage statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Get API client stats
    const apiStats = await getSerpApiClient().getUsageStats();

    // Get database stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dbStats = await prisma.pageSerpData.aggregate({
      where: {
        createdAt: { gte: today },
      },
      _count: { id: true },
      _sum: { serpApiCost: true },
    });

    // Get historical stats (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const historicalStats = await prisma.pageSerpData.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: { id: true },
      _sum: { serpApiCost: true },
    });

    // Calculate daily breakdown
    const dailyBreakdown = historicalStats.map(stat => ({
      date: stat.createdAt.toISOString().split('T')[0],
      requests: stat._count.id,
      cost: stat._sum.serpApiCost || 0,
    }));

    return NextResponse.json({
      success: true,
      stats: {
        today: {
          requests: dbStats._count.id,
          cost: dbStats._sum.serpApiCost || 0,
        },
        current: {
          requestsToday: apiStats.requestsToday,
          costToday: apiStats.costToday,
          remainingBudget: apiStats.remainingBudget,
          rateLimitReset: apiStats.rateLimitReset,
        },
        history: dailyBreakdown,
      },
    });
  } catch (error) {
    console.error('SERP usage API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage stats', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
