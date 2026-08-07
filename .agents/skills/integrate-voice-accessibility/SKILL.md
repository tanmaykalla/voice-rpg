---
name: integrate-voice-accessibility
description: Inspect a Twine, HTML, Unity, Godot, or other game project and connect authored narration and currently valid player actions to the Voice Accessibility SDK. Use when Codex needs to inventory text and controls, generate a reviewable voice manifest, add TTS/STT integration code, label icon-only controls, instrument latency and accuracy, or audit an existing game voice integration.
---

# Integrate Voice Accessibility

Build a development-time integration. Do not add an LLM agent to the shipped gameplay loop.

## Workflow

1. Read the repository instructions and identify the game framework, build target, dialogue/state system, and existing accessibility code.
2. Read the relevant adapter guidance:
   - Twine or browser DOM: `references/twine-and-web.md`
   - Unity, Godot, or custom engine: `references/game-engines.md`
3. Inventory authored narration and actions before editing. Distinguish content from debug strings, counters, decorative text, hidden controls, and spoilers.
4. Create or update a voice manifest using `references/manifest.md`. Preserve existing stable IDs. Mark uncertain entries `reviewStatus: "needs-review"` instead of guessing.
5. Connect narration to TTS and expose only currently valid actions to STT. Keep the game authoritative for state and action execution.
6. Add human-readable labels and aliases for icon-only or ambiguous controls. Never derive a spoken label solely from an opaque internal name when player-facing context is unavailable.
7. Keep provider secrets server-side. Use short-lived browser tokens and generated audio manifests where supported.
8. Retain keyboard, touch, controller, and screen-reader behavior. Voice must be additive.
9. Add observer events for TTS latency, STT latency, transcript, match outcome, retry, selected ID, and error without recording raw audio by default.
10. Test extraction, option letters/numbers, labels, rejection phrases, state changes, interruption, retry, and provider failure. Run the repository's existing checks.
11. Report files changed, automatically connected items, review-required items, excluded items, tests, and remaining provider setup.

## Runtime constraints

- Match speech only against actions supplied for the current game state.
- Prefer deterministic matching for approved labels, ordinals, and aliases.
- Never invent an action or directly mutate game state from a transcript.
- Treat an LLM matcher as an optional, constrained fallback that returns an approved action ID or no match.
- Cancel narration and listening when the game advances to a different state.
- Avoid narrating the same visible content twice.
- Require a user gesture before requesting microphone access in browsers.

## Review boundary

Proceed automatically for clearly authored text and standard enabled controls. Require developer review, or emit a `needs-review` entry, for purchases, destructive actions, timed gameplay, hidden/debug controls, unlabeled icons, duplicate labels, unclear speaker/emotion, or actions whose availability cannot be proven from the current state.
