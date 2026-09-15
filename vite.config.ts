import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

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
  server: { port: 5173, strictPort: true },
  build: { target: "es2022" },
});
