import { writeFile } from "node:fs/promises";
import { join } from "node:path";

export class ElevenLabsGenerator {
  constructor(config = {}) {
    this.name = "elevenlabs";
    this.key = config.apiKey || process.env.ELEVENLABS_API_KEY;
    this.config = config;
    if (!this.key) throw new Error("ELEVENLABS_API_KEY is required for the ElevenLabs generator");
    if (!config.voiceId && !process.env.ELEVENLABS_VOICE_ID) throw new Error("ElevenLabs requires voiceId or ELEVENLABS_VOICE_ID");
  }

  async generate(line, outputDir) {
    const voiceId = line.voice || this.config.voiceId || process.env.ELEVENLABS_VOICE_ID;
    const model = this.config.model || "eleven_v3";
    const emotionTags = { suspense: "whispers", urgent: "shouts", happy: "happily", warm: "happily", sad: "sad", angry: "angry" };
    const direction = line.direction || emotionTags[line.emotion];
    const text = direction ? `[${direction}] ${line.text}` : line.text;
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": this.key, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: model, voice_settings: { stability: this.config.stability ?? 0.42, similarity_boost: this.config.similarityBoost ?? 0.75, style: this.config.style ?? 0.35, use_speaker_boost: true } }),
    });
    if (!response.ok) throw new Error(`ElevenLabs TTS failed (${response.status}): ${await response.text()}`);
    const file = `${line.id}.mp3`;
    await writeFile(join(outputDir, file), Buffer.from(await response.arrayBuffer()));
    return { id: line.id, file, provider: this.name, model, voice: voiceId };
  }
}
