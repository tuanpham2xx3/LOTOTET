# ============================================
# Build và Push Docker Images lên Docker Hub (Windows)
# ============================================
# Usage: .\build-push.ps1 -Username <docker-hub-username> [-Tag <tag>]
# Example: .\build-push.ps1 -Username tuanpham2xx3 -Tag v1.0.0
# ============================================

param(
    [Parameter(Mandatory=$true)]
    [string]$Username,
    
    [string]$Tag = "latest",
    
    [string]$AdminApiUrl = "https://adminapi.iceteadev.site"
)

$ErrorActionPreference = "Stop"

Write-Host "🐳 Docker Hub Username: $Username" -ForegroundColor Cyan
Write-Host "🏷️  Tag: $Tag" -ForegroundColor Cyan
Write-Host "🔗 Admin API URL: $AdminApiUrl" -ForegroundColor Cyan
Write-Host ""

# Move to project root
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $ProjectRoot

# Login to Docker Hub
Write-Host "🔐 Logging in to Docker Hub..." -ForegroundColor Yellow
docker login
if ($LASTEXITCODE -ne 0) { exit 1 }

# Build and push Admin API
Write-Host ""
Write-Host "📦 Building lototet-admin..." -ForegroundColor Yellow
docker build -f deploy/Dockerfile.admin -t "$Username/lototet-admin:$Tag" .
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "🚀 Pushing lototet-admin:$Tag..." -ForegroundColor Yellow
docker push "$Username/lototet-admin:$Tag"
if ($LASTEXITCODE -ne 0) { exit 1 }

# Build and push Admin Web
Write-Host ""
Write-Host "📦 Building lototet-admin-web..." -ForegroundColor Yellow
docker build -f deploy/Dockerfile.admin-web `
    --build-arg VITE_ADMIN_API_URL=$AdminApiUrl `
    -t "$Username/lototet-admin-web:$Tag" .
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "🚀 Pushing lototet-admin-web:$Tag..." -ForegroundColor Yellow
docker push "$Username/lototet-admin-web:$Tag"
if ($LASTEXITCODE -ne 0) { exit 1 }

# Build and push Web Game
Write-Host ""
Write-Host "📦 Building lototet-web..." -ForegroundColor Yellow
docker build -f deploy/Dockerfile.web `
    --build-arg NEXT_PUBLIC_ADMIN_URL=$AdminApiUrl `
    --build-arg NEXT_PUBLIC_SOCKET_URL="https://ltapi.iceteadev.site" `
    --build-arg NEXT_PUBLIC_API_URL="https://ltapi.iceteadev.site" `
    -t "$Username/lototet-web:$Tag" .
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "🚀 Pushing lototet-web:$Tag..." -ForegroundColor Yellow
docker push "$Username/lototet-web:$Tag"
if ($LASTEXITCODE -ne 0) { exit 1 }

# Tag as latest if not already
if ($Tag -ne "latest") {
    Write-Host ""
    Write-Host "🏷️  Tagging as latest..." -ForegroundColor Yellow
    docker tag "$Username/lototet-admin:$Tag" "$Username/lototet-admin:latest"
    docker tag "$Username/lototet-admin-web:$Tag" "$Username/lototet-admin-web:latest"
    docker tag "$Username/lototet-web:$Tag" "$Username/lototet-web:latest"
    docker push "$Username/lototet-admin:latest"
    docker push "$Username/lototet-admin-web:latest"
    docker push "$Username/lototet-web:latest"
}

Write-Host ""
Write-Host "✅ Done! Images pushed to Docker Hub:" -ForegroundColor Green
Write-Host "   - $Username/lototet-admin:$Tag"
Write-Host "   - $Username/lototet-admin-web:$Tag"
Write-Host "   - $Username/lototet-web:$Tag"
Write-Host ""
Write-Host "📋 To deploy on VPS, run:" -ForegroundColor Cyan
Write-Host "   export DOCKER_HUB_USERNAME=$Username"
Write-Host "   export IMAGE_TAG=$Tag"
Write-Host "   docker-compose -f docker-compose.admin.hub.yml up -d"
Write-Host "   docker-compose -f docker-compose.web.hub.yml up -d"
