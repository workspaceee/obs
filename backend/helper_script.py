"""Builds the AutoHotkey v2 helper script that sends global hotkeys to the widget server."""

NUMPAD_ALT = {
    "Numpad0": "NumpadIns", "Numpad1": "NumpadEnd", "Numpad2": "NumpadDown", "Numpad3": "NumpadPgDn",
    "Numpad4": "NumpadLeft", "Numpad5": "NumpadClear", "Numpad6": "NumpadRight", "Numpad7": "NumpadHome",
    "Numpad8": "NumpadUp", "Numpad9": "NumpadPgUp", "NumpadDot": "NumpadDel",
}


def numpad_variants(ahk: str):
    """Return the hotkey plus its NumLock-off twin, so Numpad keys work regardless of NumLock."""
    mods = ""
    i = 0
    while i < len(ahk) and ahk[i] in "^!+#":
        mods += ahk[i]
        i += 1
    key = ahk[i:]
    out = [ahk]
    if key in NUMPAD_ALT:
        out.append(mods + NUMPAD_ALT[key])
    return out


TEMPLATE = r'''; ================================================================
;  IMBA Widgets - global hotkeys helper (AutoHotkey v2)
;  Ловит горячие клавиши поверх Dota 2 и отправляет WIN / LOSE / UNDO
;  на сервер виджетов. Не трогает файлы и память игры.
;  Клавиши меняются в веб-панели - помощник подтянет их сам (≈3 сек).
;  Требуется AutoHotkey v2: https://www.autohotkey.com/
; ================================================================
#Requires AutoHotkey v2.0
#SingleInstance Force
#UseHook true
Persistent
InstallKeybdHook

global BASE  := "__BASE__"
global TOKEN := "__TOKEN__"
global Active := Map()        ; action -> [hotkey strings]
global LastCfg := ""
global Online := -1
global Busy := false

A_IconTip := "IMBA Widgets: подключение..."
A_TrayMenu.Delete()
A_TrayMenu.Add("IMBA Widgets: подключение...", (*) => 0)
A_TrayMenu.Disable("1&")
A_TrayMenu.Add()
A_TrayMenu.Add("Открыть панель", (*) => Run(BASE "/panel"))
A_TrayMenu.Add("Тест: +WIN", (*) => SendAction("win"))
A_TrayMenu.Add("Тест: UNDO", (*) => SendAction("undo"))
A_TrayMenu.Add("Перезапустить", (*) => Reload())
A_TrayMenu.Add("Выход", (*) => ExitApp())

Http(method, path) {
    req := ComObject("WinHttp.WinHttpRequest.5.1")
    req.Open(method, BASE "/api" path (InStr(path, "?") ? "&" : "?") "token=" TOKEN, false)
    req.SetTimeouts(3000, 3000, 4000, 6000)
    req.SetRequestHeader("Content-Type", "text/plain")
    req.Send("")
    return {status: req.Status, text: req.ResponseText}
}

SetOnline(state) {
    global Online
    if (state = Online)
        return
    Online := state
    label := state ? "IMBA Widgets: подключено ✓" : "IMBA Widgets: НЕТ СВЯЗИ ✗"
    A_IconTip := label
    try A_TrayMenu.Rename("1&", label)
    try TraySetIcon("shell32.dll", state ? 297 : 132)
    TrayTip(state ? "Подключено к виджетам. Горячие клавиши активны." : "Нет связи с сервером виджетов.", "IMBA Widgets", state ? 1 : 3)
}

SendAction(action) {
    global Busy
    if Busy
        return
    Busy := true
    try {
        r := Http("POST", "/helper/action/" action)
        if (r.status = 200)
            SetOnline(true)
        else
            TrayTip("Ошибка " r.status " при отправке " action, "IMBA Widgets", 3)
    } catch {
        SetOnline(false)
    }
    Busy := false
}

MakeHandler(action) {
    return (*) => SendAction(action)
}

ApplyConfig(text) {
    global Active
    cfg := Map()
    for line in StrSplit(text, "`n", "`r") {
        if !InStr(line, "=")
            continue
        parts := StrSplit(line, "=", , 2)
        cfg[Trim(parts[1])] := Trim(parts[2])
    }
    for action in ["win", "lose", "undo"] {
        if Active.Has(action) {
            for k in Active[action]
                try Hotkey("$" k, "Off")
        }
        Active[action] := []
        if !cfg.Has(action) || cfg[action] = ""
            continue
        for k in StrSplit(cfg[action], "|") {
            try {
                Hotkey("$" k, MakeHandler(action), "On")
                Active[action].Push(k)
            } catch as e {
                TrayTip("Не удалось назначить клавишу " k, "IMBA Widgets", 3)
            }
        }
    }
}

Poll() {
    global LastCfg
    try {
        r := Http("GET", "/helper/config")
        if (r.status = 200) {
            SetOnline(true)
            if (r.text != LastCfg) {
                ApplyConfig(r.text)
                LastCfg := r.text
            }
        } else if (r.status = 403) {
            SetOnline(false)
            TrayTip("Токен устарел. Скачайте помощник заново в панели (вкладка OBS).", "IMBA Widgets", 3)
            SetTimer(Poll, 0)
        } else {
            SetOnline(false)
        }
    } catch {
        SetOnline(false)
    }
}

Poll()
SetTimer(Poll, 3000)
'''


def build_ahk_script(base_url: str, token: str) -> str:
    return TEMPLATE.replace("__BASE__", base_url).replace("__TOKEN__", token)
