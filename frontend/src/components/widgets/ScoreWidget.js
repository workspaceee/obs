import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HudFrame } from "./HudFrame";

const W = 600;
const H = 200;
const PW = 572;
const PH = 170;

const Digit = ({ value, dir, testId, tone, glitchKey }) => (
  <div className={`sw-num sw-num--${tone}`} data-testid={testId}>
    {glitchKey ? <span key={`g${glitchKey}`} className="sw-num-glitch" data-text={value} aria-hidden="true">{value}</span> : null}
    <AnimatePresence initial={false} mode="popLayout" custom={dir}>
      <motion.span
        key={value}
        custom={dir}
        className="sw-num-inner"
        variants={{
          enter: (d) => ({ y: d >= 0 ? "75%" : "-75%", opacity: 0, filter: "blur(5px)", scale: 1.2 }),
          center: { y: "0%", opacity: 1, filter: "blur(0px)", scale: 1 },
          exit: (d) => ({ y: d >= 0 ? "-75%" : "75%", opacity: 0, filter: "blur(5px)", scale: 0.85 }),
        }}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ type: "spring", stiffness: 520, damping: 30, mass: 0.7 }}
      >
        {value}
      </motion.span>
    </AnimatePresence>
  </div>
);

const FormRow = ({ recent, fxId }) => {
  const slots = Array.from({ length: 10 }, (_, i) => recent[recent.length - 10 + i]);
  return (
    <div className="sw-form" data-testid="score-widget-form">
      <span className="sw-form-label">FORM</span>
      <div className="sw-form-dots">
        {slots.map((r, i) => (
          <span
            key={i === 9 && r ? `last-${fxId}` : i}
            className={`sw-dot ${r === "W" ? "sw-dot--w" : r === "L" ? "sw-dot--l" : ""} ${i === 9 && r ? "sw-dot--last" : ""}`}
            data-testid={`score-widget-form-dot-${i}`}
            data-result={r || ""}
          />
        ))}
      </div>
      <span className="sw-form-label sw-form-label--r">LAST 10</span>
    </div>
  );
};

/** Pure visual score plate. */
export const ScorePlate = ({ data }) => {
  const prev = useRef(null);
  const [fx, setFx] = useState(null);
  const [dirs, setDirs] = useState({ w: 1, l: 1 });

  useEffect(() => {
    if (!data) return;
    const p = prev.current;
    if (p && p.version !== data.version) {
      const dw = data.wins - p.wins;
      const dl = data.losses - p.losses;
      setDirs({ w: dw >= 0 ? 1 : -1, l: dl >= 0 ? 1 : -1 });
      const t = data.last_event?.type;
      let kind = "neutral";
      if (t === "win" && dw > 0) kind = "win";
      else if (t === "lose" && dl > 0) kind = "lose";
      else if (t === "undo") kind = "undo";
      setFx({ kind, id: data.version, wChanged: dw !== 0, lChanged: dl !== 0 });
    }
    prev.current = data;
  }, [data]);

  const wins = data?.wins ?? 0;
  const losses = data?.losses ?? 0;
  const total = wins + losses;
  const winPct = total ? (wins * 100) / total : 50;
  const streak = data?.streak || { type: null, count: 0 };
  const hasStreak = streak.count >= 2;
  const streakTone = streak.type === "lose" ? "lose" : "win";
  const recent = data?.recent || [];

  return (
    <div className="sw-plate" style={{ width: PW, height: PH }} data-testid="score-widget-plate">
      <HudFrame w={PW} h={PH} cut={{ tl: 16, tr: 30, br: 16, bl: 30 }} leftColor="#2bff88" />
      <div className="sw-gleam" aria-hidden="true" />
      {fx && <div key={`fx${fx.id}`} className={`sw-plate-fx sw-plate-fx--${fx.kind}`} data-testid="score-widget-fx" data-fx={fx.kind} />}

      <div className="sw-topline">
        <span className="sw-tag"><i className="sw-tag-dot" />MATCH TRACKER</span>
        <span className="sw-ticks" />
        <span className="sw-wr" data-testid="score-widget-winrate">
          {data?.winrate != null ? <>WR <b className={data.winrate >= 50 ? "sw-wr--good" : "sw-wr--bad"}>{data.winrate}%</b></> : "WR —"}
        </span>
      </div>

      <div className="sw-grid">
        <div className="sw-block sw-block--win">
          {fx?.wChanged && <span key={`wh${fx.id}`} className={`sw-hit sw-hit--${fx.kind}`} />}
          <span className="sw-label">WIN</span>
          <Digit value={wins} dir={dirs.w} tone="win" testId="score-widget-win-value" />
          {fx?.wChanged && fx.kind !== "undo" && <span key={`ws${fx.id}`} className="sw-sweep sw-sweep--green" />}
        </div>

        <div className={`sw-streak ${hasStreak ? `sw-streak--on sw-streak--${streakTone}` : "sw-streak--off"}`} data-testid="score-widget-streak">
          <div className="sw-streak-bg" />
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              key={hasStreak ? `${streak.type}-${streak.count}` : "none"}
              className="sw-streak-inner"
              initial={{ opacity: 0, scale: 0.6, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.3, y: -8 }}
              transition={{ type: "spring", stiffness: 480, damping: 28 }}
            >
              {hasStreak ? (
                <>
                  <span className="sw-streak-count">{streak.count}</span>
                  <span className="sw-streak-label" data-testid="score-widget-streak-label">
                    {streak.type === "win" ? "WIN" : "LOSE"} STREAK
                  </span>
                </>
              ) : (
                <>
                  <span className="sw-streak-count sw-streak-count--muted">—</span>
                  <span className="sw-streak-label" data-testid="score-widget-streak-label">NO STREAK</span>
                </>
              )}
              <span className="sw-meter">
                {[1, 2, 3, 4, 5].map((i) => (
                  <i key={i} className={hasStreak && i <= streak.count ? "on" : ""} />
                ))}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="sw-block sw-block--lose">
          {fx?.lChanged && <span key={`lh${fx.id}`} className={`sw-hit sw-hit--${fx.kind}`} />}
          <span className="sw-label">LOSE</span>
          <Digit glitchKey={fx?.kind === "lose" ? fx.id : null} value={losses} dir={dirs.l} tone="lose" testId="score-widget-lose-value" />
          {fx?.lChanged && fx.kind !== "undo" && <span key={`ls${fx.id}`} className="sw-sweep sw-sweep--red" />}
        </div>
      </div>

      <FormRow recent={recent} fxId={fx?.id || 0} />

      <div className="sw-ratio" data-testid="score-widget-ratio">
        <span className="sw-ratio-w" style={{ width: `${winPct}%` }} />
        <span className="sw-ratio-l" style={{ width: `${100 - winPct}%` }} />
        <span className="sw-ratio-split" style={{ left: `${winPct}%` }} />
      </div>
    </div>
  );
};

export const SCORE_SIZE = { W, H };
