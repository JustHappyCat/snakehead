'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ExplainButtonProps {
  title: string
  explanation: string
  whatItMeans?: string
  whyItMatters?: string
  children?: React.ReactNode
}

export function ExplainButton({
  title,
  explanation,
  whatItMeans,
  whyItMatters,
  children,
}: ExplainButtonProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
            <span className="flex items-center gap-1">
              <span className="font-medium">Explain this</span>
            </span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {whatItMeans && (
            <div>
              <h4 className="font-semibold mb-1">What this means</h4>
              <p className="text-sm text-muted-foreground">{whatItMeans}</p>
            </div>
          )}
          
          {whyItMatters && (
            <div>
              <h4 className="font-semibold mb-1">Why it matters</h4>
              <p className="text-sm text-muted-foreground">{whyItMatters}</p>
            </div>
          )}
          
          <div>
            <h4 className="font-semibold mb-1">Explanation</h4>
            <p className="text-sm text-muted-foreground">{explanation}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
