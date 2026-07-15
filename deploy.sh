#!/bin/bash

# Video Controller - Deploy Script
# Run all three services with a single command

set -e

echo "🚀 Starting Video Controller (Production)..."

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing root dependencies..."
    npm install
fi

if [ ! -d "agent/node_modules" ]; then
    echo "📦 Installing agent dependencies..."
    cd agent && npm install && cd ..
fi

if [ ! -d "server/node_modules" ]; then
    echo "📦 Installing server dependencies..."
    cd server && npm install && cd ..
fi

if [ ! -d "web/node_modules" ]; then
    echo "📦 Installing web dependencies..."
    cd web && npm install && cd ..
fi

# Build all services
echo "🔨 Building all services..."
npm run build

# Start all services in production mode (background)
echo "▶️ Starting all services..."

cd "$(dirname "$0")/server" && npm run start &
SERVER_PID=$!

cd "$(dirname "$0")/agent" && npm run start &
AGENT_PID=$!

cd "$(dirname "$0")/web" && npm run preview:host &
WEB_PID=$!

echo "✅ All services started!"
echo "   - Server: PID $SERVER_PID"
echo "   - Agent: PID $AGENT_PID"
echo "   - Web: PID $WEB_PID"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for any process to exit
wait $SERVER_PID $AGENT_PID $WEB_PID
