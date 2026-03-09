$port = 6380
$garnetPath = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages\Microsoft.Garnet.DN8_Microsoft.Winget.Source_8wekyb3d8bbwe\net8.0\GarnetServer.exe'
$stdout = Join-Path $PSScriptRoot '..\logs\garnet-local.out.log'
$stderr = Join-Path $PSScriptRoot '..\logs\garnet-local.err.log'

if (-not (Test-Path $garnetPath)) {
  Write-Error "GarnetServer.exe not found at $garnetPath"
  exit 1
}

$listening = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($listening) {
  Write-Output "Garnet is already listening on port $port"
  exit 0
}

Start-Process -FilePath $garnetPath `
  -ArgumentList "--port $port --bind 127.0.0.1" `
  -WindowStyle Hidden `
  -RedirectStandardOutput $stdout `
  -RedirectStandardError $stderr

Start-Sleep -Seconds 3

$started = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if (-not $started) {
  Write-Error "Garnet failed to start on port $port"
  exit 1
}

Write-Output "Garnet started on 127.0.0.1:$port"
