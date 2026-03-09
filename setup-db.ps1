# PowerShell script to setup the database

Write-Host "==========================================" -ForegroundColor Green
Write-Host "SEO Spider Database Setup" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

# Function to check if command exists
function Test-Command($Command) {
    $oldPreference = $ErrorActionPreference
    $ErrorActionPreference = 'stop'
    try {
        if (Get-Command $Command -ErrorAction Stop) { return $true }
    } catch { return $false }
    finally { $ErrorActionPreference = $oldPreference }
}

Write-Host "Step 1: Checking prerequisites..." -ForegroundColor Yellow

# Check PostgreSQL
if (Test-Command "psql") {
    Write-Host "  PostgreSQL (psql) found" -ForegroundColor Green
} else {
    Write-Host "  PostgreSQL not found. Please install PostgreSQL first." -ForegroundColor Red
    Write-Host "    Download from: https://www.postgresql.org/download/windows/" -ForegroundColor Cyan
    exit 1
}

# Check Redis
if (Test-Command "redis-cli") {
    Write-Host "  Redis (redis-cli) found" -ForegroundColor Green
} else {
    Write-Host "  Redis not found. Please install Redis." -ForegroundColor Yellow
    Write-Host "    Download from: https://github.com/microsoftarchive/redis/releases" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Step 2: Creating database..." -ForegroundColor Yellow

# Create database
$env:PGPASSWORD = "postgres"
try {
    psql -U postgres -c "CREATE DATABASE seo_spider;" 2>$null
    Write-Host "  Database 'seo_spider' created (or already exists)" -ForegroundColor Green
} catch {
    Write-Host "  Note: Database may already exist or connection failed" -ForegroundColor Yellow
    Write-Host "    Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Step 3: Installing dependencies..." -ForegroundColor Yellow

# Install root dependencies
try {
    npm install
    Write-Host "  Dependencies installed" -ForegroundColor Green
} catch {
    Write-Host "  Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 4: Setting up Prisma..." -ForegroundColor Yellow

# Navigate to web app
cd apps/web

# Generate Prisma client
try {
    npx prisma generate
    Write-Host "  Prisma client generated" -ForegroundColor Green
} catch {
    Write-Host "  Failed to generate Prisma client" -ForegroundColor Red
    exit 1
}

# Push database schema
try {
    npx prisma db push
    Write-Host "  Database schema pushed" -ForegroundColor Green
} catch {
    Write-Host "  Failed to push database schema" -ForegroundColor Red
    Write-Host "    Make sure PostgreSQL is running on port 5432" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Step 5: Seeding database..." -ForegroundColor Yellow

# Seed database
try {
    npm run db:seed
    Write-Host "  Database seeded" -ForegroundColor Green
} catch {
    Write-Host "  Failed to seed database (may be optional)" -ForegroundColor Yellow
}

# Go back to root
cd ..\..

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "To start the application, run:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
