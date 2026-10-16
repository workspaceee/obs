import { useState } from "react";

const BGS = [
  { id: "game", label: "Стрим" },
  { id: "dark", label: "Тёмный" },
  { id: "light", label: "Светлый" },
  { id: "checker", label: "Прозрачность" },
];

/** Live preview of a widget route in an iframe over a selectable backdrop. */
export const WidgetPreview = ({ src, ratio, title, testId }) => {
  const [bg, setBg] = useState("game");
  return (
    <div className="space-y-3" data-testid={testId}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="hud-label">{title}</div>
        <div className="seg" role="tablist">
          {BGS.map((b) => (
            <button key={b.id} type="button" className={`seg-item ${bg === b.id ? "seg-item--on" : ""}`} onClick={() => setBg(b.id)} data-testid={`${testId}-bg-${b.id}`}>
              {b.label}
            </button>
          ))}
        </div>
      </div>
      <div className={`preview-box preview-box--${bg}`} style={{ aspectRatio: ratio }}>
        <iframe title={title} src={src} className="preview-iframe" allowtransparency="true" scrolling="no" />
      </div>
    </div>
  );
};
