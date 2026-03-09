const SOFT_404_PATTERNS = [
  /not\s*found/i,
  /page\s*not\s*found/i,
  /404/i,
  /could\s*not\s*find/i,
  /error\s*404/i,
  /page\s*not\s*available/i,
  /no\s*results\s*found/i,
  /nothing\s*found/i,
  /item\s*not\s*found/i,
  /resource\s*not\s*found/i,
]

const VERY_LOW_WORD_COUNT_THRESHOLD = 50

export function checkSoft404( content: string, wordCount: number = 0): {
  isSoft404: boolean
  confidence: 'high' | 'medium' | 'low'
  matchedPattern?: string
} {
  if (!content) {
    return { isSoft404: false, confidence: 'low' }
  }

  const lowerContent = content.toLowerCase()
  
  for (const pattern of SOFT_404_PATTERNS) {
    if (pattern.test(lowerContent)) {
      const matchedText = lowerContent.match(pattern)?.[0] || pattern.toString()
      
      if (wordCount < VERY_LOW_WORD_COUNT_THRESHOLD) {
        return {
          isSoft404: true,
          confidence: 'high',
          matchedPattern: matchedText,
        }
      }
      
      if (wordCount < 100) {
        return {
          isSoft404: true,
          confidence: 'medium',
          matchedPattern: matchedText,
        }
      }
      
      if (wordCount < 200 && (/404/i.test(matchedText) || /not\s*found/i.test(matchedText))) {
        return {
          isSoft404: true,
          confidence: 'medium',
          matchedPattern: matchedText,
        }
      }
    }
  }

  if (wordCount < VERY_LOW_WORD_COUNT_THRESHOLD && wordCount > 0) {
    return {
      isSoft404: true,
      confidence: 'low',
    }
  }

  return { isSoft404: false, confidence: 'low' }
}
