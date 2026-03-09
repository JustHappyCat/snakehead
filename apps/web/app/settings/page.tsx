'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, Lock, Globe } from 'lucide-react'

export default function SettingsPage() {
  const [resetLoading, setResetLoading] = useState(false)

  const handleReset = async () => {
    setResetLoading(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      window.location.href = '/'
    } catch (error) {
      console.error('Reset failed:', error)
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Access
            </CardTitle>
            <CardDescription>
              Local installs run without authentication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <h4 className="font-medium">Current Mode</h4>
                <p className="text-sm text-muted-foreground">Authentication is disabled</p>
              </div>
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={resetLoading}
              >
                {resetLoading ? 'Returning...' : 'Back to Dashboard'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Authentication
            </CardTitle>
            <CardDescription>
              Password protection is disabled in this build
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>No login required to access crawls and reports</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                If you want authentication again later, reintroduce a real auth provider rather than the old single-password gate.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Environment
            </CardTitle>
            <CardDescription>
              Application environment information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Environment</span>
                <span className="font-medium">{process.env.NODE_ENV || 'unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span className="font-medium">1.0.0 (Phase 5)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
