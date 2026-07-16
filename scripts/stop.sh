#!/usr/bin/env bash

echo ""
echo "Stopping services..."
echo ""

# Mongo — graceful shutdown via admin command, not kill -9
if pgrep -x mongod > /dev/null; then
  mongosh --quiet --eval "db.getSiblingDB('admin').shutdownServer()" 2>/dev/null || pkill -x mongod
  echo "  [mongo]  stopped"
else
  echo "  [mongo]  not running"
fi

docker stop redis  > /dev/null 2>&1 && echo "  [redis]  stopped"  || echo "  [redis]  not running"
docker stop qdrant > /dev/null 2>&1 && echo "  [qdrant] stopped" || echo "  [qdrant] not running"

echo ""