#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')
const Redis = require('ioredis')

async function checkHealth() {
  try {
    // Check PostgreSQL
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    })
    
    await prisma.$connect()
    await prisma.$disconnect()
    
    // Check Redis
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'redis',
      port: parseInt(process.env.REDIS_PORT) || 6379,
    })
    
    await redis.ping()
    await redis.disconnect()
    
    process.exit(0)
  } catch (error) {
    console.error('Health check failed:', error.message)
    process.exit(1)
  }
}

checkHealth()