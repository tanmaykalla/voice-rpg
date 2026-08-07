import { writeFile } from "node:fs/promises";
import { join } from "node:path";

export class SarvamGenerator {
  constructor(config = {}) {
    this.name = "sarvam";
    this.key = config.apiKey || process.env.SARVAM_API_KEY;
    this.config = config;
    if (!this.key) throw new Error("SARVAM_API_KEY is required for the Sarvam generator");
  }

  async generate(line, outputDir) {
    const codec = this.config.codec || "wav";
    const response = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: { "api-subscription-key": this.key, "Content-Type": "application/json" },
      body: JSON.stringify({
        text: line.text,
        target_language_code: line.language || this.config.language || "en-IN",
        speaker: line.voice || this.config.speaker || "simran",
        model: this.config.model || "bulbul:v3",
        pace: line.pace || this.config.pace || 0.92,
        temperature: line.temperature || this.config.temperature || 0.8,
        speech_sample_rate: this.config.sampleRate || 48000,
        output_audio_codec: codec,
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.audios?.[0]) throw new Error(`Sarvam TTS failed (${response.status}): ${body.error?.message || body.message || "invalid response"}`);
    const file = `${line.id}.${codec}`;
    await writeFile(join(outputDir, file), Buffer.from(body.audios[0], "base64"));
    return { id: line.id, file, provider: this.name, model: this.config.model || "bulbul:v3", voice: line.voice || this.config.speaker || "simran" };
  }
}

