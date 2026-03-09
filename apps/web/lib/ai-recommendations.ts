// AI Recommendations Service
// Integrates with OpenAI API to generate contextual SEO recommendations

import OpenAI from 'openai';
import crypto from 'crypto';

// Configuration
const CONFIG = {
  apiKey: process.env.OPENAI_API_KEY || '',
  model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
  enabled: process.env.AI_RECOMMENDATIONS_ENABLED === 'true',
  maxDailyCost: parseFloat(process.env.AI_RECOMMENDATIONS_MAX_DAILY_COST || '10.00'),
  maxCostPerUser: parseFloat(process.env.AI_RECOMMENDATIONS_MAX_COST_PER_USER || '1.00'),
  rateLimitRPM: parseInt(process.env.AI_RECOMMENDATIONS_RATE_LIMIT_RPM || '60'),
  rateLimitTPM: parseInt(process.env.AI_RECOMMENDATIONS_RATE_LIMIT_TPM || '150000'),
  cacheTTL: parseInt(process.env.AI_RECOMMENDATIONS_CACHE_TTL || '86400'),
  cachePrefix: process.env.AI_RECOMMENDATIONS_CACHE_PREFIX || 'ai-rec:',
};

// Cost per 1K tokens for different models
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
};

// Types
export interface Issue {
  id: string;
  crawlId: string;
  issueType: string;
  url: string;
  severity: string;
  impact: string;
  difficulty: string;
  title: string;
  explanation: string;
  fixStepsJson?: string | null;
}

export interface Page {
  id: string;
  url: string;
  title?: string | null;
  metaDescription?: string | null;
  canonical?: string | null;
  h1?: string | null;
  wordCount?: number | null;
  loadTimeMs?: number | null;
  statusCode?: number | null;
}

export interface IssueContext {
  url: string;
  pageTitle?: string;
  metaDescription?: string;
  h1?: string;
  canonical?: string;
  wordCount?: number;
  loadTimeMs?: number;
  statusCode?: number;
  severity: string;
  impact: string;
  difficulty: string;
  issueType: string;
  title: string;
  explanation: string;
  duplicateUrls?: string[];
  linkText?: string;
  targetUrl?: string;
  altText?: string;
  imageSize?: number;
}

export interface AIRecommendation {
  id: string;
  issueId: string;
  recommendation: string;
  actionableSteps: string[];
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: string;
  confidence: number;
  model: string;
  tokensUsed: number;
  cost: number;
  cached: boolean;
  createdAt: Date;
}

export interface CostTracker {
  totalCost: number;
  requestsToday: number;
  costByIssueType: Record<string, number>;
  costByModel: Record<string, number>;
  lastReset: Date;
}

// Rate Limiter
class RateLimiter {
  private requestTimestamps: number[] = [];
  private tokenTimestamps: number[] = [];

  async checkRequestLimit(): Promise<boolean> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Clean old timestamps
    this.requestTimestamps = this.requestTimestamps.filter(t => t > oneMinuteAgo);
    this.tokenTimestamps = this.tokenTimestamps.filter(t => t > oneMinuteAgo);

    return this.requestTimestamps.length < CONFIG.rateLimitRPM;
  }

  recordRequest(tokens: number): void {
    const now = Date.now();
    this.requestTimestamps.push(now);
    this.tokenTimestamps.push(...Array(tokens).fill(now));
  }

  async waitForAvailability(): Promise<void> {
    while (!(await this.checkRequestLimit())) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// AI Recommendations Service
export class AIRecommendationsService {
  private openai: OpenAI | null = null;
  private rateLimiter: RateLimiter;
  private costTracker: CostTracker = {
    totalCost: 0,
    requestsToday: 0,
    costByIssueType: {},
    costByModel: {},
    lastReset: new Date(),
  };

  constructor() {
    if (CONFIG.apiKey && CONFIG.enabled) {
      this.openai = new OpenAI({ apiKey: CONFIG.apiKey });
    }
    this.rateLimiter = new RateLimiter();
  }

  // Check if service is available
  isAvailable(): boolean {
    return !!(this.openai && CONFIG.enabled && CONFIG.apiKey);
  }

  // Reset daily cost tracker
  resetDailyCost(): void {
    const now = new Date();
    if (now.getDate() !== this.costTracker.lastReset.getDate()) {
      this.costTracker = {
        totalCost: 0,
        requestsToday: 0,
        costByIssueType: {},
        costByModel: {},
        lastReset: now,
      };
    }
  }

  // Check if daily cost limit is reached
  isDailyCostLimitReached(): boolean {
    this.resetDailyCost();
    return this.costTracker.totalCost >= CONFIG.maxDailyCost;
  }

  // Track cost for a recommendation
  trackCost(recommendation: AIRecommendation): void {
    this.costTracker.totalCost += recommendation.cost;
    this.costTracker.requestsToday++;
    this.costTracker.costByIssueType[recommendation.priority] =
      (this.costTracker.costByIssueType[recommendation.priority] || 0) + recommendation.cost;
    this.costTracker.costByModel[recommendation.model] =
      (this.costTracker.costByModel[recommendation.model] || 0) + recommendation.cost;
  }

  // Calculate cost based on tokens used
  calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const costs = MODEL_COSTS[model] || MODEL_COSTS['gpt-3.5-turbo'];
    const inputCost = (inputTokens / 1000) * costs.input;
    const outputCost = (outputTokens / 1000) * costs.output;
    return inputCost + outputCost;
  }

  // Get daily cost
  getDailyCost(): number {
    this.resetDailyCost();
    return this.costTracker.totalCost;
  }

  // Get cost stats
  getCostStats(): CostTracker {
    this.resetDailyCost();
    return { ...this.costTracker };
  }

  // Build context for an issue
  buildContextForIssue(issue: Issue, page?: Page, additionalData?: Record<string, any>): IssueContext {
    const context: IssueContext = {
      url: issue.url,
      severity: issue.severity,
      impact: issue.impact,
      difficulty: issue.difficulty,
      issueType: issue.issueType,
      title: issue.title,
      explanation: issue.explanation,
    };

    if (page) {
      context.pageTitle = page.title || undefined;
      context.metaDescription = page.metaDescription || undefined;
      context.canonical = page.canonical || undefined;
      context.wordCount = page.wordCount || undefined;
      context.loadTimeMs = page.loadTimeMs || undefined;
      context.statusCode = page.statusCode ?? undefined;
    }

    if (additionalData) {
      Object.assign(context, additionalData);
    }

    return context;
  }

  // Get prompt template for issue type
  getPromptForIssue(issue: Issue, context: IssueContext): string {
    const basePrompt = `You are an SEO expert. Analyze the following issue and provide a specific, actionable recommendation.

Issue: ${issue.title}
Issue Type: ${issue.issueType}
URL: ${context.url}
Severity: ${context.severity}
Impact: ${context.impact}
Difficulty: ${context.difficulty}
Explanation: ${context.explanation}`;

    const contextInfo = this.getContextInfo(issue, context);
    
    const fullPrompt = `${basePrompt}
${contextInfo}

Provide:
1. A specific recommendation for this issue (2-3 sentences)
2. 3-5 actionable steps to fix the issue
3. Estimated business impact if fixed (1-2 sentences)
4. Priority level (high/medium/low)

Format your response as valid JSON:
{
  "recommendation": "string",
  "actionableSteps": ["string", "string", "string"],
  "estimatedImpact": "string",
  "priority": "high|medium|low"
}`;

    return fullPrompt;
  }

  // Get context-specific information for prompt
  private getContextInfo(issue: Issue, context: IssueContext): string {
    const issueType = issue.issueType.toLowerCase();
    let info = '';

    switch (true) {
      case issueType.includes('title') || issueType.includes('missing-title'):
        info = `Page Title: ${context.pageTitle || 'Missing'}`;
        break;

      case issueType.includes('meta') || issueType.includes('description'):
        info = `Meta Description: ${context.metaDescription || 'Missing'}`;
        break;

      case issueType.includes('h1') || issueType.includes('heading'):
        info = `H1 Tag: ${context.h1 || 'Missing'}`;
        break;

      case issueType.includes('duplicate'):
        info = `Duplicate URLs: ${context.duplicateUrls?.join(', ') || 'N/A'}`;
        break;

      case issueType.includes('link') && issueType.includes('broken'):
        info = `Link Text: ${context.linkText || 'N/A'}
Target URL: ${context.targetUrl || 'N/A'}
HTTP Status: ${context.statusCode ?? 'N/A'}`;
        break;

      case issueType.includes('alt') || issueType.includes('image'):
        info = `Alt Text: ${context.altText || 'Missing'}
Image Size: ${context.imageSize ? `${context.imageSize} bytes` : 'N/A'}`;
        break;

      case issueType.includes('canonical'):
        info = `Canonical URL: ${context.canonical || 'Missing'}`;
        break;

      case issueType.includes('performance') || issueType.includes('slow'):
        info = `Page Load Time: ${context.loadTimeMs ? `${context.loadTimeMs}ms` : 'N/A'}
Word Count: ${context.wordCount || 'N/A'}`;
        break;

      case issueType.includes('404'):
        info = `HTTP Status: ${context.statusCode ?? '404'}`;
        break;

      default:
        info = `Page Title: ${context.pageTitle || 'N/A'}
Meta Description: ${context.metaDescription || 'N/A'}
Word Count: ${context.wordCount || 'N/A'}`;
    }

    return info;
  }

  // Generate recommendation for a single issue
  async generateRecommendation(
    issue: Issue,
    context: IssueContext,
    cached: boolean = false
  ): Promise<AIRecommendation | null> {
    if (!this.isAvailable()) {
      console.warn('AI Recommendations service is not available');
      return null;
    }

    if (this.isDailyCostLimitReached()) {
      console.warn('Daily AI cost limit reached');
      return null;
    }

    try {
      await this.rateLimiter.waitForAvailability();

      const prompt = this.getPromptForIssue(issue, context);
      const response = await this.openai!.chat.completions.create({
        model: CONFIG.model,
        messages: [
          {
            role: 'system',
            content: 'You are an SEO expert who provides specific, actionable recommendations. Always respond with valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in AI response');
      }

      const parsed = JSON.parse(content);
      const inputTokens = response.usage?.prompt_tokens || 0;
      const outputTokens = response.usage?.completion_tokens || 0;
      const totalTokens = inputTokens + outputTokens;
      const cost = this.calculateCost(CONFIG.model, inputTokens, outputTokens);

      const recommendation: AIRecommendation = {
        id: crypto.randomUUID(),
        issueId: issue.id,
        recommendation: parsed.recommendation || '',
        actionableSteps: parsed.actionableSteps || [],
        priority: parsed.priority || 'medium',
        estimatedImpact: parsed.estimatedImpact || '',
        confidence: 0.85, // Default confidence
        model: CONFIG.model,
        tokensUsed: totalTokens,
        cost,
        cached,
        createdAt: new Date(),
      };

      this.rateLimiter.recordRequest(totalTokens);
      this.trackCost(recommendation);

      return recommendation;
    } catch (error) {
      console.error('Error generating AI recommendation:', error);
      return null;
    }
  }

  // Batch generate recommendations
  async generateBatchRecommendations(
    issues: Issue[],
    contexts: IssueContext[]
  ): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = [];

    for (let i = 0; i < issues.length; i++) {
      if (this.isDailyCostLimitReached()) {
        console.warn('Daily AI cost limit reached, stopping batch generation');
        break;
      }

      const recommendation = await this.generateRecommendation(issues[i], contexts[i]);
      if (recommendation) {
        recommendations.push(recommendation);
      }

      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return recommendations;
  }

  // Get cost for a recommendation
  getRecommendationCost(recommendation: AIRecommendation): number {
    return recommendation.cost;
  }

  // Get generic fallback recommendation for issue type
  getGenericRecommendation(issue: Issue): AIRecommendation {
    const genericRecommendations: Record<string, { recommendation: string; steps: string[] }> = {
      'missing-title': {
        recommendation: 'Add a descriptive, keyword-rich title tag to this page.',
        steps: [
          'Identify the main topic of the page',
          'Create a title that includes your primary keyword',
          'Keep the title between 50-60 characters',
          'Make it compelling to encourage clicks',
        ],
      },
      'missing-meta-description': {
        recommendation: 'Add a meta description that summarizes the page content.',
        steps: [
          'Write a concise summary of the page content',
          'Include relevant keywords naturally',
          'Keep it under 160 characters',
          'Add a call-to-action if appropriate',
        ],
      },
      'missing-h1': {
        recommendation: 'Add an H1 heading to clearly define the page topic.',
        steps: [
          'Add a single H1 tag near the top of the page',
          'Include your primary keyword in the H1',
          'Make it descriptive and user-friendly',
          'Ensure only one H1 tag exists on the page',
        ],
      },
      'multiple-h1': {
        recommendation: 'Consolidate multiple H1 tags into a single H1 tag.',
        steps: [
          'Identify the most important heading',
          'Change it to H1 if it is not already',
          'Change other H1s to H2 or H3',
          'Ensure the H1 accurately describes the page content',
        ],
      },
      'duplicate-content': {
        recommendation: 'Address duplicate content to avoid SEO issues.',
        steps: [
          'Identify which page is the canonical/original version',
          'Add canonical tags pointing to the original',
          'Rewrite or consolidate duplicate content',
          'Consider 301 redirects if pages serve the same purpose',
        ],
      },
      'broken-internal-link': {
        recommendation: 'Fix or remove broken internal links.',
        steps: [
          'Update the link URL to point to the correct page',
          'Or remove the link if the target page no longer exists',
          'Check for typos in the URL',
          'Update any redirects if the page was moved',
        ],
      },
      'missing-alt-text': {
        recommendation: 'Add descriptive alt text to all images.',
        steps: [
          'Describe the image content accurately',
          'Include keywords if relevant and natural',
          'Keep alt text concise (under 125 characters)',
          'Use empty alt for decorative images',
        ],
      },
      'slow-page-load': {
        recommendation: 'Optimize page load time for better user experience.',
        steps: [
          'Compress and optimize images',
          'Minify CSS and JavaScript',
          'Enable browser caching',
          'Consider using a CDN',
          'Reduce server response time',
        ],
      },
      'missing-canonical': {
        recommendation: 'Add a canonical tag to specify the preferred URL.',
        steps: [
          'Identify the canonical URL for this content',
          'Add a rel="canonical" link tag in the head',
          'Point it to the preferred version of the page',
          'Ensure the canonical URL is accessible',
        ],
      },
    };

    const generic = genericRecommendations[issue.issueType.toLowerCase()] || {
      recommendation: 'Review and address this SEO issue to improve your website performance.',
      steps: [
        'Analyze the specific issue on the page',
        'Refer to SEO best practices for this issue type',
        'Implement the recommended fix',
        'Test the fix to ensure it resolves the issue',
      ],
    };

    return {
      id: crypto.randomUUID(),
      issueId: issue.id,
      recommendation: generic.recommendation,
      actionableSteps: generic.steps,
      priority: issue.severity === 'CRITICAL' || issue.severity === 'HIGH' ? 'high' : 'medium',
      estimatedImpact: 'Improving this issue will enhance SEO performance and user experience.',
      confidence: 0.5,
      model: 'generic',
      tokensUsed: 0,
      cost: 0,
      cached: false,
      createdAt: new Date(),
    };
  }
}

// Singleton instance
let aiServiceInstance: AIRecommendationsService | null = null;

export function getAIService(): AIRecommendationsService {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIRecommendationsService();
  }
  return aiServiceInstance;
}

// Context hashing for cache keys
export function hashContext(context: IssueContext): string {
  const contextString = JSON.stringify(context);
  return crypto.createHash('sha256').update(contextString).digest('hex');
}

// Generate cache key
export function generateCacheKey(issueType: string, contextHash: string, modelVersion: string): string {
  return `${CONFIG.cachePrefix}${issueType}:${contextHash}:${modelVersion}`;
}
