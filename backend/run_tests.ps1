$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot           # foodlens/
$backend = Join-Path $root 'backend'
$logsDir = Join-Path $root 'logs'
$testDir = 'C:\Users\Yash\AppData\Local\Temp\opencode\foodlens_tests'
$py = Join-Path $backend '.venv\Scripts\python.exe'
$logOut = Join-Path $logsDir 'backend_out.log'
$logErr = Join-Path $logsDir 'backend_err.log'
$respFile = Join-Path $logsDir 'resp.json'

New-Item -ItemType Directory -Force -Path $testDir | Out-Null
New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

# --- prepare extra test artifacts -------------------------------------------
& $py -c @"
from PIL import Image, ImageFilter
import numpy as np, os
p = r'$testDir'
# empty image (0 bytes)
open(os.path.join(p, 'empty.jpg'), 'wb').close()
# oversized file (11 MB, over the 10 MB limit)
with open(os.path.join(p, 'oversized.jpg'), 'wb') as f:
    f.write(b'x' * (11 * 1024 * 1024))
"@

# --- clean stale server on :8000 --------------------------------------------
$stale = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
foreach ($c in $stale) {
    Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 1

# --- start server ------------------------------------------------------------
$p = Start-Process -FilePath $py `
    -ArgumentList '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000' `
    -WorkingDirectory $backend `
    -RedirectStandardOutput $logOut `
    -RedirectStandardError $logErr `
    -PassThru

function Test-HttpRequest([string]$label, [string[]]$curlArgs) {
    $code = & curl.exe -s -o $respFile -w "%{http_code}" @curlArgs
    Write-Output "----------------------------------------"
    Write-Output "$label  =>  HTTP $code"
    if ($code -eq '200') {
        $j = Get-Content $respFile -Raw | ConvertFrom-Json
        Write-Output ("  prediction        : {0} ({1:P1})" -f $j.prediction.food, $j.prediction.confidence)
        Write-Output ("  top-3             : {0}" -f (($j.top_predictions | ForEach-Object { "$($_.food) $([math]::Round($_.confidence*100,1))%" }) -join ' | '))
        Write-Output ("  nutrition_status  : {0}" -f $j.nutrition_status)
        Write-Output ("  low_confidence    : {0}" -f $j.low_confidence)
        Write-Output ("  warning           : {0}" -f $j.warning)
        Write-Output ("  inference_time_ms : {0}" -f $j.inference_time_ms)
        if (-not $j.success) { Write-Output "  !! success=false" }
    } else {
        $d = Get-Content $respFile -Raw
        Write-Output "  body: $d"
    }
}

try {
    $ready = $false
    for ($i = 0; $i -lt 150; $i++) {
        try {
            $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8000/api/health' -TimeoutSec 3 -UseBasicParsing
            if ($r.StatusCode -eq 200) { $ready = $true; Write-Output "Server ready after ~$($i * 2)s"; break }
        } catch { Start-Sleep -Seconds 2 }
    }
    if (-not $ready) {
        Write-Output 'Server did not become ready. Last log lines:'
        Get-Content $logErr -Tail 40 -ErrorAction SilentlyContinue
        throw 'Server startup failed'
    }

    Write-Output ''
    Write-Output '================ TEST RESULTS ================'

    # Test A1: Food-101-style image (pizza)
    Test-HttpRequest 'A1 real pizza photo' @('-F', "file=@$testDir\test_pizza.jpg", 'http://127.0.0.1:8000/api/predict')

    # Test B: second real-world food image (sushi) -> also shows model reuse (fast inference)
    Test-HttpRequest 'B real sushi photo' @('-F', "file=@$testDir\test_sushi.jpg", 'http://127.0.0.1:8000/api/predict')

    # Test E: low-quality/uncertain (blurred pizza)
    Test-HttpRequest 'E blurred food image' @('-F', "file=@$testDir\test_blurred.jpg", 'http://127.0.0.1:8000/api/predict')

    # Test: non-food image (random noise) -> ideally low confidence
    Test-HttpRequest 'non-food noise image' @('-F', "file=@$testDir\test_nonfood.png", 'http://127.0.0.1:8000/api/predict')

    # Test C: invalid file (text content with .jpg name)
    Test-HttpRequest 'C invalid file (.jpg text)' @('-F', "file=@$testDir\invalid.jpg", 'http://127.0.0.1:8000/api/predict')

    # Test: empty upload
    Test-HttpRequest 'empty upload' @('-F', "file=@$testDir\empty.jpg", 'http://127.0.0.1:8000/api/predict')

    # Test: oversized upload
    Test-HttpRequest 'oversized upload (11 MB)' @('-F', "file=@$testDir\oversized.jpg", 'http://127.0.0.1:8000/api/predict')

    # Test: no file at all (POST with empty body)
    Test-HttpRequest 'no file field' @('-X', 'POST', '--max-time', '30', 'http://127.0.0.1:8000/api/predict')

    # Test F: verify model loaded exactly once
    $loadCount = (Select-String -Path $logErr -Pattern "Loaded food classifier" -ErrorAction SilentlyContinue).Matches.Count
    Write-Output "----------------------------------------"
    Write-Output "Model load events in log (expect 1): $loadCount"

    # Test D: edamame nutrition path (direct service check, no model can be forced)
    & $py -c @"
import sys, json
sys.path.insert(0, r'$backend')
from app.services.nutrition_service import NutritionService
ns = NutritionService(r'$backend\app\data\nutritional_database.json')
print('edamame lookup result:', repr(ns.get('edamame')))
print('pizza lookup result:', ns.get('pizza'))
"@
} finally {
    Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
    Write-Output ''
    Write-Output 'Server stopped.'
}