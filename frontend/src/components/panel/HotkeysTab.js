import { useCallback, useEffect, useMemo, useState } from "react";
import { Circle, Keyboard, AlertTriangle, RotateCcw, Save, Info } from "lucide-react";
import { toast } from "sonner";
import { http, errMsg } from "@/lib/api";
import { keyFromEvent, riskNote } from "@/lib/hotkeys";

const ROWS = [
  { id: "win", title: "+WIN", desc: "Добавить победу" },
  { id: "lose", title: "+LOSE", desc: "Добавить поражение" },
  { id: "undo", title: "UNDO", desc: "Отменить последнее действие" },
];

export const HotkeysTab = ({ hotkeys, setHotkeys, helper }) => {
  const [draft, setDraft] = useState(hotkeys);
  const [rec, setRec] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(hotkeys), [hotkeys]);

  const onKey = useCallback(
    (e) => {
      if (!rec) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.code === "Escape" && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        setRec(null);
        return;
      }
      const k = keyFromEvent(e);
      if (!k) return; // only modifier pressed so far
      if (k.error) {
        toast.error(k.error);
        return;
      }
      setDraft((d) => ({ ...d, [rec]: { ahk: k.ahk, label: k.label } }));
      setRec(null);
    },
    [rec]
  );

  useEffect(() => {
    if (!rec) return;
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [rec, onKey]);

  const conflicts = useMemo(() => {
    if (!draft) return [];
    const seen = {};
    const out = new Set();
    ROWS.forEach((r) => {
      const a = draft[r.id]?.ahk;
      if (!a) return;
      if (seen[a]) {
        out.add(r.id);
        out.add(seen[a]);
      } else seen[a] = r.id;
    });
    return [...out];
  }, [draft]);

  const dirty = draft && hotkeys && ROWS.some((r) => draft[r.id]?.ahk !== hotkeys[r.id]?.ahk);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await http.put("/hotkeys", draft);
      setHotkeys(data.keys);
      toast.success("Клавиши сохранены — помощник подхватит их за ~3 сек");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    try {
      const { data } = await http.post("/hotkeys/reset");
      setHotkeys(data.keys);
      toast.success("Возвращены клавиши по умолчанию");
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  if (!draft) return null;

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 lg:col-span-8 space-y-6">
        <div className="hud-card p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="hud-label">Глобальные клавиши</div>
            <span className={`pill ${helper?.online ? "pill--on" : "pill--off"}`} data-testid="panel-hotkeys-helper-status">
              <Circle size={8} fill="currentColor" /> {helper?.online ? "Помощник подключён" : "Помощник не запущен"}
            </span>
          </div>

          <div className="space-y-3">
            {ROWS.map((r) => {
              const item = draft[r.id];
              const isRec = rec === r.id;
              const conflict = conflicts.includes(r.id);
              const risk = riskNote(item);
              return (
                <div key={r.id} className={`hk-row ${isRec ? "hk-row--rec" : ""} ${conflict ? "hk-row--conflict" : ""}`} data-testid={`panel-hotkeys-${r.id}-row`}>
                  <div className="min-w-0">
                    <div className={`font-display text-lg font-bold tracking-wider ${r.id === "lose" ? "text-imba-red" : r.id === "win" ? "text-imba-green" : ""}`}>{r.title}</div>
                    <div className="text-xs text-white/45">{r.desc}</div>
                  </div>
                  <div className="flex items-center gap-3 ml-auto flex-wrap justify-end">
                    <kbd className="kbd" data-testid={`panel-hotkeys-${r.id}-value`}>{isRec ? "Нажмите сочетание…" : item?.label}</kbd>
                    <button type="button" className={`cut-btn h-10 px-4 ${isRec ? "btn-red" : "btn-ghost"}`} onClick={() => setRec(isRec ? null : r.id)} data-testid={`panel-hotkeys-${r.id}-recorder`}>
                      <Keyboard size={15} /> {isRec ? "Отмена (Esc)" : "Записать"}
                    </button>
                  </div>
                  {(conflict || risk) && (
                    <div className="w-full text-xs flex items-start gap-1.5 text-[#ffb3ba]">
                      <AlertTriangle size={13} className="mt-0.5 flex-none" />
                      {conflict ? "Эта клавиша уже назначена на другое действие" : risk}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {conflicts.length > 0 && (
            <div className="warn-box" data-testid="panel-hotkeys-conflict-warning">
              <AlertTriangle size={16} /> Одно сочетание назначено на несколько действий. Исправьте перед сохранением.
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-1">
            <button className="cut-btn btn-white h-11 px-5" disabled={!dirty || conflicts.length > 0 || saving} onClick={save} data-testid="panel-hotkeys-save-button">
              <Save size={16} /> Сохранить клавиши
            </button>
            {dirty && <button className="cut-btn btn-ghost h-11 px-5" onClick={() => setDraft(hotkeys)} data-testid="panel-hotkeys-discard-button">Отменить изменения</button>}
            <button className="cut-btn btn-ghost h-11 px-5 ml-auto" onClick={reset} data-testid="panel-hotkeys-reset-button">
              <RotateCcw size={16} /> По умолчанию
            </button>
          </div>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-4">
        <div className="hud-card p-5 md:p-6 space-y-3 text-sm text-white/70">
          <div className="hud-label flex items-center gap-2"><Info size={14} /> Как это работает</div>
          <p>Клавиши ловит небольшой помощник на AutoHotkey — даже когда открыта Dota 2. Скачать его можно на вкладке <b className="text-white">OBS</b>.</p>
          <p>Поменяли клавиши здесь — помощник сам подтянет их за пару секунд, перезапускать ничего не нужно.</p>
          <p>Клавиши Num работают при любом состоянии NumLock.</p>
          <p className="text-white/50">Совет: если в полноэкранной Dota клавиши не срабатывают — включите режим «Полноэкранный в окне» или запустите помощник от имени администратора.</p>
        </div>
      </div>
    </div>
  );
};
