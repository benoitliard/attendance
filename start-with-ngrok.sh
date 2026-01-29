#!/bin/bash

# Script pour démarrer l'application avec ngrok
# Usage: ./start-with-ngrok.sh
#
# Utilise le proxy Next.js - un seul tunnel ngrok nécessaire pour le port web
# Les appels API sont routés via /api/* et proxiés vers le backend

echo "🚀 Starting Attendance App with ngrok support..."

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed. Please install it first:"
    echo "   brew install ngrok"
    exit 1
fi

# Start Docker containers with rebuild
echo "🐳 Starting Docker containers..."
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

# Start ngrok in background
echo "📡 Starting ngrok tunnel..."
ngrok http 3000 --log=stdout > /tmp/ngrok-web.log 2>&1 &
NGROK_PID=$!
sleep 3

# Get ngrok URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | grep -o 'https://[^"]*' | head -1)

if [ -z "$NGROK_URL" ]; then
    echo "❌ Failed to get ngrok URL. Check /tmp/ngrok-web.log for details."
    kill $NGROK_PID 2>/dev/null
    docker compose down
    exit 1
fi

echo ""
echo "✨ Application is ready!"
echo ""
echo "   Local:"
echo "     Web: http://localhost:3000"
echo "     API: http://localhost:3001"
echo ""
echo "   Public (via ngrok):"
echo "     Web: $NGROK_URL"
echo "     API: $NGROK_URL/api (proxied through Next.js)"
echo ""
echo "Press Ctrl+C to stop..."

# Handle cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    docker compose down
    kill $NGROK_PID 2>/dev/null
    echo "👋 Bye!"
}

trap cleanup INT TERM

# Keep script running
while true; do
    sleep 1
done