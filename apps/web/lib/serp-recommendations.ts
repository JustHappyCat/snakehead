// SERP Optimization Recommendations - Generate actionable SEO recommendations based on SERP data
import { ParsedSerpData, SerpOpportunity, SerpFeature } from './serp-parser';

export interface SerpRecommendation {
  id: string;
  type: 'content' | 'technical' | 'off-page' | 'schema';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionItems: string[];
  expectedImpact: string;
  estimatedEffort: 'quick' | 'moderate' | 'significant';
  resources?: string[];
}

export class SerpRecommendationEngine {
  /**
   * Generate recommendations based on parsed SERP data
   */
  generateRecommendations(parsedData: ParsedSerpData): SerpRecommendation[] {
    const recommendations: SerpRecommendation[] = [];

    // Featured snippet recommendations
    if (parsedData.featuredSnippet) {
      recommendations.push(...this.getFeaturedSnippetRecommendations(parsedData));
    }

    // Local pack recommendations
    if (parsedData.localPack) {
      recommendations.push(...this.getLocalPackRecommendations(parsedData));
    }

    // Knowledge panel recommendations
    if (parsedData.knowledgePanel) {
      recommendations.push(...this.getKnowledgePanelRecommendations(parsedData));
    }

    // Position-based recommendations
    if (parsedData.pagePosition && parsedData.pagePosition > 3) {
      recommendations.push(...this.getPositionImprovementRecommendations(parsedData));
    }

    // Not found recommendations
    if (!parsedData.pagePosition) {
      recommendations.push(...this.getNotInSerpRecommendations(parsedData));
    }

    // Schema recommendations
    recommendations.push(...this.getSchemaRecommendations(parsedData));

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Get featured snippet recommendations
   */
  private getFeaturedSnippetRecommendations(parsedData: ParsedSerpData): SerpRecommendation[] {
    const recs: SerpRecommendation[] = [];

    if (!parsedData.isFeaturedSnippet) {
      recs.push({
        id: 'snippet-capture',
        type: 'content',
        priority: 'high',
        title: 'Capture the Featured Snippet',
        description: 'Your page is not currently featured in the snippet. Optimize your content to target this position-zero result.',
        actionItems: [
          'Analyze the current featured snippet structure and format',
          parsedData.featuredSnippet?.type === 'paragraph'
            ? 'Write a clear, direct answer (40-60 words) at the top of your content'
            : parsedData.featuredSnippet?.type === 'list'
            ? 'Format your answer as a bulleted or numbered list with 4-8 items'
            : 'Format your data as a clear HTML table with headers',
          'Place the answer prominently near the top of the page',
          'Use the same heading style (H2 or H3) as the current snippet',
          'Include the exact query or close variations in your heading',
          'Add FAQ schema markup for question-based queries',
          'Ensure your answer is more comprehensive than the current snippet',
        ],
        expectedImpact: 'Featured snippets can increase CTR by 20-30% and drive significant traffic',
        estimatedEffort: 'moderate',
        resources: [
          'https://developers.google.com/search/docs/appearance/featured-snippets',
          'https://ahrefs.com/blog/featured-snippets/',
        ],
      });
    }

    return recs;
  }

  /**
   * Get local pack recommendations
   */
  private getLocalPackRecommendations(parsedData: ParsedSerpData): SerpRecommendation[] {
    const recs: SerpRecommendation[] = [];

    recs.push({
      id: 'local-pack-optimization',
      type: 'off-page',
      priority: 'high',
      title: 'Optimize for Local Pack Results',
      description: 'A local pack appears for this query. Optimize your local presence to appear in these results.',
      actionItems: [
        'Create or claim your Google Business Profile',
        'Ensure NAP (Name, Address, Phone) is consistent across all platforms',
        'Add high-quality photos to your business profile',
        'Collect and respond to customer reviews (aim for 4.5+ stars)',
        'Add local business schema markup to your website',
        'Create location-specific pages if you have multiple locations',
        'Build local citations on relevant directories',
        'Get backlinks from local businesses and organizations',
      ],
      expectedImpact: 'Local pack results appear above organic results and can drive significant local traffic',
      estimatedEffort: 'significant',
      resources: [
        'https://developers.google.com/search/docs/appearance/local-structured-data',
        'https://www.google.com/business/',
      ],
    });

    return recs;
  }

  /**
   * Get knowledge panel recommendations
   */
  private getKnowledgePanelRecommendations(parsedData: ParsedSerpData): SerpRecommendation[] {
    const recs: SerpRecommendation[] = [];

    recs.push({
      id: 'knowledge-panel',
      type: 'off-page',
      priority: 'medium',
      title: 'Establish Knowledge Panel Presence',
      description: 'A knowledge panel appears for this entity. Build authority to potentially appear in or influence this panel.',
      actionItems: [
        'Create a Wikipedia page if notable enough',
        'Add structured data (Organization, Person, or other relevant schema)',
        'Build authoritative backlinks from trusted sources',
        'Ensure consistent entity information across the web',
        'Create a dedicated "About" page with comprehensive information',
        'Get mentioned in news articles and industry publications',
        'Maintain active social media profiles with consistent branding',
      ],
      expectedImpact: 'Knowledge panels establish brand authority and trust',
      estimatedEffort: 'significant',
      resources: [
        'https://developers.google.com/search/docs/appearance/knowledge-panel',
      ],
    });

    return recs;
  }

  /**
   * Get position improvement recommendations
   */
  private getPositionImprovementRecommendations(parsedData: ParsedSerpData): SerpRecommendation[] {
    const recs: SerpRecommendation[] = [];
    const position = parsedData.pagePosition!;

    if (position > 10) {
      recs.push({
        id: 'improve-ranking',
        type: 'content',
        priority: 'high',
        title: 'Improve Page Ranking',
        description: `Your page is currently at position ${position}. Focus on improving content quality and authority.`,
        actionItems: [
          'Conduct a content gap analysis against top-ranking pages',
          'Add more depth and comprehensive coverage of the topic',
          'Update statistics and data with current information',
          'Improve page load speed (target under 2 seconds)',
          'Build high-quality backlinks from relevant, authoritative sites',
          'Improve internal linking to this page',
          'Add multimedia content (images, videos, infographics)',
          'Optimize meta title and description for click-through rate',
          'Improve content readability and structure',
        ],
        expectedImpact: 'Moving to the first page can increase traffic by 10x or more',
        estimatedEffort: 'significant',
      });
    } else if (position > 3) {
      recs.push({
        id: 'reach-top-3',
        type: 'content',
        priority: 'high',
        title: 'Reach Top 3 Positions',
        description: `Your page is at position ${position}. Small improvements could push you into the top 3.`,
        actionItems: [
          'Analyze top 3 results and identify gaps',
          'Add unique insights or data not covered by competitors',
          'Improve content freshness with recent updates',
          'Optimize for featured snippet if applicable',
          'Improve page experience metrics (Core Web Vitals)',
          'Add relevant internal and external links',
          'Enhance meta description for better CTR',
        ],
        expectedImpact: 'Top 3 positions receive the majority of clicks',
        estimatedEffort: 'moderate',
      });
    }

    return recs;
  }

  /**
   * Get recommendations for pages not in SERP
   */
  private getNotInSerpRecommendations(parsedData: ParsedSerpData): SerpRecommendation[] {
    const recs: SerpRecommendation[] = [];

    recs.push({
      id: 'not-in-serp',
      type: 'technical',
      priority: 'critical',
      title: 'Page Not Found in SERP',
      description: 'Your page is not ranking for this query. Investigate and fix potential issues.',
      actionItems: [
        'Verify the page is indexed (check using site: query)',
        'Check for crawl errors in Google Search Console',
        'Review for manual actions or penalties',
        'Ensure the page content matches the search intent',
        'Check if the page is affected by canonicalization issues',
        'Review for keyword cannibalization with other pages',
        'Verify the page has sufficient authority and backlinks',
        'Consider if the query is relevant to your page content',
        'Check for technical SEO issues (noindex, robots.txt, etc.)',
      ],
      expectedImpact: 'Essential for any organic traffic from this query',
      estimatedEffort: 'moderate',
      resources: [
        'https://developers.google.com/search/docs/crawling-indexing/sitemaps',
        'https://developers.google.com/search/docs/crawling-indexing/robots-txt',
      ],
    });

    return recs;
  }

  /**
   * Get schema markup recommendations
   */
  private getSchemaRecommendations(parsedData: ParsedSerpData): SerpRecommendation[] {
    const recs: SerpRecommendation[] = [];

    // FAQ schema
    if (parsedData.features.includes(SerpFeature.PEOPLE_ALSO_ASK)) {
      recs.push({
        id: 'faq-schema',
        type: 'schema',
        priority: 'high',
        title: 'Add FAQ Schema Markup',
        description: 'People Also Ask appears for this query. Add FAQ schema to potentially appear in this section.',
        actionItems: [
          'Identify common questions from the People Also Ask section',
          'Create an FAQ section on your page with these questions',
          'Implement FAQPage schema markup',
          'Ensure answers are clear and concise',
          'Include 3-6 FAQ items for best results',
        ],
        expectedImpact: 'FAQ schema can help your content appear in People Also Ask and rich results',
        estimatedEffort: 'quick',
        resources: [
          'https://schema.org/FAQPage',
          'https://developers.google.com/search/docs/appearance/structured-data/faqpage',
        ],
      });
    }

    // Article schema
    recs.push({
      id: 'article-schema',
      type: 'schema',
      priority: 'medium',
      title: 'Add Article Schema Markup',
      description: 'Implement Article schema to enhance your appearance in search results.',
      actionItems: [
        'Add Article, NewsArticle, or BlogPosting schema',
        'Include author information',
        'Add publish date and last modified date',
        'Include headline and description',
        'Add thumbnail image if available',
      ],
      expectedImpact: 'Article schema can improve appearance in search results and Top Stories',
      estimatedEffort: 'quick',
      resources: [
        'https://schema.org/Article',
        'https://developers.google.com/search/docs/appearance/structured-data/article',
      ],
    });

    // Breadcrumb schema
    recs.push({
      id: 'breadcrumb-schema',
      type: 'schema',
      priority: 'medium',
      title: 'Add Breadcrumb Schema Markup',
      description: 'Implement BreadcrumbList schema for better navigation display in SERP.',
      actionItems: [
        'Add BreadcrumbList schema markup',
        'Include position, name, and URL for each breadcrumb',
        'Ensure breadcrumbs match site navigation',
      ],
      expectedImpact: 'Breadcrumbs improve user experience and can appear in search results',
      estimatedEffort: 'quick',
      resources: [
        'https://schema.org/BreadcrumbList',
        'https://developers.google.com/search/docs/appearance/structured-data/breadcrumb',
      ],
    });

    return recs;
  }

  /**
   * Get recommendations based on opportunities
   */
  getOpportunityRecommendations(opportunities: SerpOpportunity[]): SerpRecommendation[] {
    return opportunities.map((opp, index) => ({
      id: `opp-${index}`,
      type: this.mapOpportunityTypeToRecType(opp.type),
      priority: this.mapPriority(opp.priority),
      title: this.generateTitle(opp),
      description: opp.description,
      actionItems: opp.actionItems,
      expectedImpact: this.generateImpactText(opp),
      estimatedEffort: this.mapEffort(opp.estimatedEffort),
    }));
  }

  private mapOpportunityTypeToRecType(type: string): 'content' | 'technical' | 'off-page' | 'schema' {
    const typeMap: Record<string, 'content' | 'technical' | 'off-page' | 'schema'> = {
      snippet: 'content',
      local: 'off-page',
      images: 'content',
      videos: 'content',
      faq: 'content',
      schema: 'schema',
    };
    return typeMap[type] || 'content';
  }

  private mapPriority(priority: string): 'critical' | 'high' | 'medium' | 'low' {
    if (priority === 'high') return 'high';
    if (priority === 'medium') return 'medium';
    return 'low';
  }

  private generateTitle(opp: SerpOpportunity): string {
    const titles: Record<string, string> = {
      snippet: 'Target Featured Snippet',
      local: 'Optimize for Local Pack',
      images: 'Add Image Optimization',
      videos: 'Create Video Content',
      faq: 'Add FAQ Section',
      schema: 'Implement Schema Markup',
    };
    return titles[opp.type] || 'SERP Opportunity';
  }

  private generateImpactText(opp: SerpOpportunity): string {
    return `${opp.potentialImpact} impact with ${opp.estimatedEffort} effort`;
  }

  private mapEffort(effort: string): 'quick' | 'moderate' | 'significant' {
    if (effort === 'low') return 'quick';
    if (effort === 'medium') return 'moderate';
    return 'significant';
  }
}

// Export singleton instance
const recommendationEngine = new SerpRecommendationEngine();
export default recommendationEngine;
