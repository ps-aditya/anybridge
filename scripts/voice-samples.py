import os
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

OUT = "video/voice-samples"
os.makedirs(OUT, exist_ok=True)

k = Kokoro(".venv/kokoro-v1.0.onnx", ".venv/voices-v1.0.bin")

line = (
    "Most teams run software that has no API. AnyBridge lets an AI assistant "
    "operate that software anyway, with evidence, approval, and replay."
)

samples = [
    ("a-im-nicola-en", "im_nicola", "en-us", "A. Italian male, English phonemes."),
    ("b-im-nicola-it", "im_nicola", "it", "B. Italian male, Italian phonemes."),
    ("c-em-alex-en", "em_alex", "en-us", "C. Spanish male, English phonemes."),
    ("d-em-santa-en", "em_santa", "en-us", "D. Spanish male, lower register."),
    ("e-pm-alex-en", "pm_alex", "en-us", "E. Portuguese male, English phonemes."),
    ("f-am-onyx-en", "am_onyx", "en-us", "F. American male, deep, for comparison."),
]

reel = []
sr_out = 24000
for name, voice, lang, label in samples:
    text = f"{label} {line}"
    samples_arr, sr = k.create(text, voice=voice, speed=1.0, lang=lang)
    sf.write(os.path.join(OUT, f"{name}.wav"), samples_arr, sr)
    if sr != sr_out:
        # resample with linear interpolation to keep a single reel rate
        n = int(len(samples_arr) * sr_out / sr)
        samples_arr = np.interp(np.linspace(0, len(samples_arr) - 1, n), np.arange(len(samples_arr)), samples_arr)
        sr = sr_out
    reel.append(samples_arr.astype(np.float32))
    reel.append(np.zeros(int(0.7 * sr), dtype=np.float32))
    print(f"{name}: voice={voice} lang={lang} dur={len(samples_arr)/sr:.2f}s", flush=True)

combined = np.concatenate(reel)
sf.write(os.path.join(OUT, "reel.wav"), combined, sr_out)
print(f"reel: {len(combined)/sr_out:.2f}s", flush=True)
