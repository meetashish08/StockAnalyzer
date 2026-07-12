# Portkey API Connection Test Script
# Usage: .\test-portkey-connection.ps1 [api-key]

param(
    [string]$ApiKey = ""
)

Write-Host "`n=== Portkey API Connection Test ===" -ForegroundColor Cyan
Write-Host ""

# If no API key provided, prompt for it
if ([string]::IsNullOrWhiteSpace($ApiKey)) {
    Write-Host "Enter your Portkey API key (or press Enter to use default from code):" -ForegroundColor Yellow
    $input = Read-Host
    if ([string]::IsNullOrWhiteSpace($input)) {
        # Use the default key from server.js
        $ApiKey = "MfSPscvdmxTj8jGpP34lq41axRRK"
        Write-Host "Using default API key from code" -ForegroundColor Cyan
    } else {
        $ApiKey = $input
    }
}

Write-Host ""
Write-Host "Testing connection..." -ForegroundColor Yellow
Write-Host "API Key (masked): pk-...$(if($ApiKey.Length -gt 4){$ApiKey.Substring($ApiKey.Length - 4)}else{'****'})" -ForegroundColor Gray
Write-Host ""

# Test via Settings API endpoint
try {
    $body = @{
        portkeyApiKey = $ApiKey
    } | ConvertTo-Json

    $response = Invoke-RestMethod `
        -Uri "http://localhost:3001/api/settings/test" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -TimeoutSec 20 `
        -ErrorAction Stop

    if ($response.success) {
        Write-Host "✓ SUCCESS!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Message: $($response.message)" -ForegroundColor Green
        Write-Host ""
        Write-Host "Your Portkey API key is working correctly!" -ForegroundColor Cyan
        Write-Host "You can now save this key in Settings → API Configuration" -ForegroundColor Cyan
    } else {
        Write-Host "✗ FAILED" -ForegroundColor Red
        Write-Host ""
        Write-Host "Message: $($response.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ ERROR" -ForegroundColor Red
    Write-Host ""

    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "HTTP Status: $statusCode" -ForegroundColor Red

        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd() | ConvertFrom-Json
            Write-Host "Error: $($responseBody.message)" -ForegroundColor Red
        } catch {
            Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }

    Write-Host ""
    Write-Host "Possible issues:" -ForegroundColor Yellow
    Write-Host "  1. Server not running (start with: node server.js)" -ForegroundColor Gray
    Write-Host "  2. Invalid API key format" -ForegroundColor Gray
    Write-Host "  3. Network connectivity issue" -ForegroundColor Gray
    Write-Host "  4. Portkey API unavailable" -ForegroundColor Gray
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Additional diagnostics
Write-Host "Diagnostics:" -ForegroundColor Yellow
Write-Host ""

# Check if server is running
$nodeProcess = Get-Process -Name node -ErrorAction SilentlyContinue | Select-Object -First 1
if ($nodeProcess) {
    Write-Host "✓ Server is running (PID: $($nodeProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "✗ Server is NOT running" -ForegroundColor Red
    Write-Host "  Start it with: node server.js" -ForegroundColor Gray
}

# Check if port 3001 is listening
try {
    $connection = Test-NetConnection -ComputerName localhost -Port 3001 -WarningAction SilentlyContinue -ErrorAction Stop
    if ($connection.TcpTestSucceeded) {
        Write-Host "✓ Port 3001 is listening" -ForegroundColor Green
    } else {
        Write-Host "✗ Port 3001 is NOT listening" -ForegroundColor Red
    }
} catch {
    Write-Host "? Could not check port 3001" -ForegroundColor Yellow
}

# Check internet connectivity
try {
    $ping = Test-Connection -ComputerName api.portkey.ai -Count 1 -Quiet -ErrorAction Stop
    if ($ping) {
        Write-Host "✓ Can reach api.portkey.ai" -ForegroundColor Green
    } else {
        Write-Host "✗ Cannot reach api.portkey.ai" -ForegroundColor Red
    }
} catch {
    Write-Host "? Could not ping api.portkey.ai (might be blocked)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "For more details, check:" -ForegroundColor Cyan
Write-Host "  - TEST_API_CONNECTION.md" -ForegroundColor Gray
Write-Host "  - Server logs in PowerShell window" -ForegroundColor Gray
Write-Host ""
