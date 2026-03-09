import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { nanoid } from 'nanoid'
import { prisma } from '@/lib/prisma'
import { sendVerificationEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, company } = body

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: 'Email, password, and name are required' },
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

    // Password strength validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
    if (!passwordRegex.test(password)) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number' },
        { status: 400 }
      )
    }

    // Name validation
    if (name.trim().length < 2 || name.trim().length > 100) {
      return NextResponse.json(
        { success: false, error: 'Name must be between 2 and 100 characters' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingTenant) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 409 }
      )
    }

    // Generate slug from name or email
    const baseSlug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    let slug = baseSlug
    let counter = 1

    // Ensure slug is unique
    while (await prisma.tenant.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Generate email verification token
    const emailVerificationToken = nanoid(32)
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    const tenant = await prisma.tenant.create({
      data: {
        name: name.trim(),
        slug,
        email: email.toLowerCase(),
        passwordHash,
        company: company?.trim() || null,
        emailVerified: false,
        emailVerificationToken,
        emailVerificationExpires,
      },
    })

    // Send verification email
    const emailResult = await sendVerificationEmail({
      name: name.trim(),
      email: email.toLowerCase(),
      token: emailVerificationToken,
    })

    if (!emailResult.success) {
      console.warn('Failed to send verification email:', emailResult.error)
      // Don't fail the signup if email fails, just log it
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. Please check your email to verify your account.',
      tenantId: tenant.id,
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create account. Please try again.' },
      { status: 500 }
    )
  }
}
