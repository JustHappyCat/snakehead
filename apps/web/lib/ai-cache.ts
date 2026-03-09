// AI Recommendations Cache Layer
// Caches AI recommendations using Redis to reduce API costs

import { getRedisClient } from './redis';
import { AIRecommendation, IssueContext } from './ai-recommendations';
import { hashContext, generateCacheKey } from './ai-recommendations';
import { prisma } from './prisma';

// Configuration
const CONFIG = {
  cacheTTL: parseInt(process.env.AI_RECOMMENDATIONS_CACHE_TTL || '86400'), // 24 hours default
  cachePrefix: process.env.AI_RECOMMENDATIONS_CACHE_PREFIX || 'ai-rec:',
};

// Types
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
}

// Cache Statistics
class CacheStatistics {
  private hits: number = 0;
  private misses: number = 0;

  recordHit(): void {
    this.hits++;
  }

  recordMiss(): void {
    this.misses++;
  }

  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      size: total,
    };
  }

  reset(): void {
    this.hits = 0;
    this.misses = 0;
  }
}

// AI Recommendations Cache
export class AIRecommendationsCache {
  private redis = getRedisClient();
  private stats = new CacheStatistics();

  // Get cached recommendation
  async get(cacheKey: string): Promise<AIRecommendation | null> {
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.stats.recordHit();
        
        // Update hit count in database
        await this.incrementHitCount(cacheKey);
        
        return JSON.parse(cached) as AIRecommendation;
      }
      
      this.stats.recordMiss();
      return null;
    } catch (error) {
      console.error('Error getting cache:', error);
      this.stats.recordMiss();
      return null;
    }
  }

  // Set cached recommendation
  async set(
    cacheKey: string,
    recommendation: AIRecommendation,
    ttl?: number
  ): Promise<void> {
    try {
      const cacheTTL = ttl || CONFIG.cacheTTL;
      const ttlDate = new Date(Date.now() + cacheTTL * 1000);
      
      // Store in Redis
      await this.redis.setex(
        cacheKey,
        cacheTTL,
        JSON.stringify(recommendation)
      );

      // Also store in database for persistence and analytics
      await this.storeInDatabase(cacheKey, recommendation, ttlDate);
    } catch (error) {
      console.error('Error setting cache:', error);
    }
  }

  // Invalidate cache for issue type
  async invalidateIssueType(issueType: string): Promise<void> {
    try {
      // Get all keys matching the issue type pattern
      const pattern = `${CONFIG.cachePrefix}${issueType}:*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }

      // Also invalidate in database
      await prisma.aIRecommendationCache.deleteMany({
        where: { issueType },
      });
    } catch (error) {
      console.error('Error invalidating cache:', error);
    }
  }

  // Invalidate cache by cache key
  async invalidateByKey(cacheKey: string): Promise<void> {
    try {
      await this.redis.del(cacheKey);
      
      // Also invalidate in database
      await prisma.aIRecommendationCache.deleteMany({
        where: { cacheKey },
      });
    } catch (error) {
      console.error('Error invalidating cache key:', error);
    }
  }

  // Clear all cache
  async clear(): Promise<void> {
    try {
      const pattern = `${CONFIG.cachePrefix}*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }

      // Clear database cache table
      await prisma.aIRecommendationCache.deleteMany({});
      
      this.stats.reset();
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  // Get cache stats
  async getStats(): Promise<CacheStats> {
    const memoryStats = this.stats.getStats();
    
    // Get actual cache size from Redis
    try {
      const pattern = `${CONFIG.cachePrefix}*`;
      const keys = await this.redis.keys(pattern);
      memoryStats.size = keys.length;
    } catch (error) {
      console.error('Error getting cache size:', error);
    }

    return memoryStats;
  }

  // Get detailed cache statistics including database info
  async getDetailedStats(): Promise<{
    memory: CacheStats;
    database: {
      totalEntries: number;
      entriesByIssueType: Record<string, number>;
      topHitEntries: Array<{ cacheKey: string; hitCount: number }>;
    };
  }> {
    const memory = await this.getStats();
    
    // Get database statistics
    const totalEntries = await prisma.aIRecommendationCache.count();
    
    const entriesByIssueTypeRaw = await prisma.aIRecommendationCache.groupBy({
      by: ['issueType'],
      _count: { id: true },
    });
    
    const entriesByIssueType: Record<string, number> = {};
    entriesByIssueTypeRaw.forEach((item) => {
      entriesByIssueType[item.issueType] = item._count.id;
    });

    const topHitEntries = await prisma.aIRecommendationCache.findMany({
      orderBy: { hitCount: 'desc' },
      take: 10,
      select: { cacheKey: true, hitCount: true },
    });

    return {
      memory,
      database: {
        totalEntries,
        entriesByIssueType,
        topHitEntries,
      },
    };
  }

  // Store recommendation in database
  private async storeInDatabase(
    cacheKey: string,
    recommendation: AIRecommendation,
    ttl: Date
  ): Promise<void> {
    try {
      const parts = cacheKey.split(':');
      const issueType = parts[1] || '';
      const contextHash = parts[2] || '';
      const model = parts[3] || '';

      await prisma.aIRecommendationCache.upsert({
        where: { cacheKey },
        update: {
          recommendation: recommendation as any,
          ttl,
          hitCount: { increment: 1 },
          updatedAt: new Date(),
        },
        create: {
          cacheKey,
          issueType,
          contextHash,
          model,
          modelVersion: '1.0',
          recommendation: recommendation as any,
          ttl,
          hitCount: 1,
        },
      });
    } catch (error) {
      console.error('Error storing in database:', error);
    }
  }

  // Increment hit count in database
  private async incrementHitCount(cacheKey: string): Promise<void> {
    try {
      await prisma.aIRecommendationCache.updateMany({
        where: { cacheKey },
        data: { hitCount: { increment: 1 } },
      });
    } catch (error) {
      console.error('Error incrementing hit count:', error);
    }
  }

  // Clean expired entries from database
  async cleanExpiredEntries(): Promise<number> {
    try {
      const now = new Date();
      const result = await prisma.aIRecommendationCache.deleteMany({
        where: {
          ttl: { lt: now },
        },
      });
      
      return result.count;
    } catch (error) {
      console.error('Error cleaning expired entries:', error);
      return 0;
    }
  }

  // Warm cache with common issue types
  async warmCache(commonIssues: Array<{ issueType: string; context: IssueContext }>): Promise<void> {
    for (const { issueType, context } of commonIssues) {
      const cacheKey = generateCacheKey(issueType, hashContext(context), 'gpt-3.5-turbo');
      
      // Check if already cached
      const existing = await this.get(cacheKey);
      if (existing) {
        continue;
      }

      // Cache will be populated when recommendation is generated
      console.log(`Cache warming for issue type: ${issueType}`);
    }
  }

  // Get cache entries by issue type
  async getByIssueType(issueType: string): Promise<AIRecommendation[]> {
    try {
      const entries = await prisma.aIRecommendationCache.findMany({
        where: { issueType },
        take: 100,
      });

      return entries
        .map((entry) => {
          const rec = entry.recommendation as unknown;
          if (rec && typeof rec === 'object' && 'id' in rec) {
            return rec as AIRecommendation;
          }
          return null;
        })
        .filter((r): r is AIRecommendation => r !== null);
    } catch (error) {
      console.error('Error getting entries by issue type:', error);
      return [];
    }
  }
}

// Singleton instance
let cacheInstance: AIRecommendationsCache | null = null;

export function getAICache(): AIRecommendationsCache {
  if (!cacheInstance) {
    cacheInstance = new AIRecommendationsCache();
  }
  return cacheInstance;
}

// Helper function to generate cache key from issue and context
export function generateCacheKeyFromIssue(
  issueType: string,
  context: IssueContext,
  model: string = 'gpt-3.5-turbo'
): string {
  const contextHash = hashContext(context);
  return generateCacheKey(issueType, contextHash, model);
}
