#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { cleanText, stableLineId } from "../src/utils.mjs";

const input = process.argv[2], output = process.argv[3] || "story.voice.json";
if (!input) { console.error("Usage: voice-sdk-extract-twine game.html [story.voice.json]"); process.exit(1); }
const html = await readFile(resolve(input), "utf8");
const storyName = html.match(/<tw-storydata[^>]*\bname="([^"]+)"/)?.[1] || "twine-story";
const decode = (value) => value
  .replace(/&quot;/g, '"').replace(/&#(?:x27|39);/gi, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
  .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
  .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)));
const passages = [...html.matchAll(/<tw-passagedata\b([^>]*)>([\s\S]*?)<\/tw-passagedata>/g)];
const lines = [];

for (const passage of passages) {
  const name = passage[1].match(/\bname="([^"]+)"/)?.[1] || `passage-${lines.length + 1}`;
  const source = decode(passage[2]);
  const choices = [...source.matchAll(/\[\[([^\]]+?)\]\]/g)].map((match) => {
    const value = match[1];
    if (value.includes("|")) return value.split("|")[0];
    if (value.includes("->")) return value.split("->")[0];
    if (value.includes("<-")) return value.split("<-").at(-1);
    return value;
  }).map(cleanText).filter(Boolean);
  const narrative = cleanText(source
    .replace(/\[\[[^\]]+\]\]/g, " ")
    .replace(/\((?:set|put|move|display|show|hide|if|else-if|else|unless|for|either|print|link|goto|live|stop|click|replace|append|prepend):[\s\S]*?\)/gi, " ")
    .replace(/\{[^}]*\}/g, " ").replace(/<[^>]+>/g, " ").replace(/[_*]/g, " "));
  if (!narrative && !choices.length) continue;
  const narrationId = stableLineId(storyName, "narration", narrative);
  if (narrative) lines.push({ id: narrationId, passage: name, category: "narrative", speaker: "narrator", text: narrative, emotion: "auto" });
  choices.forEach((label, index) => {
    const spoken = `Option ${index + 1}. ${label}`;
    lines.push({ id: stableLineId(storyName, `${narrationId}-choice-${index + 1}`, spoken), passage: name, category: "choice", speaker: "meta", text: spoken, emotion: "neutral" });
  });
}

for (const [key, text] of [["meta-choices", "Your choices are."], ["meta-select", "Which do you choose?"], ["meta-retry", "I didn't match that. Please say the choice or its option number."], ["meta-retry", "Please say the full choice or its option number."]]) {
  lines.push({ id: stableLineId(storyName, key, text), category: "prompt", speaker: "meta", text, emotion: "neutral" });
}
const uniqueLines = [...new Map(lines.map((line) => [line.id, line])).values()];
await writeFile(resolve(output), JSON.stringify({ version: 1, story: storyName, defaultProvider: "chatterbox", lines: uniqueLines }, null, 2));
console.log(`Extracted ${uniqueLines.length} unique voice lines from ${passages.length} passages into ${resolve(output)}`);
