import axios from 'axios'
import { gunzipSync } from 'zlib'
import * as cheerio from 'cheerio'

export interface SitemapFetchResult {
  urls: string[]
  sitemapsProcessed: number
  errors: string[]
}

interface SitemapFetchOptions {
  maxUrls?: number
  maxSitemaps?: number
  timeout?: number
}

const DEFAULT_MAX_URLS = 5000
const DEFAULT_MAX_SITEMAPS = 50
const DEFAULT_TIMEOUT = 10000

/**
 * Fetch and parse XML sitemaps, following <sitemapindex> entries recursively.
 * Supports plain XML and gzip-compressed (.xml.gz) sitemaps.
 */
export async function fetchSitemapUrls(
  sitemapUrls: string[],
  options: SitemapFetchOptions = {}
): Promise<SitemapFetchResult> {
  const maxUrls = options.maxUrls ?? DEFAULT_MAX_URLS
  const maxSitemaps = options.maxSitemaps ?? DEFAULT_MAX_SITEMAPS
  const timeout = options.timeout ?? DEFAULT_TIMEOUT

  const urls = new Set<string>()
  const errors: string[] = []
  const visited = new Set<string>()
  const queue = [...sitemapUrls]
  let sitemapsProcessed = 0

  while (queue.length > 0 && sitemapsProcessed < maxSitemaps && urls.size < maxUrls) {
    const sitemapUrl = queue.shift()!
    if (visited.has(sitemapUrl)) continue
    visited.add(sitemapUrl)

    let xml: string
    try {
      xml = await fetchSitemapBody(sitemapUrl, timeout)
    } catch (error) {
      errors.push(`${sitemapUrl}: ${error instanceof Error ? error.message : String(error)}`)
      continue
    }

    sitemapsProcessed++

    let $: cheerio.CheerioAPI
    try {
      $ = cheerio.load(xml, { xmlMode: true })
    } catch {
      errors.push(`${sitemapUrl}: failed to parse XML`)
      continue
    }

    // Sitemap index: queue nested sitemaps
    $('sitemapindex > sitemap > loc').each((_, el) => {
      const loc = $(el).text().trim()
      if (loc && !visited.has(loc)) {
        queue.push(loc)
      }
    })

    // Urlset: collect page URLs
    $('urlset > url > loc').each((_, el) => {
      if (urls.size >= maxUrls) return false
      const loc = $(el).text().trim()
      if (loc) {
        urls.add(loc)
      }
    })
  }

  return {
    urls: Array.from(urls),
    sitemapsProcessed,
    errors,
  }
}

async function fetchSitemapBody(url: string, timeout: number): Promise<string> {
  const response = await axios.get(url, {
    timeout,
    responseType: 'arraybuffer',
    maxRedirects: 5,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; snakehead/1.0)',
      'Accept': 'application/xml,text/xml,*/*;q=0.8',
    },
    validateStatus: (status) => status === 200,
  })

  const buffer = Buffer.from(response.data)
  const contentType = String(response.headers['content-type'] || '')

  // Gzip payloads that axios did not transparently decompress
  const looksGzipped = buffer.length > 2 && buffer[0] === 0x1f && buffer[1] === 0x8b
  if (looksGzipped || url.toLowerCase().endsWith('.gz') || contentType.includes('gzip')) {
    if (looksGzipped) {
      return gunzipSync(buffer).toString('utf-8')
    }
  }

  return buffer.toString('utf-8')
}
