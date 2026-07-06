/**
 * Near-duplicate content detection using 64-bit SimHash over word shingles.
 *
 * Pages whose fingerprints are within a small Hamming distance are treated as
 * near-duplicates (threshold 6 of 64 bits ~= 90% similarity, matching the
 * common industry default). Candidate pairs are found via banding (8 bands of
 * 8 bits): two fingerprints within distance 7 must share at least one
 * identical band, which keeps grouping close to linear instead of O(n^2).
 */

export interface NearDuplicateGroup {
  urls: string[]
  count: number
  similarity: number
}

const SHINGLE_SIZE = 3
const HAMMING_THRESHOLD = 6
const MIN_WORDS = 50
const BAND_COUNT = 8
const BAND_BITS = 8n
const BAND_MASK = 0xffn

function fnv1a64(str: string): bigint {
  let hash = 0xcbf29ce484222325n
  const prime = 0x100000001b3n
  for (let i = 0; i < str.length; i++) {
    hash ^= BigInt(str.charCodeAt(i))
    hash = (hash * prime) & 0xffffffffffffffffn
  }
  return hash
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 0)
}

export function simhash(text: string): bigint | null {
  const words = tokenize(text)
  if (words.length < MIN_WORDS) {
    return null
  }

  const weights = new Array<number>(64).fill(0)
  const end = Math.max(1, words.length - SHINGLE_SIZE + 1)

  for (let i = 0; i < end; i++) {
    const shingle = words.slice(i, i + SHINGLE_SIZE).join(' ')
    const hash = fnv1a64(shingle)
    for (let bit = 0; bit < 64; bit++) {
      if ((hash >> BigInt(bit)) & 1n) {
        weights[bit]++
      } else {
        weights[bit]--
      }
    }
  }

  let fingerprint = 0n
  for (let bit = 0; bit < 64; bit++) {
    if (weights[bit] > 0) {
      fingerprint |= 1n << BigInt(bit)
    }
  }
  return fingerprint
}

export function hammingDistance(a: bigint, b: bigint): number {
  let x = a ^ b
  let count = 0
  while (x > 0n) {
    x &= x - 1n
    count++
  }
  return count
}

export class NearDuplicatesDetector {
  private pages: Array<{ url: string; fingerprint: bigint }> = []
  private seenUrls = new Set<string>()

  addPage(url: string, text: string | null | undefined): void {
    if (!text || this.seenUrls.has(url)) {
      return
    }

    const fingerprint = simhash(text)
    if (fingerprint === null) {
      return
    }

    this.seenUrls.add(url)
    this.pages.push({ url, fingerprint })
  }

  findNearDuplicateGroups(): NearDuplicateGroup[] {
    const n = this.pages.length
    const parent = Array.from({ length: n }, (_, i) => i)

    const find = (i: number): number => {
      while (parent[i] !== i) {
        parent[i] = parent[parent[i]]
        i = parent[i]
      }
      return i
    }

    const union = (a: number, b: number) => {
      const ra = find(a)
      const rb = find(b)
      if (ra !== rb) parent[rb] = ra
    }

    // Band candidates: fingerprints within the Hamming threshold must share a band
    const bands = new Map<string, number[]>()
    for (let i = 0; i < n; i++) {
      const fp = this.pages[i].fingerprint
      for (let band = 0; band < BAND_COUNT; band++) {
        const key = `${band}:${(fp >> (BigInt(band) * BAND_BITS)) & BAND_MASK}`
        const bucket = bands.get(key) || []
        bucket.push(i)
        bands.set(key, bucket)
      }
    }

    const compared = new Set<string>()
    const pairSimilarity = new Map<string, number>()

    for (const bucket of bands.values()) {
      if (bucket.length < 2) continue
      for (let a = 0; a < bucket.length; a++) {
        for (let b = a + 1; b < bucket.length; b++) {
          const i = bucket[a]
          const j = bucket[b]
          const pairKey = `${i}:${j}`
          if (compared.has(pairKey)) continue
          compared.add(pairKey)

          const distance = hammingDistance(this.pages[i].fingerprint, this.pages[j].fingerprint)
          if (distance <= HAMMING_THRESHOLD) {
            union(i, j)
            pairSimilarity.set(pairKey, 1 - distance / 64)
          }
        }
      }
    }

    const groupsByRoot = new Map<number, number[]>()
    for (let i = 0; i < n; i++) {
      const root = find(i)
      const members = groupsByRoot.get(root) || []
      members.push(i)
      groupsByRoot.set(root, members)
    }

    const groups: NearDuplicateGroup[] = []
    for (const members of groupsByRoot.values()) {
      if (members.length < 2) continue

      let minSimilarity = 1
      for (let a = 0; a < members.length; a++) {
        for (let b = a + 1; b < members.length; b++) {
          const key = `${members[a]}:${members[b]}`
          const similarity = pairSimilarity.get(key)
          if (similarity !== undefined && similarity < minSimilarity) {
            minSimilarity = similarity
          }
        }
      }

      groups.push({
        urls: members.map((i) => this.pages[i].url),
        count: members.length,
        similarity: Math.round(minSimilarity * 1000) / 10,
      })
    }

    groups.sort((a, b) => b.count - a.count)
    return groups
  }
}
