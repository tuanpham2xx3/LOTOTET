#!/bin/bash
# ============================================
# Build và Push Docker Images lên Docker Hub
# ============================================
# Usage: ./build-push.sh <docker-hub-username> [tag]
# Example: ./build-push.sh tuan282 v1.0.0
# ============================================

set -e

# Check arguments
if [ -z "$1" ]; then
    echo "❌ Usage: ./build-push.sh <docker-hub-username> [tag]"
    echo "   Example: ./build-push.sh tuan282 v1.0.0"
    exit 1
fi

DOCKER_HUB_USERNAME=$1
TAG=${2:-latest}
ADMIN_API_URL=${3:-https://adminapi.iceteadev.site}

echo "🐳 Docker Hub Username: $DOCKER_HUB_USERNAME"
echo "🏷️  Tag: $TAG"
echo "🔗 Admin API URL: $ADMIN_API_URL"
echo ""

# Move to project root
cd "$(dirname "$0")/.."

# Login to Docker Hub
echo "🔐 Logging in to Docker Hub..."
docker login

# Build and push Admin API
echo ""
echo "📦 Building lototet-admin..."
docker build -f deploy/Dockerfile.admin -t $DOCKER_HUB_USERNAME/lototet-admin:$TAG .
echo "🚀 Pushing lototet-admin:$TAG..."
docker push $DOCKER_HUB_USERNAME/lototet-admin:$TAG

# Build and push Admin Web
echo ""
echo "📦 Building lototet-admin-web..."
docker build -f deploy/Dockerfile.admin-web \
    --build-arg VITE_ADMIN_API_URL=$ADMIN_API_URL \
    -t $DOCKER_HUB_USERNAME/lototet-admin-web:$TAG .
echo "🚀 Pushing lototet-admin-web:$TAG..."
docker push $DOCKER_HUB_USERNAME/lototet-admin-web:$TAG

# Tag as latest if not already
if [ "$TAG" != "latest" ]; then
    echo ""
    echo "🏷️  Tagging as latest..."
    docker tag $DOCKER_HUB_USERNAME/lototet-admin:$TAG $DOCKER_HUB_USERNAME/lototet-admin:latest
    docker tag $DOCKER_HUB_USERNAME/lototet-admin-web:$TAG $DOCKER_HUB_USERNAME/lototet-admin-web:latest
    docker push $DOCKER_HUB_USERNAME/lototet-admin:latest
    docker push $DOCKER_HUB_USERNAME/lototet-admin-web:latest
fi

echo ""
echo "✅ Done! Images pushed to Docker Hub:"
echo "   - $DOCKER_HUB_USERNAME/lototet-admin:$TAG"
echo "   - $DOCKER_HUB_USERNAME/lototet-admin-web:$TAG"
echo ""
echo "📋 To deploy on VPS, run:"
echo "   export DOCKER_HUB_USERNAME=$DOCKER_HUB_USERNAME"
echo "   export IMAGE_TAG=$TAG"
echo "   docker-compose -f docker-compose.admin.hub.yml up -d"
