# E2E API smoke test for the media-sync stack (PowerShell 5.1 compatible).
# The stack must be running; start it with:  npm run stack:up
# Or let this script start it:               .\test.ps1 -Up

param(
    [switch]$Up
)

$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:3000"
$mediamtxAuth = @{ Authorization = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("sync:syncpass")) }

if ($Up) {
    Write-Host "Starting Docker Compose stack..."
    docker-compose -f deploy/docker/compose.local.yml up -d --build
    Write-Host "Waiting for services to be ready..."
    Start-Sleep -Seconds 30
}

$script:passed = 0
$script:failed = 0

function Invoke-Check {
    param(
        [string]$Name,
        [scriptblock]$Action
    )
    try {
        $result = & $Action
        $script:passed++
        Write-Host "[PASS] $Name" -ForegroundColor Green
        return $result
    } catch {
        $script:failed++
        Write-Host "[FAIL] $Name -- $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# --- MediaMTX nodes (v3 API, internal auth) ---------------------------------

Invoke-Check "MediaMTX ingest v3 API (:9000)" {
    Invoke-RestMethod -Uri "http://localhost:9000/v3/paths/list" -Headers $mediamtxAuth
} | Out-Null

# Cluster pods are not reached on a fixed host port (scaled mode publishes none);
# their health is verified via pod registration in GET /api/pods/active below.

# --- Sync service read endpoints ---------------------------------------------

Invoke-Check "GET /api/streams" { Invoke-RestMethod -Uri "$baseUrl/api/streams" } | Out-Null
Invoke-Check "GET /api/streams/assignment" { Invoke-RestMethod -Uri "$baseUrl/api/streams/assignment" } | Out-Null
Invoke-Check "GET /api/alerts" { Invoke-RestMethod -Uri "$baseUrl/api/alerts" } | Out-Null
Invoke-Check "GET /api/metrics/stream/test" { Invoke-RestMethod -Uri "$baseUrl/api/metrics/stream/test" } | Out-Null
Invoke-Check "GET /api/stream-inspection" { Invoke-RestMethod -Uri "$baseUrl/api/stream-inspection" } | Out-Null
Invoke-Check "GET /api/docs (Swagger UI)" { Invoke-WebRequest -Uri "$baseUrl/api/docs" -UseBasicParsing } | Out-Null

# --- Pod registration lifecycle ----------------------------------------------

$podBody = @{ podId = "smoke-test-pod"; host = "127.0.0.1"; type = "cluster" } | ConvertTo-Json
Invoke-Check "POST /api/pods/register" {
    Invoke-RestMethod -Uri "$baseUrl/api/pods/register" -Method POST -Body $podBody -ContentType "application/json"
} | Out-Null

Invoke-Check "POST /api/pods/heartbeat" {
    $hb = @{ podId = "smoke-test-pod" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/api/pods/heartbeat" -Method POST -Body $hb -ContentType "application/json"
} | Out-Null

$activePods = Invoke-Check "GET /api/pods/active (MediaMTX pods self-registered)" {
    $pods = Invoke-RestMethod -Uri "$baseUrl/api/pods/active"
    if ($pods.Count -lt 1) { throw "no active pods registered" }
    $pods | ForEach-Object { Write-Host ("    - {0} ({1}, {2})" -f $_.podId, $_.type, $_.status) }
    return $pods
}

# --- Stream CRUD + assignment lifecycle ---------------------------------------

$streamName = "smoke-test-stream"

Invoke-Check "POST /api/streams (create $streamName)" {
    $body = @{ name = $streamName; source = "rtsp://example.com/test"; isEnabled = $false } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/api/streams" -Method POST -Body $body -ContentType "application/json"
} | Out-Null

Invoke-Check "GET /api/streams/$streamName" {
    Invoke-RestMethod -Uri "$baseUrl/api/streams/$streamName"
} | Out-Null

if ($activePods -and $activePods.Count -gt 0) {
    $targetPod = $activePods[0].podId
    Invoke-Check "PATCH /api/streams/$streamName/assign -> $targetPod" {
        $body = @{ podId = $targetPod } | ConvertTo-Json
        $assigned = Invoke-RestMethod -Uri "$baseUrl/api/streams/$streamName/assign" -Method PATCH -Body $body -ContentType "application/json"
        if ($assigned.assignedPod -ne $targetPod) { throw "assignedPod is '$($assigned.assignedPod)', expected '$targetPod'" }
    } | Out-Null

    Invoke-Check "PATCH /api/streams/$streamName/unassign" {
        Invoke-RestMethod -Uri "$baseUrl/api/streams/$streamName/unassign" -Method PATCH
    } | Out-Null
}

Invoke-Check "DELETE /api/streams/$streamName (cleanup)" {
    Invoke-RestMethod -Uri "$baseUrl/api/streams/$streamName" -Method DELETE
} | Out-Null

# --- Summary -------------------------------------------------------------------

Write-Host ""
Write-Host ("Smoke test finished: {0} passed, {1} failed" -f $script:passed, $script:failed)
if ($script:failed -gt 0) { exit 1 }
exit 0

# To stop the stack: npm run stack:down
