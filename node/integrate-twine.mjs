#!/usr/bin/env node
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const input = process.argv[2], outputDir = process.argv[3];
if (!input || !outputDir) { console.error("Usage: voice-sdk-integrate-twine game.html output-directory"); process.exit(1); }
await mkdir(resolve(outputDir), { recursive: true });
let html = await readFile(resolve(input), "utf8");
const injection = `
<button id="voice-sdk-enable" style="position:fixed;right:12px;bottom:12px;z-index:2147483647;padding:10px 14px">Enable voice</button>
<div id="voice-sdk-status" aria-live="polite" style="position:fixed;left:12px;bottom:12px;z-index:2147483647;background:#111;color:#fff;padding:8px;max-width:55vw;font:13px system-ui">Voice accessibility ready</div>
<script src="voice-accessibility-sdk.iife.js"></script>
<script src="voice-sdk-bootstrap.js"></script>
`;
html = html.includes("</body>") ? html.replace("</body>", `${injection}</body>`) : html + injection;
await writeFile(join(resolve(outputDir), "index.html"), html);
await copyFile(resolve(HERE, "../dist/voice-accessibility-sdk.iife.js"), join(resolve(outputDir), "voice-accessibility-sdk.iife.js"));
await writeFile(join(resolve(outputDir), "voice-sdk-bootstrap.js"), `
(async function () {
  const SDK = window.VoiceAccessibilitySDK;
  const status = document.getElementById("voice-sdk-status");
  const setStatus = (message) => { status.textContent = message; };
  const manifest = await fetch("voice-audio/voice-manifest.json").then((r) => r.ok ? r.json() : {}).catch(() => ({}));
  const observer = new SDK.Observer({ onEvent: (event) => console.debug("voice-sdk", event) });
  const runtime = new SDK.AccessibilityRuntime({
    tts: new SDK.ManifestTTSProvider({ manifest, baseUrl: new URL("voice-audio/", location.href), fallback: new SDK.BrowserTTSProvider() }),
    stt: new SDK.VocalBridgeSTTProvider({ tokenUrl: "/api/voice-token" }),
    observer,
    scope: document.title,
  });
  runtime.addEventListener("status", (event) => setStatus(event.detail.message));
  runtime.addEventListener("interim", (event) => setStatus('Heard: "' + event.detail.text + '"'));
  document.getElementById("voice-sdk-enable").addEventListener("click", (event) => {
    event.currentTarget.textContent = "Voice active";
    event.currentTarget.disabled = true;
    new SDK.TwineHarloweAdapter({ runtime, storyId: document.title }).start();
  }, { once: true });
  window.voiceAccessibility = { runtime, observer, export: () => observer.export({ story: document.title }) };
})();
`);
console.log(`Integrated ${basename(input)} into ${resolve(outputDir)}`);

