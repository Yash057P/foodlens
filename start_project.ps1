$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot               # foodlens/
$backend = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'
$logsDir = Join-Path $root 'logs'
$py = Join-Path $backend '.venv\Scripts\python.exe'

# --- kill anything on our ports ----------------------------------------------
foreach ($port in 8000, 5173) {
    $list = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $list) { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue }
}
Start-Sleep -Seconds 1

# --- start backend ---
Start-Process -FilePath $py `
    -ArgumentList '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000' `
    -WorkingDirectory $backend `
    -RedirectStandardOutput (Join-Path $logsDir 'backend_out.log') `
    -RedirectStandardError (Join-Path $logsDir 'backend_err.log') `
    -WindowStyle Hidden

# --- start frontend dev server ---
Start-Process -FilePath 'npm.cmd' `
    -ArgumentList 'run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173' `
    -WorkingDirectory $frontend `
    -RedirectStandardOutput (Join-Path $logsDir 'frontend_out.log') `
    -RedirectStandardError (Join-Path $logsDir 'frontend_err.log') `
    -WindowStyle Hidden

function Wait-Http([int]$port, [string]$path, [int]$tries, [string]$label) {
    for ($i = 0; $i -lt $tries; $i++) {
        try {
            Invoke-WebRequest -Uri "http://127.0.0.1:$port$path" -TimeoutSec 3 -UseBasicParsing | Out-Null
            Write-Output "$label ready after ~$($i * 2)s"
            return $true
        } catch { Start-Sleep -Seconds 2 }
    }
    return $false
}

$okBack = Wait-Http 8000 '/api/health' 120 'backend'
$okFront = Wait-Http 5173 '/' 60 'frontend'

if ($okBack -and $okFront) {
    Write-Output 'FoodLens is running:'
    Write-Output '  Frontend : http://127.0.0.1:5173'
    Write-Output '  Backend  : http://127.0.0.1:8000  (API docs /docs)'
    Write-Output '  Logs     : logs\backend_err.log, logs\frontend_out.log'
} else {
    Write-Output 'One or both servers failed to start. Check logs:'
    Get-Content (Join-Path $logsDir 'backend_err.log') -Tail 20 -ErrorAction SilentlyContinue
    Get-Content (Join-Path $logsDir 'frontend_err.log') -Tail 20 -ErrorAction SilentlyContinue
    exit 1
}