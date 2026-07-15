# Video Controller

A real-time video queue management system with YouTube integration, featuring a web frontend, Node.js server, and Windows agent.

## Architecture

```
┌─────────┐     Socket.IO      ┌─────────┐     Socket.IO      ┌─────────┐
│   Web   │ ◄─────────────────► │ Server  │ ◄─────────────────► │  Agent  │
│ (React) │                     │ (Node.js)│                    │(Windows)│
└─────────┘                     └─────────┘                     └─────────┘
                                      │
                                 YouTube API
```

- **Web** - React frontend for user interface
- **Server** - Socket.io server for real-time communication and API
- **Agent** - Windows agent that controls the browser and player

## Prerequisites

- Node.js 18+
- npm or yarn

## Installation

```bash
# Install dependencies for all packages
cd agent && npm install
cd ../server && npm install
cd ../web && npm install
```

## Development

Run each service in separate terminals:

```bash
# Terminal 1 - Start the server
cd server
npm run dev

# Terminal 2 - Start the agent
cd agent
npm run dev

# Terminal 3 - Start the web frontend
cd web
npm run dev
```

## Project Structure

```
video-controller/
├── agent/           # Windows Agent (browser automation)
│   └── src/
│       ├── browser/  # Playwright browser management
│       ├── commands/# Command handlers
│       ├── config/  # Configuration
│       ├── player/  # YouTube player control
│       ├── queue/  # Queue management
│       ├── services/ # Business logic
│       └── socket/  # Socket.io client
├── server/          # Socket.io server
│   └── src/
│       ├── controllers/ # HTTP controllers
│       ├── routes/     # API routes
│       ├── services/   # Backend services
│       └── socket/    # Socket.io handlers
└── web/             # React frontend
    └── src/
        ├── components/ # React components
        ├── hooks/     # Custom hooks
        ├── pages/     # Page components
        ├── services/  # API services
        └── store/     # Zustand state
```

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Zustand, React Router
- **Server**: Express, Socket.io, Google APIs
- **Agent**: Playwright, Socket.io Client, Pino (logging)

## License

ISC
