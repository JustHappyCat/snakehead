'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'

type VerificationStatus = 'idle' | 'verifying' | 'success' | 'error' | 'expired'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  const [status, setStatus] = useState<VerificationStatus>('idle')
  const [message, setMessage] = useState('')
  const [resendEmail, setResendEmail] = useState(email || '')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (token) {
      verifyToken(token)
    } else if (email) {
      setStatus('error')
      setMessage('Please check your email for the verification link.')
    } else {
      setStatus('error')
      setMessage('No verification token or email provided.')
    }
  }, [token, email])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [countdown])

  const verifyToken = async (token: string) => {
    setStatus('verifying')
    setMessage('Verifying your email address...')

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus('success')
        setMessage(data.message || 'Email verified successfully!')
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      } else {
        if (data.error?.toLowerCase().includes('expired')) {
          setStatus('expired')
          setMessage(data.error || 'Verification link has expired.')
        } else {
          setStatus('error')
          setMessage(data.error || 'Failed to verify email.')
        }
      }
    } catch (error) {
      setStatus('error')
      setMessage('An error occurred. Please try again.')
    }
  }

  const handleResend = async () => {
    if (countdown > 0 || resendLoading) return

    setResendLoading(true)
    setResendSuccess(false)

    try {
      const response = await fetch('/api/auth/verify-email/resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: resendEmail }),
      })

      const data = await response.json()

      if (response.ok) {
        setResendSuccess(true)
        setCountdown(60)
      } else {
        alert(data.error || 'Failed to resend verification email.')
      }
    } catch (error) {
      alert('An error occurred. Please try again.')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-4">
          <div className={`p-3 rounded-full ${
            status === 'success' ? 'bg-green-100' :
            status === 'error' || status === 'expired' ? 'bg-orange-100' :
            'bg-primary/10'
          }`}>
            {status === 'success' ? (
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            ) : status === 'error' || status === 'expired' ? (
              <AlertCircle className="w-6 h-6 text-orange-600" />
            ) : (
              <Mail className="w-6 h-6 text-primary" />
            )}
          </div>
        </div>
        <CardTitle className="text-2xl text-center">
          {status === 'success' ? 'Email Verified!' :
           status === 'verifying' ? 'Verifying...' :
           'Email Verification'}
        </CardTitle>
        <CardDescription className="text-center">
          {status === 'success' ? 'Redirecting to login...' :
           status === 'verifying' ? 'Please wait while we verify your email.' :
           status === 'expired' ? 'Your verification link has expired.' :
           'Please verify your email address to continue.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === 'idle' && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        )}

        {status === 'verifying' && (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center py-8">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-600" />
            <p className="text-lg font-medium mb-2">{message}</p>
            <p className="text-sm text-muted-foreground">
              You will be redirected to the login page shortly.
            </p>
          </div>
        )}

        {status === 'error' && token && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 text-destructive bg-destructive/10 p-4 rounded-md">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <p>{message}</p>
            </div>
            <Button onClick={() => verifyToken(token)} className="w-full">
              Try Again
            </Button>
          </div>
        )}

        {status === 'expired' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 text-orange-600 bg-orange-50 p-4 rounded-md">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <p>{message}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>

            <Button
              onClick={handleResend}
              disabled={resendLoading || countdown > 0}
              className="w-full"
            >
              {resendLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : countdown > 0 ? (
                `Resend in ${countdown}s`
              ) : (
                'Resend Verification Email'
              )}
            </Button>

            {resendSuccess && (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-md">
                <CheckCircle2 className="w-4 h-4" />
                New verification email sent!
              </div>
            )}
          </div>
        )}

        {status === 'error' && !token && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 text-destructive bg-destructive/10 p-4 rounded-md">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <p>{message}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>

            <Button
              onClick={handleResend}
              disabled={resendLoading || countdown > 0}
              className="w-full"
            >
              {resendLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : countdown > 0 ? (
                `Resend in ${countdown}s`
              ) : (
                'Resend Verification Email'
              )}
            </Button>

            {resendSuccess && (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-md">
                <CheckCircle2 className="w-4 h-4" />
                New verification email sent!
              </div>
            )}
          </div>
        )}

        <div className="mt-6 pt-6 border-t text-center text-sm">
          <Link href="/login" className="text-primary hover:underline font-medium">
            Back to Login
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

function LoadingFallback() {
  return (
    <Card className="w-full max-w-md">
      <CardContent className="py-8">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <Suspense fallback={<LoadingFallback />}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  )
}
