#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mkdir -p "$ROOT/.data/mongodb" "$ROOT/.logs"

echo ""
echo "Starting services..."
echo ""

# ── MongoDB (native) ─────────────────────────────────────────────────────────
if pgrep -x mongod > /dev/null; then
  echo "  [mongo]  already running"
else
  mongod \
    --dbpath "$ROOT/.data/mongodb" \
    --port 27017 \
    --logpath "$ROOT/.logs/mongodb.log" \
    --fork
  echo "  [mongo]  started → mongodb://localhost:27017"
fi

# ── Redis (docker) ───────────────────────────────────────────────────────────
if docker ps --filter "name=redis" --filter "status=running" -q | grep -q .; then
  echo "  [redis]  already running (docker)"
else
  docker start redis 2>/dev/null || \
    docker run -d --name redis -p 6379:6379 redis:7-alpine \
      redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
  echo "  [redis]  started → redis://localhost:6379"
fi

# ── Qdrant (docker) ──────────────────────────────────────────────────────────
if docker ps --filter "name=qdrant" --filter "status=running" -q | grep -q .; then
  echo "  [qdrant] already running (docker)"
else
  docker start qdrant 2>/dev/null || \
    docker run -d --name qdrant -p 6333:6333 -p 6334:6334 \
      -v "$ROOT/.data/qdrant:/qdrant/storage" \
      qdrant/qdrant:v1.9.2
  echo "  [qdrant] started → http://localhost:6333"
fi

echo ""
echo "Run 'pnpm services:status' to verify."
echo ""