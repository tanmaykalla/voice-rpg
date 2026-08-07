# Voice Accessibility SDK

Provider-neutral voice accessibility for authored games. It narrates game text, reads the currently valid choices, listens to the player, deterministically matches speech to one authored choice, and invokes the game's real control.

The repository contains:

- A browser runtime for HTML and game-engine web builds.
- A Twine 2/Harlowe DOM adapter.
- A JSON bridge for Unity WebGL, Godot Web, and custom engines.
- Vocal Bridge live STT by default.
- Offline audio-manifest playback at runtime.
- Chatterbox batch TTS by default, with Sarvam Bulbul v3 and ElevenLabs v3 generators.
- Provider interfaces so applications can add other TTS or STT services.
- A repository-owned Codex skill that inventories narration and valid actions and builds a reviewable integration.

## Reference demo

- **Voice-enabled implementation:** [`tanmaykalla/anxiety-voice-accessibility-demo`](https://github.com/tanmaykalla/anxiety-voice-accessibility-demo)
- **Original game:** [*Adventures With Anxiety* by Nicky Case](https://ncase.me/anxiety/)
- **Original source and full credits:** [`ncase/anxiety`](https://github.com/ncase/anxiety)

The demo applies this architecture non-invasively to the existing CC0 HTML game: DOM observation for narration and current choices, server-tokenized Vocal Bridge STT, deterministic matching, activation of the original game controls, optional audio-manifest TTS, and an observer HUD for accuracy and latency. It is a fan-made accessibility demonstration, not an official edition; its repository preserves the creator credits and explicitly disclaims ownership of the original game.

## AI-assisted game integration

Codex users can invoke [`$integrate-voice-accessibility`](.agents/skills/integrate-voice-accessibility/SKILL.md) from this repository to inspect a Twine, HTML, Unity, Godot, or custom game project. The skill generates or updates a stable voice manifest, adds the appropriate adapter, labels ambiguous controls for review, and verifies the integration.

The skill runs during development. It does not place an LLM agent in the shipped game: runtime speech remains constrained to the actions supplied by the current game state.

For controls without visible text, integrations can provide `data-voice-label` and comma-separated `data-voice-aliases`. Engine choices accept the equivalent `label` and `aliases` fields.

## Architecture

Authored narration is generated once, not during gameplay:

```text
Twine / game dialogue data
  -> extractor
  -> provider-neutral voice manifest
  -> Chatterbox | Sarvam | ElevenLabs
  -> reviewed audio files
  -> runtime manifest player

Player microphone
  -> Vocal Bridge STT
  -> deterministic choice matcher
  -> real game choice callback
```

API keys are used only by the developer-side generator or a server-side token endpoint. Never put provider secrets in a game build.

## Install and build

```bash
npm install
npm run check
```

Outputs:

- `dist/voice-accessibility-sdk.iife.js` for a script tag.
- `dist/voice-accessibility-sdk.esm.js` for bundlers.

## Twine pipeline

Extract voice lines from a Twine 2 HTML export:

```bash
node node/extract-twine.mjs game.html story.voice.json
```

Create a voice-enabled copy of the Twine build without modifying the source export:

```bash
npm run build
node node/integrate-twine.mjs game.html voice-enabled-game
```

Generate audio using the default Chatterbox provider:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install chatterbox-tts torch torchaudio
node node/generate-audio.mjs \
  --input story.voice.json \
  --out public/voice-audio \
  --provider chatterbox \
  --config examples/provider.chatterbox.json
```

The Chatterbox reference audio must be a recording you own or are licensed to use. It determines narrator identity and performance style.

Add the IIFE bundle and an enable button to the exported HTML, load `voice-manifest.json`, and construct the adapter as shown in `examples/twine-setup.js`. Voice activation must begin from a user click so the browser can request microphone and audio permission.

## TTS providers

### Chatterbox (default)

Chatterbox runs as a developer-side Python batch process and produces WAV files. It is never required on the player's device. Configuration supports `referenceAudio`, `exaggeration`, `temperature`, `cfgWeight`, `python`, and `device`.

### Sarvam Bulbul v3

```bash
export SARVAM_API_KEY="..."
node node/generate-audio.mjs --input story.voice.json --out public/voice-audio \
  --provider sarvam --config examples/provider.sarvam.json
```

### ElevenLabs v3

```bash
export ELEVENLABS_API_KEY="..."
export ELEVENLABS_VOICE_ID="..."
node node/generate-audio.mjs --input story.voice.json --out public/voice-audio \
  --provider elevenlabs --config examples/provider.elevenlabs.json
```

Generation is resumable: existing files are reused unless `--force` is supplied. Use `--limit 10` for an inexpensive audition.

To add another generator, implement either:

```js
class MyGenerator {
  name = "my-provider";
  async generate(line, outputDirectory) {
    return { id: line.id, file: `${line.id}.mp3`, provider: this.name };
  }
}
```

or `generateBatch(lines, outputDirectory)` and register it in `node/generate-audio.mjs`.

## Vocal Bridge STT

The browser receives only a short-lived session token. Expose `/api/voice-token` from your backend using `node/vocalbridge-token-handler.mjs`:

```js
import express from "express";
import { createVocalBridgeTokenHandler } from "voice-accessibility-sdk/server";

const app = express();
app.use(express.json());
app.post("/api/voice-token", createVocalBridgeTokenHandler());
```

Configure `VOCAL_BRIDGE_API_KEY` and `VOCAL_BRIDGE_AGENT_ID` only on that server.

An STT provider implements:

```js
class MySTT {
  name = "my-stt";
  async listenOnce({ onStatus, onInterim, signal }) {
    return { text: "option one", alternatives: ["option one"] };
  }
  async stop() {}
}
```

## Game-engine API

Engines can call the runtime directly:

```js
voice.present({
  id: "forest-01",
  text: "The path divides beneath the trees.",
  speaker: "narrator",
  emotion: "suspense",
  choices: [
    { id: "left", label: "Take the left path" },
    { id: "right", label: "Take the right path" }
  ]
});
```

Listen for the adapter's `command` event and pass `choiceId` back into the engine. For iframe/WebGL integrations, `WindowMessageGameEngineAdapter` uses this protocol:

```text
engine -> { type: "voice-sdk:present", turn: {...} }
SDK    -> { type: "voice-sdk:selection", turnId, choiceId, index }
```

See `examples/game-engine.js` and `examples/window-message-engine.js`.

## Manifest format

```json
{
  "version": 1,
  "provider": "chatterbox",
  "lines": {
    "forest-01": {
      "id": "forest-01",
      "text": "The path divides.",
      "speaker": "narrator",
      "emotion": "suspense",
      "file": "forest-01.wav"
    }
  }
}
```

The runtime falls back to browser speech if a generated line is absent. Applications can disable that fallback for fully reviewed narration.

## Safety and accessibility properties

- Speech can select only a choice currently supplied by the game.
- Provider keys remain off the client.
- Audio is deterministic, cacheable, QA-reviewable, and playable offline.
- Keyboard/touch controls remain owned by the original game.
- Observers record TTS start, STT endpoint, matcher time, retries, and selected authored IDs.

## License

MIT. Provider SDKs, models, voices, generated audio, and source games retain their own licenses.
