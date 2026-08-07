import {
  AccessibilityRuntime, BrowserTTSProvider, ManifestTTSProvider,
  VocalBridgeSTTProvider, WindowMessageGameEngineAdapter,
} from "../dist/voice-accessibility-sdk.esm.js";

const manifest = await fetch("./voice-audio/voice-manifest.json").then((response) => response.json());
const runtime = new AccessibilityRuntime({
  tts: new ManifestTTSProvider({ manifest, baseUrl: "./voice-audio/", fallback: new BrowserTTSProvider() }),
  stt: new VocalBridgeSTTProvider({ tokenUrl: "/api/voice-token" }),
  scope: "engine-game",
});
new WindowMessageGameEngineAdapter({ runtime }).start();

// Engine -> browser:
// postMessage({ type: "voice-sdk:present", turn: {
//   id: "forest-01", text: "The path divides.", speaker: "narrator",
//   emotion: "suspense", choices: [{ id: "left", label: "Go left" }]
// }}, "*");
// Browser -> engine:
// { type: "voice-sdk:selection", turnId: "forest-01", choiceId: "left", index: 0 }

