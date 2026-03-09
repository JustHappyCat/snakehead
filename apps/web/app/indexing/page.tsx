'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function IndexingPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Indexing</h1>
        <p className="text-muted-foreground">Check which pages can be indexed by search engines</p>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">Start a crawl to see indexing data</p>
        </CardContent>
      </Card>
    </div>
  )
}
