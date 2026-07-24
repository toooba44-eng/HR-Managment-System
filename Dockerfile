# Single-service image: builds the frontend and serves it from the backend,
# together with the API — one container, one public URL. Ideal for Railway.

# ---------- Stage 1: build the frontend (real API, same-origin) ----------
FROM node:20-bookworm-slim AS frontend
WORKDIR /web
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
# No VITE_DEMO -> the app calls the real /api on the same origin; base = "/"
RUN npm run build

# ---------- Stage 2: install backend deps (compile better-sqlite3) ----------
FROM node:20-bookworm-slim AS backend
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev

# ---------- Stage 3: runtime ----------
FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=backend /app/node_modules ./node_modules
COPY backend/package*.json ./
COPY backend/src ./src
# Frontend build served as static files by the backend (see server.js CLIENT_DIR)
COPY --from=frontend /web/dist ./public

# Data directories (mount a Railway volume at /app/database to persist SQLite)
RUN mkdir -p database uploads/documents

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||5000)+'/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "src/server.js"]
