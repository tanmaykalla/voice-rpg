# Game engines

Use the engine's state and UI APIs; do not scrape a rendered frame as the primary integration.

## Shared contract

At each accessible decision point, send:

```js
voice.present({
  id: "stable-turn-id",
  text: "Player-facing narration",
  speaker: "narrator",
  emotion: "tense",
  choices: [
    { id: "stable-action-id", label: "Raise shield", aliases: ["shield", "defend"] }
  ]
});
```

Map the selected stable action ID back to an existing engine command, signal, event, or public method. Re-check that the action remains enabled before executing it.

## Unity

Inventory scenes, prefabs, UI Toolkit/UXML, Canvas controls, localization tables, dialogue assets, input actions, and public gameplay events. Prefer a small MonoBehaviour bridge or WebGL message bridge. Do not invoke arbitrary methods by transcript text.

## Godot

Inventory scenes, Control nodes, signals, dialogue resources, translation keys, and input actions. Prefer an autoload or scene-local bridge that receives current turns and emits stable action IDs.

## Custom engines

Use `GameEngineAdapter` directly for JavaScript builds. Use `WindowMessageGameEngineAdapter` for an iframe or WebGL boundary. For native builds, reproduce the same typed turn/selection contract over the engine's supported bridge.

## Discovery warnings

Flag rather than auto-connect:

- Controls activated only during animation or timing windows
- Purchases, account changes, deletion, or irreversible choices
- Duplicate visible labels with different effects
- Debug menus and hidden development actions
- Input actions without a player-facing label
- Text assembled dynamically without speaker or lifecycle information
