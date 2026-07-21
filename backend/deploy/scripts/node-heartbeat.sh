#!/bin/sh
set -e

# Config from node env
MEDIA_SYNC_API="${MEDIA_SYNC_API:-http://media-sync:3000}"
NODE_ID="${NODE_ID:-$(hostname)}"
NODE_HOST="${NODE_HOST:-$(hostname -i)}"
NODE_TYPE="${NODE_TYPE:-cluster}"
HEARTBEAT_INTERVAL="${HEARTBEAT_INTERVAL:-20}"   # seconds

register_node() {
  echo "Registering node $NODE_ID with Media Sync API..."
  curl -fsS -X POST "$MEDIA_SYNC_API/api/nodes/register" \
    -H "Content-Type: application/json" \
    -d "{\"nodeId\":\"$NODE_ID\",\"host\":\"$NODE_HOST\",\"type\":\"$NODE_TYPE\"}" || true
}

heartbeat_node() {
  curl -fsS -X POST "$MEDIA_SYNC_API/api/nodes/heartbeat" \
    -H "Content-Type: application/json" \
    -d "{\"nodeId\":\"$NODE_ID\"}" || true
}

# First registration (can retry until success)
until register_node; do
  echo "Node registration failed, retrying in 5s..."
  sleep 5
done

echo "Node $NODE_ID registered successfully. Starting heartbeat..."

# Start MediaMTX in background
/mediamtx &

# Heartbeat loop
while true; do
  heartbeat_node
  sleep "$HEARTBEAT_INTERVAL"
done