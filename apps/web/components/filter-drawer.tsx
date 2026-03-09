'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SlidersHorizontal, X } from 'lucide-react'

export interface FilterState {
  search?: string
  statusCodes?: string[]
  issues?: string[]
}

interface FilterDrawerProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  availableFilters?: {
    statusCodes?: string[]
    issues?: string[]
  }
}

export function FilterDrawer({
  isOpen,
  onOpenChange,
  filters,
  onFiltersChange,
  availableFilters = {
    statusCodes: ['200', '301', '302', '404', '500'],
    issues: ['BROKEN_PAGE', 'REDIRECT', 'MISSING_SECURITY_HEADERS', 'HTTPS_DISABLED', 'OPEN_PORTS_EXPOSED'],
  },
}: FilterDrawerProps) {
  const [localFilters, setLocalFilters] = React.useState<FilterState>(filters)

  React.useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  const handleApply = () => {
    onFiltersChange(localFilters)
    onOpenChange(false)
  }

  const handleReset = () => {
    setLocalFilters({})
    onFiltersChange({})
    onOpenChange(false)
  }

  const toggleStatusCode = (code: string) => {
    const current = localFilters.statusCodes || []
    setLocalFilters({
      ...localFilters,
      statusCodes: current.includes(code)
        ? current.filter((c) => c !== code)
        : [...current, code],
    })
  }

  const toggleIssue = (issue: string) => {
    const current = localFilters.issues || []
    setLocalFilters({
      ...localFilters,
      issues: current.includes(issue)
        ? current.filter((i) => i !== issue)
        : [...current, issue],
    })
  }

  const clearAllFilters = () => {
    setLocalFilters({})
  }

  const hasActiveFilters = Object.keys(localFilters).length > 0

  return (
    <>
      <Button
        variant={hasActiveFilters ? 'default' : 'outline'}
        size="sm"
        onClick={() => onOpenChange(!isOpen)}
        className="gap-2"
      >
        <SlidersHorizontal className="w-4 h-4" />
        Filters
        {hasActiveFilters && (
          <span className="bg-primary-foreground text-primary rounded-full px-2 py-0.5 text-xs">
            {Object.keys(localFilters).length}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-96 bg-background border rounded-lg shadow-lg p-4 z-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Filters</h3>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  Clear all
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search URLs..."
                value={localFilters.search || ''}
                onChange={(e) =>
                  setLocalFilters({ ...localFilters, search: e.target.value })
                }
              />
            </div>

            {availableFilters.statusCodes && (
              <div>
                <Label className="text-base font-medium">Status Codes</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {availableFilters.statusCodes.map((code) => (
                    <button
                      key={code}
                      onClick={() => toggleStatusCode(code)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        localFilters.statusCodes?.includes(code)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {availableFilters.issues && (
              <div>
                <Label className="text-base font-medium">Issues</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {availableFilters.issues.map((issue) => (
                    <button
                      key={issue}
                      onClick={() => toggleIssue(issue)}
                      className={`px-3 py-1 rounded-full text-xs transition-colors ${
                        localFilters.issues?.includes(issue)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {formatIssueLabel(issue)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={handleReset} className="flex-1">
              Reset
            </Button>
            <Button onClick={handleApply} className="flex-1">
              Apply Filters
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

function formatIssueLabel(issue: string): string {
  const labels: Record<string, string> = {
    BROKEN_PAGE: 'Broken',
    REDIRECT: 'Redirects',
    MISSING_TITLE: 'Missing Title',
    SHORT_TITLE: 'Short Title',
    LONG_TITLE: 'Long Title',
    MISSING_META_DESCRIPTION: 'Missing Meta',
    SHORT_META_DESCRIPTION: 'Short Meta',
    LONG_META_DESCRIPTION: 'Long Meta',
    MISSING_H1: 'Missing H1',
    MULTIPLE_H1: 'Multiple H1',
    LOW_WORD_COUNT: 'Low Words',
    MISSING_IMAGE_ALT: 'Missing Alt',
    CANONICAL_MISMATCH: 'Canonical Issue',
    NOT_INDEXABLE: 'Not Indexable',
    SLOW_PAGE: 'Slow Page',
    DUPLICATE_TITLE: 'Duplicate Title',
    DUPLICATE_META_DESCRIPTION: 'Duplicate Meta',
    HTTPS_DISABLED: 'HTTPS',
    MISSING_SECURITY_HEADERS: 'Sec Headers',
    WEAK_CONTENT_SECURITY_POLICY: 'Weak CSP',
    INSECURE_COOKIE_FLAGS: 'Cookie Flags',
    PERMISSIVE_CORS: 'CORS',
    TECH_STACK_EXPOSED: 'Server Leak',
    OPEN_PORTS_EXPOSED: 'Open Ports',
  }

  return labels[issue] || issue.replace(/_/g, ' ')
}
