# Test script for media-sync system using PowerShell

Write-Host "Starting Docker Compose..."
docker-compose up -d

Write-Host "Waiting for services to be ready..."
Start-Sleep -Seconds 30

Write-Host "Testing MongoDB connection..."
# Add MongoDB test if needed

Write-Host "Testing MediaMTX ingest API..."
try {
    $response = Invoke-WebRequest -Uri "http://localhost:9000/api/streams" -Method GET
    $json = $response.Content | ConvertFrom-Json
    Write-Host "Ingest streams:" $json
} catch {
    Write-Host "Failed to get ingest streams: $($_.Exception.Message)"
}

Write-Host "Testing MediaMTX cluster API..."
try {
    $response = Invoke-WebRequest -Uri "http://localhost:9001/api/streams" -Method GET
    $json = $response.Content | ConvertFrom-Json
    Write-Host "Cluster streams:" $json
} catch {
    Write-Host "Failed to get cluster streams: $($_.Exception.Message)"
}

Write-Host "Testing NestJS app health..."
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/streams" -Method GET
    $json = $response.Content | ConvertFrom-Json
    Write-Host "App streams:" $json
} catch {
    Write-Host "Failed to get streams from app: $($_.Exception.Message)"
}

Write-Host "Testing stream assignment..."
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/streams/assignment" -Method GET
    $json = $response.Content | ConvertFrom-Json
    Write-Host "Assignments:" $json
} catch {
    Write-Host "Failed to get assignments: $($_.Exception.Message)"
}

Write-Host "Testing alerts..."
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/alerts" -Method GET
    $json = $response.Content | ConvertFrom-Json
    Write-Host "Alerts:" $json
} catch {
    Write-Host "Failed to get alerts: $($_.Exception.Message)"
}

Write-Host "Testing metrics..."
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/metrics/stream/test" -Method GET
    $json = $response.Content | ConvertFrom-Json
    Write-Host "Metrics:" $json
} catch {
    Write-Host "Failed to get metrics: $($_.Exception.Message)"
}

Write-Host "Testing stream inspection..."
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/stream-inspection" -Method GET
    $json = $response.Content | ConvertFrom-Json
    Write-Host "Stream inspections:" $json.Length "inspections found"
} catch {
    Write-Host "Failed to get stream inspections: $($_.Exception.Message)"
}

Write-Host "Testing create stream..."
try {
    $body = @{
        name = "test-stream"
        source = "rtsp://example.com/test"
        enabled = $true
    } | ConvertTo-Json
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/streams" -Method POST -Body $body -ContentType "application/json"
    $json = $response.Content | ConvertFrom-Json
    Write-Host "Created stream:" $json.name
} catch {
    Write-Host "Failed to create stream: $($_.Exception.Message)"
}

Write-Host "Testing assign stream..."
try {
    $body = @{
        podId = "pod1"
    } | ConvertTo-Json
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/streams/test-stream/assign" -Method PATCH -Body $body -ContentType "application/json"
    $json = $response.Content | ConvertFrom-Json
    Write-Host "Assigned stream:" $json.assignedPod
} catch {
    Write-Host "Failed to assign stream: $($_.Exception.Message)"
}

Write-Host "All tests completed. Check output above."

# To stop: docker-compose down