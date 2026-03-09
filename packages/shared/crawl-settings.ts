import { CrawlSettings } from './types'

export const DEFAULT_CRAWL_SETTINGS: CrawlSettings = {
  maxPages: 500,
  maxDepth: 5,
  concurrency: 5,
  timeout: 10000,
  respectRobots: true,
  securityAudit: false,
  allowlist: [],
  denylist: [],
  excludeExtensions: ['.pdf', '.zip', '.exe', '.jpg', '.png', '.gif'],
}

export function validateCrawlSettings(settings: Partial<CrawlSettings>): CrawlSettings {
  const validated: CrawlSettings = {
    ...DEFAULT_CRAWL_SETTINGS,
    ...settings,
  }

  if (validated.maxPages < 1 || validated.maxPages > 10000) {
    validated.maxPages = DEFAULT_CRAWL_SETTINGS.maxPages
  }

  if (validated.maxDepth < 1 || validated.maxDepth > 20) {
    validated.maxDepth = DEFAULT_CRAWL_SETTINGS.maxDepth
  }

  if (validated.concurrency < 1 || validated.concurrency > 20) {
    validated.concurrency = DEFAULT_CRAWL_SETTINGS.concurrency
  }

  if (validated.timeout < 1000 || validated.timeout > 60000) {
    validated.timeout = DEFAULT_CRAWL_SETTINGS.timeout
  }

  validated.excludeExtensions = validated.excludeExtensions || DEFAULT_CRAWL_SETTINGS.excludeExtensions

  return validated
}

export function parseSettingsJson(json: string | null | undefined): CrawlSettings {
  if (!json) return { ...DEFAULT_CRAWL_SETTINGS }
  
  try {
    const parsed = JSON.parse(json)
    return validateCrawlSettings(parsed)
  } catch {
    return { ...DEFAULT_CRAWL_SETTINGS }
  }
}
