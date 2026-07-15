#!/bin/bash

# Video Controller - Deploy Script
# Run all three services with a single command
# Auto-installs EVERYTHING - just run ./deploy.sh

set -e

echo "🚀 Starting Video Controller (Production)..."

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

# ============================================
# Auto-install Git if not present
# ============================================
install_git() {
    echo "🔧 Installing Git..."
    
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y git
    elif command -v yum &> /dev/null; then
        sudo yum install -y git
    elif command -v dnf &> /dev/null; then
        sudo dnf install -y git
    elif command -v brew &> /dev/null; then
        brew install git
    else
        echo "❌ Cannot auto-install Git. Please install Git manually."
        exit 1
    fi
}

# Check for Git installation
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed!"
    install_git
fi

echo "✅ Git $(git --version) detected"

# ============================================
# Auto-install Node.js if not present
# ============================================
install_nodejs() {
    echo "🔧 Installing Node.js..."
    
    if command -v brew &> /dev/null; then
        brew install node
    elif command -v apt-get &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif command -v yum &> /dev/null; then
        curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
        sudo yum install -y nodejs
    elif command -v dnf &> /dev/null; then
        curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
        sudo dnf install -y nodejs
    else
        echo "⬇️ Downloading Node.js LTS..."
        
        if [ "$(uname -m)" = "x86_64" ]; then
            ARCH="x64"
        elif [ "$(uname -m)" = "aarch64" ] || [ "$(uname -m)" = "arm64" ]; then
            ARCH="arm64"
        else
            ARCH="x86"
        fi
        
        NODE_VERSION="20.18.1"
        NODE_TAR="node-v${NODE_VERSION}-linux-${ARCH}.tar.xz"
        
        cd /tmp
        curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/${NODE_TAR}" -o "$NODE_TAR"
        sudo tar -xJf "$NODE_TAR" -C /usr/local --strip-components=1
        rm -f "$NODE_TAR"
        
        echo "✅ Node.js installed to /usr/local"
    fi
}

# Auto-install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    install_nodejs
fi

# Auto-install npm if not present
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed!"
    install_nodejs
fi

echo "✅ Node.js $(node -v) and npm $(npm -v) detected"

# ============================================
# Auto-clone repository if not a git repo
# ============================================
REPO_URL="https://github.com/muhammadfahrul/video-controller.git"

if [ ! -d "$PROJECT_ROOT/.git" ]; then
    echo "📥 Repository not found. Cloning..."
    
    PARENT_DIR="$(dirname "$PROJECT_ROOT")"
    REPO_NAME="video-controller"
    
    # Remove existing directory if not a git repo
    if [ -d "$PARENT_DIR/$REPO_NAME" ] && [ ! -d "$PARENT_DIR/$REPO_NAME/.git" ]; then
        echo "🗑️ Removing non-git directory..."
        rm -rf "$PARENT_DIR/$REPO_NAME"
    fi
    
    # Clone if doesn't exist
    if [ ! -d "$PARENT_DIR/$REPO_NAME" ]; then
        cd "$PARENT_DIR"
        git clone "$REPO_URL" "$REPO_NAME"
    fi
    
    # Update PROJECT_ROOT to cloned location
    PROJECT_ROOT="$PARENT_DIR/$REPO_NAME"
    cd "$PROJECT_ROOT"
fi

# ============================================
# Install dependencies if not present
# ============================================
echo "📦 Checking dependencies..."

if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
    echo "📦 Installing root dependencies..."
    cd "$PROJECT_ROOT" && npm install
fi

if [ ! -d "$PROJECT_ROOT/agent/node_modules" ]; then
    echo "📦 Installing agent dependencies..."
    cd "$PROJECT_ROOT/agent" && npm install
fi

if [ ! -d "$PROJECT_ROOT/server/node_modules" ]; then
    echo "📦 Installing server dependencies..."
    cd "$PROJECT_ROOT/server" && npm install
fi

if [ ! -d "$PROJECT_ROOT/web/node_modules" ]; then
    echo "📦 Installing web dependencies..."
    cd "$PROJECT_ROOT/web" && npm install
fi

# ============================================
# Build all services
# ============================================
echo "🔨 Building all services..."
cd "$PROJECT_ROOT" && npm run build

# ============================================
# Start all services in production mode
# ============================================
echo "▶️ Starting all services..."

cd "$PROJECT_ROOT/server" && npm run start &
SERVER_PID=$!

cd "$PROJECT_ROOT/agent" && npm run start &
AGENT_PID=$!

cd "$PROJECT_ROOT/web" && npm run preview:host &
WEB_PID=$!

echo "✅ All services started!"
echo "   - Server: PID $SERVER_PID"
echo "   - Agent: PID $AGENT_PID"
echo "   - Web: PID $WEB_PID"
echo ""
echo "Press Ctrl+C to stop all services"

# ============================================
# Cleanup function
# ============================================
cleanup() {
    echo ""
    echo "🛑 Stopping all services..."
    kill $SERVER_PID $AGENT_PID $WEB_PID 2>/dev/null || true
    echo "✅ All services stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for any process to exit
wait $SERVER_PID $AGENT_PID $WEB_PID
