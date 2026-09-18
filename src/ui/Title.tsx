import { useMemo, useState } from "react";
import { clearSave, peekSave, useGame } from "./store";
import { dungeonFor } from "../game/data/dungeons";
import { QUEST, questIndex } from "../game/quests";

function fmtTime(ms: number) {
  const m = Math.floor(ms / 60000);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function Title() {
  const { newGame, continueGame } = useGame();
  const [peek, setPeek] = useState(useMemo(peekSave, []));
  const save = peek.kind === "ok" || peek.kind === "restored" ? peek.data : null;
  // starting over on top of a save takes two clicks; the first one says what it would cost
  const [confirming, setConfirming] = useState(false);
  const startNew = () => {
    if (save && !confirming) return setConfirming(true);
    newGame();
  };
  const hearts = save ? Array.from({ length: save.maxHearts / 2 }, (_, i) => (save.hearts - i * 2 >= 2 ? "full" : save.hearts - i * 2 === 1 ? "half" : "empty")) : [];
  const shards = save?.items.find((i) => i.id === "shard")?.qty ?? 0;
  const inTown = save?.place === "hub";
  const roomName = save ? (inTown ? "Town square" : dungeonFor(save.place).def.rooms.find((r) => r.id === save.room)?.name ?? "") : "";
  // the chapter the save is on, so the card says where the story stands
  const chapter = save ? QUEST[questIndex({ flags: save.flags, place: save.place, has: (id) => save.items.some((i) => i.id === id && i.qty > 0), shards, counters: save.counters })] : null;
  const finale = !!save?.flags.includes("finale");

  return (
    <div className="title-backdrop">
      <div className="title">
        <span className="title-eyebrow">A TOP-DOWN ACTION RPG</span>
        <h1 className="title-logo">EMBER<span>FALL</span></h1>
        <span className="title-tag muted">{finale ? "The flame is home. Emberfall is warm again." : "Three shards. Three dungeons. Bring the flame home."}</span>
        <div className="title-menu">
          {save && (
            <button className="pxbtn pxpanel title-continue" onClick={continueGame} autoFocus>
              <span className="title-continue-head"><span>Continue</span><span className="kbd">Enter</span></span>
              <span className="title-continue-meta">
                <span className="hearts">{hearts.map((h, i) => <span key={i} className={`heart ${h}`} />)}</span>
                <span className="muted">{save.gold} gold · {fmtTime(save.playtimeMs)}</span>
              </span>
              <span className="title-continue-meta">
                <span className="stat"><img src="/assets/ui/icons/shard.png" alt="" />{shards}/3</span>
                <span className="muted">{inTown ? "Emberfall" : dungeonFor(save!.place).def.name} · {roomName}</span>
              </span>
              <span className="title-continue-meta">
                <span className="title-chapter">{finale ? "The Ember is whole" : chapter ? chapter.title : ""}</span>
                {!finale && chapter && <span className="muted">{chapter.objective}</span>}
              </span>
            </button>
          )}
          {(peek.kind === "old" || peek.kind === "corrupt") && (
            <div className="title-note muted">
              <span>
                {peek.kind === "old"
                  ? `A save from an earlier build is here${peek.gold !== undefined ? ` (${peek.gold} gold${peek.playtimeMs !== undefined ? `, ${fmtTime(peek.playtimeMs)}` : ""})` : ""}; this build can't read it.`
                  : "A save is here but it can't be read."}
              </span>
              <button className="pxbtn pxslot" onClick={() => { clearSave(); setPeek({ kind: "absent" }); }}>Clear it</button>
            </div>
          )}
          {peek.kind === "restored" && <span className="title-note muted">Your save was damaged; the last good copy was restored.</span>}
          <button className={`pxbtn pxpanel${confirming ? " warn" : ""}`} onClick={startNew} onBlur={() => setConfirming(false)} autoFocus={!save}>
            <span>{confirming ? (finale ? "Start over? The finished journey will be erased" : `Start over? ${chapter ? `"${chapter.title}" will be erased` : "Your save will be erased"}`) : "New game"}</span>
            {confirming && <span className="muted t-small">Click again to confirm</span>}
          </button>
        </div>
        <span className="title-version muted">alpha {__APP_VERSION__}</span>
      </div>
    </div>
  );
}
