import { useEffect, useState } from "react";
import { useGame, type ItemId, type LessonId } from "./store";
import { uiScale, useCanvasRect } from "./useCanvasRect";
import { Title } from "./Title";
import whisperwood from "../game/data/whisperwood.json";

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

const LESSON_TEXT: Record<LessonId, { key: string; text: string }> = {
  move: { key: "WASD", text: "Move" },
  dash: { key: "Shift", text: "Dash" },
  attack: { key: "LMB", text: "Strike toward the cursor" },
  throw: { key: "RMB", text: "Throw the boomerang" },
  bomb: { key: "2", text: "Drop a bomb by the cracked wall" },
};

/** The contextual tutorial tag beside Wren. Position comes from --wren-x/--wren-y set by the scene each frame. */
function Coach() {
  const lesson = useGame((s) => s.lesson);
  if (!lesson) return null;
  const l = LESSON_TEXT[lesson.id];
  return (
    <div className="coach pxslot" key={lesson.id}>
      {lesson.id === "move" ? (
        <div className="keycross">
          <span />
          <span className={`kbd${lesson.keys?.includes("W") ? "" : " done"}`}>W</span>
          <span />
          <span className={`kbd${lesson.keys?.includes("A") ? "" : " done"}`}>A</span>
          <span className={`kbd${lesson.keys?.includes("S") ? "" : " done"}`}>S</span>
          <span className={`kbd${lesson.keys?.includes("D") ? "" : " done"}`}>D</span>
        </div>
      ) : (
        <span className="kbd">{l.key}</span>
      )}
      <span className="coach-text">{l.text}</span>
    </div>
  );
}

/** Small tag anchored to something in the world (block, door, pickup). */
function WorldTag() {
  const tag = useGame((s) => s.tag);
  if (!tag) return null;
    // keep it inside the frame and off the HUD corners: x within 12–88%, y below the wall-band HUD
    const x = Math.min(88, Math.max(12, (tag.x / 640) * 100));
    const y = Math.min(80, Math.max(16, (tag.y / 384) * 100));
    return (
    <div className={`wtag pxslot ${tag.kind ?? "info"}`} style={{ left: `${x}%`, top: `${y}%` }} key={tag.text + tag.x}>
      {tag.icon && <img src={tag.icon} alt="" />}
      <span>{tag.text}</span>
    </div>
    );
}

/** Sign / NPC dialogue: bottom panel, typewriter, any key or click to close. */
function DialogueBox() {
  const { dialogue, setDialogue } = useGame();
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(0);
    if (!dialogue) return;
    const id = window.setInterval(() => setShown((n) => (n >= dialogue.text.length ? n : n + 1)), 22);
    return () => window.clearInterval(id);
  }, [dialogue]);
  useEffect(() => {
    if (!dialogue) return;
    const done = shown >= dialogue.text.length;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Tab") return;
      e.preventDefault();
      if (done) setDialogue(null);
      else setShown(dialogue.text.length);
    };
    // a short grace so the bump that opened it doesn't also close it
    const t = window.setTimeout(() => window.addEventListener("keydown", onKey), 250);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [dialogue, shown, setDialogue]);
  if (!dialogue) return null;
  const done = shown >= dialogue.text.length;
  return (
    <div className="dialogue pxpanel" onClick={() => (done ? setDialogue(null) : setShown(dialogue.text.length))}>
      <img className="dialogue-icon" src="/assets/sprites/props/signpost.png" alt="" />
      <div className="dialogue-body">
        <span className="eyebrow">{dialogue.title}</span>
        <span className="dialogue-text">
          {dialogue.text.slice(0, shown)}
          {!done && <span className="caret">_</span>}
        </span>
        <span className={`dialogue-hint muted${done ? "" : " hidden"}`}>
          <span className="kbd">E</span> continue
        </span>
      </div>
    </div>
  );
}

const INTRO: { eyebrow: string; text: string }[] = [
  { eyebrow: "EMBERFALL", text: "For a thousand winters the Ember burned at the heart of the town, and the dark kept to the woods." },
  { eyebrow: "THE SPLITTING", text: "Then it cracked. Three shards, flung into three hollows. The fire guttered, and the dark walked in." },
  { eyebrow: "WREN, LAST WARDEN", text: "Someone has to bring the flame home. The nearest shard lies beneath Whisperwood Hollow." },
];

/** New-game opening: three plates over the title world, any key or click advances. */
function Intro() {
  const startGame = useGame((s) => s.startGame);
  const [i, setI] = useState(0);
  const next = () => (i + 1 >= INTRO.length ? startGame() : setI(i + 1));
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return startGame();
      e.preventDefault();
      next();
    };
    const t = window.setTimeout(() => window.addEventListener("keydown", onKey), 300);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  });
  const p = INTRO[i];
  return (
    <div className="bag-backdrop intro" onClick={next}>
      <div className="pause pxpanel intro-plate" key={i}>
        <span className="eyebrow">{p.eyebrow}</span>
        <span className="intro-text">{p.text}</span>
        <span className="dialogue-hint muted"><span className="kbd">Any key</span> {i + 1 < INTRO.length ? "continue" : "begin"} · <span className="kbd">Esc</span> skip</span>
      </div>
    </div>
  );
}

function fmtTime(ms: number) {
  const m = Math.floor(ms / 60000);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

/** Dungeon cleared: shard tally and a way back. */
function Complete() {
  const { keepExploring, quitToTitle, gold, playtimeMs, sessionStart, items } = useGame();
  const shards = items.find((i) => i.id === "shard")?.qty ?? 0;
  return (
    <div className="bag-backdrop intro">
      <div className="pause pxpanel intro-plate complete">
        <span className="eyebrow">WHISPERWOOD HOLLOW</span>
        <span className="t-title">Cleansed</span>
        <div className="complete-row">
          <img src="/assets/ui/icons/shard.png" alt="" />
          <span className="t-title">{shards}/3</span>
          <span className="muted t-small">shards</span>
          <img src="/assets/ui/icons/coin.png" alt="" />
          <span className="t-title">{gold}</span>
          <span className="muted t-small">gold · {fmtTime(playtimeMs + (Date.now() - sessionStart))}</span>
        </div>
        <span className="muted t-small">The Sunken Crypt waits beyond the marsh. The road there is not built yet.</span>
        <div className="pause-actions">
          <button className="pxbtn pxslot" onClick={quitToTitle}>Return to title</button>
          <button className="pxbtn pxslot" onClick={keepExploring} autoFocus>Keep exploring</button>
        </div>
      </div>
    </div>
  );
}

/** Dungeon minimap: rooms revealed as visited, current one lit. Room name sits under it. */
function Minimap() {
  const { room, roomName, flags } = useGame();
  const d = whisperwood;
  const cells: (typeof d.rooms)[number][] = d.rooms;
  return (
    <div className="minimap-wrap">
      <div className="minimap pxslot" style={{ gridTemplateColumns: `repeat(${d.cols}, calc(12px * var(--s)))` }}>
        {Array.from({ length: d.rows * d.cols }, (_, i) => {
          const gx = i % d.cols, gy = Math.floor(i / d.cols);
          const r = cells.find((c) => c.gx === gx && c.gy === gy);
          const visited = r && flags.includes(`visited:${r.id}`);
          const cls = !r ? "none" : r.id === room ? "here" : visited ? "seen" : "unknown";
          return <span key={i} className={`mm ${cls}${r?.purpose === "boss" && visited ? " boss" : ""}`} />;
        })}
      </div>
      <span className="minimap-name">{roomName}</span>
    </div>
  );
}

export function HUD() {
  const { screen, hearts, maxHearts, gold, keys, items, bagOpen, toggleBag, paused, togglePause, quitToTitle, banner, boss, respawn, dialogue, tag } = useGame();
  const rect = useCanvasRect();
  const s = uiScale(rect);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useGame.getState();
      if (st.screen !== "game") return;
      if (e.key === "Tab") {
        e.preventDefault();
        if (!st.paused && !st.dialogue) toggleBag();
      } else if (e.key === "Escape") {
        if (st.dialogue) st.setDialogue(null);
        else if (st.bagOpen) toggleBag(false);
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

  if (screen === "intro") {
    return (
      <div className="frame" style={frame as React.CSSProperties}>
        <Intro />
      </div>
    );
  }

  if (screen === "complete") {
    return (
      <div className="frame" style={frame as React.CSSProperties}>
        <Complete />
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
        <div className={`hearts${hearts <= 2 ? " low" : ""}`}>{heartStates.map((st, i) => <div key={i} className={`heart ${st}`} />)}</div>
        <div className="stat-row t-title shadowed">
          <span className="stat gold"><Icon name="coin" />{gold}</span>
          <span className="stat"><Icon name="key" />x{keys}</span>
        </div>
      </div>

      <Minimap />

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

      {!bagOpen && !dialogue && !banner && !tag && <Coach />}
      <WorldTag />

      {banner && (
        <div className={`banner ${banner.kind}`} key={banner.kind + banner.title}>
          <div className="card pxpanel">
            {banner.icon && <img className="banner-icon" src={banner.icon === "heart" ? "/assets/sprites/props/heart-container.png" : `/assets/ui/icons/${banner.icon}.png`} alt="" />}
            <div className="banner-text">
              <span className="eyebrow">{banner.kind === "boss" ? "BOSS" : banner.kind === "item" ? "YOU GOT" : banner.sub?.toUpperCase()}</span>
              <span className="t-title">{banner.title}</span>
              {banner.sub && banner.kind !== "room" && <span className="muted t-small">{banner.sub}</span>}
            </div>
          </div>
        </div>
      )}

      {boss && (
        <>
          <div className="bossbar">
            <span className="t-title bossname">{boss.name}</span>
            <div className="pxbar bar"><div className="fill" style={{ width: `${(100 * boss.hp) / boss.max}%` }} /></div>
          </div>
          {boss.status && <div className="bossstatus" key={boss.status}>{boss.status}</div>}
        </>
      )}

      <DialogueBox />

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
              {Array.from({ length: Math.max(0, 9 - items.length) }, (_, i) => (
                <div key={`e${i}`} className="bag-item"><div className="slot pxslot empty" /><div className="bag-item-text"><span className="muted">Empty</span></div></div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
