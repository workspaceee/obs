# IMBA Widgets - stop server and hotkey helper
# Pure ASCII file. Texts: messages.ru.json
. (Join-Path $PSScriptRoot 'common.ps1')
try {
    $n = Stop-Imba
    if ($n -gt 0) { Ok ((M 'stop_done') -f $n) } else { Say (M 'stop_none') }
    exit 0
} catch {
    Fail $_.Exception.Message
    exit 1
}
