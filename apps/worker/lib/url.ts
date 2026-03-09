type CrawlSettings = {
  maxPages: number
  maxDepth: number
  concurrency: number
  timeout: number
  respectRobots: boolean
  allowlist?: string[]
  denylist?: string[]
  excludeExtensions?: string[]
}

const UTM_PARAMETERS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
]

export function normalizeUrl(url: string, baseUrl?: string): string {
  try {
    let absoluteUrl = url
    
    if (baseUrl && !url.startsWith('http')) {
      absoluteUrl = new URL(url, baseUrl).href
    } else {
      absoluteUrl = url
    }
    
    const parsedUrl = new URL(absoluteUrl)
    
    parsedUrl.hash = ''
    
    parsedUrl.pathname = parsedUrl.pathname.replace(/\/$/, '') || '/'
    
    const searchParams = new URLSearchParams(parsedUrl.search)
    
    for (const param of UTM_PARAMETERS) {
      searchParams.delete(param.toLowerCase())
      searchParams.delete(param.toUpperCase())
    }
    
    parsedUrl.search = searchParams.toString().toLowerCase()
    
    return parsedUrl.href
  } catch {
    return url
  }
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function isInternalUrl(url: string, baseUrl: string): boolean {
  try {
    const parsedUrl = new URL(url)
    const parsedBase = new URL(baseUrl)
    return parsedUrl.hostname === parsedBase.hostname
  } catch {
    return false
  }
}

export function getDomain(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.hostname
  } catch {
    return ''
  }
}

export function shouldCrawlUrl(url: string, excludeExtensions: string[] = []): boolean {
  try {
    const parsedUrl = new URL(url)
    const pathname = parsedUrl.pathname.toLowerCase()
    
    const BANNED_EXTENSIONS = new Set([
      '.pdf', '.zip', '.exe', '.dmg', '.pkg', '.deb', '.rpm',
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp',
      '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm',
      '.mp3', '.wav', '.ogg', '.flac', '.aac',
      '.css', '.js', '.json', '.xml', '.rss', '.atom',
    ])

    for (const ext of [...excludeExtensions, ...Array.from(BANNED_EXTENSIONS)]) {
      if (pathname.endsWith(ext)) {
        return false
      }
    }
    
    return true
  } catch {
    return false
  }
}

export function parseSettingsJson(json: string | null | undefined): CrawlSettings {
  const DEFAULT_SETTINGS: CrawlSettings = {
    maxPages: 500,
    maxDepth: 5,
    concurrency: 5,
    timeout: 10000,
    respectRobots: true,
    allowlist: [],
    denylist: [],
    excludeExtensions: ['.pdf', '.zip', '.exe', '.jpg', '.png', '.gif'],
  }

  if (!json) return { ...DEFAULT_SETTINGS }
  
  try {
    const parsed = JSON.parse(json)
    return validateCrawlSettings(parsed, DEFAULT_SETTINGS)
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

function validateCrawlSettings(settings: any, defaults: CrawlSettings): CrawlSettings {
  const validated: CrawlSettings = { ...defaults, ...settings }

  if (validated.maxPages < 1 || validated.maxPages > 10000) {
    validated.maxPages = defaults.maxPages
  }

  if (validated.maxDepth < 1 || validated.maxDepth > 20) {
    validated.maxDepth = defaults.maxDepth
  }

  if (validated.concurrency < 1 || validated.concurrency > 20) {
    validated.concurrency = defaults.concurrency
  }

  if (validated.timeout < 1000 || validated.timeout > 60000) {
    validated.timeout = defaults.timeout
  }

  return validated
}
