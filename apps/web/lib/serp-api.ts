// SERP API Client with rate limiting and cost tracking
// Supports SerpAPI and mock data for development

export enum SerpFeature {
  FEATURED_SNIPPET = 'FEATURED_SNIPPET',
  LOCAL_PACK = 'LOCAL_PACK',
  KNOWLEDGE_PANEL = 'KNOWLEDGE_PANEL',
  IMAGE_PACK = 'IMAGE_PACK',
  VIDEO_PACK = 'VIDEO_PACK',
  PEOPLE_ALSO_ASK = 'PEOPLE_ALSO_ASK',
  RELATED_SEARCHES = 'RELATED_SEARCHES',
  TOP_STORIES = 'TOP_STORIES',
  SHOPPING_RESULTS = 'SHOPPING_RESULTS',
  SITELINKS = 'SITELINKS',
  REVIEWS = 'REVIEWS',
  RATING_STARS = 'RATING_STARS',
  FAQ_SCHEMA = 'FAQ_SCHEMA',
  EVENT_SCHEMA = 'EVENT_SCHEMA',
  PRODUCT_SCHEMA = 'PRODUCT_SCHEMA',
  RECIPE_SCHEMA = 'RECIPE_SCHEMA',
  HOW_TO_SCHEMA = 'HOW_TO_SCHEMA',
  JOB_LISTINGS = 'JOB_LISTINGS',
  FINANCE_BOX = 'FINANCE_BOX',
  CALCULATOR = 'CALCULATOR',
  CONVERTER = 'CONVERTER',
  FLIGHT_BOX = 'FLIGHT_BOX',
  HOTEL_PACK = 'HOTEL_PACK',
  NONE = 'NONE',
}

export interface SerpQuery {
  query: string;
  engine?: 'google' | 'bing' | 'yahoo';
  location?: string;
  language?: string;
  device?: 'desktop' | 'mobile' | 'tablet';
}

export interface SerpResult {
  // Query information
  query: string;
  engine: string;
  location: string;
  language: string;
  device: string;

  // Features detected
  features: SerpFeature[];

  // Organic results
  organicResults: Array<{
    position: number;
    title: string;
    link: string;
    snippet: string;
    displayedLink: string;
  }>;

  // Feature-specific data
  featuredSnippet?: {
    title: string;
    snippet: string;
    link: string;
    position: 'top' | 'middle' | 'bottom';
  };

  localPack?: {
    places: Array<{
      title: string;
      address: string;
      rating: number;
      reviews: number;
      link: string;
    }>;
    gpsCoordinates?: {
      latitude: number;
      longitude: number;
    };
  };

  knowledgePanel?: {
    title: string;
    description: string;
    imageUrl?: string;
    attributes: Record<string, string>;
  };

  imagePack?: {
    images: Array<{
      title: string;
      link: string;
      thumbnail: string;
    }>;
  };

  videoPack?: {
    videos: Array<{
      title: string;
      link: string;
      source: string;
      duration?: string;
    }>;
  };

  peopleAlsoAsk?: {
    questions: Array<{
      question: string;
      snippet: string;
      link: string;
    }>;
  };

  // Metadata
  searchTime: number;
  totalResults: number;
  apiCost: number;
  timestamp: Date;
}

// Rate limiter for API calls
class SerpRateLimiter {
  private maxRequestsPerMinute: number;
  private requests: Array<{ timestamp: number }> = [];

  constructor(maxRequestsPerMinute: number = 60) {
    this.maxRequestsPerMinute = maxRequestsPerMinute;
  }

  async acquire(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;

    // Remove old requests
    this.requests = this.requests.filter(r => r.timestamp > oneMinuteAgo);

    // Check if we've hit the limit
    if (this.requests.length >= this.maxRequestsPerMinute) {
      const oldestRequest = this.requests[0];
      const waitTime = oldestRequest.timestamp + 60 * 1000 - now;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.acquire();
    }

    this.requests.push({ timestamp: now });
  }

  getRequestsToday(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.requests.filter(r => r.timestamp >= today.getTime()).length;
  }

  getResetTime(): Date {
    if (this.requests.length === 0) return new Date();
    const oldestRequest = this.requests[0];
    return new Date(oldestRequest.timestamp + 60 * 1000);
  }
}

// Cost tracker for API usage
class SerpCostTracker {
  private maxCostPerDay: number;
  private costs: Array<{ timestamp: number; cost: number }> = [];

  constructor(maxCostPerDay: number = 10) {
    this.maxCostPerDay = maxCostPerDay;
  }

  async check(cost: number): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const costToday = this.costs
      .filter(c => c.timestamp >= today.getTime())
      .reduce((sum, c) => sum + c.cost, 0);

    if (costToday + cost > this.maxCostPerDay) {
      throw new Error(
        `Daily cost limit exceeded. Current: $${costToday.toFixed(2)}, Requested: $${cost.toFixed(2)}, Limit: $${this.maxCostPerDay.toFixed(2)}`
      );
    }
  }

  async record(cost: number): Promise<void> {
    this.costs.push({ timestamp: Date.now(), cost });
  }

  getCostToday(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.costs
      .filter(c => c.timestamp >= today.getTime())
      .reduce((sum, c) => sum + c.cost, 0);
  }

  getRemainingBudget(): number {
    return Math.max(0, this.maxCostPerDay - this.getCostToday());
  }
}

export class SerpApiClient {
  private apiKey: string;
  private provider: 'serpapi' | 'dataforseo' | 'mock';
  private rateLimiter: SerpRateLimiter;
  private costTracker: SerpCostTracker;

  constructor(config: {
    apiKey: string;
    provider?: 'serpapi' | 'dataforseo' | 'mock';
    maxRequestsPerMinute?: number;
    maxCostPerDay?: number;
  }) {
    this.apiKey = config.apiKey;
    this.provider = config.provider || 'mock';
    this.rateLimiter = new SerpRateLimiter(config.maxRequestsPerMinute || 60);
    this.costTracker = new SerpCostTracker(config.maxCostPerDay || 10);
  }

  async search(query: SerpQuery): Promise<SerpResult> {
    // Check rate limit
    await this.rateLimiter.acquire();

    // Check cost limit
    const estimatedCost = this.estimateCost(query);
    await this.costTracker.check(estimatedCost);

    try {
      let result: SerpResult;

      if (this.provider === 'serpapi') {
        result = await this.searchSerpApi(query);
      } else if (this.provider === 'dataforseo') {
        result = await this.searchDataForSEO(query);
      } else {
        result = getMockSerpResult(query.query);
      }

      // Track actual cost
      await this.costTracker.record(result.apiCost);

      return result;
    } catch (error) {
      // Retry logic
      if (this.shouldRetry(error)) {
        await this.delay(1000);
        return this.search(query);
      }
      throw error;
    }
  }

  private async searchSerpApi(query: SerpQuery): Promise<SerpResult> {
    const url = new URL('https://serpapi.com/search');
    url.searchParams.append('api_key', this.apiKey);
    url.searchParams.append('q', query.query);
    url.searchParams.append('engine', query.engine || 'google');
    url.searchParams.append('location', query.location || 'United States');
    url.searchParams.append('hl', query.language || 'en');
    url.searchParams.append('device', query.device || 'desktop');

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`SerpAPI error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return this.parseSerpApiResponse(data);
  }

  private parseSerpApiResponse(data: any): SerpResult {
    const features: SerpFeature[] = [];

    // Detect features
    if (data.answer_box) features.push(SerpFeature.FEATURED_SNIPPET);
    if (data.local_results) features.push(SerpFeature.LOCAL_PACK);
    if (data.knowledge_graph) features.push(SerpFeature.KNOWLEDGE_PANEL);
    if (data.images) features.push(SerpFeature.IMAGE_PACK);
    if (data.videos) features.push(SerpFeature.VIDEO_PACK);
    if (data.related_questions) features.push(SerpFeature.PEOPLE_ALSO_ASK);
    if (data.related_searches) features.push(SerpFeature.RELATED_SEARCHES);
    if (data.top_stories) features.push(SerpFeature.TOP_STORIES);
    if (data.shopping_results) features.push(SerpFeature.SHOPPING_RESULTS);

    return {
      query: data.search_parameters?.q || '',
      engine: data.search_parameters?.engine || 'google',
      location: data.search_parameters?.location || 'United States',
      language: data.search_parameters?.hl || 'en',
      device: data.search_parameters?.device || 'desktop',
      features,
      organicResults: (data.organic_results || []).map((r: any, i: number) => ({
        position: i + 1,
        title: r.title,
        link: r.link,
        snippet: r.snippet,
        displayedLink: r.displayed_link,
      })),
      featuredSnippet: data.answer_box
        ? {
            title: data.answer_box.title,
            snippet: data.answer_box.snippet,
            link: data.answer_box.link,
            position: 'top',
          }
        : undefined,
      localPack: data.local_results
        ? {
            places: data.local_results.map((p: any) => ({
              title: p.title,
              address: p.address,
              rating: p.rating,
              reviews: p.reviews,
              link: p.links?.website,
            })),
            gpsCoordinates: data.local_results[0]?.gps_coordinates,
          }
        : undefined,
      knowledgePanel: data.knowledge_graph
        ? {
            title: data.knowledge_graph.title,
            description: data.knowledge_graph.description,
            imageUrl: data.knowledge_graph.image,
            attributes: data.knowledge_graph.attributes || {},
          }
        : undefined,
      imagePack: data.images
        ? {
            images: data.images.slice(0, 10).map((i: any) => ({
              title: i.title,
              link: i.link,
              thumbnail: i.thumbnail,
            })),
          }
        : undefined,
      videoPack: data.videos
        ? {
            videos: data.videos.slice(0, 10).map((v: any) => ({
              title: v.title,
              link: v.link,
              source: v.source,
              duration: v.duration,
            })),
          }
        : undefined,
      peopleAlsoAsk: data.related_questions
        ? {
            questions: data.related_questions.map((q: any) => ({
              question: q.question,
              snippet: q.snippet,
              link: q.link,
            })),
          }
        : undefined,
      searchTime: data.search_metadata?.total_time_taken || 0,
      totalResults: data.search_information?.total_results || 0,
      apiCost: this.calculateSerpApiCost(data),
      timestamp: new Date(),
    };
  }

  private async searchDataForSEO(query: SerpQuery): Promise<SerpResult> {
    // DataForSEO implementation would go here
    // For now, fall back to mock data
    return getMockSerpResult(query.query);
  }

  private estimateCost(query: SerpQuery): number {
    // SerpAPI: $0.0025 per search (basic plan)
    // DataForSEO: $0.001 per search (volume pricing)
    if (this.provider === 'serpapi') {
      return 0.0025;
    }
    if (this.provider === 'dataforseo') {
      return 0.001;
    }
    return 0; // Mock is free
  }

  private calculateSerpApiCost(data: any): number {
    return this.estimateCost({} as SerpQuery);
  }

  private shouldRetry(error: any): boolean {
    // Retry on rate limit errors or temporary failures
    return (
      error?.status === 429 ||
      error?.status === 503 ||
      error?.code === 'ECONNRESET' ||
      error?.message?.includes('rate limit')
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get current usage statistics
  async getUsageStats() {
    return {
      requestsToday: this.rateLimiter.getRequestsToday(),
      costToday: this.costTracker.getCostToday(),
      remainingBudget: this.costTracker.getRemainingBudget(),
      rateLimitReset: this.rateLimiter.getResetTime(),
    };
  }
}

// Export singleton instance
let serpApiClient: SerpApiClient | null = null;

export function getSerpApiClient(): SerpApiClient {
  if (!serpApiClient) {
    const apiKey = process.env.SERPAPI_API_KEY || process.env.DATAFORSEO_API_KEY || 'mock';
    const provider = process.env.SERP_API_PROVIDER as 'serpapi' | 'dataforseo' | 'mock' || 'mock';

    serpApiClient = new SerpApiClient({
      apiKey,
      provider,
      maxRequestsPerMinute: parseInt(process.env.SERP_RATE_LIMIT || '60'),
      maxCostPerDay: parseFloat(process.env.SERP_DAILY_COST_LIMIT || '10'),
    });
  }

  return serpApiClient;
}

// Mock data for development/testing
export function getMockSerpResult(query: string): SerpResult {
  return {
    query,
    engine: 'google',
    location: 'United States',
    language: 'en',
    device: 'desktop',
    features: [
      SerpFeature.FEATURED_SNIPPET,
      SerpFeature.PEOPLE_ALSO_ASK,
      SerpFeature.RELATED_SEARCHES,
    ],
    organicResults: [
      {
        position: 1,
        title: `Result for ${query}`,
        link: 'https://example.com/page1',
        snippet: 'This is a sample snippet for the search result.',
        displayedLink: 'example.com › page1',
      },
      {
        position: 2,
        title: `Another Result for ${query}`,
        link: 'https://example.com/page2',
        snippet: 'Another sample snippet with different content.',
        displayedLink: 'example.com › page2',
      },
    ],
    featuredSnippet: {
      title: `Featured Snippet: ${query}`,
      snippet: 'This is the featured snippet content that appears at the top of search results.',
      link: 'https://example.com/featured',
      position: 'top',
    },
    peopleAlsoAsk: {
      questions: [
        {
          question: `What is ${query}?`,
          snippet: 'Answer to the first related question.',
          link: 'https://example.com/q1',
        },
        {
          question: `How does ${query} work?`,
          snippet: 'Answer to the second related question.',
          link: 'https://example.com/q2',
        },
      ],
    },
    searchTime: 0.45,
    totalResults: 1250000,
    apiCost: 0,
    timestamp: new Date(),
  };
}
