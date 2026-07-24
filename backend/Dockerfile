# ---------- Build stage: compile native deps (better-sqlite3) ----------
FROM node:20-bookworm-slim AS build

# Toolchain required to compile better-sqlite3 from source when no prebuilt binary is available
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ---------- Runtime stage ----------
FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Copy installed (already-built) node_modules and source
COPY --from=build /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src

# Data directories (mounted as volumes in compose)
RUN mkdir -p database uploads/documents

EXPOSE 5000

# Lightweight healthcheck against the API
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "src/server.js"]
