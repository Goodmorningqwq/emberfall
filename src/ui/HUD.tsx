import { useEffect, type ReactNode } from "react";
import { useGame, type ItemId } from "./store";
import { useCanvasRect } from "./useCanvasRect";

function Heart({ state, size = 36 }: { state: "full" | "half" | "empty"; size?: number }) {
  const fill = "#e0483f";
  const empty = "#3b3f3b";
  const outline = "M12 21 3 12.5V6l3-3h3l3 3 3-3h3l3 3v6.5z";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d={outline} fill="none" stroke="#1a0c0a" strokeWidth="2" strokeLinejoin="round" />
      <path d={outline} fill={state === "full" ? fill : empty} />
      {state === "half" && <path d="M12 21 3 12.5V6l3-3h3l3 3v15z" fill={fill} />}
    </svg>
  );
}

type IconName = "coin" | "key" | ItemId | "bag";
function Icon({ name, size = 24, color = "#ede9df" }: { name: IconName; size?: number; color?: string }) {
  const paths: Record<IconName, ReactNode> = {
    coin: <><circle cx="12" cy="12" r="8" /><path d="M12 8v8M9.5 10.5h3.5a1.5 1.5 0 0 1 0 3H9.5" /></>,
    key: <><circle cx="8" cy="12" r="3.5" /><path d="M11.5 12H21M18 12v3M15 12v2" /></>,
    sword: <><path d="M14.5 4.5 20 3l-1.5 5.5L8 19l-3-3z" /><path d="M5 16l-2 2M8 19l-2 2M12 12l3 3" /></>,
    potion: <><path d="M10 3h4M11 3v4.5L6.5 14a4.5 4.5 0 0 0 4 6.5h3a4.5 4.5 0 0 0 4-6.5L13 7.5V3" /><path d="M8 15h8" /></>,
    bomb: <><circle cx="11" cy="14" r="6.5" /><path d="M14.5 9.5 17 7M17 7l1.5-1.5M18.5 4.5l1 1" /></>,
    bag: <><rect x="3" y="8" width="18" height="12" rx="2" /><path d="M3 12h18M12 12v3" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function Slot({ icon, keyHint, qty, selected, empty, color }: { icon?: IconName; keyHint: string; qty?: number; selected?: boolean; empty?: boolean; color?: string }) {
  return (
    <div className={`slot${selected ? " sel" : ""}${empty ? " empty" : ""}`}>
      {icon && <Icon name={icon} size={30} color={color} />}
      {qty !== undefined && qty > 1 && <span className="qty">×{qty}</span>}
      <span className="kbd key">{keyHint}</span>
    </div>
  );
}

export function HUD() {
  const { hearts, maxHearts, gold, keys, items, bagOpen, toggleBag } = useGame();
  const rect = useCanvasRect();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        toggleBag();
      } else if (e.key === "Escape" && useGame.getState().bagOpen) {
        toggleBag(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleBag]);

  const slots = Array.from({ length: maxHearts / 2 }, (_, i) => {
    const filled = hearts - i * 2;
    return filled >= 2 ? "full" : filled === 1 ? "half" : "empty";
  });
  const item = (id: ItemId) => items.find((i) => i.id === id);

  // anchor everything to the game frame, not the window
  const frame = rect ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : { left: 0, top: 0, width: "100%", height: "100%" };

  return (
    <div className="frame" style={frame}>
      <div className="scrim" />
      <div className="hud">
        <div className="hearts">{slots.map((s, i) => <Heart key={i} state={s} />)}</div>
        <div className="stat-row">
          <span className="stat gold"><Icon name="coin" size={24} color="#e2b24a" />{gold}</span>
          <span className="stat"><Icon name="key" size={24} color="#cfd2c6" />×{keys}</span>
        </div>
      </div>

      <div className="hotbar panel">
        <Slot icon="sword" keyHint="LMB" selected />
        <div className="divider" />
        <Slot icon="potion" keyHint="1" qty={item("potion")?.qty ?? 0} color="#cfd2c6" empty={!item("potion")} />
        <Slot icon="bomb" keyHint="2" qty={item("bomb")?.qty ?? 0} color="#cfd2c6" empty={!item("bomb")} />
        <Slot keyHint="3" empty />
        <div className="divider" />
        <Slot icon="bag" keyHint="Tab" color="#e2b24a" />
      </div>

      {!bagOpen && (
        <div className="namecard">
          <div className="card">
            <span className="eyebrow">Whisperwood Hollow</span>
            <span className="title">Mossy Antechamber</span>
          </div>
        </div>
      )}

      <div className="hint panel">
        <span><span className="kbd">WASD</span> move</span>
        <span><span className="kbd">LMB</span> attack</span>
        <span><span className="kbd">Shift</span> tap dash · hold sprint</span>
      </div>

      {bagOpen && (
        <div className="bag-backdrop" onClick={() => toggleBag(false)}>
          <div className="bag panel" onClick={(e) => e.stopPropagation()}>
            <div className="bag-head">
              <span className="px bag-title">Inventory</span>
              <span className="muted"><span className="kbd">Tab</span> close</span>
            </div>
            <div className="bag-grid">
              {items.map((it) => (
                <div key={it.id} className="bag-item">
                  <div className="slot"><Icon name={it.id} size={30} />{it.qty > 1 && <span className="qty">×{it.qty}</span>}</div>
                  <div className="bag-item-text">
                    <span className="bag-item-name">{it.name}</span>
                    {it.hint && <span className="muted">{it.hint}</span>}
                  </div>
                </div>
              ))}
              {Array.from({ length: 9 - items.length }, (_, i) => (
                <div key={`e${i}`} className="bag-item"><div className="slot empty" /><div className="bag-item-text"><span className="muted">Empty</span></div></div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
