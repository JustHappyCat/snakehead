'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, FileSpreadsheet, FileText, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface Crawl {
  id: string
  startUrl: string
  status: string
  createdAt: string
}

interface ComparisonResult {
  id: string
  crawlId: string
  metricType: string
  value: number
  competitorValue: number
  gap: number
  crawl: Crawl
}

interface ComparisonGroup {
  id: string
  name: string
  createdAt: string
  crawls: Crawl[]
  results: ComparisonResult[]
}

interface ComparisonData {
  comparisonGroup: ComparisonGroup
  resultsByMetric: Record<string, ComparisonResult[]>
}

const metricNames: Record<string, string> = {
  totalPages: 'Total Pages',
  totalIssues: 'Total Issues',
  criticalIssues: 'Critical Issues',
  highIssues: 'High Issues',
  mediumIssues: 'Medium Issues',
  lowIssues: 'Low Issues',
  avgLoadTime: 'Avg Load Time (ms)',
  avgWordCount: 'Avg Word Count',
  indexablePages: 'Indexable Pages',
  nonIndexablePages: 'Non-Indexable Pages',
  totalPagesWithTitles: 'Pages with Titles',
  totalPagesWithMetaDescriptions: 'Pages with Meta Descriptions',
  totalPagesWithCanonicals: 'Pages with Canonicals',
}

const metricColors: Record<string, string> = {
  totalPages: '#3b82f6',
  totalIssues: '#ef4444',
  criticalIssues: '#dc2626',
  highIssues: '#f97316',
  mediumIssues: '#eab308',
  lowIssues: '#84cc16',
  avgLoadTime: '#8b5cf6',
  avgWordCount: '#06b6d4',
  indexablePages: '#22c55e',
  nonIndexablePages: '#6b7280',
  totalPagesWithTitles: '#0ea5e9',
  totalPagesWithMetaDescriptions: '#14b8a6',
  totalPagesWithCanonicals: '#a855f7',
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

export default function ComparisonPage() {
  const params = useParams()
  const router = useRouter()
  const comparisonId = params.id as string

  const [data, setData] = useState<ComparisonData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/comparisons/${comparisonId}/results`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch comparison')
      }
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Failed to fetch comparison:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch comparison')
    } finally {
      setLoading(false)
    }
  }

  const generateComparison = async () => {
    try {
      setGenerating(true)
      const response = await fetch(`/api/comparisons/${comparisonId}/generate`, {
        method: 'POST',
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate comparison')
      }
      await fetchData()
    } catch (err) {
      console.error('Failed to generate comparison:', err)
      alert(err instanceof Error ? err.message : 'Failed to generate comparison')
    } finally {
      setGenerating(false)
    }
  }

  const exportCSV = async () => {
    try {
      const response = await fetch(`/api/comparisons/${comparisonId}/export/csv`)
      if (!response.ok) throw new Error('Failed to export CSV')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `comparison-${comparisonId}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Failed to export CSV:', err)
      alert('Failed to export CSV')
    }
  }

  const exportPDF = async () => {
    try {
      const response = await fetch(`/api/comparisons/${comparisonId}/export/pdf`)
      if (!response.ok) throw new Error('Failed to export PDF')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `comparison-${comparisonId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Failed to export PDF:', err)
      alert('Failed to export PDF')
    }
  }

  useEffect(() => {
    fetchData()
  }, [comparisonId])

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin" />
          <span className="ml-4">Loading comparison...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="py-6">
            <p className="text-destructive">{error}</p>
            <Button onClick={() => router.push('/')} className="mt-4">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) {
    return null
  }

  const { comparisonGroup, resultsByMetric } = data
  const siteNames = comparisonGroup.crawls.map(crawl => getHostname(crawl.startUrl))
  const hasResults = Object.keys(resultsByMetric).length > 0

  // Prepare chart data
  const chartData = Object.keys(resultsByMetric).map(metricType => {
    const results = resultsByMetric[metricType]
    const data: any = {
      metric: metricNames[metricType] || metricType,
    }
    comparisonGroup.crawls.forEach((crawl, index) => {
      const result = results.find(r => r.crawlId === crawl.id)
      data[`site${index}`] = result?.value || 0
    })
    return data
  })

  // Calculate summary stats
  const totalCrawls = comparisonGroup.crawls.length
  const completedCrawls = comparisonGroup.crawls.filter(c => c.status === 'COMPLETED').length
  const allCompleted = totalCrawls === completedCrawls

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{comparisonGroup.name}</h1>
            <p className="text-muted-foreground">
              Comparing {totalCrawls} sites
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!hasResults && allCompleted && (
            <Button onClick={generateComparison} disabled={generating}>
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate Comparison
                </>
              )}
            </Button>
          )}
          {hasResults && (
            <>
              <Button variant="outline" onClick={exportCSV}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={exportPDF}>
                <FileText className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sites Compared
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCrawls}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed Crawls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCrawls}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Comparison Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {hasResults ? 'Ready' : allCompleted ? 'Pending' : 'In Progress'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Metrics Analyzed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {hasResults ? Object.keys(resultsByMetric).length : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sites List */}
      <Card>
        <CardHeader>
          <CardTitle>Sites in Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {comparisonGroup.crawls.map((crawl, index) => (
              <div key={crawl.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{getHostname(crawl.startUrl)}</div>
                    <div className="text-xs text-muted-foreground">
                      {crawl.status === 'COMPLETED' ? 'Completed' : crawl.status}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/crawls/${crawl.id}/overview`)}
                >
                  View Details
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gap Chart */}
      {hasResults && (
        <Card>
          <CardHeader>
            <CardTitle>Gap Analysis Chart</CardTitle>
            <CardDescription>
              Visual comparison of metrics across all sites
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="metric" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    interval={0}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {comparisonGroup.crawls.map((crawl, index) => (
                    <Bar
                      key={crawl.id}
                      dataKey={`site${index}`}
                      name={getHostname(crawl.startUrl)}
                      fill={metricColors[Object.keys(resultsByMetric)[index]] || '#3b82f6'}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparison Table */}
      {hasResults && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Comparison</CardTitle>
            <CardDescription>
              Side-by-side comparison of all metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Metric</th>
                    {siteNames.map((name, index) => (
                      <th key={index} className="text-center p-3 font-medium">
                        {name}
                      </th>
                    ))}
                    <th className="text-center p-3 font-medium">Gap</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(resultsByMetric).map((metricType, index) => {
                    const results = resultsByMetric[metricType]
                    const metricName = metricNames[metricType] || metricType
                    const baselineValue = results[0]?.value || 0
                    const lastValue = results[results.length - 1]?.value || 0
                    const gap = lastValue - baselineValue

                    return (
                      <tr key={metricType} className="border-b hover:bg-muted/50">
                        <td className="p-3 font-medium">{metricName}</td>
                        {comparisonGroup.crawls.map((crawl) => {
                          const result = results.find(r => r.crawlId === crawl.id)
                          return (
                            <td key={crawl.id} className="p-3 text-center">
                              {result?.value?.toFixed(1) || '0'}
                            </td>
                          )
                        })}
                        <td className="p-3 text-center">
                          {gap > 0 ? (
                            <span className="flex items-center justify-center gap-1 text-green-600">
                              <TrendingUp className="w-4 h-4" />
                              +{gap.toFixed(1)}
                            </span>
                          ) : gap < 0 ? (
                            <span className="flex items-center justify-center gap-1 text-red-600">
                              <TrendingDown className="w-4 h-4" />
                              {gap.toFixed(1)}
                            </span>
                          ) : (
                            <span className="flex items-center justify-center gap-1 text-gray-600">
                              <Minus className="w-4 h-4" />
                              0
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {!hasResults && !allCompleted && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <RefreshCw className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Waiting for Crawls to Complete</h3>
              <p className="text-muted-foreground">
                All crawls must be completed before generating the comparison.
              </p>
              <Button onClick={fetchData} className="mt-4">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Status
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
