#!/bin/sh
set -e

# Config from pod env
MEDIA_SYNC_API="${MEDIA_SYNC_API:-http://media-sync:3000}"
POD_ID="${POD_ID:-$(hostname)}"
POD_HOST="${POD_HOST:-$(hostname -i | awk '{print $1}')}"
POD_TYPE="${POD_TYPE:-cluster}"
HEARTBEAT_INTERVAL="${HEARTBEAT_INTERVAL:-20}"   # seconds
REREGISTER_EVERY="${REREGISTER_EVERY:-15}"       # heartbeats between full re-registrations
REPORT_RESOURCES="${REPORT_RESOURCES:-1}"        # 0 to disable host resource reporting

# Echo: "cpu memory disk" as integer percentages (best-effort from /proc + df).
read_resources() {
  read -r _ u1 n1 s1 i1 w1 r1 q1 t1 _ < /proc/stat
  idle1=$((i1 + w1)); tot1=$((u1 + n1 + s1 + i1 + w1 + r1 + q1 + t1))
  sleep 1
  read -r _ u2 n2 s2 i2 w2 r2 q2 t2 _ < /proc/stat
  idle2=$((i2 + w2)); tot2=$((u2 + n2 + s2 + i2 + w2 + r2 + q2 + t2))
  dtot=$((tot2 - tot1)); didle=$((idle2 - idle1)); cpu=0
  [ "$dtot" -gt 0 ] && cpu=$(((100 * (dtot - didle)) / dtot))
  mt=$(awk '/^MemTotal/{print $2}' /proc/meminfo)
  ma=$(awk '/^MemAvailable/{print $2}' /proc/meminfo); mem=0
  [ -n "$mt" ] && [ "$mt" -gt 0 ] && mem=$(((100 * (mt - ma)) / mt))
  disk=$(df -P / 2>/dev/null | awk 'NR==2{gsub("%","",$5); print $5+0}')
  echo "$cpu $mem ${disk:-0}"
}

# Echo the `,"resources":{...}` JSON fragment, or nothing if disabled/unavailable.
resources_json() {
  [ "$REPORT_RESOURCES" = "1" ] || return 0
  set -- $(read_resources)
  [ -n "$1" ] && printf ',"resources":{"cpu":%s,"memory":%s,"disk":%s}' "$1" "$2" "$3"
}

register_pod() {
  curl -fsS -X POST "$MEDIA_SYNC_API/api/pods/register" \
    -H "Content-Type: application/json" \
    -d "{\"podId\":\"$POD_ID\",\"host\":\"$POD_HOST\",\"type\":\"$POD_TYPE\"$(resources_json)}" > /dev/null
}

heartbeat_pod() {
  curl -fsS -X POST "$MEDIA_SYNC_API/api/pods/heartbeat" \
    -H "Content-Type: application/json" \
    -d "{\"podId\":\"$POD_ID\"$(resources_json)}" > /dev/null || true
}

# Exit (and let the orchestrator restart the container) if MediaMTX died.
check_mediamtx() {
  if ! pgrep -f mediamtx > /dev/null; then
    echo "MediaMTX process not found, exiting..."
    exit 1
  fi
}

# Start MediaMTX first: media serving must never wait on the sync service.
/mediamtx &
sleep 5

# Register with retry until the sync service accepts the full metadata.
# A bare heartbeat must never be the call that creates the pod record —
# it would default the type to "cluster" and leave host empty.
echo "Registering pod $POD_ID ($POD_TYPE) with $MEDIA_SYNC_API..."
until register_pod; do
  echo "Pod registration failed, retrying in 5s..."
  check_mediamtx
  sleep 5
done
echo "Pod $POD_ID registered. Starting heartbeat loop..."

count=0
while true; do
  check_mediamtx
  count=$((count + 1))
  if [ $((count % REREGISTER_EVERY)) -eq 0 ]; then
    # Periodic full re-registration heals records lost to DB resets.
    register_pod || echo "Re-registration failed; will retry next cycle"
  else
    heartbeat_pod
  fi
  sleep "$HEARTBEAT_INTERVAL"
done
