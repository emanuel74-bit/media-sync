# Test pod registration
Write-Host "Testing pod registration..."

# Register a test pod
$body = @{
    podId = "test-pod-1"
    host = "127.0.0.1"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/pods/register" -Method POST -Body $body -ContentType "application/json"
    Write-Host "Pod registration successful"
} catch {
    Write-Host "Failed to register pod: $($_.Exception.Message)"
}

# Check active pods
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/pods/active" -Method GET
    $json = $response.Content | ConvertFrom-Json
    Write-Host "Active pods: $($json.Count)"
    $json | ForEach-Object { Write-Host "  - $($_.podId) ($($_.status))" }
} catch {
    Write-Host "Failed to get active pods: $($_.Exception.Message)"
}

# Test heartbeat
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/pods/heartbeat" -Method POST -Body $body -ContentType "application/json"
    Write-Host "Pod heartbeat successful"
} catch {
    Write-Host "Failed to send heartbeat: $($_.Exception.Message)"
}