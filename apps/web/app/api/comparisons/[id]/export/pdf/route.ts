import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import jsPDF from 'jspdf'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authResponse = requireAuth(request)
    if (authResponse) return authResponse

    const comparisonGroupId = params.id

    const comparisonGroup = await prisma.comparisonGroup.findUnique({
      where: { id: comparisonGroupId },
      include: {
        crawls: {
          orderBy: { createdAt: 'asc' },
        },
        results: {
          include: {
            crawl: true,
          },
        },
      },
    })

    if (!comparisonGroup) {
      return NextResponse.json({ error: 'Comparison group not found' }, { status: 404 })
    }

    const group = comparisonGroup as any

    // For now, skip tenant check since we don't have proper session management
    // TODO: Add proper tenant check when auth is fully implemented

    // Generate PDF
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20
    let yPosition = margin

    // Title
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('SEO Comparison Report', pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 15

    // Comparison group name
    doc.setFontSize(14)
    doc.setFont('helvetica', 'normal')
    doc.text(group.name, pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 15

    // Date
    doc.setFontSize(10)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 20

    // Get site names
    const siteNames = group.crawls.map((crawl: any) => {
      try {
        return new URL(crawl.startUrl).hostname
      } catch {
        return crawl.startUrl
      }
    })

    // Group results by metric type
    const resultsByMetric: Record<string, any[]> = {}
    group.results.forEach((result: any) => {
      if (!resultsByMetric[result.metricType]) {
        resultsByMetric[result.metricType] = []
      }
      resultsByMetric[result.metricType].push(result)
    })

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

    // Draw table header
    const tableStartY = yPosition
    const colWidths = [80, ...siteNames.map(() => 35), 35]
    const totalTableWidth = colWidths.reduce((sum, w) => sum + w, 0)
    const startX = (pageWidth - totalTableWidth) / 2

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    
    // Header background
    doc.setFillColor(240, 240, 240)
    doc.rect(startX, tableStartY, totalTableWidth, 10, 'F')
    
    // Header text
    let xPosition = startX
    doc.text('Metric', xPosition + 5, tableStartY + 7)
    xPosition += colWidths[0]
    
    siteNames.forEach((name: any, index: number) => {
      doc.text(name.substring(0, 15), xPosition + 5, tableStartY + 7)
      xPosition += colWidths[index + 1]
    })
    
    doc.text('Gap', xPosition + 5, tableStartY + 7)

    yPosition += 10

    // Draw table rows
    doc.setFont('helvetica', 'normal')
    
    Object.keys(resultsByMetric).forEach((metricType, index) => {
      const results = resultsByMetric[metricType]
      const metricName = metricNames[metricType] || metricType
      
      // Alternate row background
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250)
        doc.rect(startX, yPosition, totalTableWidth, 8, 'F')
      }

      // Metric name
      xPosition = startX
      doc.text(metricName.substring(0, 25), xPosition + 5, yPosition + 6)
      xPosition += colWidths[0]

      // Values for each site
      group.crawls.forEach((crawl: any, crawlIndex: number) => {
        const result = results.find(r => r.crawlId === crawl.id)
        const value = result?.value?.toFixed(1) || '0'
        doc.text(value, xPosition + 5, yPosition + 6)
        xPosition += colWidths[crawlIndex + 1]
      })

      // Gap
      const baselineValue = results[0]?.value || 0
      const lastValue = results[results.length - 1]?.value || 0
      const gap = lastValue - baselineValue
      const gapText = (gap >= 0 ? '+' : '') + gap.toFixed(1)
      
      // Color code the gap
      if (gap > 0) {
        doc.setTextColor(0, 150, 0) // Green for positive
      } else if (gap < 0) {
        doc.setTextColor(200, 0, 0) // Red for negative
      } else {
        doc.setTextColor(0, 0, 0) // Black for zero
      }
      
      doc.text(gapText, xPosition + 5, yPosition + 6)
      doc.setTextColor(0, 0, 0) // Reset to black

      yPosition += 8

      // Check if we need a new page
      if (yPosition > pageHeight - margin) {
        doc.addPage()
        yPosition = margin
      }
    })

    // Footer
    const totalPages = doc.internal.pages.length - 1
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(
        `Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      )
    }

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="comparison-${comparisonGroupId}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Failed to export comparison as PDF:', error)
    return NextResponse.json(
      { error: 'Failed to export comparison' },
      { status: 500 }
    )
  }
}
