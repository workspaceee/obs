# IMBA Widgets - full install of all components into this folder (no admin rights needed)
# Pure ASCII file. Texts: messages.ru.json
. (Join-Path $PSScriptRoot 'common.ps1')

try {
    Say ((M 'folder') -f $Root)
    if (-not [Environment]::Is64BitOperatingSystem) { throw (M 'need_x64') }
    if ($PSVersionTable.PSVersion.Major -lt 5) { throw (M 'need_ps5') }
    Test-Layout

    $null = Stop-Imba
    New-Item -ItemType Directory -Force -Path $Runtime | Out-Null
    New-Item -ItemType Directory -Force -Path $DataDir | Out-Null

    Step (M 'unblock')
    Get-ChildItem -LiteralPath $Root -Recurse -File -ErrorAction SilentlyContinue | Unblock-File -ErrorAction SilentlyContinue
    Ok (M 'done')

    # ---------- 1. Python (portable, embedded distribution) ----------
    Step ((M 'py_step') -f $PyVersion)
    $pyCheck = @('-c', 'import sys; print(''Python'', sys.version.split()[0])')
    $pyOk = $false
    if (Test-Path -LiteralPath $PyExe) { $pyOk = ((Invoke-Native $PyExe $pyCheck) -eq 0) }
    if (-not $pyOk) {
        if (Test-Path -LiteralPath $PyDir) { Remove-Item -LiteralPath $PyDir -Recurse -Force }
        $zip = Join-Path $Runtime 'python.zip'
        Say (M 'py_download')
        Get-File $PyUrl $zip
        Expand-Archive -LiteralPath $zip -DestinationPath $PyDir -Force
        Remove-Item -LiteralPath $zip -Force
        $pth = Get-ChildItem -LiteralPath $PyDir -Filter 'python3*._pth' | Select-Object -First 1
        $stdlib = Get-ChildItem -LiteralPath $PyDir -Filter 'python3*.zip' | Select-Object -First 1
        if (-not $pth -or -not $stdlib) { throw (M 'py_broken_zip') }
        Set-Content -LiteralPath $pth.FullName -Value @($stdlib.Name, '.', 'Lib\site-packages', 'import site') -Encoding ASCII
        if ((Invoke-Native $PyExe $pyCheck) -ne 0) { throw (M 'py_no_run') }
    }
    Ok (M 'py_ok')

    # ---------- 2. pip ----------
    Step (M 'pip_step')
    if (-not (Test-Path -LiteralPath (Join-Path $PyDir 'Lib\site-packages\pip'))) {
        $gp = Join-Path $Runtime 'get-pip.py'
        Get-File $GetPipUrl $gp
        if ((Invoke-Native $PyExe @($gp, '--no-warn-script-location', '--disable-pip-version-check')) -ne 0) { throw (M 'pip_fail') }
        Remove-Item -LiteralPath $gp -Force -ErrorAction SilentlyContinue
    }
    Ok (M 'pip_ok')

    # ---------- 3. server libraries ----------
    Step (M 'libs_step')
    $code = Invoke-Native $PyExe @('-m', 'pip', 'install', '--disable-pip-version-check', '--no-warn-script-location', '--only-binary=:all:', '-q', '-r', $ReqFile)
    if ($code -ne 0) { throw (M 'libs_fail') }
    $libCheck = @('-c', 'import fastapi, uvicorn, pydantic, dotenv; print(''fastapi'', fastapi.__version__, ''/ uvicorn'', uvicorn.__version__)')
    if ((Invoke-Native $PyExe $libCheck) -ne 0) { throw (M 'libs_broken') }
    Ok (M 'libs_ok')

    # ---------- 4. AutoHotkey v2 (portable) ----------
    Step (M 'ahk_step')
    if (-not (Test-Path -LiteralPath $AhkExe)) {
        $zip = Join-Path $Runtime 'ahk.zip'
        Get-File $AhkUrl $zip
        if (Test-Path -LiteralPath $AhkDir) { Remove-Item -LiteralPath $AhkDir -Recurse -Force }
        Expand-Archive -LiteralPath $zip -DestinationPath $AhkDir -Force
        Remove-Item -LiteralPath $zip -Force
        if (-not (Test-Path -LiteralPath $AhkExe)) { throw (M 'ahk_missing') }
    }
    Ok (M 'ahk_ok')

    Set-Content -LiteralPath $Marker -Value $InstallVersion -Encoding ASCII
    Write-Host ''
    Ok (M 'install_ok')
    exit 0
} catch {
    Fail $_.Exception.Message
    Say (M 'install_retry')
    exit 1
}
