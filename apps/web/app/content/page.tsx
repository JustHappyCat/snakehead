'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ContentPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Content</h1>
        <p className="text-muted-foreground">Analyze titles, meta descriptions, and content issues</p>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">Start a crawl to see content data</p>
        </CardContent>
      </Card>
    </div>
  )
}
