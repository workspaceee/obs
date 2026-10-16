import { useEffect, useState } from "react";

/** Fixed-size design canvas scaled to fill the OBS Browser Source, keeping aspect. */
export const WidgetStage = ({ width, height, children, testId }) => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    document.documentElement.classList.add("obs-widget");
    document.documentElement.classList.remove("imba-panel");
    const fit = () => {
      const s = Math.min(window.innerWidth / width, window.innerHeight / height);
      setScale(s > 0 && Number.isFinite(s) ? s : 1);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => {
      window.removeEventListener("resize", fit);
      document.documentElement.classList.remove("obs-widget");
    };
  }, [width, height]);

  return (
    <div className="widget-viewport" data-testid={testId}>
      <div className="widget-stage" style={{ width, height, transform: `translate(-50%, -50%) scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
};
