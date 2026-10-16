# IMBA Widgets - stop server and hotkey helper
. (Join-Path $PSScriptRoot 'common.ps1')
try {
    $n = Stop-Imba
    if ($n -gt 0) { Ok "Остановлено процессов: $n" } else { Say 'Ничего не запущено.' }
    exit 0
} catch {
    Fail $_.Exception.Message
    exit 1
}
