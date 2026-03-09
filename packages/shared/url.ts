/**
 * Normalize URL for deduplication and comparison
 */
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

/**
 * Generate a hash for URL for indexing and deduplication
 */
export function urlHash(url: string): string {
  try {
    const normalized = normalizeUrl(url)
    const hash = createHash(normalized)
    return hash
  } catch {
    return ''
  }
}

function createHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16)
}

/**
 * Check if URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Check if URL is internal to the same domain
 */
export function isInternalUrl(url: string, baseUrl: string): boolean {
  try {
    const parsedUrl = new URL(url)
    const parsedBase = new URL(baseUrl)
    return parsedUrl.hostname === parsedBase.hostname
  } catch {
    return false
  }
}

/**
 * Extract domain from URL
 */
export function getDomain(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.hostname
  } catch {
    return ''
  }
}

/**
 * Check if URL should be crawled based on extension
 */
const BANNED_EXTENSIONS = [
  '.pdf', '.zip', '.exe', '.dmg', '.pkg', '.deb', '.rpm',
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp',
  '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm',
  '.mp3', '.wav', '.ogg', '.flac', '.aac',
  '.css', '.js', '.json', '.xml', '.rss', '.atom',
]

export function shouldCrawlUrl(url: string, excludeExtensions: string[] = []): boolean {
  try {
    const parsedUrl = new URL(url)
    const pathname = parsedUrl.pathname.toLowerCase()
    
    for (const ext of [...excludeExtensions, ...BANNED_EXTENSIONS]) {
      if (pathname.endsWith(ext)) {
        return false
      }
    }
    
    return true
  } catch {
    return false
  }
}
