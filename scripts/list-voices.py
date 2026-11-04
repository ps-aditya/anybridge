import sys
from kokoro_onnx import Kokoro

k = Kokoro(".venv/kokoro-v1.0.onnx", ".venv/voices-v1.0.bin")
voices = k.get_voices()
print("\n".join(sorted(voices)))
print(f"\ncount={len(voices)}", file=sys.stderr)
