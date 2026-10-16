# IMBA Widgets - shared settings and helpers (Windows PowerShell 5.1+)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12 } catch {}

$Root      = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$AppDir    = Join-Path $Root 'app'
$Backend   = Join-Path $AppDir 'backend'
$Web       = Join-Path $AppDir 'web'
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
$InstallVersion = '2'

function Say([string]$t)  { Write-Host "  $t" }
function Step([string]$t) { Write-Host ''; Write-Host "  >> $t" -ForegroundColor Cyan }
function Ok([string]$t)   { Write-Host "  [OK] $t" -ForegroundColor Green }
function Warn([string]$t) { Write-Host "  [!] $t" -ForegroundColor Yellow }
function Fail([string]$t) { Write-Host ''; Write-Host "  [X] $t" -ForegroundColor Red }

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
            Warn "Попытка $i не удалась: $($_.Exception.Message)"
        }
        $curl = $null
        if ($env:SystemRoot) { $curl = Join-Path $env:SystemRoot 'System32\curl.exe' }
        if ($curl -and (Test-Path -LiteralPath $curl)) {
            $c = Invoke-Native $curl @('-L', '--fail', '--silent', '--show-error', '--retry', '2', '-o', $OutFile, $Url)
            if ($c -eq 0 -and (Test-Path -LiteralPath $OutFile) -and ((Get-Item -LiteralPath $OutFile).Length -gt 1000)) { return }
        }
        Start-Sleep -Seconds (2 * $i)
    }
    throw "Не удалось скачать $Url"
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
