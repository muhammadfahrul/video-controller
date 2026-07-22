#!/bin/bash

# Video Controller - Deploy Script
# Run selected services with a single command
# Auto-installs dependencies - just run ./install.sh

set -e

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

# ============================================
# Interactive menu
# ============================================
show_menu() {
    echo "============================================"
    echo "   Video Controller - Deploy Script"
    echo "============================================"
    echo ""
    echo "Pilih aplikasi yang ingin diinstall:"
    echo ""
    echo "  [1] Room App       - Agent, Server, Web PWA"
    echo "  [2] Kasir          - Aplikasi Kasir (Cashier)"
    echo "  [3] Semua          - Room App + Kasir"
    echo ""
    echo "  [0] Keluar"
    echo ""
    echo -n "Masukkan pilihan [1-3]: "
}

# ============================================
# Parse menu selection
# ============================================
INSTALL_MODE=""

if [[ $# -gt 0 ]]; then
    # Command line argument provided
    case $1 in
        1|room)
            INSTALL_MODE="room"
            ;;
        2|kasir)
            INSTALL_MODE="kasir"
            ;;
        3|all)
            INSTALL_MODE="all"
            ;;
        0|exit)
            echo "Keluar..."
            exit 0
            ;;
        *)
            echo "Pilihan tidak valid: $1"
            exit 1
            ;;
    esac
else
    # Show interactive menu
    show_menu
    read -r choice
    echo ""
    
    case $choice in
        1)
            INSTALL_MODE="room"
            ;;
        2)
            INSTALL_MODE="kasir"
            ;;
        3)
            INSTALL_MODE="all"
            ;;
        0)
            echo "Keluar..."
            exit 0
            ;;
        *)
            echo "Pilihan tidak valid!"
            exit 1
            ;;
    esac
fi

# ============================================
# Show selected mode
# ============================================
echo "🚀 Starting Video Controller..."

case $INSTALL_MODE in
    all)
        echo "📦 Mode: Semua layanan (Room App + Kasir)"
        ;;
    room)
        echo "📦 Mode: Room App saja (agent, server, web)"
        ;;
    kasir)
        echo "📦 Mode: Kasir saja (cashier)"
        ;;
esac
echo ""

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

# Clean cashier/node_modules to avoid issues
if [ -d "$PROJECT_ROOT/cashier/node_modules" ]; then
    echo "🧹 Cleaning cashier node_modules..."
    rm -rf "$PROJECT_ROOT/cashier/node_modules"
    rm -f "$PROJECT_ROOT/cashier/package-lock.json"
fi

# Clean other node_modules if Node.js was upgraded
if [ "$NODE_UPGRADED" = true ]; then
    echo "🧹 Removing old node_modules (Node.js upgraded)..."
    rm -rf "$PROJECT_ROOT/node_modules"
    rm -rf "$PROJECT_ROOT/agent/node_modules"
    rm -rf "$PROJECT_ROOT/server/node_modules"
    rm -rf "$PROJECT_ROOT/web/node_modules"
    rm -rf "$PROJECT_ROOT/cashier/node_modules"
    rm -f "$PROJECT_ROOT/package-lock.json"
    rm -f "$PROJECT_ROOT/agent/package-lock.json"
    rm -f "$PROJECT_ROOT/server/package-lock.json"
    rm -f "$PROJECT_ROOT/web/package-lock.json"
    rm -f "$PROJECT_ROOT/cashier/package-lock.json"
fi

# ============================================
# Install dependencies based on mode
# ============================================
echo "📦 Checking dependencies..."

# Root dependencies (always needed for workspace)
if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
    echo "📦 Installing root dependencies..."
    cd "$PROJECT_ROOT" && npm install
fi

# Room App dependencies
if [ "$INSTALL_MODE" = "all" ] || [ "$INSTALL_MODE" = "room" ]; then
    if [ ! -d "$PROJECT_ROOT/agent/node_modules" ]; then
        echo "📦 Installing agent dependencies..."
        cd "$PROJECT_ROOT/agent" && npm install
    fi
    
    # Install Playwright browsers if not exists
    if [ ! -d "$HOME/.cache/ms-playwright" ]; then
        echo "🌐 Installing Playwright browsers..."
        cd "$PROJECT_ROOT/agent" && npx playwright install chromium --with-deps
    fi
    
    if [ ! -d "$PROJECT_ROOT/server/node_modules" ]; then
        echo "📦 Installing server dependencies..."
        cd "$PROJECT_ROOT/server" && npm install
    fi
    
    if [ ! -d "$PROJECT_ROOT/web/node_modules" ]; then
        echo "📦 Installing web dependencies..."
        cd "$PROJECT_ROOT/web" && npm install
    fi
fi

# Kasir dependencies
if [ "$INSTALL_MODE" = "all" ] || [ "$INSTALL_MODE" = "kasir" ]; then
    if [ ! -d "$PROJECT_ROOT/cashier/node_modules" ]; then
        echo "📦 Installing cashier dependencies..."
        cd "$PROJECT_ROOT/cashier" && npm install
    fi
fi

# ============================================
# Build based on mode
# ============================================
echo "🔨 Building services..."

if [ "$INSTALL_MODE" = "all" ] || [ "$INSTALL_MODE" = "room" ]; then
    echo "🔨 Building Room App (agent, server, web)..."
    cd "$PROJECT_ROOT/server" && npm run build
    cd "$PROJECT_ROOT/agent" && npm run build
    cd "$PROJECT_ROOT/web" && npm run build
fi

if [ "$INSTALL_MODE" = "all" ] || [ "$INSTALL_MODE" = "kasir" ]; then
    echo "🔨 Building Kasir (cashier)..."
    cd "$PROJECT_ROOT/cashier" && npm run build
fi

# ============================================
# Install xvfb for headless browser
# ============================================
install_xvfb() {
    echo "🔧 Installing xvfb (headless display)..."
    
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y xvfb
    elif command -v yum &> /dev/null; then
        sudo yum install -y xorg-x11-server-Xvfb
    elif command -v dnf &> /dev/null; then
        sudo dnf install -y xorg-x11-server-Xvfb
    fi
}

# Check if xvfb is needed (headless server)
if [ -z "$DISPLAY" ] && ! command -v xvfb-run &> /dev/null; then
    install_xvfb
fi

# ============================================
# Start services based on mode
# ============================================
echo "▶️ Starting services..."

# PIDs for cleanup
PIDS=""

# Start Room App services
if [ "$INSTALL_MODE" = "all" ] || [ "$INSTALL_MODE" = "room" ]; then
    echo "▶️ Starting Room App services..."
    
    cd "$PROJECT_ROOT/server" && npm run start &
    SERVER_PID=$!
    PIDS="$PIDS $SERVER_PID"
    echo "   - Server: PID $SERVER_PID"
    
    # Start agent with xvfb if no display
    if [ -z "$DISPLAY" ] && command -v xvfb-run &> /dev/null; then
        cd "$PROJECT_ROOT/agent" && xvfb-run -a npm run start &
        AGENT_PID=$!
    else
        cd "$PROJECT_ROOT/agent" && npm run start &
        AGENT_PID=$!
    fi
    PIDS="$PIDS $AGENT_PID"
    echo "   - Agent: PID $AGENT_PID"
    
    cd "$PROJECT_ROOT/web" && npm run preview:host &
    WEB_PID=$!
    PIDS="$PIDS $WEB_PID"
    echo "   - Web: PID $WEB_PID"
fi

# Start Kasir service
if [ "$INSTALL_MODE" = "all" ] || [ "$INSTALL_MODE" = "kasir" ]; then
    echo "▶️ Starting Kasir service..."
    
    cd "$PROJECT_ROOT/cashier" && npm run preview:host &
    CASHIER_PID=$!
    PIDS="$PIDS $CASHIER_PID"
    echo "   - Cashier: PID $CASHIER_PID"
fi

echo ""
echo "✅ All selected services started!"
echo ""
echo "Press Ctrl+C to stop all services"

# ============================================
# Cleanup function
# ============================================
cleanup() {
    echo ""
    echo "🛑 Stopping all services..."
    for pid in $PIDS; do
        kill $pid 2>/dev/null || true
    done
    echo "✅ All services stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for any process to exit
wait $PIDS
