import { useId } from "react";

/**
 * Crisp SVG HUD plate in IMBA style: chamfered corners, neon red outline,
 * white technical highlights, tick marks. Drawn at exact pixel size.
 */
export const HudFrame = ({ w, h, cut = { tl: 14, tr: 28, br: 14, bl: 28 }, flash = false, className = "", accent = "red", opacity = 0.86, leftColor }) => {
  const uid = useId().replace(/:/g, "");
  const { tl, tr, br, bl } = cut;
  const pts = (i) =>
    [
      [tl + i * 0.4, i],
      [w - tr - i * 0.4, i],
      [w - i, tr + i * 0.4],
      [w - i, h - br - i * 0.4],
      [w - br - i * 0.4, h - i],
      [bl + i * 0.4, h - i],
      [i, h - bl - i * 0.4],
      [i, tl + i * 0.4],
    ]
      .map((p) => p.join(","))
      .join(" ");

  const red = "#ff1a2e";
  const left = leftColor || red;
  const strokeMain = accent === "white" ? "rgba(255,255,255,0.85)" : red;
  const cx = w / 2;

  return (
    <svg className={`hud-frame ${flash ? "hud-frame--flash" : ""} ${className}`} width={w} height={h} viewBox={`-6 -6 ${w + 12} ${h + 12}`} style={{ position: "absolute", left: -6, top: -6, width: w + 12, height: h + 12, overflow: "visible" }} aria-hidden="true">
      <defs>
        <linearGradient id={`g${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#121216" stopOpacity={opacity} />
          <stop offset="0.55" stopColor="#0a0a0c" stopOpacity={opacity} />
          <stop offset="1" stopColor="#140507" stopOpacity={opacity} />
        </linearGradient>
        <pattern id={`p${uid}`} width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="1" fill="rgba(255,255,255,0.025)" />
        </pattern>
        <filter id={`f${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`s${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* body */}
      <polygon points={pts(0)} fill={`url(#g${uid})`} />
      <polygon points={pts(0)} fill={`url(#p${uid})`} />
      {/* inner hairline */}
      <polygon points={pts(6)} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
      {/* neon outline */}
      <polygon className="hud-outline" points={pts(0)} fill="none" stroke={strokeMain} strokeWidth="1.6" filter={`url(#s${uid})`} strokeLinejoin="miter" />

      {/* thick neon accents on top edge */}
      <g filter={`url(#f${uid})`} className="hud-accents">
        <line x1={tl + 10} y1="0" x2={tl + Math.min(90, w * 0.22)} y2="0" stroke={left} strokeWidth="4" />
        <line x1={w - tr - Math.min(110, w * 0.26)} y1="0" x2={w - tr - 14} y2="0" stroke={red} strokeWidth="4" />
        <line x1={cx - Math.min(60, w * 0.12)} y1={h} x2={cx} y2={h} stroke={left} strokeWidth="4" />
        <line x1={cx} y1={h} x2={cx + Math.min(60, w * 0.12)} y2={h} stroke={red} strokeWidth="4" />
        {/* corner brackets */}
        <polyline points={`${-1},${h - bl - 26} ${-1},${h - bl - 2}`} stroke={left} strokeWidth="3.5" fill="none" />
        <polyline points={`${w + 1},${tr + 2} ${w + 1},${tr + 26}`} stroke={red} strokeWidth="3.5" fill="none" />
      </g>
      {/* white technical highlights */}
      <g className="hud-white">
        <line x1={tl + Math.min(104, w * 0.26)} y1="0" x2={tl + Math.min(136, w * 0.32)} y2="0" stroke="#fff" strokeWidth="2.4" filter={`url(#s${uid})`} />
        <line x1={w - tr - Math.min(150, w * 0.34)} y1="0" x2={w - tr - Math.min(124, w * 0.29)} y2="0" stroke="#fff" strokeWidth="2.4" filter={`url(#s${uid})`} />
        <line x1={bl + 18} y1={h} x2={bl + 34} y2={h} stroke="#fff" strokeWidth="2" />
        <line x1={w - br - 34} y1={h} x2={w - br - 18} y2={h} stroke="#fff" strokeWidth="2" />
        {/* small ticks */}
        {[0, 1, 2].map((i) => (
          <line key={`tk${i}`} x1={cx + Math.min(70, w * 0.13) + 8 + i * 7} y1={h - 5} x2={cx + Math.min(70, w * 0.13) + 4 + i * 7} y2={h + 1} stroke="rgba(255,26,46,0.9)" strokeWidth="2" />
        ))}
        {[0, 1, 2].map((i) => (
          <line key={`tl${i}`} x1={cx - Math.min(70, w * 0.13) - 8 - i * 7} y1={h - 5} x2={cx - Math.min(70, w * 0.13) - 4 - i * 7} y2={h + 1} stroke={leftColor || "rgba(255,26,46,0.9)"} strokeWidth="2" />
        ))}
      </g>
    </svg>
  );
};
