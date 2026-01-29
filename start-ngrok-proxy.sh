#!/bin/bash

# Script simplifié pour démarrer l'application avec ngrok
# Utilise le proxy Next.js pour router les appels API vers le backend

echo "🚀 Starting Attendance App with ngrok proxy..."

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed. Please install it first:"
    echo "   brew install ngrok"
    echo "   Or download from: https://ngrok.com/download"
    exit 1
fi

# Start Docker containers with rebuild to ensure latest config
echo "🐳 Starting Docker containers (with rebuild)..."
docker compose up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 5

# Check if services are running
if ! docker compose ps | grep -q "Up"; then
    echo "❌ Docker containers failed to start"
    docker compose logs
    exit 1
fi

echo "✅ Services are running:"
echo "   Web: http://localhost:3000"
echo "   API: http://localhost:3001"
echo ""
echo "📡 Starting ngrok tunnel for port 3000..."
echo "   This will expose your web app publicly"
echo "   API calls (/api/*) are automatically proxied through Next.js to the backend"
echo ""
echo "   Press Ctrl+C to stop ngrok and services"
echo ""

# Handle cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping Docker containers..."
    docker compose down
    echo "👋 Bye!"
}

trap cleanup INT TERM EXIT

# Run ngrok (blocking)
ngrok http 3000