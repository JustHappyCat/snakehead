import { Severity, Impact, Difficulty } from './types'

export const SEVERITY_LEVELS: Record<Severity, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
}

export const IMPACT_LEVELS: Record<Impact, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
}

export const DIFFICULTY_LEVELS: Record<Difficulty, number> = {
  HARD: 3,
  MEDIUM: 2,
  EASY: 1,
}



export const CRAWL_STATUS_COLORS: Record<string, string> = {
  PENDING: 'text-yellow-600',
  RUNNING: 'text-blue-600',
  COMPLETED: 'text-green-600',
  FAILED: 'text-red-600',
  CANCELLED: 'text-gray-600',
}

export const COMMON_SEO_ISSUES = [
  {
    type: 'BROKEN_PAGE',
    title: 'Broken Page',
    explanation: 'This page returns a 4xx or 5xx error code and cannot be accessed.',
    whyMatters: 'Broken pages create a poor user experience and waste crawl budget.',
    fixSteps: ['Check the page URL for typos', 'Set up a 301 redirect to a related page', 'Fix server errors'],
    severity: 'HIGH' as Severity,
    impact: 'HIGH' as Impact,
    difficulty: 'EASY' as Difficulty,
  },
  {
    type: 'MISSING_TITLE',
    title: 'Missing Title Tag',
    explanation: 'This page does not have a title tag.',
    whyMatters: 'The title tag is important for SEO and helps users understand the page content.',
    fixSteps: ['Add a unique, descriptive title to the page', 'Keep it under 60 characters'],
    severity: 'MEDIUM' as Severity,
    impact: 'MEDIUM' as Impact,
    difficulty: 'EASY' as Difficulty,
  },
  {
    type: 'MISSING_META_DESCRIPTION',
    title: 'Missing Meta Description',
    explanation: 'This page does not have a meta description.',
    whyMatters: 'Meta descriptions appear in search results and affect click-through rates.',
    fixSteps: ['Add a compelling summary of the page content', 'Keep it under 160 characters'],
    severity: 'LOW' as Severity,
    impact: 'MEDIUM' as Impact,
    difficulty: 'EASY' as Difficulty,
  },
  {
    type: 'NOT_INDEXABLE',
    title: 'Not Indexable',
    explanation: 'This page is blocked from being indexed by search engines.',
    whyMatters: 'If important pages are not indexable, they cannot appear in search results.',
    fixSteps: ['Check meta robots tag', 'Check X-Robots-Tag header', 'Review robots.txt rules'],
    severity: 'HIGH' as Severity,
    impact: 'HIGH' as Impact,
    difficulty: 'MEDIUM' as Difficulty,
  },
]
