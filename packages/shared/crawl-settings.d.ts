import { CrawlSettings } from './types';
export declare const DEFAULT_CRAWL_SETTINGS: CrawlSettings;
export declare function validateCrawlSettings(settings: Partial<CrawlSettings>): CrawlSettings;
export declare function parseSettingsJson(json: string | null | undefined): CrawlSettings;
