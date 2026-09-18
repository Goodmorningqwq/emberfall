/**
 * `?debug=1` on the URL turns on the console readouts (fps, boot errors with a stack). Nothing else
 * reads it yet; the playtest helpers (`__game`) stay DEV-only.
 */
let cached: boolean | null = null;
export function isDebug(): boolean {
  if (cached === null) {
    try {
      cached = new URLSearchParams(window.location.search).get("debug") === "1";
    } catch {
      cached = false;
    }
  }
  return cached;
}
