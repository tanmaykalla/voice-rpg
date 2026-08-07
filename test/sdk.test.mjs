import assert from "node:assert/strict";
import test from "node:test";
import { AccessibilityRuntime, Observer, matchChoices, stableLineId } from "../src/index.mjs";

test("stable IDs are deterministic and content-sensitive", () => {
  assert.equal(stableLineId("Story", "start", "Hello"), stableLineId("Story", "start", "Hello"));
  assert.notEqual(stableLineId("Story", "start", "Hello"), stableLineId("Story", "start", "Goodbye"));
});

test("matcher handles words and option letters", () => {
  const choices = [{ label: "Stop the boat" }, { label: "Turn the boat" }];
  assert.equal(matchChoices("stop the boot", choices).index, 0);
  assert.equal(matchChoices("option B", choices).index, 1);
});

test("runtime narrates, listens, and activates only an authored choice", async () => {
  const spoken = [], observer = new Observer(); let selected = false;
  const tts = { name: "test-tts", speak: async (line) => { spoken.push(line.text); return { played: true }; }, stop() {} };
  const stt = { name: "test-stt", listenOnce: async () => ({ text: "go north", alternatives: ["go north"] }), stop() {} };
  const runtime = new AccessibilityRuntime({ tts, stt, observer, scope: "test" });
  const choice = await runtime.present({ id: "line-1", text: "A road divides.", choices: [{ id: "north", label: "Go north", activate: () => { selected = true; } }, { id: "south", label: "Go south" }] });
  assert.equal(choice.id, "north");
  assert.equal(selected, true);
  assert.deepEqual(spoken.slice(0, 2), ["A road divides.", "Your choices are."]);
  assert.equal(observer.events.find((event) => event.type === "stt").outcome, "selected");
});

