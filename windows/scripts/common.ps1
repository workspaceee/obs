# IMBA Widgets - shared settings and helpers (Windows PowerShell 5.1+)
# NOTE: this file is pure ASCII on purpose. All Russian text lives in messages.ru.json
#       (read explicitly as UTF-8), so the scripts work with any file encoding.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12 } catch {}

# Folder layout (same in the GitHub repo and in the zip):
#   <Root>\1_FIRST_START_INSTALL.bat, 2_START.bat, 3_STOP.bat
#   <Root>\backend\server.py ...
#   <Root>\windows\scripts\*.ps1   <- this file
#   <Root>\windows\web\index.html  (prebuilt widgets + panel)
#   <Root>\runtime\  (created: portable Python + AutoHotkey)
#   <Root>\data\     (created: database, logs)
$Root      = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$Backend   = Join-Path $Root 'backend'
$Web       = Join-Path $Root 'windows\web'
$ReqFile   = Join-Path $Root 'windows\requirements-local.txt'
$Runtime   = Join-Path $Root 'runtime'
$PyDir     = Join-Path $Runtime 'python'
$PyExe     = Join-Path $PyDir 'python.exe'
$AhkDir    = Join-Path $Runtime 'autohotkey'
$AhkExe    = Join-Path $AhkDir 'AutoHotkey64.exe'
$DataDir   = Join-Path $Root 'data'
$Marker    = Join-Path $Runtime 'installed.txt'
$HelperAhk = Join-Path $Root 'IMBA-Hotkeys.ahk'
$PidFile   = Join-Path $DataDir 'server.pid'
$Port      = 8765
$PyVersion = '3.12.8'
$PyUrl     = "https://www.python.org/ftp/python/$PyVersion/python-$PyVersion-embed-amd64.zip"
$GetPipUrl = 'https://bootstrap.pypa.io/get-pip.py'
$AhkUrl    = 'https://www.autohotkey.com/download/ahk-v2.zip'
$InstallVersion = '3'

# ---------- messages (UTF-8 JSON) ----------
$script:Msg = $null
try {
    $script:Msg = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'messages.ru.json') -Raw -Encoding UTF8 | ConvertFrom-Json
} catch {}
function M([string]$k) {
    if ($script:Msg -and ($script:Msg.PSObject.Properties.Name -contains $k)) { return [string]$script:Msg.$k }
    return $k
}

function Say([string]$t)  { Write-Host "  $t" }
function Step([string]$t) { Write-Host ''; Write-Host "  >> $t" -ForegroundColor Cyan }
function Ok([string]$t)   { Write-Host "  [OK] $t" -ForegroundColor Green }
function Warn([string]$t) { Write-Host "  [!] $t" -ForegroundColor Yellow }
function Fail([string]$t) { Write-Host ''; Write-Host "  [X] $t" -ForegroundColor Red }

# Check that the project files are where the scripts expect them
function Test-Layout {
    $need = @(
        (Join-Path $Backend 'server.py'),
        (Join-Path $Backend 'storage.py'),
        (Join-Path $Backend 'helper_script.py'),
        (Join-Path $Web 'index.html'),
        $ReqFile
    )
    $missing = @($need | Where-Object { -not (Test-Path -LiteralPath $_) })
    if ($missing.Count -gt 0) {
        $rel = ($missing | ForEach-Object { $_.Substring($Root.Length).TrimStart('\') }) -join ', '
        throw ((M 'missing_files') -f $rel)
    }
}

# Run a console program, print its output in grey, return exit code (never throws on stderr text)
function Invoke-Native {
    param([string]$Exe, [string[]]$Arguments)
    $old = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $code = 1
    try {
        & $Exe @Arguments 2>&1 | ForEach-Object { Write-Host "     $_" -ForegroundColor DarkGray }
        $code = $LASTEXITCODE
    } catch {
        Write-Host "     $($_.Exception.Message)" -ForegroundColor DarkGray
        $code = 1
    } finally {
        $ErrorActionPreference = $old
    }
    return $code
}

function Get-File {
    param([string]$Url, [string]$OutFile)
    for ($i = 1; $i -le 3; $i++) {
        try {
            if (Test-Path -LiteralPath $OutFile) { Remove-Item -LiteralPath $OutFile -Force }
            Invoke-WebRequest -Uri $Url -OutFile $OutFile -UseBasicParsing -TimeoutSec 300
            if ((Test-Path -LiteralPath $OutFile) -and ((Get-Item -LiteralPath $OutFile).Length -gt 1000)) { return }
        } catch {
            Warn ((M 'dl_try_fail') -f $i, $_.Exception.Message)
        }
        $curl = $null
        if ($env:SystemRoot) { $curl = Join-Path $env:SystemRoot 'System32\curl.exe' }
        if ($curl -and (Test-Path -LiteralPath $curl)) {
            $c = Invoke-Native $curl @('-L', '--fail', '--silent', '--show-error', '--retry', '2', '-o', $OutFile, $Url)
            if ($c -eq 0 -and (Test-Path -LiteralPath $OutFile) -and ((Get-Item -LiteralPath $OutFile).Length -gt 1000)) { return }
        }
        Start-Sleep -Seconds (2 * $i)
    }
    throw ((M 'dl_fail') -f $Url)
}

function Test-Installed {
    if (-not (Test-Path -LiteralPath $PyExe)) { return $false }
    if (-not (Test-Path -LiteralPath $AhkExe)) { return $false }
    if (-not (Test-Path -LiteralPath $Marker)) { return $false }
    return ((Get-Content -LiteralPath $Marker -Raw).Trim() -eq $InstallVersion)
}

# Stop our own python/AutoHotkey processes (only those started from this folder)
function Stop-Imba {
    $n = 0
    Get-Process -ErrorAction SilentlyContinue | ForEach-Object {
        $p = $null
        try { $p = $_.Path } catch {}
        if ($p -and $p.StartsWith($Runtime, [System.StringComparison]::OrdinalIgnoreCase)) {
            try { Stop-Process -Id $_.Id -Force -ErrorAction Stop; $n++ } catch {}
        }
    }
    if (Test-Path -LiteralPath $PidFile) { Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue }
    if ($n -gt 0) { Start-Sleep -Milliseconds 700 }
    return $n
}

function Get-PortOwner([int]$p) {
    $c = $null
    try { $c = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction Stop | Select-Object -First 1 } catch { return $null }
    if (-not $c) { return $null }
    $proc = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue
    if ($proc) { return "$($proc.ProcessName) (PID $($proc.Id))" }
    return "PID $($c.OwningProcess)"
}

function Get-LanIp {
    try {
        $ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
            Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.PrefixOrigin -ne 'WellKnown' } |
            Sort-Object -Property InterfaceMetric | Select-Object -First 1
        if ($ip) { return $ip.IPAddress }
    } catch {}
    return $null
}
