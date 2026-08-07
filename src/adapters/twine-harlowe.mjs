import { cleanText, stableLineId } from "../utils.mjs";

function visible(element) {
  if (!element?.isConnected) return false;
  const style = getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
}

export class TwineHarloweAdapter {
  constructor({ runtime, storyId = document.title || "twine", passageSelector = "tw-passage", choiceSelector = "tw-link", settleMs = 150 } = {}) {
    if (!runtime) throw new Error("TwineHarloweAdapter requires a runtime");
    this.runtime = runtime;
    this.storyId = storyId;
    this.passageSelector = passageSelector;
    this.choiceSelector = choiceSelector;
    this.settleMs = settleMs;
    this.timer = null;
    this.lastKey = "";
    this.observer = null;
  }

  activePassage() {
    const passages = Array.from(document.querySelectorAll(this.passageSelector)).filter(visible);
    return passages.at(-1) || null;
  }

  passageName(passage) {
    return passage?.getAttribute("data-passage") || passage?.id || cleanText(passage?.querySelector('span[style*="font-size"]')?.textContent) || `passage-${Array.from(document.querySelectorAll(this.passageSelector)).indexOf(passage) + 1}`;
  }

  extract() {
    const passage = this.activePassage();
    if (!passage) return null;
    const elements = Array.from(passage.querySelectorAll(this.choiceSelector)).filter((item) => visible(item) && !item.closest("tw-sidebar") && cleanText(item.textContent));
    const clone = passage.cloneNode(true);
    clone.querySelectorAll(`${this.choiceSelector}, tw-sidebar, script, style, tw-error, tw-notifier`).forEach((node) => node.remove());
    clone.querySelectorAll('span[style*="font-size: 40%"], span[style*="font-size:40%"]')?.forEach((node) => node.remove());
    const text = cleanText(clone.textContent).replace(/^_+|_+$/g, "").trim();
    const name = this.passageName(passage);
    // Content-derived narration IDs work even when a Twine format does not
    // expose its authored passage name in the rendered DOM.
    const id = stableLineId(this.storyId, "narration", text);
    const choices = elements.map((element, index) => ({
      id: element.getAttribute("data-passage") || `${name}:${index + 1}`,
      label: cleanText(element.textContent),
      activate: () => element.click(),
    }));
    return { id, key: name, text, speaker: "narrator", choices, metadata: { passage: name } };
  }

  schedule() {
    clearTimeout(this.timer);
    this.timer = setTimeout(async () => {
      const turn = this.extract();
      if (!turn) return;
      const key = `${turn.id}|${turn.choices.map((choice) => choice.label).join("|")}`;
      if (key === this.lastKey) return;
      this.lastKey = key;
      await this.runtime.present(turn).catch((error) => this.runtime.status("error", { error }));
    }, this.settleMs);
  }

  start() {
    const story = document.querySelector("tw-story") || document.body;
    this.observer = new MutationObserver(() => this.schedule());
    this.observer.observe(story, { childList: true, subtree: true, characterData: true });
    this.schedule();
    return this;
  }

  stop() { this.observer?.disconnect(); clearTimeout(this.timer); this.runtime.stop(); }
}
