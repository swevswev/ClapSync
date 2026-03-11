#!/bin/bash

# ClapSync Backend - ECR Deployment Script
# Usage: ./deploy-to-ecr.sh [region] [account-id]

set -e

REGION=${1:-us-east-1}
ACCOUNT_ID=${2}
REPO_NAME="clapsync-backend"
IMAGE_NAME="clapsync-backend"

if [ -z "$ACCOUNT_ID" ]; then
    echo "Error: AWS Account ID required"
    echo "Usage: ./deploy-to-ecr.sh [region] [account-id]"
    echo "Example: ./deploy-to-ecr.sh us-east-1 123456789012"
    exit 1
fi

ECR_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO_NAME}"

echo "🚀 Starting deployment to ECR..."
echo "Region: ${REGION}"
echo "Account ID: ${ACCOUNT_ID}"
echo "Repository: ${REPO_NAME}"
echo ""

# Check if repository exists, create if not
echo "📦 Checking ECR repository..."
if ! aws ecr describe-repositories --repository-names ${REPO_NAME} --region ${REGION} &> /dev/null; then
    echo "Creating ECR repository..."
    aws ecr create-repository --repository-name ${REPO_NAME} --region ${REGION}
    echo "✅ Repository created"
else
    echo "✅ Repository exists"
fi

# Login to ECR
echo ""
echo "🔐 Logging into ECR..."
aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ECR_URI}

# Build Docker image
echo ""
echo "🔨 Building Docker image..."
docker build -t ${IMAGE_NAME}:latest .

# Tag image
echo ""
echo "🏷️  Tagging image..."
docker tag ${IMAGE_NAME}:latest ${ECR_URI}:latest
docker tag ${IMAGE_NAME}:latest ${ECR_URI}:$(date +%Y%m%d-%H%M%S)

# Push to ECR
echo ""
echo "📤 Pushing image to ECR..."
docker push ${ECR_URI}:latest
docker push ${ECR_URI}:$(date +%Y%m%d-%H%M%S)

echo ""
echo "✅ Deployment complete!"
echo "Image URI: ${ECR_URI}:latest"
echo ""
echo "Next steps:"
echo "1. Update your ECS task definition with the new image URI"
echo "2. Update your ECS service to use the new task definition"
echo "3. Set environment variables in ECS task definition:"
echo "   - FRONTEND_URL"
echo "   - AWS_REGION"
echo "   - AUDIO_SESSION_TABLE_NAME"
echo "   - USER_TABLE_NAME"
echo "   - S3_BUCKET_NAME"
echo "   - AUDIO_SESSION_USER_SIZE"

