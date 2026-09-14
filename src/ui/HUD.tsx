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
      {keyHint && <span className="kbd key">{keyHint}</span>}
    </div>
  );
}

export function HUD() {
  const { screen, hearts, maxHearts, gold, keys, items, bagOpen, toggleBag, paused, togglePause, quitToTitle, roomName, dungeonName, banner, boss, respawn, room } = useGame();
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

  if (screen === "dead") {
    return (
      <div className="frame" style={frame as React.CSSProperties}>
        <div className="bag-backdrop dead">
          <div className="pause pxpanel death">
            <span className="eyebrow">WHISPERWOOD HOLLOW</span>
            <span className="t-title">You fell.</span>
            <span className="muted t-small">The Hollow keeps what it takes. Your keys and treasures are safe.</span>
            <div className="pause-actions">
              <button className="pxbtn pxslot" onClick={quitToTitle}>Title</button>
              <button className="pxbtn pxslot" onClick={respawn} autoFocus>Try again</button>
            </div>
          </div>
        </div>
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
        <Slot icon={item("boomerang") ? "boomerang" : undefined} keyHint="RMB" empty={!item("boomerang")} />
        {item("bosskey") && <Slot icon="bosskey" keyHint="" />}
        <div className="divider" />
        <Slot icon="bag" keyHint="Tab" />
      </div>

      {!bagOpen && !banner && (
        <div className="namecard" key={room}>
          <div className="card pxpanel">
            <span className="eyebrow">{dungeonName.toUpperCase()}</span>
            <span className="t-title">{roomName}</span>
          </div>
        </div>
      )}

      {banner && (
        <div className={`banner ${banner.kind}`} key={banner.title}>
          <div className="card pxpanel">
            {banner.icon && <img className="banner-icon" src={banner.icon === "heart" ? "/assets/sprites/props/heart-container.png" : `/assets/ui/icons/${banner.icon}.png`} alt="" />}
            <div className="banner-text">
              <span className="eyebrow">{banner.kind === "boss" ? "BOSS" : banner.kind === "item" ? "YOU GOT" : ""}</span>
              <span className="t-title">{banner.title}</span>
              {banner.sub && <span className="muted t-small">{banner.sub}</span>}
            </div>
          </div>
        </div>
      )}

      {boss && (
        <div className="bossbar">
          <span className="t-small bossname">{boss.name}</span>
          <div className="pxbar bar"><div className="fill" style={{ width: `${(100 * boss.hp) / boss.max}%` }} /></div>
          {boss.status && <span className="t-small bossstatus">{boss.status}</span>}
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
              <div><span className="kbd">RMB</span><span>Throw boomerang</span></div>
              <div><span className="kbd">1</span><span>Drink potion</span></div>
              <div><span className="kbd">2</span><span>Drop bomb</span></div>
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
