import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { execSync } from "node:child_process";

/** "0.0.1+6b2175b" - package version plus the commit (Vercel's env, else git, else "dev"). */
function appVersion() {
  const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf-8")) as { version: string };
  let sha = process.env.VERCEL_GIT_COMMIT_SHA ?? "";
  if (!sha) {
    try {
      sha = execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    } catch {
      sha = "";
    }
  }
  return `${pkg.version}+${sha ? sha.slice(0, 7) : "dev"}`;
}

/**
 * Dev-only: POST /__snap?name=<file> with a data-URL body saves a PNG to
 * docs/mockup/frames/. Lets the running game hand frames to mockups and
 * review sheets without a screenshot tool in the loop.
 */
function snapshotSink(): Plugin {
  return {
    name: "emberfall-snapshot-sink",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__snap", (req, res) => {
        const url = new URL(req.url ?? "", "http://x");
        const name = basename(url.searchParams.get("name") ?? "frame").replace(/[^\w.-]/g, "_");
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
          // any data URL: the extension follows the media type (png frames, wav music previews)
          const m = /^data:([\w/.+-]+);base64,/.exec(body);
          const b64 = m ? body.slice(m[0].length) : body;
          const ext = m && m[1] === "audio/wav" ? "wav" : "png";
          const dir = join(process.cwd(), ext === "wav" ? "docs/audio-review" : "docs/mockup/frames");
          mkdirSync(dir, { recursive: true });
          writeFileSync(join(dir, `${name}.${ext}`), Buffer.from(b64, "base64"));
          res.end("ok");
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), snapshotSink()],
  define: { __APP_VERSION__: JSON.stringify(appVersion()) },
  server: { port: 5173, strictPort: true },
  build: {
    target: "es2022",
    // the engine and React change once a year; the game changes every push - keep them in their own
    // hashed chunks so a one-line edit re-ships kilobytes, not the 1.4 MB of Phaser
    rollupOptions: { output: { manualChunks: { phaser: ["phaser"], react: ["react", "react-dom", "zustand"] } } },
  },
});
