# Twine and browser games

## Twine

1. Identify the story format and version. Use `TwineHarloweAdapter` only for compatible Harlowe markup; create a format-specific adapter otherwise.
2. Run the SDK extractor against the exported HTML and inspect its output.
3. Compare static extraction with the rendered DOM. Macros and conditional links may exist only at runtime.
4. Observe the active passage and visible, enabled choices. Bind selection to the original link or control.
5. Add `data-voice-label` and optional `data-voice-aliases` to icon-only or unclear controls, or map them explicitly in adapter configuration.
6. Exclude sidebar history/navigation unless the author asks to expose it.
7. Package a copy of the export; do not overwrite the author's source HTML.

## General HTML

Inspect semantic buttons, links, form controls, accessible names, `aria-label`, and application-specific state. Do not expose every clickable element automatically. Require that a control is visible, enabled, player-facing, and valid for the current state.

Prefer accessible names in this order:

1. Explicit voice label
2. Existing accessible name or `aria-label`
3. Visible player-facing text
4. Reviewed manifest label

Use a `MutationObserver` only around the game container. Debounce updates, calculate a state key, and cancel the previous voice turn when the state changes.
