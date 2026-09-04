"""
download_parsing_model.py
--------------------------
Download BiSeNet ResNet18 ONNX face parsing model từ GitHub Releases.
Source: https://github.com/yakhyo/face-parsing (MIT License)

19 classes (index → label):
  0: background  1: skin       2: l_brow    3: r_brow
  4: l_eye       5: r_eye      6: eye_g     7: l_ear
  8: r_ear       9: ear_r     10: nose     11: mouth
 12: u_lip      13: l_lip     14: neck     15: neck_l
 16: cloth (áo) 17: hair      18: hat

Dùng cho Personal Color AI:
  skin  (1)  → da mặt
  neck  (14) → da cổ / body
  hair  (17) → tóc
  hat   (18) → mũ (loại bỏ khỏi tóc)
  cloth (16) → áo (loại bỏ)
  l_eye + r_eye (4,5) → màu mắt (dùng iris landmarks FaceMesh tinh chỉnh)
"""

import hashlib
import sys
import urllib.request
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────
MODEL_URL  = "https://github.com/yakhyo/face-parsing/releases/download/v0.0.2/resnet18.onnx"
OUT_PATH   = Path(__file__).parent.parent / "web" / "public" / "face_parsing.onnx"
MODEL_SIZE_MB_APPROX = 43  # ~43 MB

def download_with_progress(url: str, dest: Path):
    dest.parent.mkdir(parents=True, exist_ok=True)
    print(f"Downloading: {url}")
    print(f"Destination: {dest}")
    print(f"Expected size: ~{MODEL_SIZE_MB_APPROX} MB\n")

    downloaded = [0]
    def reporthook(count, block_size, total_size):
        downloaded[0] += block_size
        mb = downloaded[0] / 1024 / 1024
        if total_size > 0:
            pct = min(100, downloaded[0] * 100 // total_size)
            bar = "#" * (pct // 2) + "-" * (50 - pct // 2)
            print(f"\r[{bar}] {pct:3d}%  {mb:.1f} MB", end="", flush=True)
        else:
            print(f"\r  Downloaded: {mb:.1f} MB", end="", flush=True)

    try:
        urllib.request.urlretrieve(url, dest, reporthook)
        print()  # newline after progress
    except Exception as e:
        if dest.exists():
            dest.unlink()
        raise RuntimeError(f"Download failed: {e}") from e

def verify_onnx(path: Path):
    """Quick ONNX sanity check."""
    try:
        import onnxruntime as ort
        sess = ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])
        inp  = sess.get_inputs()[0]
        out  = sess.get_outputs()[0]
        print(f"  Input  : {inp.name}  shape={inp.shape}  type={inp.type}")
        print(f"  Output : {out.name}  shape={out.shape}  type={out.type}")
        print("  Model verified with ONNX Runtime.")
    except ImportError:
        print("  onnxruntime not installed — skipping verification.")
    except Exception as e:
        print(f"  WARNING: ONNX verification failed: {e}")

def main():
    if OUT_PATH.exists():
        size_mb = OUT_PATH.stat().st_size / 1024 / 1024
        print(f"[OK] face_parsing.onnx already exists ({size_mb:.1f} MB)")
        print(f"     Path: {OUT_PATH}")
        verify_onnx(OUT_PATH)
        return

    print("=" * 60)
    print("  Face Parsing Model Download")
    print("  BiSeNet ResNet18 — CelebAMask-HQ — 19 classes")
    print("=" * 60 + "\n")

    download_with_progress(MODEL_URL, OUT_PATH)

    size_mb = OUT_PATH.stat().st_size / 1024 / 1024
    print(f"\n[OK] Saved: {OUT_PATH}  ({size_mb:.1f} MB)")

    print("\nVerifying ONNX model…")
    verify_onnx(OUT_PATH)

    print(f"\n{'='*60}")
    print(f"  Done! Model ready at: web/public/face_parsing.onnx")
    print(f"  Next: npm run dev  (model loads automatically in browser)")
    print(f"{'='*60}\n")

if __name__ == "__main__":
    main()
