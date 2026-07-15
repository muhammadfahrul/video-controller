#!/bin/bash

# Video Controller - Deploy Script
# Run all three services with a single command
# Auto-installs EVERYTHING - just run ./deploy.sh

set -e

echo "🚀 Starting Video Controller (Production)..."

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

# ============================================
# Auto-install Git if needed
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
    fi
}

# Check if we already have the project files
HAS_PROJECT_FILES=false
if [ -f "$PROJECT_ROOT/package.json" ]; then
    HAS_PROJECT_FILES=true
    echo "📁 Project files found in current directory"
fi

# Try to get files - git clone, zip download, or use existing files
if [ "$HAS_PROJECT_FILES" = false ]; then
    # Try git first
    if command -v git &> /dev/null; then
        echo "✅ Git $(git --version) detected"
        
        REPO_URL="https://github.com/muhammadfahrul/video-controller.git"
        PARENT_DIR="$(dirname "$PROJECT_ROOT")"
        REPO_NAME="video-controller"
        
        if [ ! -d "$PARENT_DIR/$REPO_NAME" ]; then
            echo "📥 Cloning repository..."
            cd "$PARENT_DIR"
            git clone "$REPO_URL" "$REPO_NAME"
        fi
        
        PROJECT_ROOT="$PARENT_DIR/$REPO_NAME"
        cd "$PROJECT_ROOT"
        HAS_PROJECT_FILES=true
    else
        # Try installing git
        echo "❌ Git is not installed!"
        install_git
        
        if command -v git &> /dev/null; then
            echo "✅ Git installed"
            
            REPO_URL="https://github.com/muhammadfahrul/video-controller.git"
            PARENT_DIR="$(dirname "$PROJECT_ROOT")"
            REPO_NAME="video-controller"
            
            echo "📥 Cloning repository..."
            cd "$PARENT_DIR"
            git clone "$REPO_URL" "$REPO_NAME"
            
            PROJECT_ROOT="$PARENT_DIR/$REPO_NAME"
            cd "$PROJECT_ROOT"
            HAS_PROJECT_FILES=true
        else
            # Download as ZIP as last resort
            echo "⬇️ Downloading as ZIP..."
            
            PARENT_DIR="$(dirname "$PROJECT_ROOT")"
            cd /tmp
            curl -fsSL "https://github.com/muhammadfahrul/video-controller/archive/refs/heads/main.zip" -o video-controller.zip
            unzip -q video-controller.zip
            mv video-controller-main "$PARENT_DIR/video-controller"
            rm video-controller.zip
            
            PROJECT_ROOT="$PARENT_DIR/video-controller"
            cd "$PROJECT_ROOT"
            HAS_PROJECT_FILES=true
        fi
    fi
fi

if [ "$HAS_PROJECT_FILES" = false ]; then
    echo "❌ Cannot get project files!"
    exit 1
fi

# ============================================
# Auto-install Node.js if not present
# ============================================
install_nodejs() {
    echo "🔧 Installing Node.js..."
    
    if command -v brew &> /dev/null; then
        brew install node
    elif command -v apt-get &> /dev/null; then
        # Remove old node packages first
        echo "🧹 Cleaning old Node.js packages..."
        sudo apt-get remove -y nodejs libnode-dev libnode72 2>/dev/null || true
        sudo apt-get autoremove -y
        
        # Install Node.js 20
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif command -v yum &> /dev/null; then
        sudo yum remove -y nodejs 2>/dev/null || true
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
        sudo yum install -y nodejs
    elif command -v dnf &> /dev/null; then
        sudo dnf remove -y nodejs 2>/dev/null || true
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
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

# Check if Node.js version is too old (need 16+)
NODE_MAJOR_VERSION=$(node -v 2>/dev/null | sed 's/v\([0-9]*\).*/\1/')

# Track if we upgraded Node.js
NODE_UPGRADED=false

# Auto-install Node.js if not present or version too old
if ! command -v node &> /dev/null || [ "$NODE_MAJOR_VERSION" -lt 16 ]; then
    echo "❌ Node.js $(node -v 2>/dev/null || echo 'not found') is too old or not installed!"
    install_nodejs
    NODE_UPGRADED=true
fi

# Refresh PATH to get new Node.js
export PATH="/usr/local/bin:$PATH"

# Auto-install npm if not present
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed!"
    install_nodejs
fi

echo "✅ Node.js $(node -v) and npm $(npm -v) detected"

# ============================================
# Clean node_modules if needed
# ============================================
# Always clean web/node_modules to avoid rolldown binding issues
if [ -d "$PROJECT_ROOT/web/node_modules" ]; then
    echo "🧹 Cleaning web node_modules..."
    rm -rf "$PROJECT_ROOT/web/node_modules"
    rm -f "$PROJECT_ROOT/web/package-lock.json"
fi

# Clean other node_modules if Node.js was upgraded
if [ "$NODE_UPGRADED" = true ]; then
    echo "🧹 Removing old node_modules (Node.js upgraded)..."
    rm -rf "$PROJECT_ROOT/node_modules"
    rm -rf "$PROJECT_ROOT/agent/node_modules"
    rm -rf "$PROJECT_ROOT/server/node_modules"
    rm -f "$PROJECT_ROOT/package-lock.json"
    rm -f "$PROJECT_ROOT/agent/package-lock.json"
    rm -f "$PROJECT_ROOT/server/package-lock.json"
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
