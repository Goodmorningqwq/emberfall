// Full-game regression playthrough. Load after tools/playtest.js in the dev page:
//   await import("/tools/regression.js?v=1"); const report = await window.__regress();
// Starts a fresh save, then plays the whole main quest by script — real fights, chests, tools, boss
// windows — with `goto` only to move between rooms. Every beat asserts flags/items/screens; the report
// is a list of [beat, ok, detail]. Heals between fights so a bad roll doesn't end the run.
window.__regress = async (opts = {}) => {
  const R = [];
  const section = async (name, fn) => { try { await fn(); } catch (e) { R.push([name + " — crashed", false, e.message]); } };
  const st = () => window.__store.getState();
  // balance telemetry: hearts lost and game time between beats (heals are counted as lost hearts)
  let lastT = 0, lostAcc = 0, lastHearts = 0;
  const tnow = () => (window.__game.loop.now || 0);
  const ok = (name, cond, detail = "") => { const dt = Math.round((tnow() - lastT) / 100) / 10; lastT = tnow(); R.push([name, !!cond, detail, lostAcc, dt]); lostAcc = 0; if (!cond && opts.stopOnFail) throw new Error("regression stop: " + name); return !!cond; };
  const heal = () => { lostAcc += st().maxHearts - st().hearts; st().heal(99); };
  const watchHearts = () => { const h = st().hearts; if (h < lastHearts) lostAcc += lastHearts - h; lastHearts = h; };
  const _run = window.__run; const runW = async (ms) => { const r = await _run(ms); watchHearts(); return r; };
  const sleep = window.__sleep;
  const run = runW;
  const game = window.__game;
  const hubS = () => game.scene.getScene("Hub");
  const dg = () => game.scene.getScene("Dungeon");
  const waitScene = async (sc, pred = () => true) => { for (let i = 0; i < 120 && !(sc.scene.settings.status === 5 && pred()); i++) { await sleep(200); await run(100); } await run(600); };
  const clamp = (r, x, y) => [Math.min(Math.max(x, r.x + 48), r.x + r.w - 48), Math.min(Math.max(y, r.y + 110), r.y + r.h - 40)];
  const tp = (x, y) => window.__tp(x, y);
  const swing = async (d, e) => { const [x, y] = clamp(d.room, e.sprite.x, e.sprite.y + 34); tp(x, y); window.__aim(e.sprite.x, e.sprite.y - 40); await window.__vhold("KeyJ", 74, 60); await run(420); };
  const swingFrom = async (d, e, x, y) => { const [cx, cy] = clamp(d.room, x, y); tp(cx, cy); window.__aim(e.sprite.x, e.sprite.y - 10); await window.__vhold("KeyJ", 74, 60); await run(420); };
  const fight = async (d, max = 60) => { let n = 0; while (d.enemies.filter((e) => !e.isDead && !e.isBoss).length && n++ < max) { const e = d.enemies.filter((e) => !e.isDead && !e.isBoss)[0];
      if (e.blocksNow && e.facing) { // a shield-bearer: step behind it and cut
        await swingFrom(d, e, e.sprite.x - e.facing.x * 30, e.sprite.y - 6 - e.facing.y * 30);
      } else await swing(d, e);
      if (st().hearts <= 2) heal(); } await run(900); return n; };
  const openChests = async (d) => {
    for (let t = 0; t < 4000 && !d.chests.some((c) => !c.opened); t += 200) await run(200); // reveals land on a delay
    for (const c of [...d.chests]) { for (let tries = 0; tries < 3 && !c.opened; tries++) { tp(c.image.x + 16, c.image.y + 46 + tries * 4); await run(80); await window.__vhold("KeyW", 87, 300); await run(1600); } }
  };
  const pickup = async (d, kind, ms = 6000) => { for (let t = 0; t < ms; t += 150) { const it = d.pickupGroup.getChildren().find((c) => c.getData("pickup") === kind); if (it) { tp(it.x, it.y + 2); await run(kind === "shard" ? 3600 : 500); return true; } await run(150); } return false; };
  const talk = async (hub, kind) => { const a = hub.anchorList.find((z) => z.kind === kind); const p = hub.player.sprite; for (let tries = 0; tries < 3 && !st().dialogue; tries++) { p.setPosition(a.tx * 32 + 16, a.ty * 32 + 60 + tries * 6); p.body.reset(p.x, p.y); await run(120); await window.__vhold("KeyW", 87, 700); await run(250); } return !!st().dialogue; };
  const waitBoss = async () => { for (let t = 0; t < 8000 && !st().boss; t += 200) await run(200); await run(800); };
  const useTool = async (d, tool, tx, ty) => { st().setTool(tool); const p = d.player.sprite; const dx = tx - p.x, dy = ty - p.y, L = Math.hypot(dx, dy); return d.throwBoomerang({ x: dx / L, y: dy / L }); };

  // ---- fresh start in town
  localStorage.removeItem("emberfall.save.1");
  st().newGame(); await sleep(100); st().startGame();
  await waitScene(hubS(), () => !!hubS().player?.sprite?.body);
  ok("fresh start in town", st().place === "hub" && st().screen === "game");
  {
    const hub = hubS(); const p = hub.player.sprite;
    await talk(hub, "npc-elder");
    ok("Tam talks", !!st().dialogue, st().dialogue?.title); st().setDialogue(null); await run(200);
    ok("quest step 2 after Tam", st().hasFlag("talked:elder"));
    // walk through the east gate
    const gate = hub.anchorList.find((a) => a.kind === "gate-whisperwood");
    p.setPosition(gate.tx * 32 - 30, gate.ty * 32 + 40); p.body.reset(p.x, p.y); await window.__vhold("KeyD", 68, 1400);
    await sleep(800); await run(400);
    await waitScene(dg(), () => !!dg().room);
    ok("east gate → Whisperwood", st().place === "whisperwood" && dg().room?.id === "entrance");
  }

  await section("Whisperwood", async () => {
    const d = dg();
    d.goto("west-fight"); await run(1800);
    await fight(d);
    ok("west-fight cleared, potion unlocked", st().hasFlag("cleared:west-fight") && st().hasFlag("unlock:potion"));
    await pickup(d, "key");
    ok("first key picked up", st().keys >= 1, "keys=" + st().keys);
    d.goto("west-miniboss"); await run(1800);
    await fight(d, 80);
    await openChests(d);
    ok("boomerang from the mossback's den", st().hasItem("boomerang"));
    d.goto("east-crystal"); await run(1800);
    await fight(d, 60);
    // ring the crystal with the boomerang
    const cz = d.crystals[0];
    if (cz) { const [x, y] = clamp(d.room, cz.image.x + 16, cz.image.y + 90); tp(x, y); await run(60); await useTool(d, "boomerang", cz.image.x + 16, cz.image.y + 10); await run(1500); }
    await openChests(d);
    ok("boss key from the crystal room", st().hasItem("bosskey"));
    d.goto("boss"); await waitBoss();
    const b = d.enemies.find((e) => e.isBoss);
    ok("Treant intro", !!b && st().boss?.name === "ELDER TREANT");
    for (let round = 0; round < 12 && b && !b.isDead; round++) {
      for (let t = 0; t < 14000 && !b.coreOpen; t += 100) { await run(100); if (st().hearts <= 2) heal(); }
      const [x, y] = clamp(d.room, b.sprite.x, b.sprite.y + 90); tp(x, y); await run(40);
      await useTool(d, "boomerang", b.sprite.x, b.sprite.y - 40); await run(700);
      for (let i = 0; i < 6 && !b.isDead && b.state === "stunned"; i++) await swing(d, b);
      await run(800);
    }
    ok("Treant defeated", st().hasFlag("boss:whisperwood"));
    await pickup(d, "shard");
    ok("shard 1 + complete screen", st().hasFlag("shard:whisperwood") && st().screen === "complete");
    st().keepExploring(); await run(300);
    // walk home through the entrance
    d.goto("entrance"); await run(1500); const r = d.room; tp(r.x + r.w / 2, r.y + r.h - 40); await window.__vhold("KeyS", 83, 1200); await sleep(800); await run(500);
    await waitScene(hubS(), () => !!hubS().player?.sprite?.body);
    ok("back in town by the east gate", st().place === "hub");
  });

  await section("town after Whisperwood", async () => {
    const hub = hubS(); const p = hub.player.sprite;
    await talk(hub, "npc-elder"); st().setDialogue(null); await run(200);
    ok("Tam after shard 1", st().hasFlag("talked:elder:1"));
    // Orrin: the tempered sword (the shop path), else set the tier so the later bosses stay in budget
    st().openShop("blacksmith"); const err = st().gold >= 80 ? st().buy("sword2") : "poor"; st().closeShop();
    ok("Orrin sells the tempered sword", st().swordTier === 2 || err === "poor", "gold=" + st().gold + " " + (err ?? "bought"));
    if (st().swordTier < 2) window.__store.setState({ swordTier: 2 });
    ok("west gate open", hub.gateOpen("gate-crypt"));
    const gate = hub.anchorList.find((a) => a.kind === "gate-crypt");
    p.setPosition(gate.tx * 32 + 76, gate.ty * 32 + 40); p.body.reset(p.x, p.y); await window.__vhold("KeyA", 65, 1600);
    await sleep(800); await run(400);
    await waitScene(dg(), () => !!dg().room && dg().meta?.id === "crypt");
    ok("west gate → Crypt", st().place === "crypt");
  });

  await section("Crypt", async () => {
    const d = dg();
    d.goto("drowned-hall"); await run(2000);
    for (let tries = 0; tries < 3 && !st().hasFlag("solved:drowned-hall"); tries++) { const r = d.room; tp(r.x + 2 * 32 + 16, r.y + 8 * 32 + 16); await run(100); await window.__vhold("KeyS", 83, 500); await run(1600); }
    ok("Drowned Hall drained", st().hasFlag("solved:drowned-hall") && d.water.length === 0);
    d.goto("ossuary"); await run(1800); await fight(d, 80);
    await pickup(d, "key");
    ok("ossuary key", st().keys >= 1, "keys=" + st().keys);
    d.goto("crossing"); await run(1800); await fight(d, 60);
    // the west door: bump it with a key
    { const door = d.doors.find((x) => x.kind === "locked"); if (door) { tp(door.image.x + 60, door.image.y + 32); await window.__vhold("KeyA", 65, 500); await run(600); } }
    ok("Crossing west door unlocked", st().hasFlag("door:crossing:door-locked:0"));
    d.goto("captains-vault"); await run(1800); await fight(d, 100);
    await openChests(d);
    ok("grapple from the Captain", st().hasItem("grapple"));
    d.goto("cistern"); await run(1800);
    { const r = d.room; const p = d.player.sprite; tp(r.x + 2 * 32 + 16, r.y + 4 * 32 + 16); await run(60);
      const a = d.anchors.find((z) => z.x > r.x + 200); await useTool(d, "grapple", a.x, a.y); for (let i = 0; i < 40 && d.grapple; i++) await run(100);
      ok("hooked across the cistern", p.x > r.x + 11 * 32, "x=" + Math.round((p.x - r.x) / 32));
      // the blue slime swims: let it come to the shore, then cut it from the floor
      for (let i = 0; i < 30 && d.enemies.some((e) => !e.isDead); i++) { const e = d.enemies.find((e) => !e.isDead); tp(r.x + 12 * 32 + 16, Math.min(Math.max(e.sprite.y + 30, r.y + 110), r.y + r.h - 40)); window.__aim(e.sprite.x, e.sprite.y - 10); await window.__vhold("KeyJ", 74, 60); await run(420); if (st().hearts <= 2) heal(); }
      tp(r.x + 13 * 32 + 16, r.y + 7 * 32 + 16); await window.__vhold("KeyS", 83, 500); await run(1800);
      await openChests(d);
    }
    ok("boss key from the cistern", st().hasItem("bosskey"));
    d.goto("boss"); await waitBoss();
    const b = d.enemies.find((e) => e.isBoss); const p = d.player.sprite;
    ok("Bone Knight intro", !!b && st().boss?.name === "BONE KNIGHT");
    for (let round = 0; round < 14 && b && !b.isDead; round++) {
      for (let t = 0; t < 16000 && !b.guardOpen; t += 100) { await run(100); if (st().hearts <= 2) heal(); if (b.state === "quakeTell") { const a = d.anchors[0]; tp(a.x + 20, a.y + 20); } }
      const side = b.sprite.x < d.room.x + d.room.w / 2 ? 1 : -1; const [x, y] = clamp(d.room, b.sprite.x + side * 100, b.sprite.y - 20); tp(x, y); await run(40);
      await useTool(d, "grapple", b.sprite.x, b.sprite.y - 32); await run(800);
      for (let i = 0; i < 6 && !b.isDead && b.state === "exposed"; i++) await swing(d, b);
      await run(600);
    }
    ok("Bone Knight defeated", st().hasFlag("boss:crypt"));
    await pickup(d, "shard");
    ok("shard 2", st().hasFlag("shard:crypt"));
    st().keepExploring(); await run(300);
    st().setPlace("hub"); d.scene.start("Hub", { from: "gate-crypt" });
    await waitScene(hubS(), () => !!hubS().player?.sprite?.body);
  });

  await section("town after Crypt", async () => {
    const hub = hubS(); const p = hub.player.sprite;
    await talk(hub, "npc-elder"); st().setDialogue(null); await run(200);
    ok("south gate open after shard 2", hub.gateOpen("gate-cinder"));
    const gate = hub.anchorList.find((a) => a.kind === "gate-cinder");
    p.setPosition(gate.tx * 32 + 32, gate.ty * 32 - 20); p.body.reset(p.x, p.y); await window.__vhold("KeyS", 83, 1600);
    await sleep(800); await run(400);
    await waitScene(dg(), () => !!dg().room && dg().meta?.id === "cinder");
    ok("south gate → Cinder", st().place === "cinder");
  });

  await section("Cinder", async () => {
    const d = dg();
    d.goto("vent-gallery"); await run(1500);
    { const r = d.room; tp(r.x + 18 * 32 + 16, r.y + 10 * 32 + 16); await window.__vhold("KeyD", 68, 300); await run(1600); await openChests(d); }
    ok("vent gallery plate → key", st().hasFlag("solved:vent-gallery") && st().keys >= 1);
    d.goto("forge-hall"); await run(1800); await fight(d, 80);
    d.goto("cinder-crossing"); await run(1800); await fight(d, 60);
    { const door = d.doors.find((x) => x.kind === "locked"); if (door) { tp(door.image.x + 60, door.image.y + 32); await window.__vhold("KeyA", 65, 500); await run(600); } }
    d.goto("smelter"); await run(1800); await fight(d, 100); await openChests(d);
    ok("Fire Rod from the Smelter", st().hasItem("firerod"));
    d.goto("brazier-vault"); await run(1800);
    for (const br of d.braziers) { const [x, y] = clamp(d.room, br.x, br.y + 70); tp(x, y); await run(60); await useTool(d, "firerod", br.x, br.y); await run(700); }
    await run(600); await openChests(d);
    ok("boss key from the braziers", st().hasItem("bosskey"));
    d.goto("boss"); await waitBoss();
    const b = d.enemies.find((e) => e.isBoss); const p = d.player.sprite;
    ok("Cinder Golem intro", !!b && st().boss?.name === "CINDER GOLEM");
    for (let round = 0; round < 20 && b && !b.isDead; round++) {
      if (st().hearts <= 4) heal();
      const f = b.facing; const [bx, by] = clamp(d.room, b.sprite.x - f.x * 90, b.sprite.y - 28 - f.y * 90); tp(bx, by); await run(80);
      await useTool(d, "firerod", b.sprite.x, b.sprite.y - 28);
      for (let i = 0; i < 20 && b.state !== "hot"; i++) await run(70);
      for (let i = 0; i < 8 && !b.isDead && b.state === "hot"; i++) await swing(d, b);
      await run(900);
    }
    ok("Cinder Golem defeated", st().hasFlag("boss:cinder"));
    await pickup(d, "shard");
    ok("shard 3", st().hasFlag("shard:cinder"));
    st().keepExploring(); await run(300);
    st().setPlace("hub"); d.scene.start("Hub", { from: "gate-cinder" });
    await waitScene(hubS(), () => !!hubS().player?.sprite?.body);
  });

  await section("finale", async () => {
    const hub = hubS();
    await talk(hub, "npc-elder"); st().setDialogue(null); await run(200);
    for (let t = 0; t < 9000; t += 500) { await run(500); if (st().screen === "complete") break; }
    ok("finale", st().hasFlag("finale") && st().screen === "complete");
  });
  const failed = R.filter((r) => !r[1]);
  console.table(R.map(([n, o, d, lost, dt]) => ({ beat: n, ok: o ? "✓" : "✗", detail: d, heartsLost: lost, seconds: dt })));
  return { passed: R.length - failed.length, failed: failed.map((r) => r[0] + (r[2] ? " (" + r[2] + ")" : "")), beats: R };
};
