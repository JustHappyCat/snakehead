// AI Recommendations API Endpoint
// Generates and retrieves AI-powered SEO recommendations

import { NextRequest, NextResponse } from 'next/server';
import { getAIService } from '@/lib/ai-recommendations';
import { getAICache } from '@/lib/ai-cache';
import { prisma } from '@/lib/prisma';
import { generateCacheKeyFromIssue } from '@/lib/ai-cache';
import { Issue, IssueContext, AIRecommendation } from '@/lib/ai-recommendations';

// POST /api/ai/recommendations - Generate or retrieve recommendations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { issueIds, forceRefresh = false } = body;

    if (!Array.isArray(issueIds) || issueIds.length === 0) {
      return NextResponse.json(
        { error: 'issueIds must be a non-empty array' },
        { status: 400 }
      );
    }

    // Limit the number of issues per request
    const maxIssuesPerRequest = 50;
    if (issueIds.length > maxIssuesPerRequest) {
      return NextResponse.json(
        { error: `Maximum ${maxIssuesPerRequest} issues per request` },
        { status: 400 }
      );
    }

    const aiService = getAIService();
    const aiCache = getAICache();

    // Check if AI service is available
    if (!aiService.isAvailable()) {
      return NextResponse.json(
        { error: 'AI recommendations service is not available' },
        { status: 503 }
      );
    }

    // Check daily cost limit
    if (aiService.isDailyCostLimitReached()) {
      return NextResponse.json(
        { error: 'Daily AI cost limit reached. Please try again tomorrow.' },
        { status: 429 }
      );
    }

    // Get issues from database
    const issues = await prisma.issue.findMany({
      where: {
        id: { in: issueIds },
      },
    });

    if (issues.length === 0) {
      return NextResponse.json(
        { error: 'No issues found' },
        { status: 404 }
      );
    }

    // Get pages for context
    const urls = issues.map((i) => i.url);
    const pages = await prisma.page.findMany({
      where: {
        url: { in: urls },
      },
    });

    // Map pages to issues
    const pageMap = new Map(pages.map((p) => [p.url, p]));

    // Build contexts for each issue
    const contexts: IssueContext[] = issues.map((issue) => {
      const page = pageMap.get(issue.url);
      return aiService.buildContextForIssue(issue, page || undefined);
    });

    // Check cache first (unless force refresh)
    const cached: AIRecommendation[] = [];
    const uncachedIssues: Issue[] = [];
    const uncachedContexts: IssueContext[] = [];

    for (let i = 0; i < issues.length; i++) {
      const issue = issues[i];
      const context = contexts[i];
      const cacheKey = generateCacheKeyFromIssue(issue.issueType, context);

      if (!forceRefresh) {
        const cachedRec = await aiCache.get(cacheKey);
        if (cachedRec) {
          cached.push(cachedRec);
          continue;
        }
      }

      uncachedIssues.push(issue);
      uncachedContexts.push(context);
    }

    // Generate recommendations for uncached issues
    const newRecs = await aiService.generateBatchRecommendations(
      uncachedIssues,
      uncachedContexts
    );

    // Cache new recommendations
    for (let i = 0; i < newRecs.length; i++) {
      const rec = newRecs[i];
      const issue = uncachedIssues[i];
      const context = uncachedContexts[i];
      const cacheKey = generateCacheKeyFromIssue(issue.issueType, context);

      await aiCache.set(cacheKey, rec);

      // Update issue with AI recommendation
      await prisma.issue.update({
        where: { id: issue.id },
        data: {
          aiRecommendation: JSON.stringify(rec),
          aiGeneratedAt: new Date(),
          aiModel: rec.model,
          aiConfidence: rec.confidence,
          aiCost: rec.cost,
        },
      });
    }

    const allRecommendations = [...cached, ...newRecs];

    return NextResponse.json({
      recommendations: allRecommendations,
      stats: {
        total: allRecommendations.length,
        cached: cached.length,
        generated: newRecs.length,
        cacheHitRate: cached.length / allRecommendations.length,
      },
    });
  } catch (error) {
    console.error('Error in AI recommendations API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/ai/recommendations/stats - Get AI statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const aiService = getAIService();
    const aiCache = getAICache();

    if (type === 'cost') {
      // Get cost statistics
      const costStats = aiService.getCostStats();
      return NextResponse.json({
        totalCost: costStats.totalCost,
        requestsToday: costStats.requestsToday,
        costByIssueType: costStats.costByIssueType,
        costByModel: costStats.costByModel,
        maxDailyCost: parseFloat(process.env.AI_RECOMMENDATIONS_MAX_DAILY_COST || '10.00'),
        dailyLimitReached: aiService.isDailyCostLimitReached(),
      });
    }

    if (type === 'cache') {
      // Get cache statistics
      const cacheStats = await aiCache.getDetailedStats();
      return NextResponse.json(cacheStats);
    }

    // Get all statistics
    const costStats = aiService.getCostStats();
    const cacheStats = await aiCache.getDetailedStats();

    return NextResponse.json({
      cost: {
        totalCost: costStats.totalCost,
        requestsToday: costStats.requestsToday,
        costByIssueType: costStats.costByIssueType,
        costByModel: costStats.costByModel,
        maxDailyCost: parseFloat(process.env.AI_RECOMMENDATIONS_MAX_DAILY_COST || '10.00'),
        dailyLimitReached: aiService.isDailyCostLimitReached(),
      },
      cache: cacheStats,
      service: {
        available: aiService.isAvailable(),
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        enabled: process.env.AI_RECOMMENDATIONS_ENABLED === 'true',
      },
    });
  } catch (error) {
    console.error('Error getting AI stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/ai/recommendations - Clear cache
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const issueType = searchParams.get('issueType');
    const cacheKey = searchParams.get('cacheKey');

    const aiCache = getAICache();

    if (issueType) {
      // Invalidate cache for specific issue type
      await aiCache.invalidateIssueType(issueType);
      return NextResponse.json({
        message: `Cache invalidated for issue type: ${issueType}`,
      });
    }

    if (cacheKey) {
      // Invalidate specific cache key
      await aiCache.invalidateByKey(cacheKey);
      return NextResponse.json({
        message: `Cache invalidated for key: ${cacheKey}`,
      });
    }

    // Clear all cache
    await aiCache.clear();
    return NextResponse.json({
      message: 'All AI recommendation cache cleared',
    });
  } catch (error) {
    console.error('Error clearing AI cache:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
