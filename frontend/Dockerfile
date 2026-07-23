# ---------- Build stage ----------
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---------- Serve stage ----------
FROM nginx:1.27-alpine AS runtime
# Defaults; override at runtime (docker-compose / Railway injects its own PORT).
ENV BACKEND_URL=http://backend:5000 \
    PORT=80
# nginx image auto-runs envsubst on *.template files at startup, writing to /etc/nginx/conf.d/
COPY default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
