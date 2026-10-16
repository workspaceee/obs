import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HudFrame } from "./HudFrame";
import { immortalTier, medalSrc, rankName, slotKey, slotValue } from "@/lib/ranks";

const FW = 262;
const FH = 318;

const Stars = ({ n }) => (
  <span className="rw-stars">
    {[1, 2, 3, 4, 5].map((i) => (
      <span key={i} className={i <= n ? "rw-star rw-star--on" : "rw-star"}>
        ★
      </span>
    ))}
  </span>
);

const Ring = () => (
  <svg className="rw-ring" viewBox="0 0 200 200" aria-hidden="true">
    <circle cx="100" cy="100" r="92" className="rw-ring-a" />
    <circle cx="100" cy="100" r="84" className="rw-ring-b" />
  </svg>
);

const MedalFrame = ({ slot, label, side }) => {
  const k = slotKey(slot);
  const first = useRef(true);
  const [flashId, setFlashId] = useState(null);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setFlashId(k);
  }, [k]);

  const isImm = slot?.rank === 8;
  const tier = isImm ? immortalTier(slot?.place) : null;
  const src = medalSrc(slot);

  return (
    <div className={`rw-frame rw-frame--${side}`} style={{ width: FW, height: FH }}>
      <HudFrame w={FW} h={FH} cut={side === "current" ? { tl: 16, tr: 34, br: 16, bl: 34 } : { tl: 34, tr: 16, br: 34, bl: 16 }} opacity={0.82} leftColor={side === "current" ? "#ffffff" : undefined} />
      {flashId && <div key={`fl${flashId}`} className="rw-frame-flash" data-testid={`rank-widget-${side}-flash`} />}
      <div className={`rw-tab rw-tab--${side}`} data-testid={`rank-widget-${side}-label`}>
        <span>{label}</span>
      </div>

      <div className="rw-medal-wrap">
        <div className="rw-rays" aria-hidden="true" />
        <Ring />
        <div className="rw-medal-glow" />
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={src + (slot?.place || "")}
            className="rw-medal"
            initial={{ opacity: 0, x: -10, skewX: -10, filter: "brightness(2.2) saturate(0.4)" }}
            animate={{
              opacity: [0, 1, 0.55, 1],
              x: [-10, 4, -2, 0],
              skewX: [-10, 4, 0, 0],
              filter: ["brightness(2.2) saturate(0.4)", "brightness(1.4) saturate(1)", "brightness(1.6) saturate(1)", "brightness(1) saturate(1)"],
            }}
            exit={{ opacity: 0, scale: 0.92, filter: "brightness(2) blur(3px)" }}
            transition={{ duration: 0.55, times: [0, 0.35, 0.6, 1], ease: "easeOut" }}
          >
            <img src={src} alt={rankName(slot?.rank)} className="rw-medal-img" draggable={false} data-testid={`rank-widget-${side}-medal`} />
            {isImm && slot?.place ? <span className="rw-place" data-testid={`rank-widget-${side}-place`}>{slot.place}</span> : null}
            {flashId && (
              <>
                <img key={`gr${flashId}`} src={src} alt="" className="rw-ghost rw-ghost--r" draggable={false} />
                <img key={`gw${flashId}`} src={src} alt="" className="rw-ghost rw-ghost--w" draggable={false} />
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="rw-caption">
        <div className="rw-name" data-testid={`rank-widget-${side}-name`}>{rankName(slot?.rank)}</div>
        <div className="rw-sub">
          {isImm ? <span className="rw-tier">{slot?.place ? `${tier.label} · #${slot.place}` : "LEADERBOARD"}</span> : <Stars n={slot?.stars || 0} />}
        </div>
      </div>
    </div>
  );
};

// stars between ranks: Herald 1 = 1 ... Divine 5 = 35, Immortal = 36
const starIndex = (s) => (!s ? 0 : s.rank === 8 ? 36 : (s.rank - 1) * 5 + (s.stars || 1));

function progressInfo(cur, goal) {
  if (!cur || !goal) return null;
  if (cur.rank === 8 && goal.rank === 8) {
    if (cur.place && goal.place && cur.place > goal.place) return { value: cur.place - goal.place, unit: "PLACES TO GO" };
    return null;
  }
  const d = starIndex(goal) - starIndex(cur);
  if (d > 0) return { value: d, unit: d === 1 ? "STAR TO GO" : "STARS TO GO", star: true };
  return null;
}

const Lane = ({ reached, pulseKey, info }) => (
  <div className={`rw-lane ${reached ? "rw-lane--reached" : ""}`} key={pulseKey}>
    <div className="rw-lane-label" data-testid="rank-widget-lane-label">{reached ? "GOAL REACHED" : "ROAD TO"}</div>
    <div className="rw-track">
      <span className="rw-track-line" />
      <span className="rw-track-glint" />
    </div>
    <div className="rw-chevrons">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} className="rw-chev" style={{ animationDelay: `${i * 0.22}s` }} width="34" height="52" viewBox="0 0 34 52" aria-hidden="true">
          <polygon points="0,0 14,0 34,26 14,52 0,52 20,26" />
        </svg>
      ))}
    </div>
    <div className="rw-track rw-track--b">
      <span className="rw-track-line" />
    </div>
    <div className="rw-togo" data-testid="rank-widget-togo">
      {reached ? (
        <span className="rw-togo-unit rw-togo-unit--gold">WELL PLAYED</span>
      ) : info ? (
        <>
          <span className="rw-togo-val">
            {info.value}
            {info.star ? <i>★</i> : null}
          </span>
          <span className="rw-togo-unit">{info.unit}</span>
        </>
      ) : (
        <span className="rw-togo-unit">CLIMBING</span>
      )}
    </div>
  </div>
);

export const RankPlate = ({ data }) => {
  const cur = data?.current;
  const goal = data?.goal;
  const reached = cur && goal && slotValue(cur) >= slotValue(goal);
  return (
    <div className={`rw-root ${reached ? "rw-root--reached" : ""}`}>
      <MedalFrame slot={cur} label="CURRENT" side="current" />
      <Lane reached={reached} pulseKey={`${slotKey(cur)}|${slotKey(goal)}`} info={progressInfo(cur, goal)} />
      <MedalFrame slot={goal} label="GOAL" side="goal" />
    </div>
  );
};

export const RANK_SIZE = { W: 900, H: 360 };
