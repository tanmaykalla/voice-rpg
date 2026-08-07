#!/usr/bin/env node
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { resolve, join } from "node:path";
import { ChatterboxGenerator } from "./providers/chatterbox.mjs";
import { SarvamGenerator } from "./providers/sarvam.mjs";
import { ElevenLabsGenerator } from "./providers/elevenlabs.mjs";

function args(values) {
  const output = {};
  for (let index = 2; index < values.length; index++) {
    const key = values[index].replace(/^--/, "");
    const next = values[index + 1];
    output[key] = next && !next.startsWith("--") ? values[++index] : true;
  }
  return output;
}

const options = args(process.argv);
if (!options.input || !options.out) {
  console.error("Usage: voice-sdk-generate --input story.voice.json --out public/voice-audio [--provider chatterbox|sarvam|elevenlabs] [--config provider.json] [--limit N] [--force]");
  process.exit(1);
}

const inputPath = resolve(options.input), outputDir = resolve(options.out);
const input = JSON.parse(await readFile(inputPath, "utf8"));
const config = options.config ? JSON.parse(await readFile(resolve(options.config), "utf8")) : {};
const providerName = options.provider || input.defaultProvider || "chatterbox";
const providers = { chatterbox: ChatterboxGenerator, sarvam: SarvamGenerator, elevenlabs: ElevenLabsGenerator };
if (!providers[providerName]) throw new Error(`Unknown provider: ${providerName}`);
const generator = new providers[providerName](config);
await mkdir(outputDir, { recursive: true });
let lines = Array.isArray(input.lines) ? input.lines : Object.values(input.lines || {});
if (options.limit) lines = lines.slice(0, Number(options.limit));
for (const line of lines) {
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(line.id)) throw new Error(`Unsafe line id: ${line.id}`);
}

let generated;
if (generator.generateBatch) {
  generated = await generator.generateBatch(lines, outputDir);
} else {
  generated = [];
  for (const [index, line] of lines.entries()) {
    const expected = join(outputDir, `${line.id}.${providerName === "elevenlabs" ? "mp3" : config.codec || "wav"}`);
    if (!options.force) {
      try { await access(expected); generated.push({ id: line.id, file: expected.split("/").at(-1), provider: providerName, reused: true }); console.log(`[${index + 1}/${lines.length}] reuse ${line.id}`); continue; } catch {}
    }
    console.log(`[${index + 1}/${lines.length}] generate ${line.id}`);
    generated.push(await generator.generate(line, outputDir));
  }
}

const byId = Object.fromEntries(lines.map((line) => {
  const result = generated.find((item) => item.id === line.id);
  return [line.id, { ...line, ...result }];
}));
const manifest = { version: 1, generatedAt: new Date().toISOString(), provider: providerName, lines: byId };
await writeFile(join(outputDir, "voice-manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`Generated ${generated.length} lines with ${providerName}`);

