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
