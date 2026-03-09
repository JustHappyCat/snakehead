// SERP Response Parser - Parse SERP responses and extract actionable insights
import { SerpResult, SerpFeature } from './serp-api';

export { SerpFeature };

export interface ParsedSerpData {
  // Basic info
  query: string;
  features: SerpFeature[];

  // Page position
  pagePosition?: number;
  isFeaturedSnippet: boolean;
  isTopResult: boolean;

  // Feature details
  featuredSnippet?: FeaturedSnippetData;
  localPack?: LocalPackData;
  knowledgePanel?: KnowledgePanelData;

  // Competitors
  competitors: CompetitorData[];

  // Opportunities
  opportunities: SerpOpportunity[];
}

export interface FeaturedSnippetData {
  type: 'paragraph' | 'list' | 'table';
  title: string;
  content: string;
  sourceUrl: string;
  position: 'top' | 'middle' | 'bottom';
  wordCount: number;
  hasStructuredData: boolean;
}

export interface LocalPackData {
  businessCount: number;
  topBusinesses: Array<{
    name: string;
    rating: number;
    reviewCount: number;
    address: string;
  }>;
  requiresGoogleBusinessProfile: boolean;
}

export interface KnowledgePanelData {
  entityName: string;
  entityType: string;
  description: string;
  hasImage: boolean;
  attributes: Record<string, string>;
  source: string;
}

export interface CompetitorData {
  position: number;
  domain: string;
  url: string;
  title: string;
  features: SerpFeature[];
  gapAnalysis?: {
    contentGap: string[];
    technicalGap: string[];
    authorityGap: string[];
  };
}

export interface SerpOpportunity {
  type: 'snippet' | 'local' | 'images' | 'videos' | 'faq' | 'schema';
  priority: 'high' | 'medium' | 'low';
  description: string;
  estimatedEffort: 'low' | 'medium' | 'high';
  potentialImpact: 'high' | 'medium' | 'low';
  actionItems: string[];
}

export class SerpParser {
  /**
   * Parse SERP result and extract actionable insights
   */
  parse(serpResult: SerpResult, pageUrl?: string): ParsedSerpData {
    const pagePosition = this.findPagePosition(serpResult, pageUrl);

    return {
      query: serpResult.query,
      features: serpResult.features,
      pagePosition,
      isFeaturedSnippet: !!serpResult.featuredSnippet?.link?.includes(pageUrl || ''),
      isTopResult: (pagePosition || 999) <= 3,
      featuredSnippet: this.parseFeaturedSnippet(serpResult),
      localPack: this.parseLocalPack(serpResult),
      knowledgePanel: this.parseKnowledgePanel(serpResult),
      competitors: this.parseCompetitors(serpResult, pageUrl),
      opportunities: this.identifyOpportunities(serpResult, pageUrl),
    };
  }

  /**
   * Find the position of a specific page in SERP
   */
  private findPagePosition(serpResult: SerpResult, pageUrl?: string): number | undefined {
    if (!pageUrl) return undefined;

    const result = serpResult.organicResults.find(
      r => r.link === pageUrl || r.link.startsWith(pageUrl)
    );

    return result?.position;
  }

  /**
   * Parse featured snippet data
   */
  private parseFeaturedSnippet(serpResult: SerpResult): FeaturedSnippetData | undefined {
    if (!serpResult.featuredSnippet) return undefined;

    const snippet = serpResult.featuredSnippet;
    const content = snippet.snippet;

    return {
      type: this.detectSnippetType(content),
      title: snippet.title,
      content,
      sourceUrl: snippet.link,
      position: snippet.position,
      wordCount: content.split(/\s+/).length,
      hasStructuredData: this.detectStructuredData(content),
    };
  }

  /**
   * Detect snippet type (paragraph, list, or table)
   */
  private detectSnippetType(content: string): 'paragraph' | 'list' | 'table' {
    // Check for list patterns
    if (/^[\d\-\*]\s+/m.test(content)) {
      return 'list';
    }

    // Check for table patterns
    if (content.includes('|') && content.split('\n').length > 2) {
      return 'table';
    }

    return 'paragraph';
  }

  /**
   * Detect if content has structured data patterns
   */
  private detectStructuredData(content: string): boolean {
    const patterns = [
      /step\s+\d+/i,
      /first,?\s*(then|next|after)/i,
      /\d+\.\s+[A-Z]/,
      /definition:/i,
    ];

    return patterns.some(p => p.test(content));
  }

  /**
   * Parse local pack data
   */
  private parseLocalPack(serpResult: SerpResult): LocalPackData | undefined {
    if (!serpResult.localPack) return undefined;

    return {
      businessCount: serpResult.localPack.places.length,
      topBusinesses: serpResult.localPack.places.slice(0, 3).map(p => ({
        name: p.title,
        rating: p.rating,
        reviewCount: p.reviews,
        address: p.address,
      })),
      requiresGoogleBusinessProfile: true,
    };
  }

  /**
   * Parse knowledge panel data
   */
  private parseKnowledgePanel(serpResult: SerpResult): KnowledgePanelData | undefined {
    if (!serpResult.knowledgePanel) return undefined;

    const kp = serpResult.knowledgePanel;

return {
      entityName: kp.title,
      entityType: this.inferEntityType(kp as any),
      description: kp.description,
      hasImage: !!kp.imageUrl,
      attributes: kp.attributes,
      source: 'google',
    };
  }

  /**
   * Infer entity type from knowledge panel data
   */
  private inferEntityType(kp: KnowledgePanelData): string {
    const attrs = Object.keys(kp.attributes);

    if (attrs.includes('Founded')) return 'Company';
    if (attrs.includes('Born')) return 'Person';
    if (attrs.includes('Genre')) return 'Artist/Musician';
    if (attrs.includes('Height')) return 'Person';
    if (attrs.includes('Headquarters')) return 'Organization';

    return 'Entity';
  }

  /**
   * Parse competitor data
   */
  private parseCompetitors(serpResult: SerpResult, pageUrl?: string): CompetitorData[] {
    return serpResult.organicResults
      .filter(r => !pageUrl || !r.link.includes(pageUrl))
      .slice(0, 10)
      .map(r => ({
        position: r.position,
        domain: this.extractDomain(r.link),
        url: r.link,
        title: r.title,
        features: [],
      }));
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  }

  /**
   * Identify SERP opportunities
   */
  private identifyOpportunities(serpResult: SerpResult, pageUrl?: string): SerpOpportunity[] {
    const opportunities: SerpOpportunity[] = [];
    const pagePosition = this.findPagePosition(serpResult, pageUrl);

    // Featured snippet opportunity
    if (serpResult.featuredSnippet && !serpResult.featuredSnippet.link?.includes(pageUrl || '')) {
      opportunities.push({
        type: 'snippet',
        priority: 'high',
        description: 'Featured snippet is available but your page is not featured',
        estimatedEffort: this.estimateSnippetEffort(serpResult.featuredSnippet),
        potentialImpact: 'high',
        actionItems: this.getSnippetActionItems(serpResult.featuredSnippet),
      });
    }

    // Local pack opportunity
    if (serpResult.localPack) {
      opportunities.push({
        type: 'local',
        priority: pagePosition && pagePosition <= 10 ? 'high' : 'medium',
        description: 'Local pack is present for this query',
        estimatedEffort: 'medium',
        potentialImpact: 'high',
        actionItems: [
          'Create or optimize Google Business Profile',
          'Add local business schema markup',
          'Ensure NAP consistency across the web',
          'Collect and respond to customer reviews',
        ],
      });
    }

    // Image pack opportunity
    if (serpResult.imagePack) {
      opportunities.push({
        type: 'images',
        priority: 'medium',
        description: 'Image pack appears in SERP',
        estimatedEffort: 'low',
        potentialImpact: 'medium',
        actionItems: [
          'Add relevant, high-quality images',
          'Optimize image alt text',
          'Use descriptive file names',
          'Implement image schema markup',
        ],
      });
    }

    // Video pack opportunity
    if (serpResult.videoPack) {
      opportunities.push({
        type: 'videos',
        priority: 'medium',
        description: 'Video pack appears in SERP',
        estimatedEffort: 'high',
        potentialImpact: 'medium',
        actionItems: [
          'Create video content for this topic',
          'Optimize video titles and descriptions',
          'Add video schema markup',
          'Embed relevant videos on the page',
        ],
      });
    }

    // FAQ opportunity
    if (serpResult.peopleAlsoAsk && serpResult.peopleAlsoAsk.questions.length > 0) {
      opportunities.push({
        type: 'faq',
        priority: 'high',
        description: 'People Also Ask section present',
        estimatedEffort: 'medium',
        potentialImpact: 'high',
        actionItems: [
          'Add FAQ section to page',
          'Implement FAQ schema markup',
          'Answer questions from People Also Ask',
          'Structure answers in Q&A format',
        ],
      });
    }

    // Schema markup opportunities
    const schemaOpportunities = this.identifySchemaOpportunities(serpResult);
    opportunities.push(...schemaOpportunities);

    return opportunities.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Estimate effort to target featured snippet
   */
  private estimateSnippetEffort(snippet: any): 'low' | 'medium' | 'high' {
    if (snippet.type === 'paragraph') return 'low';
    if (snippet.type === 'list') return 'medium';
    return 'high';
  }

  /**
   * Get action items for featured snippet
   */
  private getSnippetActionItems(snippet: any): string[] {
    const actions: string[] = [];

    actions.push('Analyze current featured snippet structure');

    if (snippet.type === 'paragraph') {
      actions.push('Create clear, concise answer (40-60 words)');
      actions.push('Place answer at top of content');
    } else if (snippet.type === 'list') {
      actions.push('Format as ordered or unordered list');
      actions.push('Include 4-8 items in the list');
    } else if (snippet.type === 'table') {
      actions.push('Format data as HTML table');
      actions.push('Include clear headers');
    }

    actions.push('Add relevant schema markup');
    actions.push('Ensure content directly answers the query');

    return actions;
  }

  /**
   * Identify schema markup opportunities
   */
  private identifySchemaOpportunities(serpResult: SerpResult): SerpOpportunity[] {
    const opportunities: SerpOpportunity[] = [];

    // Check for recipe opportunity
    if (this.isRecipeQuery(serpResult.query)) {
      opportunities.push({
        type: 'schema',
        priority: 'medium',
        description: 'Recipe schema recommended for this query',
        estimatedEffort: 'medium',
        potentialImpact: 'high',
        actionItems: [
          'Add Recipe schema markup',
          'Include cooking time, ingredients, nutrition info',
          'Add recipe images',
        ],
      });
    }

    // Check for product opportunity
    if (this.isProductQuery(serpResult.query)) {
      opportunities.push({
        type: 'schema',
        priority: 'high',
        description: 'Product schema recommended for this query',
        estimatedEffort: 'medium',
        potentialImpact: 'high',
        actionItems: [
          'Add Product schema markup',
          'Include price, availability, reviews',
          'Add aggregate rating schema',
        ],
      });
    }

    // Check for FAQ opportunity
    if (serpResult.peopleAlsoAsk) {
      opportunities.push({
        type: 'schema',
        priority: 'high',
        description: 'FAQ schema recommended',
        estimatedEffort: 'low',
        potentialImpact: 'high',
        actionItems: [
          'Add FAQPage schema markup',
          'Include questions from People Also Ask',
        ],
      });
    }

    return opportunities;
  }

  /**
   * Check if query is recipe-related
   */
  private isRecipeQuery(query: string): boolean {
    const recipeKeywords = ['recipe', 'how to cook', 'how to make', 'ingredients', 'bake', 'cook'];
    return recipeKeywords.some(kw => query.toLowerCase().includes(kw));
  }

  /**
   * Check if query is product-related
   */
  private isProductQuery(query: string): boolean {
    const productKeywords = ['buy', 'price', 'cheap', 'best', 'review', 'vs', 'compare'];
    return productKeywords.some(kw => query.toLowerCase().includes(kw));
  }

  /**
   * Generate SERP summary
   */
  generateSummary(parsedData: ParsedSerpData): string {
    const parts: string[] = [];

    parts.push(`Query: "${parsedData.query}"`);
    parts.push(`Features: ${parsedData.features.length} detected`);

    if (parsedData.pagePosition) {
      parts.push(`Position: ${parsedData.pagePosition}`);
    } else {
      parts.push('Position: Not found in top results');
    }

    if (parsedData.isFeaturedSnippet) {
      parts.push('✓ Featured snippet captured');
    }

    if (parsedData.opportunities.length > 0) {
      parts.push(`Opportunities: ${parsedData.opportunities.length} identified`);
    }

    return parts.join(' | ');
  }
}

// Export singleton instance
const serpParser = new SerpParser();
export default serpParser;
