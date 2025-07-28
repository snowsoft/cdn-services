# CDN Services Health Check Test Script

Write-Host "CDN Services Health Check" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green

# Container durumunu kontrol et
Write-Host "`nChecking container status..." -ForegroundColor Yellow
$containers = docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | Out-String
Write-Host $containers

# Health endpoint'i test et
Write-Host "`nTesting health endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri http://localhost:3012/health -Method Get
    Write-Host "Health Status: " -NoNewline -ForegroundColor Cyan
    Write-Host "HEALTHY" -ForegroundColor Green
    Write-Host "`nResponse:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10 | Write-Host
} catch {
    Write-Host "Health Status: " -NoNewline -ForegroundColor Cyan
    Write-Host "UNHEALTHY" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red

    # Container loglarını göster
    Write-Host "`nContainer Logs:" -ForegroundColor Yellow
    docker logs cdn-services --tail 20
}

# Ana endpoint'i test et
Write-Host "`nTesting main endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri http://localhost:3012/ -Method Get
    Write-Host "Main Endpoint: " -NoNewline -ForegroundColor Cyan
    Write-Host "OK" -ForegroundColor Green
    Write-Host "`nResponse:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10 | Write-Host
} catch {
    Write-Host "Main Endpoint: " -NoNewline -ForegroundColor Cyan
    Write-Host "FAILED" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
}