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
window.__vt = window.__vt || performance.now();
window.__run = (ms) => new Promise((resolve) => {
  const loop = window.__game.loop; const ch = new MessageChannel(); const end = window.__vt + ms;
  ch.port1.onmessage = () => { if (window.__vt >= end) return resolve(true); window.__vt += 1000 / 60; try { loop.step(window.__vt); } catch (e) { console.error('[__run]', e); } ch.port2.postMessage(0); };
  ch.port2.postMessage(0);
});
window.__vhold = async (code, keyCode, ms) => {
  const kev = (type) => new KeyboardEvent(type, { code, key: code.replace("Key", "").toLowerCase(), keyCode, which: keyCode, bubbles: true });
  window.dispatchEvent(kev("keydown")); await window.__run(ms); window.dispatchEvent(kev("keyup")); await window.__run(32);
};
