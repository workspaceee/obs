import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Circle, Swords, Medal, Keyboard, MonitorPlay, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { http, getToken, setToken, useLiveState } from "@/lib/api";
import { BrandMark } from "@/components/panel/BrandMark";
import { ScoreTab } from "@/components/panel/ScoreTab";
import { RankTab } from "@/components/panel/RankTab";
import { HotkeysTab } from "@/components/panel/HotkeysTab";
import { ObsTab } from "@/components/panel/ObsTab";

const TAB_KEY = "imba_panel_tab";

export default function PanelPage() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [hotkeys, setHotkeys] = useState(null);
  const [helper, setHelper] = useState(null);
  const [tab, setTab] = useState(() => localStorage.getItem(TAB_KEY) || "score");
  const score = useLiveState("score");
  const rank = useLiveState("rank");

  useEffect(() => {
    document.documentElement.classList.add("imba-panel");
    if (!getToken()) {
      nav("/login", { replace: true });
      return;
    }
    http
      .get("/panel/state")
      .then(({ data }) => {
        setHotkeys(data.hotkeys);
        setHelper(data.helper);
        score.push(data.score);
        rank.push(data.rank);
        setReady(true);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav]);

  useEffect(() => {
    if (!ready) return;
    const t = setInterval(() => {
      http.get("/helper/status").then((r) => setHelper(r.data)).catch(() => {});
    }, 4000);
    return () => clearInterval(t);
  }, [ready]);

  const changeTab = (v) => {
    setTab(v);
    localStorage.setItem(TAB_KEY, v);
  };

  const logout = async () => {
    try {
      await http.post("/auth/logout");
    } catch {
      /* ignore */
    }
    setToken(null);
    nav("/login", { replace: true });
  };

  if (!ready) {
    return (
      <div className="panel-bg min-h-screen flex items-center justify-center" data-testid="panel-loading">
        <Loader2 className="animate-spin text-imba-red" size={32} />
      </div>
    );
  }

  return (
    <div className="panel-bg min-h-screen">
      <header className="panel-header">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center gap-4">
          <BrandMark />
          <div className="ml-auto flex items-center gap-2 md:gap-3">
            <span className={`pill ${score.online ? "pill--on" : "pill--off"} hidden sm:inline-flex`} data-testid="panel-server-status">
              <Circle size={8} fill="currentColor" /> {score.online ? "Виджеты online" : "Нет связи"}
            </span>
            <span className={`pill ${helper?.online ? "pill--on" : "pill--off"}`} data-testid="panel-header-helper-status">
              <Circle size={8} fill="currentColor" /> <span className="hidden sm:inline">Помощник</span><span className="sm:hidden">AHK</span> {helper?.online ? "подключён" : "офлайн"}
            </span>
            <button className="cut-btn btn-ghost h-9 px-3" onClick={logout} title="Выйти" data-testid="panel-logout-button">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <Tabs value={tab} onValueChange={changeTab} className="space-y-6">
          <TabsList className="imba-tabs" data-testid="panel-tabs">
            <TabsTrigger value="score" className="imba-tab" data-testid="panel-tab-score"><Swords size={15} /> Счёт</TabsTrigger>
            <TabsTrigger value="rank" className="imba-tab" data-testid="panel-tab-rank"><Medal size={15} /> Звание</TabsTrigger>
            <TabsTrigger value="hotkeys" className="imba-tab" data-testid="panel-tab-hotkeys"><Keyboard size={15} /> Клавиши</TabsTrigger>
            <TabsTrigger value="obs" className="imba-tab" data-testid="panel-tab-obs"><MonitorPlay size={15} /> OBS</TabsTrigger>
          </TabsList>

          <TabsContent value="score" className="mt-0">
            <ScoreTab score={score.data} pushScore={score.push} hotkeys={hotkeys} />
          </TabsContent>
          <TabsContent value="rank" className="mt-0">
            <RankTab rank={rank.data} pushRank={rank.push} />
          </TabsContent>
          <TabsContent value="hotkeys" className="mt-0">
            <HotkeysTab hotkeys={hotkeys} setHotkeys={setHotkeys} helper={helper} />
          </TabsContent>
          <TabsContent value="obs" className="mt-0">
            <ObsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
