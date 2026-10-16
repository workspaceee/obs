import { useState } from "react";
import { Copy, Check, Download, MonitorPlay, KeyRound, ExternalLink, RefreshCw, PanelTop, HardDrive } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { http, errMsg, BACKEND_URL } from "@/lib/api";

const IS_LOCAL = !BACKEND_URL;

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
};

const UrlRow = ({ title, url, size, testId }) => {
  const [done, setDone] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="font-display font-semibold tracking-wide">{title}</div>
        <span className="kbd">{size}</span>
      </div>
      <div className="flex gap-2">
        <div className="url-box" data-testid={`panel-obs-${testId}-url`}>{url}</div>
        <button
          className={`cut-btn h-11 px-4 ${done ? "btn-white" : "btn-red"}`}
          onClick={async () => {
            if (await copyText(url)) {
              setDone(true);
              toast.success("Ссылка скопирована");
              setTimeout(() => setDone(false), 1800);
            } else toast.error("Не удалось скопировать");
          }}
          data-testid={`panel-obs-copy-${testId}-url-button`}
        >
          {done ? <Check size={16} /> : <Copy size={16} />} <span className="hidden sm:inline">{done ? "Готово" : "Скопировать"}</span>
        </button>
        <a className="cut-btn btn-ghost h-11 px-3" href={url} target="_blank" rel="noreferrer" title="Открыть" data-testid={`panel-obs-open-${testId}-url-button`}>
          <ExternalLink size={16} />
        </a>
      </div>
    </div>
  );
};

const Step = ({ n, title, children }) => (
  <div className="step">
    <div className="step-n">{n}</div>
    <div className="space-y-1.5">
      <div className="font-display font-semibold text-base tracking-wide">{title}</div>
      <div className="text-sm text-white/65 space-y-1.5">{children}</div>
    </div>
  </div>
);

export const ObsTab = () => {
  const origin = window.location.origin;
  const scoreUrl = `${origin}/widget/score`;
  const rankUrl = `${origin}/widget/rank`;
  const panelUrl = `${origin}/panel`;
  const [dl, setDl] = useState(false);
  const [dlWin, setDlWin] = useState(false);

  const downloadWindows = async () => {
    setDlWin(true);
    try {
      const res = await http.get("/download/windows", { responseType: "blob", timeout: 180000 });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "IMBA-Widgets-Windows.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast.success("Архив скачан — распакуйте и запустите 1_FIRST_START_INSTALL.bat");
    } catch (e) {
      toast.error(errMsg(e, "Не удалось скачать архив"));
    } finally {
      setDlWin(false);
    }
  };
  const [pw, setPw] = useState({ old_password: "", new_password: "" });

  const download = async () => {
    setDl(true);
    try {
      const res = await http.get("/helper/script", { params: { base: BACKEND_URL || origin }, responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "IMBA-Hotkeys.ahk";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast.success("Помощник скачан — запустите IMBA-Hotkeys.ahk");
    } catch (e) {
      toast.error(errMsg(e, "Не удалось скачать"));
    } finally {
      setDl(false);
    }
  };

  const regenerate = async () => {
    try {
      await http.post("/helper/regenerate");
      toast.success("Токен обновлён. Скачайте помощник заново.");
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const changePw = async (e) => {
    e.preventDefault();
    if (pw.new_password.length < 4) return toast.error("Новый пароль — минимум 4 символа");
    try {
      await http.post("/auth/password", pw);
      setPw({ old_password: "", new_password: "" });
      toast.success("Пароль изменён");
    } catch (e2) {
      toast.error(errMsg(e2));
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 lg:col-span-7 space-y-6">
        <div className="hud-card p-5 md:p-6 space-y-5">
          <div className="hud-label flex items-center gap-2"><MonitorPlay size={14} /> Постоянные ссылки для OBS</div>
          <UrlRow title="Счёт WIN / LOSE" url={scoreUrl} size="600 × 200" testId="score" />
          <UrlRow title="Звание · текущее → цель" url={rankUrl} size="900 × 360" testId="rank" />
          <p className="text-xs text-white/40">Ссылки не меняются — добавляете их в OBS один раз. Виджеты масштабируются без потери качества: можно задать 1200×400 или 1800×720.</p>
        </div>

        <div className="hud-card p-5 md:p-6 space-y-5">
          <div className="hud-label">Как добавить в OBS — 3 шага</div>
          <Step n="1" title="Источник «Браузер»">
            <p>В OBS: <b className="text-white">Источники → + → Браузер</b> (Browser). Назовите, например, «IMBA Счёт».</p>
          </Step>
          <Step n="2" title="Вставьте ссылку и размер">
            <p>URL — ссылка выше. Ширина/высота: <b className="text-white">600×200</b> для счёта, <b className="text-white">900×360</b> для звания. Поле «Пользовательский CSS» можно оставить как есть — фон уже прозрачный.</p>
          </Step>
          <Step n="3" title="Две галочки — выключить">
            <p>Снимите «Отключать источник, когда он не виден» и «Обновлять браузер при активации сцены» — тогда анимации не сбрасываются. Растяните виджет в нужном месте сцены — готово.</p>
          </Step>
        </div>

        <div className="hud-card p-5 md:p-6 space-y-3">
          <div className="hud-label flex items-center gap-2"><PanelTop size={14} /> Бонус: панель прямо внутри OBS</div>
          <p className="text-sm text-white/65">
            OBS → <b className="text-white">Док-панели → Пользовательские браузерные док-панели</b>, вставьте ссылку на панель — и кнопки WIN/LOSE будут прямо в OBS. С телефона та же ссылка работает как пульт.
          </p>
          <UrlRow title="Панель управления" url={panelUrl} size="док / телефон" testId="panel" />
        </div>
      </div>

      <div className="col-span-12 lg:col-span-5 space-y-6">
        {IS_LOCAL ? (
          <div className="hud-card hud-card--win p-5 md:p-6 space-y-2" data-testid="panel-obs-local-card">
            <div className="hud-label flex items-center gap-2"><HardDrive size={14} /> Локальная версия · Windows</div>
            <p className="text-sm text-white/70">Всё работает на вашем ПК. Помощник клавиш запускается автоматически вместе с 2_START.bat — скачивать ничего не нужно.</p>
          </div>
        ) : (
          <div className="hud-card hud-card--win p-5 md:p-6 space-y-4" data-testid="panel-obs-windows-card">
            <div className="hud-label flex items-center gap-2"><HardDrive size={14} /> Версия для Windows (localhost)</div>
            <p className="text-sm text-white/70">Готовая папка: кладёте на рабочий стол, запускаете <b className="text-white">1_FIRST_START_INSTALL.bat</b> — он сам скачает Python и AutoHotkey в папку и запустит всё. Дальше — <b className="text-white">2_START.bat</b>.</p>
            <p className="text-xs text-white/45">Виджеты будут по адресу http://127.0.0.1:8765 — без интернет-сервера. Данные хранятся в папке data.</p>
            <button className="cut-btn btn-green h-12 w-full text-base" onClick={downloadWindows} disabled={dlWin} data-testid="panel-obs-download-windows-button">
              <Download size={18} /> {dlWin ? "Собираем архив…" : "Скачать IMBA-Widgets-Windows.zip"}
            </button>
          </div>
        )}
        <div className="hud-card hud-card--accent p-5 md:p-6 space-y-4">
          <div className="hud-label">Помощник горячих клавиш · Windows</div>
          <ol className="text-sm text-white/70 space-y-2 list-decimal pl-5">
            <li>Установите бесплатный <a className="text-white underline decoration-[#ff1a2e] underline-offset-4" href="https://www.autohotkey.com/" target="_blank" rel="noreferrer" data-testid="panel-obs-ahk-link">AutoHotkey v2</a> (один раз).</li>
            <li>Скачайте помощник и запустите двойным кликом.</li>
            <li>В трее появится значок и уведомление «Подключено». Статус виден и вверху этой панели.</li>
          </ol>
          <button className="cut-btn btn-red h-12 w-full text-base" onClick={download} disabled={dl} data-testid="panel-obs-download-ahk-button">
            <Download size={18} /> {dl ? "Скачиваем…" : "Скачать IMBA-Hotkeys.ahk"}
          </button>
          <p className="text-xs text-white/40">Помощник не трогает файлы и память Dota 2 — только отправляет команду на сервер виджетов. В файле зашит личный токен — не передавайте его другим.</p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="text-xs text-white/50 hover:text-white flex items-center gap-1.5" data-testid="panel-obs-regenerate-token-button"><RefreshCw size={12} /> Выпустить новый токен</button>
            </AlertDialogTrigger>
            <AlertDialogContent className="hud-dialog">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display">Выпустить новый токен?</AlertDialogTitle>
                <AlertDialogDescription>Старый файл помощника перестанет работать — нужно будет скачать его заново.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction className="bg-[#ff1a2e] hover:bg-[#ff3345] text-white" onClick={regenerate} data-testid="panel-obs-regenerate-confirm-button">Выпустить</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <form className="hud-card p-5 md:p-6 space-y-3" onSubmit={changePw} data-testid="panel-password-form">
          <div className="hud-label flex items-center gap-2"><KeyRound size={14} /> Сменить пароль панели</div>
          <Input type="password" placeholder="Текущий пароль" value={pw.old_password} onChange={(e) => setPw((p) => ({ ...p, old_password: e.target.value }))} className="hud-input h-11" data-testid="panel-password-old-input" />
          <Input type="password" placeholder="Новый пароль" value={pw.new_password} onChange={(e) => setPw((p) => ({ ...p, new_password: e.target.value }))} className="hud-input h-11" data-testid="panel-password-new-input" />
          <button type="submit" className="cut-btn btn-white h-11 px-5" disabled={!pw.old_password || !pw.new_password} data-testid="panel-password-save-button">Сохранить пароль</button>
        </form>
      </div>
    </div>
  );
};
