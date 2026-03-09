import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { prisma } from '@/lib/prisma'
import { sendVerificationEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Find tenant by email
    const tenant = await prisma.tenant.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!tenant) {
      // Don't reveal if email exists or not for security
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a verification link has been sent.',
      })
    }

    // Check if email is already verified
    if (tenant.emailVerified) {
      return NextResponse.json(
        { success: false, error: 'Email is already verified' },
        { status: 400 }
      )
    }

    // Generate new verification token
    const emailVerificationToken = nanoid(32)
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Update tenant with new token
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        emailVerificationToken,
        emailVerificationExpires,
      },
    })

    // Send verification email
    const emailResult = await sendVerificationEmail({
      name: tenant.name,
      email: tenant.email,
      token: emailVerificationToken,
    })

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error)
      // Don't fail the request if email fails, just log it
    }

    return NextResponse.json({
      success: true,
      message: 'New verification email sent',
    })
  } catch (error) {
    console.error('Resend verification email error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to resend verification email. Please try again.' },
      { status: 500 }
    )
  }
}
