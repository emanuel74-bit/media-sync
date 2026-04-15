#!/bin/sh
set -e

# Config from pod env
MEDIA_SYNC_API="${MEDIA_SYNC_API:-http://media-sync:3000}"
POD_ID="${POD_ID:-$(hostname)}"
POD_HOST="${POD_HOST:-$(hostname -i)}"
POD_TYPE="${POD_TYPE:-cluster}"
HEARTBEAT_INTERVAL="${HEARTBEAT_INTERVAL:-20}"   # seconds

register_pod() {
  echo "Registering pod $POD_ID with Media Sync API..."
  curl -fsS -X POST "$MEDIA_SYNC_API/api/pods/register" \
    -H "Content-Type: application/json" \
    -d "{\"podId\":\"$POD_ID\",\"host\":\"$POD_HOST\",\"type\":\"$POD_TYPE\"}" || true
}

heartbeat_pod() {
  curl -fsS -X POST "$MEDIA_SYNC_API/api/pods/heartbeat" \
    -H "Content-Type: application/json" \
    -d "{\"podId\":\"$POD_ID\"}" || true
}

# First registration (can retry until success)
until register_pod; do
  echo "Pod registration failed, retrying in 5s..."
  sleep 5
done

echo "Pod $POD_ID registered successfully. Starting heartbeat..."

# Start MediaMTX in background
/mediamtx &

# Heartbeat loop
while true; do
  heartbeat_pod
  sleep "$HEARTBEAT_INTERVAL"
done