import { matchChoices } from "./matcher.mjs";
import { Observer } from "./observer.mjs";
import { cleanText, stableLineId } from "./utils.mjs";

const now = () => globalThis.performance?.now?.() ?? Date.now();

export class AccessibilityRuntime extends EventTarget {
  constructor({ tts, stt, observer, scope = "game", readChoices = true, maxRetries = 2, locale = "en" } = {}) {
    super();
    if (!tts) throw new Error("A TTS runtime provider is required");
    if (!stt) throw new Error("An STT provider is required");
    this.tts = tts;
    this.stt = stt;
    this.observer = observer || new Observer();
    this.scope = scope;
    this.readChoices = readChoices;
    this.maxRetries = maxRetries;
    this.locale = locale;
    this.generation = 0;
    this.abortController = null;
  }

  status(message, detail = {}) {
    this.dispatchEvent(new CustomEvent("status", { detail: { message, ...detail } }));
  }

  async speak(utterance) {
    const requestedAt = now();
    const event = this.observer.record("tts", { lineId: utterance.id, category: utterance.category, speaker: utterance.speaker, provider: this.tts.name, completed: false });
    const result = await this.tts.speak(utterance);
    this.observer.update(event.id, { ...result, completed: Boolean(result?.played), totalMs: Math.round(now() - requestedAt) });
    return result;
  }

  normalizeTurn(turn) {
    const id = turn.id || stableLineId(this.scope, turn.key || "turn", turn.text || "");
    const choices = (turn.choices || []).map((choice, index) => typeof choice === "string"
      ? { id: String(index + 1), label: cleanText(choice) }
      : { ...choice, id: String(choice.id ?? index + 1), label: cleanText(choice.label ?? choice.text) });
    return { ...turn, id, text: cleanText(turn.text), choices };
  }

  async present(rawTurn) {
    const turn = this.normalizeTurn(rawTurn);
    const generation = ++this.generation;
    await this.stop(false);
    this.observer.record("turn", { turnId: turn.id, textChars: turn.text.length, choices: turn.choices.map((choice) => choice.label) });
    this.status("narrating", { turn });
    if (turn.text) await this.speak({ id: turn.id, text: turn.text, speaker: turn.speaker || "narrator", emotion: turn.emotion, category: "narrative" });
    if (generation !== this.generation || !turn.choices.length) return null;

    if (this.readChoices) {
      const introText = turn.choicePrompt || "Your choices are.";
      await this.speak({ id: stableLineId(this.scope, "meta-choices", introText), text: introText, speaker: "meta", category: "prompt" });
      for (let index = 0; index < turn.choices.length; index++) {
        if (generation !== this.generation) return null;
        const choice = turn.choices[index];
        const spoken = `Option ${index + 1}. ${choice.label}`;
        await this.speak({ id: choice.speechId || stableLineId(this.scope, `${turn.id}-choice-${index + 1}`, spoken), text: spoken, speaker: "meta", category: "choice" });
      }
      const question = turn.selectionPrompt || "Which do you choose?";
      await this.speak({ id: stableLineId(this.scope, "meta-select", question), text: question, speaker: "meta", category: "prompt" });
    }
    if (generation !== this.generation) return null;
    return this.listenForSelection(turn, generation);
  }

  async listenForSelection(turn, generation) {
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (generation !== this.generation) return null;
      this.abortController = new AbortController();
      const openedAt = now();
      let firstInterimAt = null, lastInterimAt = null;
      this.status("listening", { attempt });
      try {
        const heard = await this.stt.listenOnce({
          signal: this.abortController.signal,
          onStatus: (message) => this.status(message, { attempt }),
          onInterim: (text) => {
            const time = now();
            if (firstInterimAt == null) firstInterimAt = time;
            lastInterimAt = time;
            this.dispatchEvent(new CustomEvent("interim", { detail: { text, attempt } }));
          },
        });
        const finalAt = now();
        const matchStartedAt = now();
        const result = matchChoices(heard.alternatives || [heard.text], turn.choices);
        const selected = result.index >= 0 ? turn.choices[result.index] : null;
        this.observer.record("stt", {
          turnId: turn.id, transcript: heard.text, provider: this.stt.name, attempt,
          selectedId: selected?.id || null, selectedLabel: selected?.label || null,
          outcome: result.confident && selected ? "selected" : selected ? "confirmation" : "retry",
          score: result.score, margin: result.margin, via: result.via,
          micToFinalMs: Math.round(finalAt - openedAt),
          firstInterimMs: firstInterimAt == null ? null : Math.round(firstInterimAt - openedAt),
          endpointMs: lastInterimAt == null ? null : Math.round(finalAt - lastInterimAt),
          matchMs: Math.round((now() - matchStartedAt) * 1000) / 1000,
        });
        if (result.confident && selected) {
          this.status("selected", { choice: selected, result });
          selected.activate?.();
          this.dispatchEvent(new CustomEvent("selection", { detail: { turn, choice: selected, result, transcript: heard.text } }));
          return selected;
        }
        if (attempt < this.maxRetries) {
          const retryText = selected ? "Please say the full choice or its option number." : "I didn't match that. Please say the choice or its option number.";
          await this.speak({ id: stableLineId(this.scope, "meta-retry", retryText), text: retryText, speaker: "meta", category: "retry" });
        }
      } catch (error) {
        if (error?.name === "AbortError") return null;
        this.observer.record("stt_error", { turnId: turn.id, provider: this.stt.name, message: error?.message || String(error) });
        this.status("error", { error });
        if (attempt >= this.maxRetries) throw error;
      }
    }
    this.status("unmatched", { turn });
    return null;
  }

  async stop(increment = true) {
    if (increment) this.generation++;
    this.abortController?.abort();
    this.abortController = null;
    this.tts.stop?.();
    await this.stt.stop?.();
  }

  destroy() { return this.stop(); }
}
