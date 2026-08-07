export class ManifestTTSProvider {
  constructor({ manifest = {}, baseUrl = "", fallback = null, preload = true } = {}) {
    this.name = "manifest";
    this.manifest = manifest;
    this.baseUrl = baseUrl;
    this.fallback = fallback;
    this.cache = new Map();
    this.active = null;
    if (preload && typeof Audio !== "undefined") this.preload();
  }

  entries() { return this.manifest.lines || {}; }
  urlFor(line) { return new URL(line.file, this.baseUrl || globalThis.location?.href || "http://localhost/").href; }

  preload() {
    for (const line of Object.values(this.entries())) {
      if (!line.file) continue;
      const audio = new Audio(this.urlFor(line));
      audio.preload = "metadata";
      this.cache.set(line.id, audio);
    }
  }

  async speak(utterance) {
    const line = this.entries()[utterance.id];
    if (!line?.file || typeof Audio === "undefined") return this.fallback?.speak(utterance) || { played: false, provider: this.name, missing: true };
    const audio = this.cache.get(line.id) || new Audio(this.urlFor(line));
    this.cache.set(line.id, audio);
    this.active = audio;
    const requestedAt = performance.now();
    return new Promise((resolve) => {
      let startedAt = null, settled = false;
      const finish = (played, error) => {
        if (settled) return;
        settled = true;
        if (this.active === audio) this.active = null;
        resolve({ played, provider: line.provider || this.manifest.provider || this.name, startLatencyMs: startedAt == null ? null : Math.round(startedAt - requestedAt), durationMs: startedAt == null ? null : Math.round(performance.now() - startedAt), error });
      };
      audio.currentTime = 0;
      audio.onplaying = () => { startedAt = performance.now(); };
      audio.onended = () => finish(true);
      audio.onerror = () => finish(false, "audio-error");
      audio.play().catch(async (error) => {
        if (this.fallback) return resolve(await this.fallback.speak(utterance));
        finish(false, error.message);
      });
    });
  }

  stop() {
    if (this.active) { this.active.pause(); this.active = null; }
    this.fallback?.stop?.();
  }
}

