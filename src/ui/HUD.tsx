import { useGame } from "./store";

function Heart({ state }: { state: "full" | "half" | "empty" }) {
  const fill = "#e0483f";
  const empty = "#3b3f3b";
  const outline = "M12 21 3 12.5V6l3-3h3l3 3 3-3h3l3 3v6.5z";
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
      <path d={outline} fill="none" stroke="#1a0c0a" strokeWidth="2" strokeLinejoin="round" />
      <path d={outline} fill={state === "full" ? fill : empty} />
      {state === "half" && <path d="M12 21 3 12.5V6l3-3h3l3 3v15z" fill={fill} />}
    </svg>
  );
}

function Icon({ name, color = "#ede9df" }: { name: "coin" | "key"; color?: string }) {
  const paths = {
    coin: <><circle cx="12" cy="12" r="8" /><path d="M12 8v8M9.5 10.5h3.5a1.5 1.5 0 0 1 0 3H9.5" /></>,
    key: <><circle cx="8" cy="12" r="3.5" /><path d="M11.5 12H21M18 12v3M15 12v2" /></>,
  };
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

export function HUD() {
  const { hearts, maxHearts, gold, keys } = useGame();
  const slots = Array.from({ length: maxHearts / 2 }, (_, i) => {
    const filled = hearts - i * 2;
    return filled >= 2 ? "full" : filled === 1 ? "half" : "empty";
  });
  return (
    <>
      <div className="hud">
        <div className="hearts">{slots.map((s, i) => <Heart key={i} state={s} />)}</div>
        <div className="stat-row">
          <span className="stat" style={{ color: "var(--gold)" }}><Icon name="coin" color="#e2b24a" />{gold}</span>
          <span className="stat" style={{ color: "#cfd2c6" }}><Icon name="key" color="#cfd2c6" />×{keys}</span>
        </div>
      </div>
      <div className="namecard">
        <span className="eyebrow">Whisperwood Hollow</span>
        <span className="title">Mossy Antechamber</span>
      </div>
      <div className="hint">
        <span><span className="kbd">WASD</span> move</span>
        <span><span className="kbd">J</span> attack</span>
        <span><span className="kbd">K</span> roll</span>
      </div>
    </>
  );
}
