import {
  AccessibilityRuntime, BrowserTTSProvider, ManifestTTSProvider,
  VocalBridgeSTTProvider, GameEngineAdapter,
} from "../dist/voice-accessibility-sdk.esm.js";

const runtime = new AccessibilityRuntime({
  tts: new ManifestTTSProvider({ manifest: await fetch("./voice-audio/voice-manifest.json").then((response) => response.json()), baseUrl: "./voice-audio/", fallback: new BrowserTTSProvider() }),
  stt: new VocalBridgeSTTProvider({ tokenUrl: "/api/voice-token" }),
  scope: "my-game",
});
const voice = new GameEngineAdapter({ runtime, scope: "my-game" });
voice.addEventListener("command", ({ detail }) => game.selectChoice(detail.choiceId));

export function presentGameNode(node) {
  return voice.present({ id: node.id, text: node.text, speaker: node.speaker, emotion: node.emotion, choices: node.choices });
}

