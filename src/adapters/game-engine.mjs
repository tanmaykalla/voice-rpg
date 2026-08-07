import { stableLineId } from "../utils.mjs";

export class GameEngineAdapter extends EventTarget {
  constructor({ runtime, scope = "engine" } = {}) {
    super();
    if (!runtime) throw new Error("GameEngineAdapter requires a runtime");
    this.runtime = runtime;
    this.scope = scope;
    runtime.addEventListener("selection", (event) => this.dispatchEvent(new CustomEvent("selection", { detail: event.detail })));
  }

  present({ id, text, speaker = "narrator", emotion, choices = [], metadata } = {}) {
    const turnId = id || stableLineId(this.scope, metadata?.node || "turn", text);
    return this.runtime.present({
      id: turnId, text, speaker, emotion, metadata,
      choices: choices.map((choice, index) => ({
        id: String(choice.id ?? index + 1), label: choice.label ?? choice.text,
        activate: choice.activate || (() => this.dispatchEvent(new CustomEvent("command", { detail: { type: "select", turnId, choiceId: String(choice.id ?? index + 1), index } }))),
      })),
    });
  }

  stop() { return this.runtime.stop(); }
}

export class WindowMessageGameEngineAdapter extends GameEngineAdapter {
  constructor(options = {}) {
    super(options);
    this.target = options.target || globalThis.parent;
    this.targetOrigin = options.targetOrigin || "*";
    this.onMessage = (event) => {
      if (event.data?.type === "voice-sdk:present") this.present(event.data.turn);
      if (event.data?.type === "voice-sdk:stop") this.stop();
    };
    this.addEventListener("command", (event) => this.target?.postMessage({ type: "voice-sdk:selection", ...event.detail }, this.targetOrigin));
  }

  start() {
    globalThis.addEventListener("message", this.onMessage);
    this.target?.postMessage({ type: "voice-sdk:ready" }, this.targetOrigin);
    return this;
  }

  destroy() { globalThis.removeEventListener("message", this.onMessage); return this.stop(); }
}

