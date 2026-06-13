# CanvasRoom

**Real-time collaborative whiteboard for teams.** Draw, diagram, and brainstorm together — changes appear instantly for every participant in the room.

## Live Demo

> Deploy your own in under 5 minutes (see [Deployment](#deployment)).

---

## Features

- **Authentication** — Register, log in, log out. Secure HTTP-only session cookies. Password hashing with bcrypt.
- **Whiteboard rooms** — Create, rename, delete rooms. Shareable invite links. Private by default, optionally public.
- **Real-time collaboration** — Multiple users in the same room. Live cursor positions with name labels. Presence list showing who's online.
- **Drawing tools** — Pen, Eraser, Line, Rectangle, Circle, Text. Color picker, stroke width, opacity, font size.
- **Undo / Redo** — Full history stack (up to 50 steps). Keyboard shortcuts (Ctrl+Z / Ctrl+Y).
- **Persistence** — Board state saved to PostgreSQL as structured JSON. Debounced autosave (2 s after last change). Reloads on return.
- **Clean UI** — Dashboard with room cards, empty states, loading states, collaborator avatars, save status indicator.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + Radix UI primitives |
| Real-time | Socket.IO (custom HTTP server) |
| State | Zustand |
| ORM | Prisma 5 |
| Database | PostgreSQL (Neon / Supabase) |
| Auth | Custom session tokens + bcrypt |
| Icons | Lucide React |
| Deploy | Vercel + managed Postgres |

---

## Architecture

```
Browser
├── Next.js App Router pages
│   ├── /login, /register          → Auth pages
│   ├── /dashboard                 → Room list
│   └── /board/[roomId]            → Whiteboard canvas
│
├── Zustand store (useCanvasStore)
│   ├── objects[]                  → Committed drawing objects
│   ├── drawingObject              → In-progress stroke (ephemeral)
│   ├── history[][]                → Undo/redo stack
│   └── cursors, presenceUsers     → Real-time collaboration state
│
└── Socket.IO client
    ├── room:join / room:leave
    ├── cursor:move → cursor:update (broadcast to others)
    └── object:draw / update / delete (broadcast to others)

Server (custom Node.js HTTP + Next.js)
├── Next.js API routes (/api/*)    → REST: auth, rooms, board state
└── Socket.IO server
    ├── In-memory room presence    → Map<roomId, Map<socketId, User>>
    └── Broadcasts drawing events to room peers (no DB write per event)

PostgreSQL (via Prisma)
├── User, Session
├── Room, RoomMember
├── RoomSnapshot                   → Full board state, upserted on autosave
└── WhiteboardObject               → Individual objects (for future granular sync)
```

**Key design decisions:**

- **Ephemeral vs durable state**: Live cursor moves and in-progress strokes stay in Socket.IO memory only. Completed objects are broadcast via socket *and* saved to Postgres via debounced autosave (2 s delay).
- **Snapshot model**: Board state is stored as a single `RoomSnapshot` JSON blob, not individual events. This keeps queries simple and load time fast. The version counter enables optimistic concurrency checks.
- **Custom server**: Socket.IO requires a persistent Node.js process, so we bypass `next start` with a minimal `server/index.ts` that initializes both Next.js and Socket.IO on the same HTTP server.

---

## Local Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database (or use [Neon](https://neon.tech) free tier)

### Steps

```bash
# 1. Clone and install
git clone <your-repo-url>
cd canvas-room
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and a random SESSION_SECRET

# 3. Push database schema
npm run db:push

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — register an account and create a room.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (e.g. from Neon) |
| `SESSION_SECRET` | Random 32-char secret for session signing |
| `NEXT_PUBLIC_APP_URL` | Full URL of your app (e.g. `https://your-app.vercel.app`) |

Generate `SESSION_SECRET`:
```bash
openssl rand -base64 32
```

---

## Database Setup

```bash
# Apply schema to your database (development)
npm run db:push

# Or run migrations (production-safe)
npm run db:migrate

# Open Prisma Studio to browse data
npm run db:studio
```

---

## Deployment

### Vercel + Neon (recommended)

1. **Create a Neon database** at [neon.tech](https://neon.tech) — copy the connection string.
2. **Push to GitHub** (make sure `.env` is in `.gitignore` ✓).
3. **Import to Vercel** → set environment variables (`DATABASE_URL`, `SESSION_SECRET`, `NEXT_PUBLIC_APP_URL`).
4. **Override the build command** in Vercel settings:
   - Build command: `npm run db:generate && next build`
   - Output: `.next`

> **Note on Socket.IO**: Vercel's serverless functions don't support persistent WebSocket connections. For production real-time, deploy the custom server (`server/index.ts`) to Railway, Render, or Fly.io instead, pointing at your Neon database. Vercel works perfectly for the static/API portions without real-time.

### Railway (full real-time support)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy
railway login
railway init
railway up
```

Set the same env vars in the Railway dashboard. Railway runs `npm start` which launches the custom server with Socket.IO.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (Next.js + Socket.IO) |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:migrate` | Run database migrations |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:generate` | Regenerate Prisma client |

---

## What This Project Demonstrates

This project was built as a **portfolio piece** to demonstrate production-level full-stack engineering. Specifically:

### Real-Time Synchronization
Socket.IO broadcasts drawing events to all room participants instantly. Cursor positions update at 60fps without touching the database. The separation of ephemeral (socket) and durable (Postgres) state is a core architectural decision.

### WebSocket Architecture
A custom Node.js HTTP server runs both the Next.js request handler and the Socket.IO server on the same port. In-memory presence maps (`Map<roomId, Map<socketId, User>>`) track who's in each room without any database overhead.

### Canvas Rendering
All drawing is done on an HTML5 `<canvas>` element with a custom rendering loop. Objects are stored as structured data (points, coordinates, styles), not rasterized images — making them resolution-independent and queryable.

### Persistent Collaborative State
Board state is stored as a `RoomSnapshot` JSON blob in PostgreSQL. Autosave triggers 2 seconds after the last change (debounced), keeping write volume low. When a user rejoins a room, the full board state is restored from the snapshot.

### Authenticated Multi-User Workflows
Sessions use HTTP-only cookies with server-side token storage in Postgres (not JWTs stored in localStorage). Room access control supports owner/member/public tiers. Share tokens let unauthenticated viewers join with a link.

### Full-Stack TypeScript Engineering
Shared `types/index.ts` defines all domain models used across API routes, Socket.IO events, Zustand store, and React components. Prisma generates a typed client from the schema. Zero `any` types in production code.

