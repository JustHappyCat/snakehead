export declare function normalizeUrl(url: string, baseUrl?: string): string;
/**
 * Generate a hash for URL for indexing and deduplication
 */
export declare function urlHash(url: string): string;
/**
 * Check if URL is valid
 */
export declare function isValidUrl(url: string): boolean;
/**
 * Check if URL is internal to the same domain
 */
export declare function isInternalUrl(url: string, baseUrl: string): boolean;
/**
 * Extract domain from URL
 */
export declare function getDomain(url: string): string;
export declare function shouldCrawlUrl(url: string, excludeExtensions?: string[]): boolean;
