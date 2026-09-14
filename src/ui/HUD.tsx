import { useEffect } from "react";
import { useGame, type ItemId } from "./store";
import { uiScale, useCanvasRect } from "./useCanvasRect";
import { Title } from "./Title";

/** PixelLab icon set at public/assets/ui/icons/<name>.png (24x24). */
type IconName = ItemId | "coin" | "bag" | "boomerang" | "shard" | "bosskey" | "grapple";
function Icon({ name, alt = "" }: { name: IconName; alt?: string }) {
  return <img src={`/assets/ui/icons/${name}.png`} alt={alt} draggable={false} />;
}

function Slot({ icon, keyHint, qty, selected, empty }: { icon?: IconName; keyHint: string; qty?: number; selected?: boolean; empty?: boolean }) {
  return (
    <div className={`slot pxslot${selected ? " sel" : ""}${empty ? " empty" : ""}`}>
      {icon && <Icon name={icon} />}
      {qty !== undefined && qty > 1 && <span className="qty">x{qty}</span>}
      <span className="kbd key">{keyHint}</span>
    </div>
  );
}

export function HUD() {
  const { screen, hearts, maxHearts, gold, keys, items, bagOpen, toggleBag, paused, togglePause, quitToTitle } = useGame();
  const rect = useCanvasRect();
  const s = uiScale(rect);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useGame.getState();
      if (st.screen !== "game") return;
      if (e.key === "Tab") {
        e.preventDefault();
        if (!st.paused) toggleBag();
      } else if (e.key === "Escape") {
        if (st.bagOpen) toggleBag(false);
        else togglePause();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleBag, togglePause]);

  const heartStates = Array.from({ length: maxHearts / 2 }, (_, i) => {
    const filled = hearts - i * 2;
    return filled >= 2 ? "full" : filled === 1 ? "half" : "empty";
  });
  const item = (id: ItemId) => items.find((i) => i.id === id);

  // anchor everything to the game frame (not the window) and scale by an integer
  const frame = rect
    ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height, "--s": s }
    : { left: 0, top: 0, width: "100%", height: "100%", "--s": 2 };

  if (screen === "title") {
    return (
      <div className="frame" style={frame as React.CSSProperties}>
        <Title />
      </div>
    );
  }

  return (
    <div className="frame" style={frame as React.CSSProperties}>
      <div className="scrim" />
      <div className="hud">
        <div className="hearts">{heartStates.map((st, i) => <div key={i} className={`heart ${st}`} />)}</div>
        <div className="stat-row t-title shadowed">
          <span className="stat gold"><Icon name="coin" />{gold}</span>
          <span className="stat"><Icon name="key" />x{keys}</span>
        </div>
      </div>

      <div className="hotbar pxpanel">
        <Slot icon="sword" keyHint="LMB" selected />
        <div className="divider" />
        <Slot icon="potion" keyHint="1" qty={item("potion")?.qty ?? 0} empty={!item("potion")} />
        <Slot icon="bomb" keyHint="2" qty={item("bomb")?.qty ?? 0} empty={!item("bomb")} />
        <Slot keyHint="3" empty />
        <div className="divider" />
        <Slot icon="bag" keyHint="Tab" />
      </div>

      {!bagOpen && (
        <div className="namecard">
          <div className="card pxpanel">
            <span className="eyebrow">WHISPERWOOD HOLLOW</span>
            <span className="t-title">Mossy Antechamber</span>
          </div>
        </div>
      )}


      {paused && (
        <div className="bag-backdrop" onClick={() => togglePause(false)}>
          <div className="pause pxpanel" onClick={(e) => e.stopPropagation()}>
            <span className="t-title">Paused</span>
            <div className="controls">
              <div><span className="kbd">WASD</span><span>Move</span></div>
              <div><span className="kbd">LMB</span><span>Attack toward cursor</span></div>
              <div><span className="kbd">Shift</span><span>Tap: dash · Hold: sprint</span></div>
              <div><span className="kbd">Tab</span><span>Bag</span></div>
              <div><span className="kbd">Esc</span><span>Pause / resume</span></div>
            </div>
            <div className="pause-actions">
              <button className="pxbtn pxslot" onClick={quitToTitle}>Quit to title</button>
              <button className="pxbtn pxslot" onClick={() => togglePause(false)} autoFocus>Resume</button>
            </div>
          </div>
        </div>
      )}

      {bagOpen && (
        <div className="bag-backdrop" onClick={() => toggleBag(false)}>
          <div className="bag pxpanel" onClick={(e) => e.stopPropagation()}>
            <div className="bag-head">
              <span className="t-title">Inventory</span>
              <span className="muted"><span className="kbd">Tab</span> close</span>
            </div>
            <div className="bag-grid">
              {items.map((it) => (
                <div key={it.id} className="bag-item">
                  <div className="slot pxslot"><Icon name={it.id} />{it.qty > 1 && <span className="qty">x{it.qty}</span>}</div>
                  <div className="bag-item-text">
                    <span>{it.name}</span>
                    {it.hint && <span className="muted">{it.hint}</span>}
                  </div>
                </div>
              ))}
              {Array.from({ length: 9 - items.length }, (_, i) => (
                <div key={`e${i}`} className="bag-item"><div className="slot pxslot empty" /><div className="bag-item-text"><span className="muted">Empty</span></div></div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
