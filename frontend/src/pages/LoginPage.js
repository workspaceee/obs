import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, ArrowRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { http, setToken, getToken, errMsg } from "@/lib/api";
import { BrandMark } from "@/components/panel/BrandMark";

export default function LoginPage() {
  const nav = useNavigate();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("imba-panel");
    if (getToken()) nav("/panel", { replace: true });
  }, [nav]);

  const submit = async (e) => {
    e.preventDefault();
    if (!pw) return setErr("Введите пароль");
    setBusy(true);
    setErr("");
    try {
      const { data } = await http.post("/auth/login", { password: pw });
      setToken(data.token);
      nav("/panel", { replace: true });
    } catch (e2) {
      setErr(errMsg(e2, "Не удалось войти"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel-bg min-h-screen flex items-center">
      <div className="w-full max-w-6xl mx-auto px-6 py-16 grid lg:grid-cols-2 gap-14 items-center">
        <div className="space-y-6">
          <BrandMark large />
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight">
            Оверлеи для стрима <span className="text-imba-red neon-text">без сворачивания игры</span>
          </h1>
          <p className="text-white/60 text-base md:text-lg max-w-md">
            Счёт WIN / LOSE на горячих клавишах и цель по званию Dota 2 — в стиле IMBA Cyber Club.
          </p>
        </div>

        <form onSubmit={submit} className="hud-card p-8 md:p-10 space-y-6 max-w-md w-full lg:justify-self-end" data-testid="login-form">
          <div className="flex items-center gap-3">
            <div className="icon-chip"><Lock size={18} /></div>
            <div>
              <div className="font-display text-xl font-semibold tracking-wide">Вход в панель</div>
              <div className="text-sm text-white/50">Только для стримера</div>
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="pw" className="hud-label">Пароль</label>
            <Input
              id="pw"
              type="password"
              autoFocus
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="••••••••"
              className="hud-input h-12 text-base"
              data-testid="login-password-input"
            />
            {err && <p className="text-sm text-imba-red" data-testid="login-error-text">{err}</p>}
          </div>
          <button type="submit" disabled={busy} className="cut-btn btn-red w-full h-12 text-base" data-testid="login-submit-button">
            {busy ? <Loader2 className="animate-spin" size={18} /> : <>Войти <ArrowRight size={18} /></>}
          </button>
        </form>
      </div>
    </div>
  );
}
