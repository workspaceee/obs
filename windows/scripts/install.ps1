# IMBA Widgets - full install of all components into this folder (no admin rights needed)
. (Join-Path $PSScriptRoot 'common.ps1')

try {
    Say "Папка проекта: $Root"
    if (-not [Environment]::Is64BitOperatingSystem) { throw 'Нужна 64-битная Windows 10 или 11.' }
    if ($PSVersionTable.PSVersion.Major -lt 5) { throw 'Нужен PowerShell 5 или новее (есть в Windows 10/11).' }
    if (-not (Test-Path -LiteralPath (Join-Path $Backend 'server.py'))) { throw 'Не найден app\backend\server.py - распакуйте архив целиком.' }

    $null = Stop-Imba
    New-Item -ItemType Directory -Force -Path $Runtime | Out-Null
    New-Item -ItemType Directory -Force -Path $DataDir | Out-Null

    Step '0/4  Снимаю пометку "файл из интернета"'
    Get-ChildItem -LiteralPath $Root -Recurse -File -ErrorAction SilentlyContinue | Unblock-File -ErrorAction SilentlyContinue
    Ok 'Готово'

    # ---------- 1. Python (portable, embedded distribution) ----------
    Step "1/4  Python $PyVersion (портативный, внутри папки runtime)"
    $pyOk = $false
    if (Test-Path -LiteralPath $PyExe) {
        $pyOk = ((Invoke-Native $PyExe @('-c', 'import sys; print(''Python'', sys.version.split()[0])')) -eq 0)
    }
    if (-not $pyOk) {
        if (Test-Path -LiteralPath $PyDir) { Remove-Item -LiteralPath $PyDir -Recurse -Force }
        $zip = Join-Path $Runtime 'python.zip'
        Say 'Скачиваю Python (~11 МБ)...'
        Get-File $PyUrl $zip
        Expand-Archive -LiteralPath $zip -DestinationPath $PyDir -Force
        Remove-Item -LiteralPath $zip -Force
        $pth = Get-ChildItem -LiteralPath $PyDir -Filter 'python3*._pth' | Select-Object -First 1
        $stdlib = Get-ChildItem -LiteralPath $PyDir -Filter 'python3*.zip' | Select-Object -First 1
        if (-not $pth -or -not $stdlib) { throw 'Архив Python повреждён. Запустите установку ещё раз.' }
        Set-Content -LiteralPath $pth.FullName -Value @($stdlib.Name, '.', 'Lib\site-packages', 'import site') -Encoding ASCII
        if ((Invoke-Native $PyExe @('-c', 'import sys; print(''Python'', sys.version.split()[0])')) -ne 0) {
            throw 'Python не запускается. Возможно, антивирус заблокировал папку runtime.'
        }
    }
    Ok 'Python готов'

    # ---------- 2. pip ----------
    Step '2/4  Менеджер пакетов pip'
    if (-not (Test-Path -LiteralPath (Join-Path $PyDir 'Lib\site-packages\pip'))) {
        $gp = Join-Path $Runtime 'get-pip.py'
        Get-File $GetPipUrl $gp
        if ((Invoke-Native $PyExe @($gp, '--no-warn-script-location', '--disable-pip-version-check')) -ne 0) { throw 'Не удалось установить pip.' }
        Remove-Item -LiteralPath $gp -Force -ErrorAction SilentlyContinue
    }
    Ok 'pip готов'

    # ---------- 3. server libraries ----------
    Step '3/4  Библиотеки сервера (FastAPI, Uvicorn)'
    $req = Join-Path $Backend 'requirements.txt'
    $code = Invoke-Native $PyExe @('-m', 'pip', 'install', '--disable-pip-version-check', '--no-warn-script-location', '--only-binary=:all:', '-q', '-r', $req)
    if ($code -ne 0) { throw 'Не удалось установить библиотеки сервера (pip).' }
    if ((Invoke-Native $PyExe @('-c', 'import fastapi, uvicorn, pydantic, dotenv; print(''fastapi'', fastapi.__version__, ''/ uvicorn'', uvicorn.__version__)')) -ne 0) {
        throw 'Библиотеки установлены с ошибкой.'
    }
    Ok 'Библиотеки установлены'

    # ---------- 4. AutoHotkey v2 (portable) ----------
    Step '4/4  AutoHotkey v2 (портативный) - для горячих клавиш'
    if (-not (Test-Path -LiteralPath $AhkExe)) {
        $zip = Join-Path $Runtime 'ahk.zip'
        Get-File $AhkUrl $zip
        if (Test-Path -LiteralPath $AhkDir) { Remove-Item -LiteralPath $AhkDir -Recurse -Force }
        Expand-Archive -LiteralPath $zip -DestinationPath $AhkDir -Force
        Remove-Item -LiteralPath $zip -Force
        if (-not (Test-Path -LiteralPath $AhkExe)) { throw 'AutoHotkey64.exe не найден - возможно, его удалил антивирус. Добавьте папку в исключения и повторите.' }
    }
    Ok 'AutoHotkey готов'

    Set-Content -LiteralPath $Marker -Value $InstallVersion -Encoding ASCII
    Write-Host ''
    Ok 'Установка завершена. Дальше запускайте 2_START.bat'
    exit 0
} catch {
    Fail $_.Exception.Message
    Say 'Проверьте интернет и запустите 1_FIRST_START_INSTALL.bat ещё раз.'
    exit 1
}
