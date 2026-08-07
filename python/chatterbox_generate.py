#!/usr/bin/env python3
"""Batch Chatterbox renderer. Reads one JSON document from stdin."""
import json
import os
import sys

import torch
import torchaudio
from chatterbox.tts import ChatterboxTTS

payload = json.load(sys.stdin)
config = payload.get("config", {})
output_dir = payload["outputDir"]
os.makedirs(output_dir, exist_ok=True)

device = config.get("device") or ("cuda" if torch.cuda.is_available() else "cpu")
model = ChatterboxTTS.from_pretrained(device=device)
reference = config.get("referenceAudio")

for index, line in enumerate(payload["lines"], start=1):
    emotion_exaggeration = {
        "neutral": 0.5, "auto": 0.7, "reflective": 0.65, "warm": 0.75,
        "suspense": 0.85, "fearful": 0.9, "urgent": 1.0, "angry": 1.05,
    }.get(line.get("emotion"))
    kwargs = {
        "exaggeration": line.get("exaggeration", emotion_exaggeration or config.get("exaggeration", 0.75)),
        "temperature": line.get("temperature", config.get("temperature", 0.8)),
        "cfg_weight": line.get("cfgWeight", config.get("cfgWeight", 0.45)),
    }
    if reference:
        kwargs["audio_prompt_path"] = reference
    wav = model.generate(line["text"], **kwargs)
    target = os.path.join(output_dir, f'{line["id"]}.wav')
    torchaudio.save(target, wav, model.sr)
    print(f'[{index}/{len(payload["lines"])}] {line["id"]}', flush=True)
