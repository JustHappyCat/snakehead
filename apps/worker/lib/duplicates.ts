import { createHash } from 'crypto'

export function generateHash(content: string): string {
  if (!content) return ''
  const normalized = content.trim().toLowerCase().replace(/\s+/g, ' ')
  return createHash('sha256').update(normalized).digest('hex')
}

export interface DuplicateGroup {
  hash: string
  content: string
  urls: string[]
  count: number
}

export function findDuplicates(items: Array<{ url: string; content?: string }>): DuplicateGroup[] {
  const hashMap = new Map<string, { content: string; urls: string[] }>()
  
  for (const item of items) {
    if (!item.content) continue
    
    const hash = generateHash(item.content)
    
    if (!hashMap.has(hash)) {
      hashMap.set(hash, { content: item.content, urls: [] })
    }
    
    const group = hashMap.get(hash)!
    if (!group.urls.includes(item.url)) {
      group.urls.push(item.url)
    }
  }
  
  const duplicates: DuplicateGroup[] = []
  
  for (const [hash, group] of hashMap) {
    if (group.urls.length > 1) {
      duplicates.push({
        hash,
        content: group.content,
        urls: group.urls,
        count: group.urls.length,
      })
    }
  }
  
  duplicates.sort((a, b) => b.count - a.count)
  
  return duplicates
}

export interface DuplicateResult {
  url: string
  isDuplicate: boolean
  duplicateGroup?: {
    hash: string
    urls: string[]
    count: number
  }
}

export function checkDuplicates(
  items: Array<{ url: string; content?: string }>
): DuplicateResult[] {
  const duplicates = findDuplicates(items)
  const duplicateHashes = new Set(duplicates.map(d => d.hash))
  const duplicateByUrl = new Map<string, DuplicateResult>()
  
  for (const item of items) {
    if (!item.content) {
      duplicateByUrl.set(item.url, {
        url: item.url,
        isDuplicate: false,
      })
      continue
    }
    
    const hash = generateHash(item.content)
    const duplicateGroup = duplicates.find(d => d.hash === hash)
    
    duplicateByUrl.set(item.url, {
      url: item.url,
      isDuplicate: duplicateHashes.has(hash),
      duplicateGroup: duplicateGroup,
    })
  }
  
  return Array.from(duplicateByUrl.values())
}
