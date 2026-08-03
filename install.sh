#!/bin/bash

# Video Controller - Deploy Script
# Run selected services with a single command
# Auto-installs dependencies - just run ./install.sh

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

# Source NVM for proper Node.js version (hardcoded path for reliability)
export NVM_DIR="/home/parkee/.nvm"
# Try to source NVM if it exists, use default version if available
\. "$NVM_DIR/nvm.sh" 2>/dev/null && nvm use default >/dev/null 2>&1 || true
# Ensure NVM node is first in PATH
export PATH="$NVM_DIR/versions/node/$(nvm version default 2>/dev/null || echo 'v22.18.0')/bin:$PATH"

set -e

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
    echo "  [A] Auto-start Room App"
    echo "  [B] Auto-start Kasir"
    echo "  [C] Auto-start Semua"
    echo ""
    echo "  [D] Remove Auto-start Room App"
    echo "  [E] Remove Auto-start Kasir"
    echo "  [F] Remove Auto-start Semua"
    echo ""
    echo "  [0] Keluar"
    echo ""
    echo -n "Masukkan pilihan [0-F]: "
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
        a|autostart|ar|autostart-room)
            INSTALL_MODE="autostart-room"
            ;;
        b|autostart-kasir|bk|autostart-cashier)
            INSTALL_MODE="autostart-kasir"
            ;;
        c|autostart-all|all)
            INSTALL_MODE="autostart-all"
            ;;
        d|remove-autostart-room|remove-room)
            INSTALL_MODE="remove-autostart-room"
            ;;
        e|remove-autostart-kasir|remove-kasir)
            INSTALL_MODE="remove-autostart-kasir"
            ;;
        f|remove-autostart-all|remove-all)
            INSTALL_MODE="remove-autostart-all"
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
        a|A)
            INSTALL_MODE="autostart-room"
            ;;
        b|B)
            INSTALL_MODE="autostart-kasir"
            ;;
        c|C)
            INSTALL_MODE="autostart-all"
            ;;
        d|D)
            INSTALL_MODE="remove-autostart-room"
            ;;
        e|E)
            INSTALL_MODE="remove-autostart-kasir"
            ;;
        f|F)
            INSTALL_MODE="remove-autostart-all"
            ;;
        r|R)
            INSTALL_MODE="remove-autostart"
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
    autostart-room)
        echo "📦 Mode: Setup Auto-start Room App"
        ;;
    autostart-kasir)
        echo "📦 Mode: Setup Auto-start Kasir"
        ;;
    autostart-all)
        echo "📦 Mode: Setup Auto-start Semua"
        ;;
    remove-autostart-room)
        echo "📦 Mode: Hapus Auto-start Room App"
        ;;
    remove-autostart-kasir)
        echo "📦 Mode: Hapus Auto-start Kasir"
        ;;
    remove-autostart-all)
        echo "📦 Mode: Hapus Auto-start Semua"
        ;;
esac
echo ""

# ============================================
# Ensure unzip is available
# ============================================
install_unzip() {
    echo "🔧 Installing unzip..."
    
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y unzip
    elif command -v yum &> /dev/null; then
        sudo yum install -y unzip
    elif command -v dnf &> /dev/null; then
        sudo dnf install -y unzip
    elif command -v brew &> /dev/null; then
        brew install unzip
    fi
}

# Check if we already have the project files
HAS_PROJECT_FILES=false
if [ -f "$PROJECT_ROOT/package.json" ]; then
    HAS_PROJECT_FILES=true
    echo "📁 Project files found in current directory"
fi

# Download repository archive directly as ZIP when project files are not present
if [ "$HAS_PROJECT_FILES" = false ]; then
    if ! command -v unzip &> /dev/null; then
        echo "❌ unzip is not installed!"
        install_unzip
    fi

    if ! command -v unzip &> /dev/null; then
        echo "❌ Cannot install unzip!"
        exit 1
    fi

    echo "⬇️ Downloading repository archive..."

    PARENT_DIR="$(dirname "$PROJECT_ROOT")"
    REPO_URL="https://github.com/muhammadfahrul/video-controller/archive/refs/heads/main.zip"
    ARCHIVE_NAME="video-controller-main.zip"
    EXTRACT_DIR="$PARENT_DIR/video-controller-main"
    DEST_DIR="$PARENT_DIR/video-controller"

    cd /tmp
    rm -f "$ARCHIVE_NAME"
    curl -fsSL "$REPO_URL" -o "$ARCHIVE_NAME"

    if [ -d "$DEST_DIR" ]; then
        rm -rf "$DEST_DIR"
    fi

    unzip -q "$ARCHIVE_NAME" -d "$PARENT_DIR"
    mv "$EXTRACT_DIR" "$DEST_DIR"

    PROJECT_ROOT="$DEST_DIR"
    cd "$PROJECT_ROOT"
    HAS_PROJECT_FILES=true
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
# Skip if auto-start mode (services will be started by systemd)
# ============================================
if [[ "$INSTALL_MODE" == autostart-* ]] || [[ "$INSTALL_MODE" == remove-autostart-* ]]; then
    # Skip starting services here, will be started by systemd
    echo "⏭️ Skipping manual start (auto-start mode)"
else
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

# End of manual start section
fi

# ============================================
# Auto-start setup (systemd)
# ============================================
setup_autostart() {
    local mode="$1"  # room, kasir, or all
    
    echo "📝 Membuat systemd service files..."
    
    # Source NVM to get correct Node.js and npm paths
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    # Get current user
    CURRENT_USER=$(whoami)
    
    # Create systemd service directory
    SYSTEMD_USER_DIR="$HOME/.config/systemd/user"
    mkdir -p "$SYSTEMD_USER_DIR"
    
    # Setup based on mode
    if [ "$mode" = "room" ] || [ "$mode" = "all" ]; then
        # Server service
        cat > "$SYSTEMD_USER_DIR/video-controller-server.service" << EOF
[Unit]
Description=Video Controller Server
After=network.target

[Service]
Type=simple
WorkingDirectory=$PROJECT_ROOT/server
ExecStart=/bin/bash -l -c 'source $NVM_DIR/nvm.sh && npm run start'
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=default.target
EOF
        echo "   ✅ video-controller-server.service"
        
        # Agent service (visible browser with DISPLAY access)
        cat > "$SYSTEMD_USER_DIR/video-controller-agent.service" << EOF
[Unit]
Description=Video Controller Agent
After=network.target video-controller-server.service
Wants=video-controller-server.service

[Service]
Type=simple
WorkingDirectory=$PROJECT_ROOT/agent
Environment=BROWSER_HEADLESS=false
Environment=DISPLAY=:0
Environment=XAUTHORITY=%h/.Xauthority
ExecStart=/bin/bash -l -c 'source /home/parkee/.nvm/nvm.sh && npm run start'
Restart=on-failure
RestartSec=10

[Install]
WantedBy=default.target
EOF
        echo "   ✅ video-controller-agent.service"
        
        # Web service
        cat > "$SYSTEMD_USER_DIR/video-controller-web.service" << EOF
[Unit]
Description=Video Controller Web
After=network.target

[Service]
Type=simple
WorkingDirectory=$PROJECT_ROOT/web
ExecStart=/bin/bash -l -c 'source $NVM_DIR/nvm.sh && npm run preview:host'
Restart=on-failure
RestartSec=10

[Install]
WantedBy=default.target
EOF
        echo "   ✅ video-controller-web.service"
    fi
    
    if [ "$mode" = "kasir" ] || [ "$mode" = "all" ]; then
        # Cashier service
        cat > "$SYSTEMD_USER_DIR/video-controller-cashier.service" << EOF
[Unit]
Description=Video Controller Cashier
After=network.target

[Service]
Type=simple
WorkingDirectory=$PROJECT_ROOT/cashier
ExecStart=/bin/bash -l -c 'source $NVM_DIR/nvm.sh && npm run preview:host'
Restart=on-failure
RestartSec=10

[Install]
WantedBy=default.target
EOF
        echo "   ✅ video-controller-cashier.service"
    fi
    
    # Reload systemd
    systemctl --user daemon-reload
    
    # Enable linger to allow user services to start on boot
    echo "🔐 Enabling user service linger..."
    loginctl enable-linger "$CURRENT_USER" 2>/dev/null || true
    
    echo ""
    echo "✅ Systemd services dibuat untuk mode: $mode"
    echo ""
    
    # Show enable commands based on mode
    if [ "$mode" = "room" ] || [ "$mode" = "all" ]; then
        echo "Untuk mengaktifkan Room App auto-start:"
        echo "  systemctl --user enable video-controller-server.service"
        echo "  systemctl --user enable video-controller-agent.service"
        echo "  systemctl --user enable video-controller-web.service"
        echo ""
        echo "Untuk memulai sekarang:"
        echo "  systemctl --user start video-controller-server.service"
        echo "  systemctl --user start video-controller-agent.service"
        echo "  systemctl --user start video-controller-web.service"
        echo ""
    fi
    
    if [ "$mode" = "kasir" ] || [ "$mode" = "all" ]; then
        echo "Untuk mengaktifkan Kasir auto-start:"
        echo "  systemctl --user enable video-controller-cashier.service"
        echo ""
        echo "Untuk memulai sekarang:"
        echo "  systemctl --user start video-controller-cashier.service"
        echo ""
    fi
    
    # Ask to enable now
    echo -n "Aktifkan auto-start sekarang? [y/N]: "
    read -r enable_now
    
    if [[ "$enable_now" =~ ^[Yy]$ ]]; then
        echo ""
        echo "🔄 Mengaktifkan services..."
        
        if [ "$mode" = "room" ] || [ "$mode" = "all" ]; then
            systemctl --user enable video-controller-server.service
            systemctl --user enable video-controller-agent.service
            systemctl --user enable video-controller-web.service
            
            echo ""
            echo "▶️ Memulai Room App services..."
            systemctl --user start video-controller-server.service
            sleep 2
            systemctl --user start video-controller-agent.service
            sleep 1
            systemctl --user start video-controller-web.service
        fi
        
        if [ "$mode" = "kasir" ] || [ "$mode" = "all" ]; then
            systemctl --user enable video-controller-cashier.service
            
            echo ""
            echo "▶️ Memulai Kasir service..."
            systemctl --user start video-controller-cashier.service
        fi
        
        echo ""
        echo "✅ Auto-start diaktifkan!"
    fi
}

# Remove auto-start
remove_autostart() {
    local mode="$1"  # room, kasir, or all
    
    echo "🗑️ Menghapus auto-start untuk mode: $mode..."
    
    SYSTEMD_USER_DIR="$HOME/.config/systemd/user"
    
    if [ "$mode" = "room" ] || [ "$mode" = "all" ]; then
        # Stop Room App services
        systemctl --user stop video-controller-server.service 2>/dev/null || true
        systemctl --user stop video-controller-agent.service 2>/dev/null || true
        systemctl --user stop video-controller-web.service 2>/dev/null || true
        
        # Disable Room App services
        systemctl --user disable video-controller-server.service 2>/dev/null || true
        systemctl --user disable video-controller-agent.service 2>/dev/null || true
        systemctl --user disable video-controller-web.service 2>/dev/null || true
        
        # Remove Room App service files
        rm -f "$SYSTEMD_USER_DIR/video-controller-server.service"
        rm -f "$SYSTEMD_USER_DIR/video-controller-agent.service"
        rm -f "$SYSTEMD_USER_DIR/video-controller-web.service"
        
        echo "   ✅ Room App services removed"
    fi
    
    if [ "$mode" = "kasir" ] || [ "$mode" = "all" ]; then
        # Stop Kasir service
        systemctl --user stop video-controller-cashier.service 2>/dev/null || true
        
        # Disable Kasir service
        systemctl --user disable video-controller-cashier.service 2>/dev/null || true
        
        # Remove Kasir service file
        rm -f "$SYSTEMD_USER_DIR/video-controller-cashier.service"
        
        echo "   ✅ Kasir service removed"
    fi
    
    # Reload systemd
    systemctl --user daemon-reload
    
    echo "✅ Auto-start ($mode) dihapus!"
}

# Handle auto-start modes
if [ "$INSTALL_MODE" = "autostart-room" ]; then
    echo "📦 Installing dependencies for Room App auto-start..."
    cd "$PROJECT_ROOT/agent" && npm install
    cd "$PROJECT_ROOT/server" && npm install
    cd "$PROJECT_ROOT/web" && npm install
    
    echo "🔨 Building Room App..."
    cd "$PROJECT_ROOT/server" && npm run build
    cd "$PROJECT_ROOT/agent" && npm run build
    cd "$PROJECT_ROOT/web" && npm run build
    
    setup_autostart "room"
    exit 0
fi

if [ "$INSTALL_MODE" = "autostart-kasir" ]; then
    echo "📦 Installing dependencies for Kasir auto-start..."
    cd "$PROJECT_ROOT/cashier" && npm install
    
    echo "🔨 Building Kasir..."
    cd "$PROJECT_ROOT/cashier" && npm run build
    
    setup_autostart "kasir"
    exit 0
fi

if [ "$INSTALL_MODE" = "autostart-all" ]; then
    echo "📦 Installing dependencies for all services..."
    cd "$PROJECT_ROOT/agent" && npm install
    cd "$PROJECT_ROOT/server" && npm install
    cd "$PROJECT_ROOT/web" && npm install
    cd "$PROJECT_ROOT/cashier" && npm install
    
    echo "🔨 Building all services..."
    cd "$PROJECT_ROOT/server" && npm run build
    cd "$PROJECT_ROOT/agent" && npm run build
    cd "$PROJECT_ROOT/web" && npm run build
    cd "$PROJECT_ROOT/cashier" && npm run build
    
    setup_autostart "all"
    exit 0
fi

if [ "$INSTALL_MODE" = "remove-autostart-room" ]; then
    remove_autostart "room"
    exit 0
fi

if [ "$INSTALL_MODE" = "remove-autostart-kasir" ]; then
    remove_autostart "kasir"
    exit 0
fi

if [ "$INSTALL_MODE" = "remove-autostart-all" ]; then
    remove_autostart "all"
    exit 0
fi

# Legacy support for old remove-autostart mode
if [ "$INSTALL_MODE" = "remove-autostart" ]; then
    remove_autostart "all"
    exit 0
fi

# Wait for any process to exit (only for manual start mode)
if [ -n "$PIDS" ]; then
    wait $PIDS
fi
