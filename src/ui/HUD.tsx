import { useEffect, useRef, useState } from "react";
import { useGame, type ItemId, type LessonId } from "./store";
import { uiScale, useCanvasRect } from "./useCanvasRect";
import { Title } from "./Title";
import { dungeonFor } from "../game/data/dungeons";
import { sfx } from "../game/audio";
import { SHOPS } from "./shop";

/** PixelLab icon set at public/assets/ui/icons/<name>.png (24x24). */
type IconName = ItemId | "coin" | "bag" | "boomerang" | "shard" | "bosskey" | "grapple";
function Icon({ name, alt = "" }: { name: IconName; alt?: string }) {
  return <img src={`/assets/ui/icons/${name}.png`} alt={alt} draggable={false} />;
}

function Slot({ icon, keyHint, qty, selected, empty, locked }: { icon?: IconName; keyHint: string; qty?: number; selected?: boolean; empty?: boolean; locked?: boolean }) {
  return (
    <div className={`slot pxslot${selected ? " sel" : ""}${empty || locked ? " empty" : ""}${locked ? " locked" : ""}`}>
      {icon && <Icon name={icon} />}
      {qty !== undefined && qty > 1 && !locked && <span className="qty">x{qty}</span>}
      {keyHint && !locked && <span className="kbd key">{keyHint}</span>}
      {locked && <img className="lock" src="/assets/ui/lock.png" alt="locked" />}
    </div>
  );
}

/** Room lore read aloud on entry — a caption, never a hold. */
function Narrator() {
  const text = useGame((s) => s.narration);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(0);
    if (!text) return;
    const id = window.setInterval(() => setShown((n) => (n >= text.length ? n : n + 1)), 28);
    return () => window.clearInterval(id);
  }, [text]);
  if (!text) return null;
  return (
    <div className="narrator" key={text}>
      <span className="narrator-text">{text.slice(0, shown)}{shown < text.length && <span className="caret">_</span>}</span>
    </div>
  );
}

const LESSON_TEXT: Record<LessonId, { key: string; text: string }> = {
  move: { key: "WASD", text: "Move" },
  dash: { key: "Shift", text: "Dash" },
  attack: { key: "LMB", text: "Aim with the mouse, click to strike" },
  potion: { key: "1", text: "Drink a potion to heal" },
  throw: { key: "RMB", text: "Throw the boomerang" },
  grapple: { key: "RMB", text: "Fire the hook at an anchor post" },
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
  const { keepExploring, quitToTitle, gold, playtimeMs, sessionStart, items, place } = useGame();
  const shards = items.find((i) => i.id === "shard")?.qty ?? 0;
  const meta = dungeonFor(place);
  return (
    <div className="bag-backdrop intro">
      <div className="pause pxpanel intro-plate complete">
        <span className="eyebrow">{meta.completeEyebrow}</span>
        <span className="t-title">Cleansed</span>
        <div className="complete-row">
          <img src="/assets/ui/icons/shard.png" alt="" />
          <span className="t-title">{shards}/3</span>
          <span className="muted t-small">shards</span>
          <img src="/assets/ui/icons/coin.png" alt="" />
          <span className="t-title">{gold}</span>
          <span className="muted t-small">gold · {fmtTime(playtimeMs + (Date.now() - sessionStart))}</span>
        </div>
        <span className="muted t-small">{meta.completeNext}</span>
        <div className="pause-actions">
          <button className="pxbtn pxslot" onClick={quitToTitle}>Return to title</button>
          <button className="pxbtn pxslot" onClick={keepExploring} autoFocus>Keep exploring</button>
        </div>
      </div>
    </div>
  );
}

/**
 * Dungeon minimap, drawn from pixel tiles (public/assets/ui/minimap.png, tools/draw_minimap.py):
 * rooms revealed as visited, current one lit, doorways drawn between rooms you've seen.
 * Room name sits under it.
 */
function Minimap() {
  const { room, roomName, flags, place } = useGame();
  const d = dungeonFor(place).def;
  const cells: (typeof d.rooms)[number][] = d.rooms;
  const at = (gx: number, gy: number) => cells.find((c) => c.gx === gx && c.gy === gy);
  const seen = (r?: (typeof cells)[number]) => !!r && (flags.includes(`visited:${r.id}`) || r.id === room);
  // a doorway exists where the ASCII map has floor in the wall: east = rows 6-7 at col 19, south = row 11 at cols 9-10
  const eastDoor = (r: (typeof cells)[number]) => r.map[6][19] !== "#";
  const southDoor = (r: (typeof cells)[number]) => r.map[11][9] !== "#";
  const W = 14, H = 10, G = 4; // cell size + gap, in UI px
  const items: React.ReactNode[] = [];
  for (let gy = 0; gy < d.rows; gy++) {
    for (let gx = 0; gx < d.cols; gx++) {
      const r = at(gx, gy);
      const x = gx * (W + G), y = gy * (H + G);
      const state = !r ? "none" : r.id === room ? "here" : seen(r) ? "seen" : "unknown";
      items.push(<span key={`c${gx}${gy}`} className={`mm ${state}${r?.purpose === "boss" && seen(r) ? " boss" : ""}`} style={{ left: `calc(${x}px * var(--s))`, top: `calc(${y}px * var(--s))` }} />);
      if (!r) continue;
      const e = at(gx + 1, gy);
      if (e && eastDoor(r) && (seen(r) || seen(e))) items.push(<span key={`e${gx}${gy}`} className="mm-link h" style={{ left: `calc(${x + W}px * var(--s))`, top: `calc(${y + H / 2 - 1}px * var(--s))` }} />);
      const s = at(gx, gy + 1);
      if (s && southDoor(r) && (seen(r) || seen(s))) items.push(<span key={`s${gx}${gy}`} className="mm-link v" style={{ left: `calc(${x + W / 2 - 1}px * var(--s))`, top: `calc(${y + H}px * var(--s))` }} />);
    }
  }
  return (
    <div className="minimap-wrap">
      <div className="minimap pxslot" style={{ width: `calc(${d.cols * (W + G) - G}px * var(--s))`, height: `calc(${d.rows * (H + G) - G}px * var(--s))` }}>{items}</div>
      <span className="minimap-name">{roomName}</span>
    </div>
  );
}

/**
 * Every boss gets its own bar frame (PixelLab, 192x32) with a transparent channel the
 * fill is drawn behind. `channel` is the fill rect inside the frame, in frame pixels.
 */
const BOSS_BARS: Record<string, { img: string; w: number; h: number; channel: [number, number, number, number]; fill: string; hi: string; lo: string }> = {
  "ELDER TREANT": { img: "/assets/sprites/props/bossbar-treant.png", w: 192, h: 32, channel: [32, 12, 127, 9], fill: "#e8763a", hi: "#ffd090", lo: "#7a2e10" },
  "BONE KNIGHT": { img: "/assets/sprites/props/bossbar-boneknight.png", w: 192, h: 32, channel: [33, 11, 121, 9], fill: "#4fb3c4", hi: "#bfeff5", lo: "#1e4a58" },
};

/** The boss's own health bar: bespoke frame, fill clipped to its channel, name riding above. */
function BossBar({ name, hp, max }: { name: string; hp: number; max: number }) {
  const cfg = BOSS_BARS[name];
  if (!cfg) {
    return (
      <div className="bossbar-generic pxpanel">
        <span className="t-title bossname">{name}</span>
        <div className="pxbar bar"><div className="fill" style={{ width: `${(100 * hp) / max}%` }} /></div>
      </div>
    );
  }
  const [cx, cy, cw, ch] = cfg.channel;
  const frac = Math.max(0, Math.min(1, hp / max));
  return (
    <div className="bossbar-own" style={{ width: `calc(${cfg.w}px * var(--s))` }}>
      <span className="t-title bossname">{name}</span>
      <div className="bossbar-frame" style={{ width: `calc(${cfg.w}px * var(--s))`, height: `calc(${cfg.h}px * var(--s))` }}>
        <div className="bossbar-track" style={{ left: `calc(${cx}px * var(--s))`, top: `calc(${cy}px * var(--s))`, width: `calc(${cw}px * var(--s))`, height: `calc(${ch}px * var(--s))`, background: cfg.lo }}>
          <div className="bossbar-fill" style={{ width: `${frac * 100}%`, background: `linear-gradient(180deg, ${cfg.hi} 0, ${cfg.hi} calc(2px * var(--s)), ${cfg.fill} calc(2px * var(--s)), ${cfg.fill} 100%)` }} />
        </div>
        <img src={cfg.img} alt="" draggable={false} />
      </div>
    </div>
  );
}

/** Vendor panel: cards with price and the delta they give; Esc/click-out closes. */
function ShopPanel() {
  const { shop, gold, items, swordTier, armorTier, flags, buy, closeShop } = useGame();
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => setMsg(null), [shop?.vendor]);
  if (!shop) return null;
  const def = SHOPS[shop.vendor];
  const qty = (id: string) => items.find((i) => i.id === id)?.qty ?? 0;
  const iconSrc = (icon: string) => (icon === "heart" ? "/assets/sprites/props/heart-container.png" : icon.startsWith("sword") ? "/assets/ui/icons/sword.png" : icon === "armor1" ? "/assets/ui/icons/helmet.png" : icon === "armor2" ? "/assets/ui/icons/shield-crest.png" : `/assets/ui/icons/${icon}.png`);
  return (
    <div className="bag-backdrop" onClick={closeShop}>
      <div className="shop pxpanel" onClick={(e) => e.stopPropagation()}>
        <div className="bag-head">
          <span className="eyebrow">{def.title}</span>
          <span className="muted"><span className="kbd">Esc</span> leave</span>
        </div>
        <span className="t-small shop-greeting">{def.greeting}</span>
        <div className="shop-grid">
          {def.entries.map((e) => {
            const owned = e.upgrade === "sword2" ? swordTier >= 2 : e.upgrade === "sword3" ? swordTier >= 3 : e.upgrade === "heart" ? flags.includes("bought:heart") : e.upgrade === "armor1" ? armorTier >= 1 : e.upgrade === "armor2" ? armorTier >= 2 : false;
            const locked = (e.upgrade === "sword3" && swordTier < 2) || (e.upgrade === "armor2" && armorTier < 1);
            const full = !!e.give && qty(e.give.item) >= e.give.max;
            const canAfford = gold >= e.price;
            const disabled = owned || locked || full || !canAfford;
            const label = owned ? "Owned" : locked ? (e.upgrade === "armor2" ? "Leather first" : "Temper first") : full ? "Full" : `${e.price}`;
            return (
              <div key={e.id} className={`shop-card pxslot${disabled ? " off" : ""}${shop.bought === e.id ? " bought" : ""}`}>
                <img src={iconSrc(e.icon)} alt="" />
                <div className="shop-text">
                  <span>{e.name}{e.give && <span className="muted"> ×{qty(e.give.item)}/{e.give.max}</span>}</span>
                  <span className="muted t-small">{e.effect}</span>
                </div>
                <button className={`pxbtn pxslot shop-buy${!canAfford && !owned && !full && !locked ? " poor" : ""}`} disabled={disabled} onClick={() => { const err = buy(e.id); setMsg(err); sfx(err ? "ui" : "chest"); }}>
                  {!owned && !locked && !full && <img src="/assets/ui/icons/coin.png" alt="" />}{label}
                </button>
              </div>
            );
          })}
        </div>
        <div className="shop-foot">
          <span className="stat gold t-title"><img src="/assets/ui/icons/coin.png" alt="" />{gold}</span>
          {msg && <span className="shop-msg">{msg}</span>}
        </div>
      </div>
    </div>
  );
}

/** Adds a class for `ms` whenever `value` changes in the given direction — the HUD's little "something happened" pops. */
function useFlash(value: number, dir: "up" | "any" = "any", ms = 450) {
  const [on, setOn] = useState(false);
  const prev = useRef(value);
  useEffect(() => {
    const was = prev.current;
    prev.current = value;
    if (value === was || (dir === "up" && value < was)) return;
    setOn(true);
    const t = window.setTimeout(() => setOn(false), ms);
    return () => window.clearTimeout(t);
  }, [value, dir, ms]);
  return on;
}

export function HUD() {
  const { screen, hearts, maxHearts, gold, keys, items, bagOpen, toggleBag, paused, togglePause, quitToTitle, banner, boss, respawn, dialogue, tag, flags, settings, setSettings, place, tool } = useGame();
  const rect = useCanvasRect();
  const s = uiScale(rect);
  const healFlash = useFlash(hearts, "up");
  const keyFlash = useFlash(keys);
  const goldFlash = useFlash(gold, "up", 300);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useGame.getState();
      if (st.screen !== "game") return;
      if (e.key === "Tab") {
        e.preventDefault();
        if (!st.paused && !st.dialogue && !st.shop) toggleBag();
      } else if (e.key === "Escape") {
        sfx("ui");
        if (st.shop) st.closeShop();
        else if (st.dialogue) st.setDialogue(null);
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
      {hearts <= 2 && <div className="vignette" />}
      <div className="hud">
        <div className={`hearts${hearts <= 2 ? " low" : ""}${healFlash ? " gain" : ""}`}>{heartStates.map((st, i) => <div key={i} className={`heart ${st}`} />)}</div>
        <div className="stat-row t-title shadowed">
          <span className={`stat gold${goldFlash ? " flash" : ""}`}><Icon name="coin" />{gold}</span>
          <span className={`stat${keyFlash ? " flash" : ""}`}><Icon name="key" />x{keys}</span>
        </div>
      </div>

      {place !== "hub" && <Minimap />}

      <div className="hotbar pxpanel">
        <Slot icon="sword" keyHint="LMB" selected />
        <div className="divider" />
        <Slot icon="potion" keyHint="1" qty={item("potion")?.qty ?? 0} empty={!item("potion")} locked={!flags.includes("unlock:potion")} />
        <Slot icon="bomb" keyHint="2" qty={item("bomb")?.qty ?? 0} empty={!item("bomb")} locked={!flags.includes("unlock:bomb")} />
        <Slot icon={item(tool) ? tool : item("boomerang") ? "boomerang" : item("grapple") ? "grapple" : undefined} keyHint={item("boomerang") && item("grapple") ? "RMB · Q" : "RMB"} empty={!item("boomerang") && !item("grapple")} />
        {item("bosskey") && <Slot icon="bosskey" keyHint="" />}
        <div className="divider" />
        <Slot icon="bag" keyHint="Tab" />
      </div>

      {!bagOpen && !dialogue && !banner && !tag && <Coach />}
      {!dialogue && !bagOpen && <WorldTag />}

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
          {/* the stone name plate lands mid-screen on the intro, then rises and hands over to the boss's own bar */}
          <div className={`bossplate pxpanel ${boss.intro ? "intro" : "bar"}`}>
            <span className="eyebrow">BOSS</span>
            <span className="t-title bossname">{boss.name}</span>
            <span className="muted t-small bosssub">{boss.sub}</span>
          </div>
          {!boss.intro && <BossBar name={boss.name} hp={boss.hp} max={boss.max} />}
          {!boss.intro && boss.status && <div className="bossstatus" key={boss.status}>{boss.status}</div>}
        </>
      )}

      <DialogueBox />
      <ShopPanel />
      {!dialogue && !banner && <Narrator />}

      {paused && (
        <div className="bag-backdrop" onClick={() => togglePause(false)}>
          <div className="pause pxpanel" onClick={(e) => e.stopPropagation()}>
            <span className="t-title">Paused</span>
            <div className="controls">
              <div><span className="kbd">WASD</span><span>Move</span></div>
              <div><span className="kbd">LMB</span><span>Attack toward cursor</span></div>
              <div><span className="kbd">Shift</span><span>Tap: dash · Hold: sprint</span></div>
              <div><span className="kbd">RMB</span><span>Use tool (boomerang / hook)</span></div>
              <div><span className="kbd">Q</span><span>Swap tool</span></div>
              <div><span className="kbd">1</span><span>Drink potion</span></div>
              <div><span className="kbd">2</span><span>Drop bomb</span></div>
              <div><span className="kbd">Tab</span><span>Bag</span></div>
              <div><span className="kbd">Esc</span><span>Pause / resume</span></div>
            </div>
            <div className="pause-settings">
              <span className="muted t-small">Sound</span>
              <button className="pxbtn pxslot" onClick={() => { const v = settings.sfx >= 1 ? 0 : Math.min(1, Math.round((settings.sfx + 0.25) * 4) / 4); setSettings({ sfx: v }); sfx("ui"); }}>
                {settings.sfx <= 0 ? "Off" : `${Math.round(settings.sfx * 100)}%`}
              </button>
            </div>
            <div className="pause-settings">
              <span className="muted t-small">Screen shake</span>
              <button className="pxbtn pxslot" onClick={() => setSettings({ shake: settings.shake === 1 ? 0.5 : settings.shake === 0.5 ? 0 : 1 })}>
                {settings.shake === 1 ? "Full" : settings.shake === 0.5 ? "Low" : "Off"}
              </button>
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
