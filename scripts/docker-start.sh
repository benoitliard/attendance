#!/bin/bash
set -e

echo "🐳 Starting Attendance Tracker with Docker..."
echo ""

cd "$(dirname "$0")/../backend"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Build and start all services
echo "📦 Building and starting containers..."
docker-compose up --build -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "🎉 Attendance Tracker is running!"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "   🌐 Web App:     http://localhost:3000"
    echo "   🔌 API Server:  http://localhost:3001"
    echo "   🗄️  Database:    postgresql://localhost:5432/attendance"
    echo ""
    echo "📋 Test Accounts:"
    echo "   Admin:   admin@attendance.app / admin123"
    echo "   Teacher: teacher@attendance.app / teacher123"
    echo ""
    echo "📝 Commands:"
    echo "   View logs:    docker-compose logs -f"
    echo "   Stop:         docker-compose down"
    echo "   Reset DB:     docker-compose down -v && docker-compose up --build -d"
    echo ""
else
    echo "❌ Something went wrong. Check logs with: docker-compose logs"
    exit 1
fi
