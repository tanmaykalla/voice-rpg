export function createVocalBridgeTokenHandler({
  apiKey = process.env.VOCAL_BRIDGE_API_KEY,
  agentId = process.env.VOCAL_BRIDGE_AGENT_ID,
  endpoint = "https://vocalbridgeai.com/api/v1/token",
} = {}) {
  if (!apiKey || !agentId) throw new Error("VOCAL_BRIDGE_API_KEY and VOCAL_BRIDGE_AGENT_ID are required");
  return async function vocalBridgeTokenHandler(request, response) {
    let participantName = "Voice Accessibility Player";
    if (request.body?.participant_name) participantName = String(request.body.participant_name).slice(0, 80);
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: { "X-API-Key": apiKey, "X-Agent-Id": agentId, "Content-Type": "application/json" },
      body: JSON.stringify({ participant_name: participantName }),
    });
    const payload = await upstream.json().catch(() => ({ error: "invalid_upstream_response" }));
    if (!payload.url && payload.livekit_url) payload.url = payload.livekit_url;
    if (typeof response.status === "function") return response.status(upstream.status).json(payload);
    response.writeHead(upstream.status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    response.end(JSON.stringify(payload));
  };
}

