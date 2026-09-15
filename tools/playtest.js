// Console helpers for playtesting (paste into the dev-tools console).
window.__boot = async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  window.__sleep = sleep;
  window.__store = (await import("/src/ui/store.ts")).useGame;
  window.__sc = () => window.__game.scene.getScene("Dungeon");
  const kev = (type, code, keyCode) => new KeyboardEvent(type, { code, key: code.replace("Key", "").toLowerCase(), keyCode, which: keyCode, bubbles: true });
  window.__hold = async (code, keyCode, ms) => { window.dispatchEvent(kev("keydown", code, keyCode)); await sleep(ms); window.dispatchEvent(kev("keyup", code, keyCode)); };
  window.__key = (code, keyCode) => window.__hold(code, keyCode, 60);
  window.__aim = (wx, wy) => { const sc = window.__sc(); const cam = sc.cameras.main; const ptr = sc.input.activePointer; ptr.x = wx - cam.scrollX; ptr.y = wy - cam.scrollY; };
  window.__tp = (wx, wy) => { const p = window.__sc().player.sprite; p.setPosition(wx, wy); p.body.reset(wx, wy); };
  window.__fight = async (max = 40) => {
    const sc = window.__sc(); let n = 0;
    while (sc.enemies.filter((e) => !e.isDead).length && n++ < max) {
      const e = sc.enemies.filter((e) => !e.isDead)[0];
      window.__tp(e.sprite.x, e.sprite.y + 34); window.__aim(e.sprite.x, e.sprite.y - 60);
      await window.__key("KeyJ", 74); await sleep(520);
    }
    return [n, sc.enemies.length];
  };
  return "booted";
};

// Save the current game frame (no React HUD) to docs/mockup/frames/<name>.png via the dev snapshot sink.
window.__snap = (name) => new Promise((resolve) => {
  window.__game.renderer.snapshot((img) => {
    fetch("/__snap?name=" + encodeURIComponent(name), { method: "POST", body: img.src }).then((r) => r.text()).then(resolve);
  });
});

// Virtual-time driver: when the page is hidden (RAF stalls) step Phaser by hand
// via MessageChannel, which browsers don't throttle. __run(ms) advances ms of game time.
window.__run = (ms) => new Promise((resolve) => {
  // visible page: RAF is stepping the game, so just wait it out in real time
  if (document.visibilityState === "visible") return setTimeout(() => resolve(true), ms);
  // Phaser's TweenManager clocks itself off Date.now(), not the loop delta: skew Date.now by the same virtual time
  if (!window.__realNow) { window.__realNow = Date.now.bind(Date); window.__vskew = 0; Date.now = () => window.__realNow() + window.__vskew; }
  const loop = window.__game.loop; const ch = new MessageChannel();
  let vt = Math.max(loop.now, window.__vt || 0); const end = vt + ms;
  ch.port1.onmessage = () => { if (vt >= end) { window.__vt = vt; return resolve(true); } vt += 1000 / 60; window.__vskew += 1000 / 60; try { loop.step(vt); } catch (e) { console.error('[__run]', e); } ch.port2.postMessage(0); };
  ch.port2.postMessage(0);
});
window.__vhold = async (code, keyCode, ms) => {
  const kev = (type) => new KeyboardEvent(type, { code, key: code.replace("Key", "").toLowerCase(), keyCode, which: keyCode, bubbles: true });
  window.dispatchEvent(kev("keydown")); await window.__run(ms); window.dispatchEvent(kev("keyup")); await window.__run(32);
};

// HUD overlap QA: returns pairs of HUD elements whose boxes intersect, plus anything outside the frame.
window.__hudOverlaps = () => {
  const frame = document.querySelector('#ui .frame'); if (!frame) return ['no frame'];
  const F = frame.getBoundingClientRect();
  const sel = ['.hud', '.minimap-wrap', '.hotbar', '.coach', '.wtag', '.banner .card', '.bossplate.intro', '.bossbar-own', '.bossbar-generic', '.bossstatus', '.dialogue'];
  const boxes = [];
  for (const s of sel) for (const el of frame.querySelectorAll(s)) { const r = el.getBoundingClientRect(); if (r.width && r.height) boxes.push({ s, r }); }
  const out = [];
  const hit = (a, b) => a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) if (hit(boxes[i].r, boxes[j].r)) out.push(`${boxes[i].s} x ${boxes[j].s}`);
  for (const b of boxes) if (b.r.left < F.left - 1 || b.r.right > F.right + 1 || b.r.top < F.top - 1 || b.r.bottom > F.bottom + 1) out.push(`${b.s} outside frame`);
  return out;
};

// Boot straight into a dungeon from a fresh page: waits for the Hub (stepping virtual time when hidden),
// continues the saved game, then waits for the Dungeon scene. Seed a save first if you need flags/items.
window.__start = async (roomId) => {
  if (!window.__store) await window.__boot();
  const hub = window.__game.scene.getScene("Hub"), d = window.__game.scene.getScene("Dungeon");
  // asset loading is real network time: wait it out in real time, stepping the loop so the loader can finish
  const settle = async (sc) => { for (let i = 0; i < 120 && sc.scene.settings.status < 5; i++) { await window.__sleep(250); await window.__run(100); } };
  await settle(hub);
  await window.__run(300);
  window.__store.getState().continueGame();
  await window.__run(50);
  if (d.scene.settings.status < 5 && !hub.scene.isActive("Dungeon")) hub.scene.start("Dungeon");
  await settle(d);
  await window.__run(1500);
  if (roomId) { d.goto(roomId); await window.__run(1600); }
  return [d.meta?.id, d.room?.id];
};
