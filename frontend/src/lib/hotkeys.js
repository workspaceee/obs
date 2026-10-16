// Convert a browser KeyboardEvent into an AutoHotkey v2 hotkey string + readable label.
const PUNCT = {
  Minus: ["SC00C", "-"],
  Equal: ["SC00D", "="],
  BracketLeft: ["SC01A", "["],
  BracketRight: ["SC01B", "]"],
  Semicolon: ["SC027", ";"],
  Quote: ["SC028", "'"],
  Backquote: ["SC029", "`"],
  Backslash: ["SC02B", "\\"],
  Comma: ["SC033", ","],
  Period: ["SC034", "."],
  Slash: ["SC035", "/"],
};

const NAMED = {
  ArrowUp: ["Up", "↑"],
  ArrowDown: ["Down", "↓"],
  ArrowLeft: ["Left", "←"],
  ArrowRight: ["Right", "→"],
  Home: ["Home", "Home"],
  End: ["End", "End"],
  PageUp: ["PgUp", "PgUp"],
  PageDown: ["PgDn", "PgDn"],
  Insert: ["Ins", "Insert"],
  Delete: ["Del", "Delete"],
  Pause: ["Pause", "Pause"],
  ScrollLock: ["ScrollLock", "ScrollLock"],
  Space: ["Space", "Space"],
  Enter: ["Enter", "Enter"],
  Tab: ["Tab", "Tab"],
  Backspace: ["Backspace", "Backspace"],
  NumpadAdd: ["NumpadAdd", "Num +"],
  NumpadSubtract: ["NumpadSub", "Num -"],
  NumpadMultiply: ["NumpadMult", "Num *"],
  NumpadDivide: ["NumpadDiv", "Num /"],
  NumpadDecimal: ["NumpadDot", "Num ."],
  NumpadEnter: ["NumpadEnter", "Num Enter"],
};

const MODIFIER_CODES = ["ControlLeft", "ControlRight", "AltLeft", "AltRight", "ShiftLeft", "ShiftRight", "MetaLeft", "MetaRight", "OSLeft", "OSRight"];

export function keyFromEvent(e) {
  const code = e.code;
  if (MODIFIER_CODES.includes(code)) return null;
  let key = null;
  let label = null;
  let m;
  if ((m = code.match(/^Key([A-Z])$/))) {
    key = m[1].toLowerCase();
    label = m[1];
  } else if ((m = code.match(/^Digit(\d)$/))) {
    key = m[1];
    label = m[1];
  } else if ((m = code.match(/^Numpad(\d)$/))) {
    key = `Numpad${m[1]}`;
    label = `Num ${m[1]}`;
  } else if ((m = code.match(/^F(\d{1,2})$/))) {
    key = `F${m[1]}`;
    label = `F${m[1]}`;
  } else if (NAMED[code]) {
    [key, label] = NAMED[code];
  } else if (PUNCT[code]) {
    [key, label] = PUNCT[code];
  }
  if (!key) return { error: "Эта клавиша не поддерживается" };

  let ahk = "";
  const parts = [];
  if (e.ctrlKey) { ahk += "^"; parts.push("Ctrl"); }
  if (e.altKey) { ahk += "!"; parts.push("Alt"); }
  if (e.shiftKey) { ahk += "+"; parts.push("Shift"); }
  if (e.metaKey) { ahk += "#"; parts.push("Win"); }
  parts.push(label);
  return { ahk: ahk + key, label: parts.join(" + "), hasModifier: ahk.length > 0 };
}

export function riskNote(item) {
  if (!item) return null;
  const hasMod = /^[\^!+#]/.test(item.ahk);
  if (!hasMod) {
    return "Без Ctrl/Alt/Shift клавиша будет перехвачена и перестанет работать в Dota 2.";
  }
  if (/^\+?[a-z0-9]$/i.test(item.ahk.replace(/^\+/, "")) && /^\+/.test(item.ahk)) {
    return "Shift + буква/цифра часто используется в Dota 2 (очередь приказов).";
  }
  return null;
}

export const DEFAULT_HOTKEYS = {
  win: { ahk: "^!Numpad1", label: "Ctrl + Alt + Num 1" },
  lose: { ahk: "^!Numpad2", label: "Ctrl + Alt + Num 2" },
  undo: { ahk: "^!Numpad0", label: "Ctrl + Alt + Num 0" },
};
