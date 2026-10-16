# IMBA Widgets - start server + hotkey helper, open the panel
# Pure ASCII file. Texts: messages.ru.json
. (Join-Path $PSScriptRoot 'common.ps1')

$proc = $null
try {
    Test-Layout
    if (-not (Test-Installed)) {
        Warn (M 'not_installed')
        & (Join-Path $PSScriptRoot 'install.ps1')
        if ($LASTEXITCODE -ne 0) { exit 1 }
    }

    $stopped = Stop-Imba
    if ($stopped -gt 0) { Say ((M 'prev_closed') -f $stopped) }

    $owner = Get-PortOwner $Port
    if ($owner) { throw ((M 'port_busy') -f $Port, $owner) }

    New-Item -ItemType Directory -Force -Path $DataDir | Out-Null
    $env:IMBA_LOCAL = '1'
    $env:DATA_DIR = $DataDir
    $env:STATIC_DIR = $Web
    $env:HELPER_SCRIPT_PATH = $HelperAhk
    $env:LOCAL_BASE_URL = "http://127.0.0.1:$Port"
    $env:PYTHONUTF8 = '1'
    $env:PYTHONIOENCODING = 'utf-8'
    $env:PYTHONDONTWRITEBYTECODE = '1'
    Remove-Item Env:MONGO_URL -ErrorAction SilentlyContinue

    Step (M 'srv_start')
    $pyArgs = @('-m', 'uvicorn', 'server:app', '--app-dir', ('"' + $Backend + '"'), '--host', '0.0.0.0', '--port', "$Port", '--no-access-log', '--log-level', 'warning', '--timeout-graceful-shutdown', '2')
    $proc = Start-Process -FilePath $PyExe -ArgumentList $pyArgs -WorkingDirectory $Backend -NoNewWindow -PassThru
    $null = $proc.Handle
    Set-Content -LiteralPath $PidFile -Value $proc.Id -Encoding ASCII

    $ready = $false
    for ($i = 0; $i -lt 80; $i++) {
        Start-Sleep -Milliseconds 400
        if ($proc.HasExited) { throw ((M 'srv_exited') -f $proc.ExitCode) }
        try {
            $r = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/api/" -UseBasicParsing -TimeoutSec 2
            if ($r.StatusCode -eq 200) { $ready = $true; break }
        } catch {}
    }
    if (-not $ready) { throw (M 'srv_timeout') }
    Ok (M 'srv_ok')

    Step (M 'ahk_start')
    for ($i = 0; $i -lt 20 -and -not (Test-Path -LiteralPath $HelperAhk); $i++) { Start-Sleep -Milliseconds 250 }
    if (Test-Path -LiteralPath $HelperAhk) {
        Start-Process -FilePath $AhkExe -ArgumentList ('"' + $HelperAhk + '"') -WorkingDirectory $Root | Out-Null
        Ok (M 'ahk_started')
    } else {
        Warn (M 'ahk_no_file')
    }

    $base = "http://127.0.0.1:$Port"
    $lan = Get-LanIp
    Write-Host ''
    Write-Host '  ==============================================================' -ForegroundColor Red
    Write-Host (M 'b_title') -ForegroundColor White
    Write-Host '  ==============================================================' -ForegroundColor Red
    Write-Host ((M 'b_panel') -f $base) -ForegroundColor White
    Write-Host (M 'b_pass') -ForegroundColor DarkGray
    Write-Host ((M 'b_score') -f $base) -ForegroundColor Green
    Write-Host ((M 'b_rank') -f $base) -ForegroundColor Green
    if ($lan) { Write-Host ((M 'b_phone') -f $lan, $Port) -ForegroundColor White }
    Write-Host (M 'b_keys') -ForegroundColor White
    Write-Host '  --------------------------------------------------------------' -ForegroundColor Red
    Write-Host (M 'b_keep') -ForegroundColor Yellow
    Write-Host (M 'b_events') -ForegroundColor DarkGray
    Write-Host ''

    try { Start-Process "$base/panel" | Out-Null } catch { Warn (M 'no_browser') }

    Wait-Process -Id $proc.Id -ErrorAction SilentlyContinue
    Write-Host ''
    Say (M 'srv_stopped')
    exit 0
} catch {
    Fail $_.Exception.Message
    exit 1
} finally {
    $null = Stop-Imba
}
