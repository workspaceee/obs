import { useEffect, useState } from "react";
import { Trophy, Skull, Undo2, RotateCcw, Save, Keyboard, MousePointerClick } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { http, errMsg } from "@/lib/api";
import { WidgetPreview } from "./WidgetPreview";

const EVENT_RU = { win: "+WIN", lose: "+LOSE", undo: "UNDO", set: "Ручная правка", reset: "Сброс", init: "Старт" };

export const ScoreTab = ({ score, pushScore, hotkeys }) => {
  const [busy, setBusy] = useState(null);
  const [form, setForm] = useState({ wins: "0", losses: "0" });
  const [dirty, setDirty] = useState(false);
  const [log, setLog] = useState([]);

  useEffect(() => {
    if (score && !dirty) setForm({ wins: String(score.wins), losses: String(score.losses) });
  }, [score, dirty]);

  useEffect(() => {
    http.get("/score/log").then((r) => setLog(r.data)).catch(() => {});
  }, [score?.version]);

  const act = async (a) => {
    setBusy(a);
    try {
      const { data } = await http.post(`/score/${a}`);
      pushScore(data);
      if (a === "undo" && !data.changed) toast("Нечего отменять");
      if (a === "reset") toast.success("Счёт сброшен");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    const w = parseInt(form.wins, 10);
    const l = parseInt(form.losses, 10);
    if (Number.isNaN(w) || Number.isNaN(l) || w < 0 || l < 0) return toast.error("Введите целые числа от 0");
    setBusy("save");
    try {
      const { data } = await http.put("/score", { wins: w, losses: l });
      pushScore(data);
      setDirty(false);
      toast.success("Счёт обновлён");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  const streak = score?.streak;

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 lg:col-span-7 space-y-6 order-2 lg:order-1">
        <div className="hud-card p-5 md:p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="hud-label">Действия</div>
            <div className="text-xs text-white/40 flex items-center gap-1.5"><MousePointerClick size={14} /> или горячие клавиши</div>
          </div>
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            <button className="act-btn act-btn--win" disabled={!!busy} onClick={() => act("win")} data-testid="panel-score-win-button">
              <Trophy size={22} />
              <span className="act-title">+WIN</span>
              <span className="act-key">{hotkeys?.win?.label}</span>
            </button>
            <button className="act-btn act-btn--lose" disabled={!!busy} onClick={() => act("lose")} data-testid="panel-score-lose-button">
              <Skull size={22} />
              <span className="act-title">+LOSE</span>
              <span className="act-key">{hotkeys?.lose?.label}</span>
            </button>
            <button className="act-btn act-btn--undo" disabled={!!busy || !score?.can_undo} onClick={() => act("undo")} data-testid="panel-score-undo-button">
              <Undo2 size={22} />
              <span className="act-title">UNDO</span>
              <span className="act-key">{hotkeys?.undo?.label}</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="stat"><span className="stat-k">Победы</span><span className="stat-v text-imba-green" data-testid="panel-score-wins-value">{score?.wins ?? "—"}</span></div>
            <div className="stat"><span className="stat-k">Поражения</span><span className="stat-v text-imba-red" data-testid="panel-score-losses-value">{score?.losses ?? "—"}</span></div>
            <div className="stat">
              <span className="stat-k">Серия</span>
              <span className={`stat-v ${streak?.count >= 2 ? (streak.type === "lose" ? "text-imba-red" : "text-imba-green") : ""}`} data-testid="panel-score-streak-value">
                {streak?.count >= 2 ? `${streak.count} ${streak.type === "win" ? "W" : "L"}` : "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="hud-card p-5 md:p-6 space-y-4">
          <div className="hud-label">Ручная правка</div>
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-imba-green" htmlFor="in-wins">WIN</label>
              <Input id="in-wins" type="number" min={0} inputMode="numeric" value={form.wins} onChange={(e) => { setDirty(true); setForm((f) => ({ ...f, wins: e.target.value })); }} className="hud-input h-11 text-lg font-display" data-testid="panel-score-wins-input" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-white/50" htmlFor="in-losses">LOSE</label>
              <Input id="in-losses" type="number" min={0} inputMode="numeric" value={form.losses} onChange={(e) => { setDirty(true); setForm((f) => ({ ...f, losses: e.target.value })); }} className="hud-input h-11 text-lg font-display" data-testid="panel-score-losses-input" />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="cut-btn btn-white h-11 px-5" disabled={!dirty || busy === "save"} onClick={save} data-testid="panel-score-save-button">
              <Save size={16} /> Сохранить
            </button>
            {dirty && (
              <button className="cut-btn btn-ghost h-11 px-5" onClick={() => setDirty(false)} data-testid="panel-score-cancel-edit-button">Отменить</button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="cut-btn btn-outline-red h-11 px-5 ml-auto" data-testid="panel-score-reset-button">
                  <RotateCcw size={16} /> Сбросить счёт
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="hud-dialog">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-display">Сбросить счёт до 0 : 0?</AlertDialogTitle>
                  <AlertDialogDescription>Серия тоже обнулится. Если ошиблись — нажмите UNDO, счёт вернётся.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="panel-score-reset-cancel-button">Отмена</AlertDialogCancel>
                  <AlertDialogAction className="bg-[#ff1a2e] hover:bg-[#ff3345] text-white" onClick={() => act("reset")} data-testid="panel-score-reset-confirm-button">Сбросить</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="hud-card p-5 md:p-6 space-y-3">
          <div className="hud-label">Последние действия</div>
          {log.length === 0 ? (
            <p className="text-sm text-white/40">Пока пусто — нажмите +WIN или +LOSE.</p>
          ) : (
            <ul className="divide-y divide-white/5" data-testid="panel-score-log">
              {log.slice(0, 8).map((it, i) => (
                <li key={`${it.at}-${i}`} className="flex items-center gap-3 py-2 text-sm">
                  <span className={`log-dot log-dot--${it.type}`} />
                  <span className="font-display font-semibold w-32">{EVENT_RU[it.type] || it.type}</span>
                  <span className="text-white/50 flex items-center gap-1.5">{it.source === "hotkey" ? <><Keyboard size={13} /> клавиша</> : "панель"}</span>
                  <span className="ml-auto font-display text-white/70">{it.wins} : {it.losses}</span>
                  <span className="text-white/30 text-xs w-14 text-right">{new Date(it.at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="col-span-12 lg:col-span-5 order-1 lg:order-2">
        <div className="hud-card p-5 md:p-6 lg:sticky lg:top-24">
          <WidgetPreview src="/widget/score" ratio="600 / 200" title="Предпросмотр · счёт" testId="panel-score-preview" />
          <p className="text-xs text-white/40 mt-3">Это тот же виджет, что в OBS. Обновляется мгновенно.</p>
        </div>
      </div>
    </div>
  );
};
