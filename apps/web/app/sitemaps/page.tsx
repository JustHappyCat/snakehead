'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Map } from 'lucide-react'

export default function SitemapsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sitemaps</h1>
        <p className="text-muted-foreground">XML sitemaps discovery and analysis</p>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Map className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Select a Crawl</h3>
          <p className="text-center text-muted-foreground mb-6 max-w-md">
            Start a crawl to discover and analyze XML sitemaps.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
