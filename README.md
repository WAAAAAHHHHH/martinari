# Martinari

**Browser-based, privacy focused, "P2P file transfer. No accounts. No cloud. Just share.".**

Open → Create room → Share code → Transfer files directly between browsers via WebRTC.

---
### Quick Personal Info
-Dm @martinari.info on Instragram for support/help/talking.

-Check contributions.md for a free ad of your personal website/account, images arent accepted(link,text,small logo's accepted only).

## Quick Start

### Prerequisites
- Node.js 18+
- npm 8+

### Install dependencies
```bash
npm install
```

### Development
```bash
# Terminal 1 — Server (port 3001)
cd packages/server
npm run dev

# Terminal 2 — Client (port 5173)
cd packages/client
npm run dev
```

Open http://localhost:5173

### Production build
```bash
npm run build
```

---

## Terminal CLI (Headless P2P Transfer)

Transfer files directly from your command line without ever opening a browser!

### Option A: Zero-Install Standalone File
Simply download `martina.js` and run it with Node.js:
```bash
# Join an existing room:
node martina.js join <ROOM_CODE>
# or shorthand:
node martina.js mjoin <ROOM_CODE>

# Create a new room from terminal:
node martina.js create

# Quick one-line send:
node martina.js send <ROOM_CODE> ./path/to/file.png
```

### Option B: Global CLI / Package
```bash
# Link the CLI globally:
cd packages/cli
npm link

# Now run anywhere:
mjoin <ROOM_CODE>
# or
martina create
```

Inside any active CLI room, you can type `/send <file>` anytime, drag-and-drop files into the terminal, or view peers with `/peers`. Incoming files are automatically downloaded with live speed and progress bars!

---

## Architecture

```
Browser A ──WebSocket──► Server (signaling only)
Browser A ◄──WebSocket── Server
Browser A ◄──────────────────────────── WebRTC DataChannel ──► Browser B
                              (files travel here, 
                              never via server)
```

- **Server**: Fastify + WebSocket — creates rooms, routes SDP/ICE, never stores files
- **Client**: React + Vite + TailwindCSS + Framer Motion

## Environment Variables

Server (`packages/server/.env`):
```
PORT=3001
```

Client (`packages/client/.env`):
```
VITE_WS_URL=ws://localhost:3001
VITE_API_URL=http://localhost:3001
```
