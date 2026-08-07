import { VocalBridge } from "@vocalbridgeai/sdk";

export class VocalBridgeSTTProvider {
  constructor({ adapter = null, tokenUrl = "/api/voice-token", participantName = "Voice Accessibility Player" } = {}) {
    this.name = "vocalbridge";
    this.adapter = adapter;
    this.tokenUrl = tokenUrl;
    this.participantName = participantName;
    this.client = null;
    this.connected = false;
    this.handlers = null;
  }

  async connect(onStatus) {
    if (this.adapter) return this.adapter.prime(onStatus);
    if (this.connected) return true;
    this.client = new VocalBridge({ auth: { tokenUrl: this.tokenUrl }, participantName: this.participantName, autoPlayAudio: false });
    this.client.on("agentAction", ({ action, payload }) => {
      if (action !== "live_transcript" || !payload?.text) return;
      if (payload.is_final) {
        const handler = this.handlers?.onFinal;
        this.handlers = null;
        this.client.setMicrophoneEnabled(false).finally(() => handler?.(payload.text.trim(), payload));
      } else this.handlers?.onInterim?.(payload.text.trim(), payload);
    });
    this.client.on("error", (error) => this.handlers?.onError?.(error));
    onStatus?.("connecting to Vocal Bridge");
    await this.client.connect();
    this.connected = true;
    await this.client.setMicrophoneEnabled(false);
    onStatus?.("Vocal Bridge ready");
    return true;
  }

  async listenOnce({ onStatus, onInterim, signal } = {}) {
    await this.connect(onStatus);
    return new Promise(async (resolve, reject) => {
      const abort = () => { this.stop(); reject(new DOMException("Listening aborted", "AbortError")); };
      signal?.addEventListener("abort", abort, { once: true });
      try {
        if (!this.adapter) {
          this.handlers = { onInterim, onFinal: (text, payload) => { signal?.removeEventListener("abort", abort); resolve({ text, alternatives: [text], payload }); }, onError: (error) => { signal?.removeEventListener("abort", abort); reject(error); } };
          await this.client.setMicrophoneEnabled(true);
          onStatus?.("listening");
          return;
        }
        const started = await this.adapter.listen({
          onStatus,
          onStart: () => onStatus?.("listening"),
          onInterim,
          onFinal: (text, payload) => { signal?.removeEventListener("abort", abort); resolve({ text, alternatives: [text], payload }); },
          onError: (error) => { signal?.removeEventListener("abort", abort); reject(error); },
        });
        if (!started) reject(new Error("Vocal Bridge did not start listening"));
      } catch (error) { reject(error); }
    });
  }

  async stop() {
    this.handlers = null;
    if (this.adapter) return this.adapter.stop?.();
    if (this.connected) await this.client.setMicrophoneEnabled(false);
  }
  async disconnect() {
    this.handlers = null;
    if (this.adapter) return this.adapter.disconnect?.();
    await this.client?.disconnect();
    this.client = null;
    this.connected = false;
  }
}
