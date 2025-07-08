#!/bin/bash

# ChromaDB Docker Setup for Forest Integration
# Sets up ChromaDB server using Docker with proper configuration

set -e

echo "🐳 Setting up ChromaDB with Docker for Forest Integration"
echo "=" * 60

# Configuration
CHROMA_PORT=${CHROMA_PORT:-8000}
CHROMA_DATA_DIR=${CHROMA_DATA_DIR:-"./chromadb-data"}
CONTAINER_NAME="forest-chromadb"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

echo_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo_error "Docker is not installed or not in PATH"
    echo "Please install Docker from https://www.docker.com/get-started"
    exit 1
fi

echo_success "Docker is available"

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo_error "Docker is not running"
    echo "Please start Docker and try again"
    exit 1
fi

echo_success "Docker is running"

# Stop and remove existing container if it exists
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo_info "Stopping existing ChromaDB container..."
    docker stop $CONTAINER_NAME || true
    docker rm $CONTAINER_NAME || true
    echo_success "Existing container removed"
fi

# Create data directory
mkdir -p "$CHROMA_DATA_DIR"
echo_success "Data directory created: $CHROMA_DATA_DIR"

# Pull ChromaDB image
echo_info "Pulling ChromaDB Docker image..."
if docker pull chromadb/chroma:latest; then
    echo_success "ChromaDB image pulled successfully"
else
    echo_error "Failed to pull ChromaDB image"
    exit 1
fi

# Start ChromaDB container
echo_info "Starting ChromaDB container..."
CONTAINER_ID=$(docker run -d \
    --name $CONTAINER_NAME \
    -p ${CHROMA_PORT}:8000 \
    -v "$(pwd)/${CHROMA_DATA_DIR}:/chroma/chroma" \
    -e CHROMA_SERVER_CORS_ALLOW_ORIGINS="*" \
    --restart unless-stopped \
    chromadb/chroma:latest)

if [ $? -eq 0 ]; then
    echo_success "ChromaDB container started successfully"
    echo_info "Container ID: $CONTAINER_ID"
else
    echo_error "Failed to start ChromaDB container"
    exit 1
fi

# Wait for container to be ready
echo_info "Waiting for ChromaDB to be ready..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if curl -s http://localhost:${CHROMA_PORT}/api/v1/heartbeat &> /dev/null; then
        echo_success "ChromaDB is ready!"
        break
    fi
    
    attempt=$((attempt + 1))
    echo -n "."
    sleep 1
done

if [ $attempt -eq $max_attempts ]; then
    echo_error "ChromaDB failed to start within 30 seconds"
    echo "Container logs:"
    docker logs $CONTAINER_NAME
    exit 1
fi

# Test ChromaDB functionality
echo_info "Testing ChromaDB functionality..."

# Test heartbeat
HEARTBEAT=$(curl -s http://localhost:${CHROMA_PORT}/api/v1/heartbeat)
if [ $? -eq 0 ]; then
    echo_success "Heartbeat test passed"
else
    echo_error "Heartbeat test failed"
fi

# Test collections endpoint
COLLECTIONS=$(curl -s http://localhost:${CHROMA_PORT}/api/v1/collections)
if [ $? -eq 0 ]; then
    echo_success "Collections endpoint working"
else
    echo_error "Collections endpoint failed"
fi

# Display status
echo ""
echo "🎉 ChromaDB Setup Complete!"
echo "=" * 60
echo_info "Container Name: $CONTAINER_NAME"
echo_info "Port: $CHROMA_PORT"
echo_info "Data Directory: $CHROMA_DATA_DIR"
echo_info "Health Check: http://localhost:${CHROMA_PORT}/api/v1/heartbeat"
echo_info "Collections: http://localhost:${CHROMA_PORT}/api/v1/collections"

echo ""
echo "🔧 Forest Integration:"
echo "Environment variables set automatically:"
echo "export CHROMA_HOST=localhost"
echo "export CHROMA_PORT=$CHROMA_PORT"
echo "export CHROMA_DATA_DIR=$CHROMA_DATA_DIR"

echo ""
echo "📋 Management Commands:"
echo "• View logs:     docker logs $CONTAINER_NAME"
echo "• Stop server:   docker stop $CONTAINER_NAME"
echo "• Start server:  docker start $CONTAINER_NAME"
echo "• Remove server: docker stop $CONTAINER_NAME && docker rm $CONTAINER_NAME"

echo ""
echo "🚀 Ready to use with Forest!"
echo "ChromaDB will now work seamlessly with the Forest AI system."

# Set environment variables for current session
export CHROMA_HOST=localhost
export CHROMA_PORT=$CHROMA_PORT
export CHROMA_DATA_DIR=$CHROMA_DATA_DIR

echo ""
echo_success "Setup complete! ChromaDB is running and ready for Forest integration."