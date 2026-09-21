# ODAY OS — keep API, dashboard, and Expo in live-reload together.
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Test-PortOpen([int]$Port) {
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $client.Connect('127.0.0.1', $Port)
    $client.Close()
    return $true
  } catch {
    return $false
  }
}

function Get-LanIPv4 {
  $candidates = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.IPAddress -notlike '127.*' -and
      $_.IPAddress -notlike '169.254.*' -and
      $_.PrefixOrigin -ne 'WellKnown'
    } |
    Sort-Object -Property InterfaceMetric

  $preferred = $candidates | Where-Object { $_.IPAddress -like '192.168.*' } | Select-Object -First 1
  if ($preferred) { return $preferred.IPAddress }
  if ($candidates) { return $candidates[0].IPAddress }
  return '192.168.1.13'
}

$LanIp = Get-LanIPv4
$ApiUrl = "http://${LanIp}:8000"

$mobileEnv = @"
EXPO_PUBLIC_API_URL=$ApiUrl
EXPO_PUBLIC_APP_ENV=development
"@
Set-Content -Path (Join-Path $Root 'oday-mobile\.env') -Value $mobileEnv -Encoding utf8

$dashboardEnvPath = Join-Path $Root 'dashboard\.env'
@"
VITE_ODAY_LARAVEL=http://127.0.0.1:8000
VITE_ODAY_API_URL=
"@ | Set-Content -Path $dashboardEnvPath -Encoding utf8

Write-Host ""
Write-Host "ODAY OS live"
Write-Host "  API        $ApiUrl"
Write-Host "  Dashboard  http://${LanIp}:5173"
Write-Host "  Phone APK  talks to $ApiUrl  (restart the app after API changes)"
Write-Host "  Phone UI   scan the Expo QR for instant screen updates"
Write-Host "  Mobile login: server $ApiUrl | user oday | pass oday"
Write-Host ""
if (-not (Test-PortOpen 3306)) {
  Write-Host "WARNING: Nothing is listening on MySQL port 3306."
  Write-Host "  Laravel returns HTTP 500 until MySQL is running (DB_* in .env)."
  Write-Host "  Install/start MySQL (Laragon, XAMPP, or Docker) then: php artisan migrate"
  Write-Host ""
}
try {
  & php artisan oday:bootstrap-mobile-user --reset | Out-Null
} catch {
  Write-Host "Mobile user bootstrap skipped (often because MySQL is down)"
}
Write-Host ""

if (-not (Test-PortOpen 8000)) {
  Write-Host "Clearing Laravel caches..."
  try {
    & php artisan optimize:clear | Out-Null
  } catch {
    Write-Host "Laravel cache clear skipped"
  }
  Write-Host "Starting Laravel..."
  Start-Process -FilePath 'powershell' -WorkingDirectory $Root -ArgumentList @(
    '-NoExit',
    '-Command',
    "php artisan serve --host 0.0.0.0 --port 8000"
  )
} else {
  Write-Host "Laravel already running on port 8000"
}

if (-not (Test-PortOpen 5173)) {
  Write-Host "Starting dashboard..."
  Start-Process -FilePath 'powershell' -WorkingDirectory (Join-Path $Root 'dashboard') -ArgumentList @(
    '-NoExit',
    '-Command',
    "npm run dev"
  )
} else {
  Write-Host "Dashboard already running on port 5173"
}

Write-Host "Starting Expo Metro..."
Set-Location (Join-Path $Root 'oday-mobile')
$env:REACT_NATIVE_PACKAGER_HOSTNAME = $LanIp
$env:EXPO_PUBLIC_API_URL = $ApiUrl
$env:EXPO_PUBLIC_APP_ENV = 'development'
npx expo start --lan
