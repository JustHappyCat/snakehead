'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const glossaryTerms = [
  {
    term: 'Broken Pages',
    definition: 'Pages that return 4xx or 5xx HTTP status codes and cannot be accessed by users or search engines.',
    why: 'Broken pages create a poor user experience and can hurt your search rankings.',
    fix: 'Set up redirects (301 for moved pages) or fix the links pointing to them.'
  },
  {
    term: 'Not Indexable',
    definition: 'Pages that search engines cannot or should not show in their results.',
    why: 'If important pages are not indexable, they cannot appear in search results.',
    fix: 'Check meta robots tags, X-Robots-Tag headers, or robots.txt files.'
  },
  {
    term: '404 Error',
    definition: 'Server response meaning the page was not found.',
    why: 'Users and search engines cannot access the content.',
    fix: 'Restore the page or redirect to a relevant page with a 301 redirect.'
  },
  {
    term: '301 Redirect',
    definition: 'Permanent redirect that tells search engines the page has moved.',
    why: 'Preserves SEO value when pages are moved or restructured.',
    fix: 'Set up server-side redirects from old URLs to new ones.'
  },
  {
    term: 'Meta Description',
    definition: 'HTML tag that provides a summary of the page content for search results.',
    why: 'Good descriptions improve click-through rates from search results.',
    fix: 'Write unique, compelling descriptions under 160 characters for each page.'
  },
  {
    term: 'Canonical Tag',
    definition: 'HTML element that tells search engines which version of a page is the preferred one.',
    why: 'Prevents duplicate content issues and consolidates ranking signals.',
    fix: 'Add canonical tags pointing to the master version of duplicate pages.'
  },
  {
    term: 'robots.txt',
    definition: 'File that tells search engine crawlers which pages they can or cannot access.',
    why: 'Prevents search engines from indexing sensitive or unnecessary pages.',
    fix: 'Create or edit robots.txt in your website root directory.'
  },
  {
    term: 'Soft 404',
    definition: 'Page that shows "not found" content but returns a 200 OK status code.',
    why: 'Confuses search engines and wastes crawl budget on non-existent pages.',
    fix: 'Return proper 404 status codes for pages that do not exist.'
  },
]

export default function GlossaryPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Glossary</h1>
        <p className="text-muted-foreground">SEO terms explained in plain language</p>
      </div>

      <div className="space-y-4">
        {glossaryTerms.map((item, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="text-lg">{item.term}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium text-sm mb-1">What it means</h4>
                <p className="text-sm text-muted-foreground">{item.definition}</p>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-1">Why it matters</h4>
                <p className="text-sm text-muted-foreground">{item.why}</p>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-1">How to fix</h4>
                <p className="text-sm text-muted-foreground">{item.fix}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
