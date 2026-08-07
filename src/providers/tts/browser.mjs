import { cleanText } from "../../utils.mjs";

export class BrowserTTSProvider {
  constructor({ voice, lang = "en-US", rate = 1, pitch = 1 } = {}) {
    this.name = "browser";
    this.voiceName = voice;
    this.lang = lang;
    this.rate = rate;
    this.pitch = pitch;
    this.synth = globalThis.speechSynthesis;
  }

  resolveVoice() {
    const voices = this.synth?.getVoices() || [];
    return voices.find((item) => item.name === this.voiceName)
      || voices.find((item) => /^en/i.test(item.lang) && /flo|shelley|sandy|samantha|ava|karen/i.test(item.name))
      || voices.find((item) => /^en/i.test(item.lang)) || voices[0];
  }

  speak(utterance) {
    const text = cleanText(utterance.text);
    if (!text || !this.synth || typeof SpeechSynthesisUtterance === "undefined") return Promise.resolve({ played: false, provider: this.name });
    return new Promise((resolve) => {
      const startedAt = performance.now();
      const speech = new SpeechSynthesisUtterance(text);
      const voice = this.resolveVoice();
      if (voice) speech.voice = voice;
      speech.lang = voice?.lang || this.lang;
      speech.rate = utterance.rate || this.rate;
      speech.pitch = utterance.pitch || this.pitch;
      let audioAt = null, done = false;
      const finish = (played, error) => {
        if (done) return;
        done = true;
        resolve({ played, provider: this.name, voice: voice?.name, startLatencyMs: audioAt == null ? null : Math.round(audioAt - startedAt), durationMs: audioAt == null ? null : Math.round(performance.now() - audioAt), error });
      };
      speech.onstart = () => { audioAt = performance.now(); };
      speech.onend = () => finish(true);
      speech.onerror = (event) => finish(false, event.error || "speech-error");
      this.synth.speak(speech);
    });
  }

  stop() { this.synth?.cancel(); }
}

