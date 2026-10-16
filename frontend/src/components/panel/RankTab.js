import { useEffect, useState } from "react";
import { ArrowLeftRight, Crown } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { http, errMsg } from "@/lib/api";
import { RANKS, medalSrc, immortalTier, rankName } from "@/lib/ranks";
import { WidgetPreview } from "./WidgetPreview";

const SlotPicker = ({ title, slot, onChange, testId }) => {
  const [place, setPlace] = useState(slot?.place ? String(slot.place) : "");
  useEffect(() => setPlace(slot?.place ? String(slot.place) : ""), [slot?.place]);

  const commitPlace = () => {
    const v = place.trim() === "" ? null : parseInt(place, 10);
    if (v !== null && (Number.isNaN(v) || v < 1 || v > 99999)) {
      toast.error("Место — число от 1 до 99999");
      return;
    }
    if (v !== (slot?.place || null)) onChange({ ...slot, place: v });
  };

  const isImm = slot?.rank === 8;

  return (
    <div className="hud-card p-5 md:p-6 space-y-5" data-testid={testId}>
      <div className="flex items-center gap-4">
        <img src={medalSrc(slot)} alt="" className="w-20 h-20 object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,0.6)]" />
        <div>
          <div className="hud-label">{title}</div>
          <div className="font-display text-2xl font-bold tracking-wider" data-testid={`${testId}-name`}>
            {rankName(slot?.rank)}{" "}
            {!isImm && <span className="text-imba-red">{"★".repeat(slot?.stars || 0)}</span>}
          </div>
          {isImm && <div className="text-sm text-[#f3cf7a]">{slot?.place ? `${immortalTier(slot.place).label} · #${slot.place}` : "без места в топе"}</div>}
        </div>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {RANKS.map((r) => (
          <button
            key={r.id}
            type="button"
            title={`${r.name} · ${r.ru}`}
            className={`medal-pick ${slot?.rank === r.id ? "medal-pick--on" : ""}`}
            onClick={() => onChange({ rank: r.id, stars: r.id === 8 ? 0 : slot?.rank === 8 || !slot?.stars ? 1 : slot.stars, place: r.id === 8 ? slot?.place || null : null })}
            data-testid={`${testId}-rank-${r.id}`}
          >
            <img src={r.id === 8 ? "/medals/top0.png" : `/medals/${r.id}-${slot?.rank === r.id ? slot.stars : 1}.png`} alt={r.name} loading="lazy" />
            <span>{r.name}</span>
          </button>
        ))}
      </div>

      {!isImm ? (
        <div className="space-y-2">
          <div className="text-xs text-white/50">Звёзды</div>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} type="button" className={`star-pick ${slot?.stars === s ? "star-pick--on" : ""}`} onClick={() => onChange({ ...slot, stars: s })} data-testid={`${testId}-stars-${s}`}>
                <img src={`/medals/${slot.rank}-${s}.png`} alt="" loading="lazy" />
                <span>{s}★</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="text-xs text-white/50 flex items-center gap-1.5" htmlFor={`${testId}-place`}><Crown size={13} /> Место в таблице лидеров (необязательно)</label>
          <div className="flex gap-2">
            <Input
              id={`${testId}-place`}
              type="number"
              min={1}
              inputMode="numeric"
              placeholder="например 523"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              onBlur={commitPlace}
              onKeyDown={(e) => e.key === "Enter" && commitPlace()}
              className="hud-input h-11 font-display text-lg"
              data-testid="panel-rank-immortal-place-input"
            />
            <button type="button" className="cut-btn btn-white h-11 px-4" onClick={commitPlace} data-testid={`${testId}-place-save-button`}>OK</button>
          </div>
          <p className="text-xs text-white/40">Топ 1 / 10 / 100 / 1000 — медаль меняется автоматически, номер пишется на табличке.</p>
        </div>
      )}
    </div>
  );
};

export const RankTab = ({ rank, pushRank }) => {
  const save = async (next) => {
    try {
      const { data } = await http.put("/rank", next);
      pushRank(data);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  if (!rank) return null;

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12">
        <div className="hud-card p-5 md:p-6">
          <WidgetPreview src="/widget/rank" ratio="900 / 360" title="Предпросмотр · звание" testId="panel-rank-preview" />
        </div>
      </div>
      <div className="col-span-12 lg:col-span-6">
        <SlotPicker title="CURRENT · текущее" slot={rank.current} onChange={(s) => save({ current: s, goal: rank.goal })} testId="panel-rank-current-picker" />
      </div>
      <div className="col-span-12 lg:col-span-6">
        <SlotPicker title="GOAL · цель" slot={rank.goal} onChange={(s) => save({ current: rank.current, goal: s })} testId="panel-rank-goal-picker" />
      </div>
      <div className="col-span-12 flex justify-center">
        <button className="cut-btn btn-ghost h-11 px-6" onClick={() => save({ current: rank.goal, goal: rank.current })} data-testid="panel-rank-swap-button">
          <ArrowLeftRight size={16} /> Поменять местами
        </button>
      </div>
    </div>
  );
};
