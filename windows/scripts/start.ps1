# IMBA Widgets - start server + hotkey helper, open the panel
. (Join-Path $PSScriptRoot 'common.ps1')

$proc = $null
try {
    if (-not (Test-Installed)) {
        Warn 'Компоненты ещё не установлены - запускаю установку...'
        & (Join-Path $PSScriptRoot 'install.ps1')
        if ($LASTEXITCODE -ne 0) { exit 1 }
    }

    $stopped = Stop-Imba
    if ($stopped -gt 0) { Say "Предыдущий запуск закрыт ($stopped проц.)." }

    $owner = Get-PortOwner $Port
    if ($owner) { throw "Порт $Port занят другой программой: $owner. Закройте её или перезагрузите ПК." }

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

    Step 'Запускаю сервер виджетов...'
    $pyArgs = @('-m', 'uvicorn', 'server:app', '--app-dir', ('"' + $Backend + '"'), '--host', '0.0.0.0', '--port', "$Port", '--no-access-log', '--log-level', 'warning', '--timeout-graceful-shutdown', '2')
    $proc = Start-Process -FilePath $PyExe -ArgumentList $pyArgs -WorkingDirectory $Backend -NoNewWindow -PassThru
    $null = $proc.Handle
    Set-Content -LiteralPath $PidFile -Value $proc.Id -Encoding ASCII

    $ready = $false
    for ($i = 0; $i -lt 80; $i++) {
        Start-Sleep -Milliseconds 400
        if ($proc.HasExited) { throw "Сервер остановился при запуске (код $($proc.ExitCode)). См. сообщения выше." }
        try {
            $r = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/api/" -UseBasicParsing -TimeoutSec 2
            if ($r.StatusCode -eq 200) { $ready = $true; break }
        } catch {}
    }
    if (-not $ready) { throw 'Сервер не ответил за 30 секунд.' }
    Ok 'Сервер работает'

    Step 'Запускаю помощник горячих клавиш (AutoHotkey)...'
    for ($i = 0; $i -lt 20 -and -not (Test-Path -LiteralPath $HelperAhk); $i++) { Start-Sleep -Milliseconds 250 }
    if (Test-Path -LiteralPath $HelperAhk) {
        Start-Process -FilePath $AhkExe -ArgumentList ('"' + $HelperAhk + '"') -WorkingDirectory $Root | Out-Null
        Ok 'Помощник запущен (значок в трее возле часов)'
    } else {
        Warn 'Файл IMBA-Hotkeys.ahk не создан - горячие клавиши недоступны, кнопки в панели работают.'
    }

    $base = "http://127.0.0.1:$Port"
    $lan = Get-LanIp
    Write-Host ''
    Write-Host '  ==============================================================' -ForegroundColor Red
    Write-Host '     I M B A   W I D G E T S   -   ЗАПУЩЕНО' -ForegroundColor White
    Write-Host '  ==============================================================' -ForegroundColor Red
    Write-Host "   Панель:       $base/panel" -ForegroundColor White
    Write-Host '                 пароль по умолчанию: imba2025' -ForegroundColor DarkGray
    Write-Host "   OBS счёт:     $base/widget/score    (600 x 200)" -ForegroundColor Green
    Write-Host "   OBS звание:   $base/widget/rank     (900 x 360)" -ForegroundColor Green
    if ($lan) { Write-Host "   С телефона:  http://$($lan):$Port/panel   (та же Wi-Fi сеть)" -ForegroundColor White }
    Write-Host '   Клавиши:      Ctrl+Alt+Num1 = WIN | Ctrl+Alt+Num2 = LOSE | Ctrl+Alt+Num0 = UNDO' -ForegroundColor White
    Write-Host '  --------------------------------------------------------------' -ForegroundColor Red
    Write-Host '   Не закрывайте это окно во время стрима. Остановить: Ctrl+C' -ForegroundColor Yellow
    Write-Host '   Ниже будут появляться события: WIN / LOSE / UNDO / RANK' -ForegroundColor DarkGray
    Write-Host ''

    try { Start-Process "$base/panel" | Out-Null } catch { Warn 'Не удалось открыть браузер - откройте ссылку вручную.' }

    Wait-Process -Id $proc.Id -ErrorAction SilentlyContinue
    Write-Host ''
    Say 'Сервер остановлен.'
    exit 0
} catch {
    Fail $_.Exception.Message
    exit 1
} finally {
    $null = Stop-Imba
}
