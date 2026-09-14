import { useMemo } from "react";
import { readSave, useGame } from "./store";
import whisperwood from "../game/data/whisperwood.json";

function fmtTime(ms: number) {
  const m = Math.floor(ms / 60000);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function Title() {
  const { newGame, continueGame } = useGame();
  const save = useMemo(readSave, []);
  const hearts = save ? Array.from({ length: save.maxHearts / 2 }, (_, i) => (save.hearts - i * 2 >= 2 ? "full" : save.hearts - i * 2 === 1 ? "half" : "empty")) : [];
  const shards = save?.items.find((i) => i.id === "shard")?.qty ?? 0;
  const roomName = save ? whisperwood.rooms.find((r) => r.id === save.room)?.name ?? "" : "";

  return (
    <div className="title-backdrop">
      <div className="title">
        <span className="title-eyebrow">A TOP-DOWN ACTION RPG</span>
        <h1 className="title-logo">EMBER<span>FALL</span></h1>
        <span className="title-tag muted">Three shards. Three dungeons. Bring the flame home.</span>
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
                <span className="muted">{whisperwood.name} · {roomName}</span>
              </span>
            </button>
          )}
          <button className="pxbtn pxpanel" onClick={newGame} autoFocus={!save}>
            <span>New game</span>
          </button>
        </div>
        <span className="title-version muted">v0.1 prototype</span>
      </div>
    </div>
  );
}
