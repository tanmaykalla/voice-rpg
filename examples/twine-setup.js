const SDK = window.VoiceAccessibilitySDK;
const browserFallback = new SDK.BrowserTTSProvider();
const tts = new SDK.ManifestTTSProvider({
  manifest: window.VOICE_MANIFEST || {},
  baseUrl: new URL("./voice-audio/", location.href),
  fallback: browserFallback,
});
const stt = new SDK.VocalBridgeSTTProvider({ tokenUrl: "/api/voice-token" });
const observer = new SDK.Observer({ onEvent: (event) => console.debug("voice-sdk", event) });
const runtime = new SDK.AccessibilityRuntime({ tts, stt, observer, scope: document.title });

document.getElementById("enable-voice").addEventListener("click", () => {
  new SDK.TwineHarloweAdapter({ runtime, storyId: document.title }).start();
}, { once: true });

