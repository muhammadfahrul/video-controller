# Video Controller

A real-time video playlist management system with YouTube integration, featuring a web frontend, Node.js server, and Windows agent. Control video playback remotely and manage a shared playlist across multiple clients.

## Features

- **Real-time Playlist Management** - Add, remove, and reorder videos in a shared playlist
- **Remote Playback Control** - Play, pause, skip, and adjust volume from any connected client
- **YouTube Integration** - Seamlessly play YouTube videos with full DOM control
- **Multi-client Support** - Multiple web clients can connect simultaneously via Socket.IO
- **Health Monitoring** - Automatic health checks for browser, player, and network status
- **Auto-recovery** - Intelligent recovery system handles common failure scenarios
- **Persistent Storage** - Playlist and player state are persisted to JSON files

## Architecture

```
┌─────────┐     Socket.IO      ┌─────────┐     Socket.IO      ┌─────────┐
│   Web   │ ◄─────────────────► │ Server  │ ◄─────────────────► │  Agent  │
│ (React) │                     │ (Node.js)│                    │(Windows)│
└─────────┘                     └─────────┘                     └─────────┘
        │                            │                              │
        │                            │                              │
        ▼                            ▼                              ▼
┌─────────┐                  YouTube API
│ Cashier │
│ (React) │
└─────────┘
```

- **Web** - React PWA frontend for user interface (放在PC包厢)
- **Cashier** - React frontend for billing and timer management (放在PC收银台)
- **Server** - Socket.io server for real-time communication and API
- **Agent** - Windows agent that controls the browser and player (放在每个PC包厢)

## Prerequisites

- Node.js 18+
- npm or yarn
- Google Chrome/Chromium (for Playwright)

## Installation

```bash
# Install dependencies for all packages
cd agent && npm install
cd ../server && npm install
cd ../web && npm install
```

## Configuration

Each component has its own configuration file:

| File | Description |
|------|-------------|
| `agent/src/config/config.json` | Agent settings (port, browser options) |
| `server/src/config/` | Server settings |
| `web/src/config/` | Frontend settings |

## Development

Run each service in separate terminals:

```bash
# Terminal 1 - Start the server
cd server
npm run dev

# Terminal 2 - Start the agent (repeat for each room)
cd agent
npm run dev

# Terminal 3 - Start the web frontend
cd web
npm run dev

# Terminal 4 - Start the cashier app
cd cashier
npm run dev
```

The services will be available at:
- **Web UI**: http://localhost:5173
- **Cashier UI**: http://localhost:5174
- **Server API**: http://localhost:53331

## Deployment

### Quick Deploy

```bash
# Linux/macOS
./deploy.sh

# Windows PowerShell
./deploy.ps1
```

### Manual Deployment

```bash
# Build all packages
cd agent && npm run build
cd ../server && npm run build
cd ../web && npm run build

# Start services (production)
cd server && npm start
cd ../agent && npm start
```

## API Overview

### Socket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `playlist:add` | Web → Server | Add video to playlist |
| `playlist:remove` | Web → Server | Remove video from playlist |
| `playlist:update` | Server → Web | Playlist updated |
| `player:control` | Server → Agent | Play/pause/skip commands |
| `player:status` | Agent → Server | Current player state |
| `heartbeat` | Agent → Server | Agent heartbeat |

### REST Endpoints

- `GET /api/playlist` - Get current playlist
- `GET /api/player/status` - Get player status
- `GET /api/health` - Get system health

## Project Structure

```
video-controller/
├── agent/           # Windows Agent (browser automation)
│   └── src/
│       ├── browser/  # Playwright browser management
│       ├── commands/# Command handlers
│       ├── config/  # Configuration
│       ├── player/  # YouTube player control
│       ├── playlist/  # Playlist management
│       ├── services/ # Business logic
│       └── socket/  # Socket.io client
├── server/          # Socket.io server
│   └── src/
│       ├── controllers/ # HTTP controllers
│       ├── routes/     # API routes
│       ├── services/   # Backend services
│       └── socket/    # Socket.io handlers
├── web/             # React frontend
│   └── src/
│       ├── components/ # React components
│       ├── hooks/     # Custom hooks
│       ├── pages/     # Page components
│       ├── services/  # API services
│       └── store/     # Zustand state
├── deploy.sh         # Linux/macOS deployment script
└── deploy.ps1        # Windows deployment script
```

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Zustand, React Router
- **Server**: Express, Socket.io, Google APIs
- **Agent**: Playwright, Socket.io Client, Pino (logging)

## Troubleshooting

### Agent won't connect
- Verify server is running on the configured port
- Check network/firewall settings
- Review agent logs for connection errors

### YouTube player not responding
- Ensure browser is launched with required permissions
- Check that YouTube page loads correctly
- Verify player DOM selectors are up to date

### Playlist not syncing
- Check Socket.IO connection status
- Verify JSON storage files are writable
- Review server logs

## License

ISC
