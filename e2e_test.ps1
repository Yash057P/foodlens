$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot           # foodlens/
$backend = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'
$logsDir = Join-Path $root 'logs'
$testDir = Join-Path $root 'testdata'
$py = Join-Path $backend '.venv\Scripts\python.exe'
$respFile = Join-Path $logsDir 'resp.json'

# --- kill anything on our ports ----------------------------------------------
foreach ($port in 8000, 5173) {
    $list = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $list) { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue }
}
Start-Sleep -Seconds 1

# --- start backend ---
$pBack = Start-Process -FilePath $py `
    -ArgumentList '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000' `
    -WorkingDirectory $backend `
    -RedirectStandardOutput (Join-Path $logsDir 'e2e_backend_out.log') `
    -RedirectStandardError (Join-Path $logsDir 'e2e_backend_err.log') `
    -PassThru

# --- start frontend dev server ---
$pFront = Start-Process -FilePath 'npm.cmd' `
    -ArgumentList 'run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173' `
    -WorkingDirectory $frontend `
    -RedirectStandardOutput (Join-Path $logsDir 'e2e_frontend_out.log') `
    -RedirectStandardError (Join-Path $logsDir 'e2e_frontend_err.log') `
    -PassThru

function Wait-Http([int]$port, [string]$path, [int]$tries, [string]$label) {
    for ($i = 0; $i -lt $tries; $i++) {
        try {
            $r = Invoke-WebRequest -Uri "http://127.0.0.1:$port$path" -TimeoutSec 3 -UseBasicParsing
            Write-Output "$label ready after ~$($i * 2)s"
            return $true
        } catch { Start-Sleep -Seconds 2 }
    }
    Write-Output "$label NOT ready"
    return $false
}

try {
    $okBack = Wait-Http 8000 '/api/health' 120 'backend'
    $okFront = Wait-Http 5173 '/' 60 'frontend'

    if (-not ($okBack -and $okFront)) {
        Write-Output '--- backend err ---'
        Get-Content (Join-Path $logsDir 'e2e_backend_err.log') -Tail 30 -ErrorAction SilentlyContinue
        Write-Output '--- frontend err ---'
        Get-Content (Join-Path $logsDir 'e2e_frontend_err.log') -Tail 30 -ErrorAction SilentlyContinue
        throw 'e2e could not start'
    }

    Write-Output ''
    Write-Output '================ E2E THROUGH VITE PROXY ================'

    # 1) frontend serves the React app
    $html = Invoke-WebRequest -Uri 'http://127.0.0.1:5173/' -UseBasicParsing
    $hasTitle = $html.Content -match 'FoodLens'
    Write-Output ("Frontend HTML contains 'FoodLens' title: {0}" -f $hasTitle)

    # 2) proxy: predict a pizza image
    $code = & curl.exe -s -o $respFile -w "%{http_code}" -F "file=@$testDir\test_pizza.jpg" 'http://127.0.0.1:5173/api/predict'
    $j = Get-Content $respFile -Raw | ConvertFrom-Json
    Write-Output ("Proxy /api/predict => HTTP {0}" -f $code)
    Write-Output ("  prediction: {0} ({1:P1})" -f $j.prediction.food, $j.prediction.confidence)
    Write-Output ("  nutrition_status: {0}" -f $j.nutrition_status)
    Write-Output ("  inference_time_ms: {0}" -f $j.inference_time_ms)

    # 3) proxy: invalid file handled
    $code2 = & curl.exe -s -o $respFile -w "%{http_code}" -F "file=@$testDir\invalid.jpg" 'http://127.0.0.1:5173/api/predict'
    Write-Output ("Proxy invalid-file => HTTP {0}" -f $code2)

    # 4) direct health through proxy
    $health = Invoke-WebRequest -Uri 'http://127.0.0.1:5173/api/health' -UseBasicParsing
    Write-Output ("Proxy /api/health => {0}" -f $health.Content)
} finally {
    foreach ($proc in @($pBack, $pFront)) {
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
    foreach ($port in 8000, 5173) {
        $list = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        foreach ($c in $list) { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue }
    }
    Write-Output ''
    Write-Output 'Servers stopped.'
}