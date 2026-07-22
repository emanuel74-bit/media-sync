# Live-stack lifecycle smoke test for media-sync (PowerShell 5.1 compatible).
#
# Run from backend/ against an existing local stack:
#   .\test.ps1 -PublishHost localhost
#
# Or start the local Compose stack first:
#   .\test.ps1 -Up
#
# This script intentionally does not run under `npm test` (CONVENTIONS TEST-07).

param(
    [switch]$Up,
    [string]$BaseUrl = "http://localhost:3000",
    [string]$IngestApiUrl = "http://localhost:9000",
    [string]$ClusterApiUrl = "http://localhost:9001",
    [string]$ClusterApiAuth = "sync:syncpass",
    [string]$PublishHost,
    [string]$FfmpegPath = "ffmpeg",
    [int]$StartupTimeoutSeconds = 120,
    [int]$LifecycleTimeoutSeconds = 60
)

$ErrorActionPreference = "Stop"
$script:passed = 0
$script:failed = 0
$script:publisher = $null
$script:publisherLog = $null
$script:publishToken = $null
$script:apiWasReady = $false
$script:clusterApiWasReady = $false
$script:lifecycleAborted = $false

$clusterAuth = @{
    Authorization = "Basic " +
        [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($ClusterApiAuth))
}
$streamName = "smoke-lifecycle-" + [Guid]::NewGuid().ToString("N").Substring(0, 12)
$encodedStreamName = [Uri]::EscapeDataString($streamName)

function Assert-Condition {
    param(
        [bool]$Condition,
        [string]$Message
    )

    if (!$Condition) {
        throw $Message
    }
}

function Get-HttpStatusCode {
    param([System.Management.Automation.ErrorRecord]$ErrorRecord)

    $response = $ErrorRecord.Exception.Response
    if ($response -and $response.StatusCode) {
        return [int]$response.StatusCode
    }
    return $null
}

function Invoke-Step {
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
        throw
    }
}

function Invoke-CleanupStep {
    param(
        [string]$Name,
        [scriptblock]$Action
    )

    try {
        & $Action | Out-Null
        Write-Host "[CLEAN] $Name" -ForegroundColor DarkGreen
    } catch {
        $script:failed++
        Write-Host "[FAIL] cleanup: $Name -- $($_.Exception.Message)" -ForegroundColor Red
    }
}

function Wait-Until {
    param(
        [string]$Description,
        [int]$TimeoutSeconds,
        [scriptblock]$Probe
    )

    $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
    $lastError = $null
    do {
        try {
            $result = & $Probe
            if ($null -ne $result -and $false -ne $result) {
                return $result
            }
            $lastError = $null
        } catch {
            $lastError = $_.Exception.Message
        }
        Start-Sleep -Seconds 1
    } while ([DateTime]::UtcNow -lt $deadline)

    $suffix = if ($lastError) { " Last error: $lastError" } else { "" }
    throw "Timed out after ${TimeoutSeconds}s waiting for $Description.$suffix"
}

function Test-MediaMtxPathAbsent {
    param(
        [string]$ApiUrl,
        [hashtable]$Headers
    )

    try {
        Invoke-RestMethod -Uri "$ApiUrl/v3/paths/get/$encodedStreamName" -Headers $Headers |
            Out-Null
        return $false
    } catch {
        if ((Get-HttpStatusCode $_) -eq 404) {
            return $true
        }
        throw
    }
}

function Stop-Publisher {
    if ($script:publisher -and !$script:publisher.HasExited) {
        try {
            $script:publisher.Kill()
        } catch [System.InvalidOperationException] {
            # The publisher exited between the HasExited check and Kill().
        }
    }
    if ($script:publisher) {
        $script:publisher.WaitForExit()
    }
}

function Get-PublisherDiagnostics {
    if (!$script:publisherLog -or !(Test-Path -LiteralPath $script:publisherLog)) {
        return "no FFmpeg diagnostic output"
    }

    $diagnostics = (Get-Content -Raw -LiteralPath $script:publisherLog).Trim()
    if (!$diagnostics) {
        return "FFmpeg exited without diagnostic output"
    }
    if ($script:publishToken) {
        $diagnostics = $diagnostics.Replace($script:publishToken, "<redacted>")
    }
    return [Regex]::Replace($diagnostics, "rtsp://[^@\s]+@", "rtsp://<redacted>@")
}

function Resolve-PublishUrl {
    param([string]$ReservationUrl)

    $hostOverride = $PublishHost
    if (!$hostOverride -and $Up) {
        $hostOverride = "localhost"
    }
    if (!$hostOverride) {
        return $ReservationUrl
    }

    $builder = New-Object System.UriBuilder($ReservationUrl)
    $builder.Host = $hostOverride
    return $builder.Uri.AbsoluteUri
}

if ($Up) {
    Write-Host "Starting the local Docker Compose stack..."
    docker-compose -f deploy/docker/compose.local.yml up -d --build
    if ($LASTEXITCODE -ne 0) {
        throw "docker-compose failed with exit code $LASTEXITCODE"
    }
}

try {
    Invoke-Step "Sync API becomes ready" {
        Wait-Until "GET /api/streams" $StartupTimeoutSeconds {
            $streams = Invoke-RestMethod -Uri "$BaseUrl/api/streams"
            return ,$streams
        }
    } | Out-Null
    $script:apiWasReady = $true

    $activeNodes = Invoke-Step "Ingest and cluster nodes self-register" {
        Wait-Until "active ingest and cluster nodes" $StartupTimeoutSeconds {
            $nodes = @(Invoke-RestMethod -Uri "$BaseUrl/api/nodes/active")
            $hasIngest = @($nodes | Where-Object { $_.type -eq "ingest" }).Count -gt 0
            $hasCluster = @($nodes | Where-Object { $_.type -eq "cluster" }).Count -gt 0
            if ($hasIngest -and $hasCluster) {
                return ,$nodes
            }
            return $null
        }
    }
    $activeIngestNodeIds = @(
        $activeNodes |
            Where-Object { $_.type -eq "ingest" } |
            ForEach-Object { $_.nodeId }
    )

    Invoke-Step "MediaMTX ingest API is ready" {
        Invoke-RestMethod -Uri "$IngestApiUrl/v3/paths/list" | Out-Null
    } | Out-Null

    Invoke-Step "MediaMTX cluster API is ready" {
        Invoke-RestMethod -Uri "$ClusterApiUrl/v3/paths/list" -Headers $clusterAuth | Out-Null
    } | Out-Null
    $script:clusterApiWasReady = $true

    Invoke-Step "Read-only API surface responds" {
        Invoke-RestMethod -Uri "$BaseUrl/api/streams/assignment" | Out-Null
        Invoke-RestMethod -Uri "$BaseUrl/api/alerts" | Out-Null
        Invoke-RestMethod -Uri "$BaseUrl/api/metrics/nodes" | Out-Null
        Invoke-RestMethod -Uri "$BaseUrl/api/metrics/stream/$encodedStreamName" | Out-Null
        Invoke-RestMethod -Uri "$BaseUrl/api/stream-inspection" | Out-Null
        Invoke-WebRequest -Uri "$BaseUrl/api/docs" -UseBasicParsing | Out-Null
    } | Out-Null

    $reservation = Invoke-Step "Reserve ingest stream $streamName" {
        $body = @{ name = $streamName } | ConvertTo-Json
        $result = Invoke-RestMethod `
            -Uri "$BaseUrl/api/ingest/streams" `
            -Method POST `
            -Body $body `
            -ContentType "application/json"
        # Capture the secret before response-contract assertions so any FFmpeg diagnostic that
        # includes the URL can still be redacted. Cleanup uses the unique name independently.
        $script:publishToken = $result.publishToken

        Assert-Condition ($result.name -eq $streamName) "reservation returned the wrong name"
        Assert-Condition (![string]::IsNullOrWhiteSpace($result.ingestNode)) `
            "reservation did not select an ingest node"
        Assert-Condition (![string]::IsNullOrWhiteSpace($result.publishUrl)) `
            "reservation did not return a publish URL"
        Assert-Condition (![string]::IsNullOrWhiteSpace($result.publishToken)) `
            "reservation did not return a publish token"
        Assert-Condition ($result.ingestNode -in $activeIngestNodeIds) `
            "reservation selected a node outside the active ingest set"
        return $result
    }

    Invoke-Step "Reservation is persisted in reserved state" {
        $stream = Invoke-RestMethod -Uri "$BaseUrl/api/streams/$encodedStreamName"
        Assert-Condition ($stream.status -eq "reserved") `
            "stream status is '$($stream.status)', expected 'reserved'"
        Assert-Condition ($stream.ingestNode -eq $reservation.ingestNode) `
            "persisted ingestNode does not match the reservation"
    } | Out-Null

    Invoke-Step "Publish auth rejects the wrong reservation secret" {
        $body = @{
            action = "publish"
            path = $streamName
            user = "publish"
            password = "wrong-smoke-secret"
        } | ConvertTo-Json
        try {
            Invoke-RestMethod `
                -Uri "$BaseUrl/api/ingest/auth" `
                -Method POST `
                -Body $body `
                -ContentType "application/json" | Out-Null
        } catch {
            Assert-Condition ((Get-HttpStatusCode $_) -eq 401) `
                "wrong secret returned HTTP $(Get-HttpStatusCode $_), expected 401"
            return
        }
        throw "wrong secret was accepted"
    } | Out-Null

    Invoke-Step "Publish auth accepts the reservation secret" {
        $body = @{
            action = "publish"
            path = $streamName
            user = "publish"
            password = $reservation.publishToken
        } | ConvertTo-Json
        $authorized = Invoke-RestMethod `
            -Uri "$BaseUrl/api/ingest/auth" `
            -Method POST `
            -Body $body `
            -ContentType "application/json"
        Assert-Condition ($authorized.authorized -eq $true) "valid secret was not authorized"
    } | Out-Null

    Invoke-Step "Start synthetic RTSP publisher" {
        $ffmpeg = Get-Command $FfmpegPath -ErrorAction Stop
        $publishUrl = Resolve-PublishUrl $reservation.publishUrl
        $script:publisherLog = [IO.Path]::GetTempFileName()
        $arguments = @(
            "-hide_banner",
            "-loglevel", "warning",
            "-nostdin",
            "-re",
            "-f", "lavfi",
            "-i", "testsrc=size=320x240:rate=10",
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-tune", "zerolatency",
            "-pix_fmt", "yuv420p",
            "-f", "rtsp",
            "-rtsp_transport", "tcp",
            $publishUrl
        )
        $script:publisher = Start-Process `
            -FilePath $ffmpeg.Source `
            -ArgumentList $arguments `
            -RedirectStandardError $script:publisherLog `
            -WindowStyle Hidden `
            -PassThru
        Start-Sleep -Seconds 2
        if ($script:publisher.HasExited) {
            throw "FFmpeg exited early: $(Get-PublisherDiagnostics)"
        }
    } | Out-Null

    Invoke-Step "Publish activates, assigns, and syncs the stream" {
        $stream = Wait-Until "stream status synced" $LifecycleTimeoutSeconds {
            if ($script:publisher.HasExited) {
                throw "FFmpeg exited early: $(Get-PublisherDiagnostics)"
            }
            $current = Invoke-RestMethod -Uri "$BaseUrl/api/streams/$encodedStreamName"
            if ($current.status -eq "sync_error") {
                throw "stream entered sync_error: $($current.lastError)"
            }
            if ($current.status -eq "synced" -and $current.assignedNode) {
                return $current
            }
            return $null
        }
        Assert-Condition ($null -eq $stream.reservedUntil) `
            "activation did not clear reservedUntil"
    } | Out-Null

    Invoke-Step "Ingest and assigned cluster paths become ready" {
        Wait-Until "ready ingest and cluster paths" $LifecycleTimeoutSeconds {
            $ingestPath = Invoke-RestMethod `
                -Uri "$IngestApiUrl/v3/paths/get/$encodedStreamName"
            $clusterPath = Invoke-RestMethod `
                -Uri "$ClusterApiUrl/v3/paths/get/$encodedStreamName" `
                -Headers $clusterAuth
            return ($ingestPath.ready -eq $true -and $clusterPath.ready -eq $true)
        } | Out-Null
    } | Out-Null

    Invoke-Step "Stop the publisher" {
        Stop-Publisher
    } | Out-Null

    Invoke-Step "Disappearance marks the stream stale and tears down its relay" {
        Wait-Until "stale stream and absent cluster path" $LifecycleTimeoutSeconds {
            $stream = Invoke-RestMethod -Uri "$BaseUrl/api/streams/$encodedStreamName"
            $pathAbsent = Test-MediaMtxPathAbsent $ClusterApiUrl $clusterAuth
            return ($stream.status -eq "stale" -and $pathAbsent)
        } | Out-Null
    } | Out-Null
} catch {
    $script:lifecycleAborted = $true
    if ($script:failed -eq 0) {
        $script:failed++
        Write-Host "[FAIL] lifecycle -- $($_.Exception.Message)" -ForegroundColor Red
    }
} finally {
    Invoke-CleanupStep "stop synthetic publisher" {
        Stop-Publisher
    }

    if ($script:clusterApiWasReady) {
        Invoke-CleanupStep "remove cluster path if it still exists" {
            try {
                Invoke-RestMethod `
                    -Uri "$ClusterApiUrl/v3/config/paths/delete/$encodedStreamName" `
                    -Method DELETE `
                    -Headers $clusterAuth | Out-Null
            } catch {
                if ((Get-HttpStatusCode $_) -ne 404) {
                    throw
                }
            }
        }
    }

    if ($script:apiWasReady) {
        Invoke-CleanupStep "delete the persisted smoke stream" {
            $current = Invoke-RestMethod -Uri "$BaseUrl/api/streams/$encodedStreamName"
            if ($null -ne $current) {
                Invoke-RestMethod `
                    -Uri "$BaseUrl/api/streams/$encodedStreamName" `
                    -Method DELETE | Out-Null
            }
            $remaining = Invoke-RestMethod -Uri "$BaseUrl/api/streams/$encodedStreamName"
            Assert-Condition ($null -eq $remaining) "stream still exists after cleanup"
        }
    }

    if ($script:publisherLog -and (Test-Path -LiteralPath $script:publisherLog)) {
        Invoke-CleanupStep "remove publisher diagnostics" {
            Remove-Item -LiteralPath $script:publisherLog -Force
        }
    }
}

Write-Host ""
Write-Host ("Lifecycle smoke test finished: {0} passed, {1} failed" -f $script:passed, $script:failed)
if ($script:lifecycleAborted) {
    Write-Host "The lifecycle stopped at the first failed prerequisite or transition." `
        -ForegroundColor Yellow
}
if ($Up) {
    Write-Host "The Compose stack is still running; stop it with: npm run stack:down"
}
if ($script:failed -gt 0) {
    exit 1
}
exit 0
