'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, AlertTriangle, Info, CheckCircle, HelpCircle, Sparkles } from 'lucide-react'
import {
  AIRecommendationBadge,
  AIRecommendationLoading,
  AIRecommendationError,
  type AIRecommendation,
} from '@/components/ai-recommendation-badge'

export interface Issue {
  id: string
  issueType: string
  url: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  impact: 'HIGH' | 'MEDIUM' | 'LOW'
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  title: string
  explanation: string
  fixStepsJson?: string
  aiRecommendation?: string | null
}

interface IssuePanelProps {
  issue: Issue | null
  isOpen: boolean
  onClose: () => void
}

export function IssuePanel({ issue, isOpen, onClose }: IssuePanelProps) {
  const [aiRecommendation, setAIRecommendation] = React.useState<AIRecommendation | null>(null)
  const [isLoadingAI, setIsLoadingAI] = React.useState(false)
  const [aiError, setAIError] = React.useState<string | null>(null)
  const [showAI, setShowAI] = React.useState(false)

  const fixSteps = issue?.fixStepsJson ? JSON.parse(issue.fixStepsJson) : []

  React.useEffect(() => {
    if (issue?.aiRecommendation) {
      try {
        setAIRecommendation(JSON.parse(issue.aiRecommendation))
      } catch (e) {
        console.error('Failed to parse AI recommendation:', e)
      }
    }
  }, [issue?.aiRecommendation])

  const fetchAIRecommendation = async () => {
    if (!issue) return
    
    setIsLoadingAI(true)
    setAIError(null)
    setShowAI(true)

    try {
      const response = await fetch('/api/ai/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueIds: [issue.id] }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch AI recommendation')
      }

      const data = await response.json()
      if (data.recommendations && data.recommendations.length > 0) {
        setAIRecommendation(data.recommendations[0])
      }
    } catch (error) {
      setAIError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoadingAI(false)
    }
  }

  const severityColors = {
    CRITICAL: 'bg-red-500 text-white',
    HIGH: 'bg-orange-500 text-white',
    MEDIUM: 'bg-yellow-500 text-white',
    LOW: 'bg-green-500 text-white',
  }

  const difficultyColors = {
    EASY: 'bg-green-100 text-green-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    HARD: 'bg-red-100 text-red-800',
  }

  const impactColors = {
    HIGH: 'bg-red-100 text-red-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    LOW: 'bg-green-100 text-green-800',
  }

  if (!issue) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <DialogTitle className="text-lg font-semibold">
              {issue.title}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  const explanationModal = document.createElement('dialog')
                  explanationModal.innerHTML = `
                    <div style="padding: 20px; max-width: 500px;">
                      <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">About ${issue.issueType}</h3>
                      <p style="color: #666; font-size: 14px; margin-bottom: 12px;">${getWhatItMeans(issue.issueType)}</p>
                      <p style="color: #666; font-size: 14px; margin-bottom: 16px;"><strong>Why it matters:</strong> ${getWhyItMatters(issue.issueType)}</p>
                      <p style="color: #666; font-size: 14px;"><strong>Explanation:</strong> ${issue.explanation}</p>
                      <button onclick="this.closest('dialog').close()" style="margin-top: 20px; padding: 8px 16px; cursor: pointer;">Close</button>
                    </div>
                  `
                  document.body.appendChild(explanationModal)
                  explanationModal.showModal()
                  explanationModal.addEventListener('close', () => {
                    document.body.removeChild(explanationModal)
                  })
                }}
              >
                <HelpCircle className="w-3 h-3 mr-1" />
                Explain this
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <DialogDescription className="space-y-2">
            <a
              href={issue.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline block truncate"
            >
              {issue.url}
            </a>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Badge className={severityColors[issue.severity]}>
              {issue.severity}
            </Badge>
            <Badge className={impactColors[issue.impact]}>
              Impact: {issue.impact}
            </Badge>
            <Badge className={difficultyColors[issue.difficulty]}>
              Difficulty: {issue.difficulty}
            </Badge>
            <Badge variant="outline">{issue.issueType}</Badge>
            
            {!aiRecommendation && !isLoadingAI && !showAI && (
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAIRecommendation}
                className="ml-auto"
              >
                <Sparkles className="w-3 h-3 mr-1" />
                Get AI Recommendation
              </Button>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <Info className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium mb-1">What this means</h4>
                <p className="text-sm text-muted-foreground">
                  {issue.explanation}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium mb-1">Why it matters</h4>
                <p className="text-sm text-muted-foreground">
                  {getWhyItMatters(issue.issueType)}
                </p>
              </div>
            </div>

            {fixSteps.length > 0 && (
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium mb-2">How to fix</h4>
                  <ol className="text-sm text-muted-foreground space-y-2">
                    {fixSteps.map((step: string, index: number) => (
                      <li key={index} className="flex gap-2">
                        <span className="font-semibold shrink-0">
                          {index + 1}.
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}

            {showAI && (
              <div className="border-t pt-6">
                {isLoadingAI && <AIRecommendationLoading />}
                {aiError && (
                  <AIRecommendationError
                    message={aiError}
                    onRetry={fetchAIRecommendation}
                  />
                )}
                {aiRecommendation && (
                  <AIRecommendationBadge
                    recommendation={aiRecommendation}
                    issueUrl={issue.url}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function getWhyItMatters(issueType: string): string {
  const whyMap: Record<string, string> = {
    BROKEN_PAGE: 'Broken pages create a poor user experience and waste crawl budget.',
    REDIRECT: 'Redirects can slow down page loads and may confuse search engines.',
    MISSING_TITLE: 'Pages without titles appear in search results without a title, reducing click-through rates.',
    SHORT_TITLE: 'Short titles may not provide enough information about the page content.',
    LONG_TITLE: 'Titles longer than 60 characters get truncated in search results.',
    MISSING_META_DESCRIPTION: 'Pages without meta descriptions have no control over how they appear in search results.',
    SHORT_META_DESCRIPTION: 'Short descriptions may not provide enough information to encourage clicks.',
    LONG_META_DESCRIPTION: 'Descriptions longer than 155 characters get truncated in search results.',
    MISSING_H1: 'Missing H1 headings make it harder for users and search engines to understand the page content.',
    MULTIPLE_H1: 'Multiple H1 headings can confuse search engines about the main topic of the page.',
    LOW_WORD_COUNT: 'Pages with very little content may not provide enough information to be valuable for users.',
    MISSING_IMAGE_ALT: 'Missing alt text reduces image accessibility and weakens image search relevance.',
    MISSING_CANONICAL: 'Missing canonical tags make it harder to consolidate duplicate URLs and preferred page versions.',
    MISSING_OPEN_GRAPH: 'Missing Open Graph tags weakens link previews and social sharing quality.',
    MISSING_TWITTER_CARD: 'Missing Twitter card tags reduce the consistency of previews on X and similar platforms.',
    MISSING_VIEWPORT: 'Missing viewport tags can cause poor rendering and usability on mobile devices.',
    CANONICAL_MISMATCH: 'Incorrect canonical tags can cause duplicate content issues.',
    NOT_INDEXABLE: 'Pages blocked from indexing cannot appear in search results.',
    SLOW_PAGE: 'Slow pages waste crawl budget and create a worse user experience.',
    SOFT_404: 'Soft 404s waste crawl budget and may rank irrelevant pages, confusing both users and search engines.',
    ORPHAN_PAGE: 'Orphan pages are difficult to discover and may never be indexed by search engines.',
    DEAD_END_PAGE: 'Dead-end pages stop users and crawlers from naturally continuing deeper into the site.',
    BROKEN_INTERNAL_LINK: 'Broken internal links waste crawl budget and interrupt internal discovery paths.',
    INTERNAL_LINK_TO_REDIRECT: 'Internal links that hit redirects add latency and dilute crawl efficiency.',
    DUPLICATE_TITLE: 'Duplicate titles make it harder for search engines to understand which page is most relevant.',
    DUPLICATE_META_DESCRIPTION: 'Duplicate meta descriptions reduce differentiation in search results.',
    HTTPS_DISABLED: 'Serving pages without enforced HTTPS leaves traffic vulnerable and weakens trust signals.',
    MISSING_SECURITY_HEADERS: 'Missing security headers reduce browser-level protection against common attacks.',
    WEAK_CONTENT_SECURITY_POLICY: 'A permissive Content Security Policy weakens cross-site scripting protections.',
    INSECURE_COOKIE_FLAGS: 'Missing cookie security flags increase the risk of token theft or cross-site request misuse.',
    PERMISSIVE_CORS: 'Overly broad CORS rules can expose resources to untrusted origins.',
    TECH_STACK_EXPOSED: 'Leaking server or framework details helps attackers fingerprint the stack.',
    OPEN_PORTS_EXPOSED: 'Unexpected internet-facing ports increase the attack surface of the host.',
  }

  return whyMap[issueType] || 'This issue can affect your website&apos;s performance in search results.'
}

function getWhatItMeans(issueType: string): string {
  const whatMap: Record<string, string> = {
    BROKEN_PAGE: 'This page returns an error (4xx or 5xx status code) instead of loading properly.',
    REDIRECT: 'This page redirects visitors to another URL before loading the final content.',
    MISSING_TITLE: 'This page lacks a title tag, which is the main heading shown in search results.',
    SHORT_TITLE: 'This page&apos;s title is very short (under 30 characters) and may not describe content well.',
    LONG_TITLE: 'This page&apos;s title is too long (over 60 characters) and gets cut off in search results.',
    MISSING_META_DESCRIPTION: 'This page lacks a meta description, which summarizes content for search engines.',
    SHORT_META_DESCRIPTION: 'This page&apos;s meta description is very short (under 70 characters).',
    LONG_META_DESCRIPTION: 'This page&apos;s meta description is too long (over 155 characters).',
    MISSING_H1: 'This page lacks an H1 heading, which should define the main topic of the page.',
    MULTIPLE_H1: 'This page has multiple H1 headings, but should only have one main heading.',
    LOW_WORD_COUNT: 'This page has very little content (under 300 words) and may not be valuable to users.',
    MISSING_IMAGE_ALT: 'One or more images on this page are missing alt text.',
    MISSING_CANONICAL: 'This page does not declare a canonical URL.',
    MISSING_OPEN_GRAPH: 'This page is missing one or more key Open Graph tags used for social previews.',
    MISSING_TWITTER_CARD: 'This page does not define a twitter:card meta tag.',
    MISSING_VIEWPORT: 'This page does not define a viewport meta tag for mobile browsers.',
    CANONICAL_MISMATCH: 'This page&apos;s canonical URL doesn&apos;t point to itself, which confuses search engines.',
    NOT_INDEXABLE: 'Search engines are blocked from including this page in their results.',
    SLOW_PAGE: 'This page responded slowly during the crawl and may need performance work.',
    SOFT_404: 'This page returns a 200 OK status but appears to be an error page.',
    ORPHAN_PAGE: 'No other pages on your site link to this page, making it hard to discover.',
    DEAD_END_PAGE: 'This page does not link to any other internal page.',
    BROKEN_INTERNAL_LINK: 'This page links to one or more internal URLs that return an error.',
    INTERNAL_LINK_TO_REDIRECT: 'This page links to internal URLs that redirect before loading.',
    DUPLICATE_TITLE: 'This page shares the same title with another crawled page.',
    DUPLICATE_META_DESCRIPTION: 'This page shares the same meta description with another crawled page.',
    HTTPS_DISABLED: 'The audited URL was available over HTTP instead of being protected by HTTPS.',
    MISSING_SECURITY_HEADERS: 'The audited response is missing one or more recommended browser security headers.',
    WEAK_CONTENT_SECURITY_POLICY: 'The site has a Content Security Policy, but it still allows unsafe script or style execution paths.',
    INSECURE_COOKIE_FLAGS: 'One or more response cookies are missing Secure, HttpOnly, or SameSite protections.',
    PERMISSIVE_CORS: 'The site allows cross-origin access more broadly than is typically necessary.',
    TECH_STACK_EXPOSED: 'The response reveals server or framework headers that identify the underlying stack.',
    OPEN_PORTS_EXPOSED: 'Common port checks found additional internet-facing services on the target host.',
  }

  return whatMap[issueType] || 'This is an issue affecting your website&apos;s SEO or performance.'
}
