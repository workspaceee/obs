export const BrandMark = ({ large = false }) => (
  <div className={`brand-mark ${large ? "brand-mark--lg" : ""}`} data-testid="brand-mark">
    <span className="brand-imba">IMBA</span>
    <span className="brand-sep" />
    <span className="brand-sub">WIDGETS</span>
  </div>
);
