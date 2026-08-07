# Voice integration manifest

Use stable authored IDs. Keep display text, spoken wording, recognized aliases, and engine bindings separate.

```json
{
  "version": 1,
  "game": "example-game",
  "sourceLocale": "en-US",
  "turns": [
    {
      "id": "combat.intro",
      "text": "The creature prepares to strike.",
      "speaker": "narrator",
      "emotion": "tense",
      "source": "CombatManager.descriptionText",
      "reviewStatus": "approved",
      "actions": [
        {
          "id": "combat.fire",
          "label": "Fire attack",
          "spokenLabel": "Use fire attack",
          "aliases": ["fire", "flame attack"],
          "binding": "SpecialAttackPanel/FireButton",
          "risk": "standard",
          "reviewStatus": "approved"
        }
      ]
    }
  ]
}
```

## Requirements

- Derive IDs from authored passage, node, action, or localization keys when available.
- Do not use translated text as the permanent identity.
- Use `approved`, `needs-review`, or `excluded` for `reviewStatus`.
- Record why an item is excluded or needs review.
- Keep aliases short, natural, locale-specific, and distinct among simultaneous actions.
- Store source locations in a form a developer can find again.
- Never store API keys, access tokens, or generated voice-cloning samples in the manifest.

For localization, attach locale catalogs by stable ID rather than duplicating engine bindings.
