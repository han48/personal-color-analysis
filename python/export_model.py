"""
export_model.py
---------------
Export scikit-learn pipeline → ONNX format.
Output:
  ../model/model.onnx
  ../model/model_metadata.json  – class names, feature order, palettes

Requirements:
  pip install skl2onnx onnx onnxruntime
"""

import json
import pickle
from pathlib import Path

import numpy as np

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT      = Path(__file__).parent.parent
MODEL_DIR = ROOT / "model"

# ── Load artefacts ─────────────────────────────────────────────────────────────
print("📂 Loading artefacts…")
with open(MODEL_DIR / "model.pkl", "rb") as f:
    pipeline = pickle.load(f)

with open(MODEL_DIR / "label_encoder.pkl", "rb") as f:
    le = pickle.load(f)

with open(MODEL_DIR / "feature_names.json") as f:
    feature_names = json.load(f)

n_features = len(feature_names)
print(f"   Features : {n_features}")
print(f"   Classes  : {list(le.classes_)}")

# ── Export to ONNX ─────────────────────────────────────────────────────────────
try:
    from skl2onnx import convert_sklearn
    from skl2onnx.common.data_types import FloatTensorType
except ImportError:
    print("❌ skl2onnx not found. Run: pip install skl2onnx onnx onnxruntime")
    raise

print("\n🔄 Converting to ONNX…")
initial_type = [("float_input", FloatTensorType([None, n_features]))]
onnx_model = convert_sklearn(
    pipeline,
    initial_types=initial_type,
    target_opset=12,
    options={id(pipeline.named_steps["classifier"]): {"zipmap": False}},
)

onnx_path = MODEL_DIR / "model.onnx"
with open(onnx_path, "wb") as f:
    f.write(onnx_model.SerializeToString())
print(f"✅ Saved: {onnx_path}  ({onnx_path.stat().st_size/1024:.1f} KB)")

# ── Smoke-test ONNX ────────────────────────────────────────────────────────────
print("\n🧪 Smoke-testing ONNX model…")
import onnxruntime as rt

sess = rt.InferenceSession(str(onnx_path))
dummy = np.random.randn(1, n_features).astype(np.float32)
input_name = sess.get_inputs()[0].name
label_name = sess.get_outputs()[0].name
prob_name  = sess.get_outputs()[1].name

labels, probs = sess.run([label_name, prob_name], {input_name: dummy})
predicted_idx = int(labels[0])
predicted_class = le.classes_[predicted_idx]
confidence = float(probs[0][predicted_idx])
print(f"   Predicted : {predicted_class}  (confidence {confidence:.3f})")
print("   ONNX model working ✓")

# ── Save model_metadata.json ───────────────────────────────────────────────────
# Inline colour data so the web app doesn't need a separate fetch
PALETTES = {
    "Spring_Light":  {
        "palette": ["#FFF0D6","#FFD59E","#FFAB76","#FF8C69","#F4A460","#DEB887","#FFE4B5","#FFDAB9"],
        "color_groups": {"warm_neutrals": ["#FFF0D6","#FFE4B5"], "peach_coral": ["#FFAB76","#FF8C69"], "golden": ["#FFD59E","#F4A460"]},
        "recommended_hair_colors": ["#C9A96E","#D4A96A","#B8860B","#DAA520","#CD853F"],
        "recommended_makeup": {
            "lipstick":   ["#FF9A7A","#FFB347","#FF7F50","#FA8072"],
            "blush":      ["#FFB6A3","#FFDAB9","#FFA07A"],
            "eyeshadow":  ["#D2B48C","#DEB887","#F4A460","#FFDEAD"]
        }
    },
    "Spring_Warm": {
        "palette": ["#FFE4C4","#FFDEAD","#FFA500","#FF8C00","#FF7043","#FF6347","#FFD700","#FFC300"],
        "color_groups": {"warm_oranges": ["#FFA500","#FF8C00"], "coral_red": ["#FF7043","#FF6347"], "gold": ["#FFD700","#FFC300"]},
        "recommended_hair_colors": ["#B8860B","#CD853F","#8B4513","#A0522D","#D2691E"],
        "recommended_makeup": {
            "lipstick":   ["#FF6347","#FF4500","#E25822","#CC5500"],
            "blush":      ["#FF7F50","#FFA07A","#FA8072"],
            "eyeshadow":  ["#DAA520","#B8860B","#CD853F","#8B6914"]
        }
    },
    "Spring_Clear": {
        "palette": ["#FFF9E6","#FFD700","#FF8C69","#FF6B6B","#00CED1","#40E0D0","#98FF98","#7FFFD4"],
        "color_groups": {"bright_warm": ["#FFD700","#FF8C69"], "clear_cool": ["#00CED1","#40E0D0"], "fresh_green": ["#98FF98","#7FFFD4"]},
        "recommended_hair_colors": ["#DAA520","#C9A96E","#B8860B","#FFD700","#DEB887"],
        "recommended_makeup": {
            "lipstick":   ["#FF6B6B","#FF4F4F","#FF7F7F","#FF69B4"],
            "blush":      ["#FFB6C1","#FF9AA2","#FFD1DC"],
            "eyeshadow":  ["#98FF98","#90EE90","#40E0D0","#87CEEB"]
        }
    },
    "Spring_Bright": {
        "palette": ["#FFFF00","#FF6B35","#FF1493","#00FF7F","#00BFFF","#FF4500","#FF69B4","#ADFF2F"],
        "color_groups": {"vibrant": ["#FFFF00","#FF6B35"], "bright_pink": ["#FF1493","#FF69B4"], "fresh": ["#00FF7F","#ADFF2F"]},
        "recommended_hair_colors": ["#FFD700","#DAA520","#C9A96E","#FFA500","#FF8C00"],
        "recommended_makeup": {
            "lipstick":   ["#FF1493","#FF69B4","#FF4500","#FF6347"],
            "blush":      ["#FF69B4","#FFB6C1","#FF85A1"],
            "eyeshadow":  ["#00BFFF","#00FF7F","#ADFF2F","#FFFF00"]
        }
    },

    "Summer_Light": {
        "palette": ["#E6E6FA","#DDA0DD","#FFB6C1","#87CEEB","#B0C4DE","#98FB98","#F0E6FF","#D8BFD8"],
        "color_groups": {"soft_lavender": ["#E6E6FA","#D8BFD8"], "dusty_pink": ["#FFB6C1","#DDA0DD"], "powder_blue": ["#87CEEB","#B0C4DE"]},
        "recommended_hair_colors": ["#C0C0C0","#A8A8A8","#D3D3D3","#B0B0B0","#987654"],
        "recommended_makeup": {
            "lipstick":   ["#DDA0DD","#DA70D6","#FFB6C1","#DB7093"],
            "blush":      ["#FFB6C1","#FFC0CB","#FFD1DC"],
            "eyeshadow":  ["#E6E6FA","#D8BFD8","#B0C4DE","#87CEEB"]
        }
    },
    "Summer_Cool": {
        "palette": ["#B0E0E6","#ADD8E6","#87CEFA","#6495ED","#DDA0DD","#EE82EE","#DB7093","#C71585"],
        "color_groups": {"cool_blue": ["#B0E0E6","#87CEFA"], "rose_pink": ["#DB7093","#C71585"], "violet": ["#DDA0DD","#EE82EE"]},
        "recommended_hair_colors": ["#708090","#778899","#A0A0A0","#8B8682","#696969"],
        "recommended_makeup": {
            "lipstick":   ["#DB7093","#C71585","#FF69B4","#DC143C"],
            "blush":      ["#FFB6C1","#DB7093","#FFC0CB"],
            "eyeshadow":  ["#6495ED","#4169E1","#DDA0DD","#C0C0C0"]
        }
    },
    "Summer_Soft": {
        "palette": ["#F5DEB3","#DEB887","#DCDCDC","#C0C0C0","#E6E6FA","#FFB6C1","#98FB98","#B0C4DE"],
        "color_groups": {"muted_neutral": ["#DCDCDC","#C0C0C0"], "soft_blush": ["#FFB6C1","#F5DEB3"], "hazy": ["#E6E6FA","#B0C4DE"]},
        "recommended_hair_colors": ["#BC8F8F","#C0A080","#B8A090","#A09080","#9B8B7B"],
        "recommended_makeup": {
            "lipstick":   ["#BC8F8F","#CD8A8A","#C68484","#D8A0A0"],
            "blush":      ["#FADADD","#F4C2C2","#E8B4B8"],
            "eyeshadow":  ["#B0C4DE","#C0C0C0","#D8BFD8","#DCDCDC"]
        }
    },
    "Summer_Muted": {
        "palette": ["#BEBEBE","#A9A9A9","#D2B48C","#BC8F8F","#8FBC8F","#6B8E8B","#708090","#9B8B7B"],
        "color_groups": {"muted_grey": ["#BEBEBE","#A9A9A9"], "dusty_rose": ["#BC8F8F","#D2B48C"], "sage": ["#8FBC8F","#6B8E8B"]},
        "recommended_hair_colors": ["#808080","#696969","#A0A0A0","#8B8682","#7B7B7B"],
        "recommended_makeup": {
            "lipstick":   ["#BC8F8F","#A08080","#9B8080","#B09090"],
            "blush":      ["#D2B48C","#C8A882","#BFA07A"],
            "eyeshadow":  ["#A9A9A9","#808080","#6B8E8B","#8FBC8F"]
        }
    },

    "Autumn_Warm": {
        "palette": ["#8B4513","#A0522D","#D2691E","#CD853F","#DAA520","#B8860B","#8B6914","#6B4226"],
        "color_groups": {"warm_brown": ["#8B4513","#A0522D"], "golden_amber": ["#DAA520","#B8860B"], "rust": ["#D2691E","#CD853F"]},
        "recommended_hair_colors": ["#4A2C0A","#6B3A2A","#8B4513","#5C3317","#3B2006"],
        "recommended_makeup": {
            "lipstick":   ["#8B4513","#A0522D","#B8480A","#C04000"],
            "blush":      ["#CD853F","#D2691E","#C07840"],
            "eyeshadow":  ["#DAA520","#B8860B","#8B6914","#A0522D"]
        }
    },
    "Autumn_Deep": {
        "palette": ["#3B1A08","#5C2E0A","#722F00","#8B0000","#4B3832","#6B3A2A","#856048","#704214"],
        "color_groups": {"deep_red": ["#8B0000","#722F00"], "dark_brown": ["#3B1A08","#5C2E0A"], "bronze": ["#856048","#704214"]},
        "recommended_hair_colors": ["#1C0A00","#2B1200","#3B1A08","#0A0000","#1A0800"],
        "recommended_makeup": {
            "lipstick":   ["#8B0000","#722F00","#C41E3A","#B22222"],
            "blush":      ["#6B3A2A","#8B4513","#7B3A28"],
            "eyeshadow":  ["#3B1A08","#856048","#4B3832","#6B3A2A"]
        }
    },
    "Autumn_Soft": {
        "palette": ["#C4956A","#BF8B5E","#A07850","#8B7355","#D2B48C","#C8A882","#B8906A","#A07050"],
        "color_groups": {"soft_brown": ["#C4956A","#BF8B5E"], "warm_tan": ["#D2B48C","#C8A882"], "caramel": ["#A07850","#B8906A"]},
        "recommended_hair_colors": ["#6B4226","#7B5236","#8B6246","#704820","#5C3A18"],
        "recommended_makeup": {
            "lipstick":   ["#C4956A","#B8845A","#A0784A","#C07848"],
            "blush":      ["#D2B48C","#C4956A","#BF8B5E"],
            "eyeshadow":  ["#C8A882","#B8906A","#A07850","#8B7355"]
        }
    },
    "Autumn_Muted": {
        "palette": ["#8B7355","#A0896B","#6B5840","#7A6248","#9B8B7B","#8B7B6B","#786050","#6B5848"],
        "color_groups": {"muted_brown": ["#8B7355","#786050"], "warm_grey": ["#9B8B7B","#8B7B6B"], "olive": ["#6B5840","#7A6248"]},
        "recommended_hair_colors": ["#4A3828","#5A4838","#6A5848","#3A2818","#4A3020"],
        "recommended_makeup": {
            "lipstick":   ["#8B6B4B","#7B5B3B","#9B7B5B","#A07848"],
            "blush":      ["#9B8B7B","#A09080","#8B7B6B"],
            "eyeshadow":  ["#8B7355","#786050","#6B5840","#7A6248"]
        }
    },

    "Winter_Deep": {
        "palette": ["#000000","#0A0A0A","#1C1C1C","#2F2F2F","#000080","#00008B","#191970","#003153"],
        "color_groups": {"black_family": ["#000000","#1C1C1C"], "deep_navy": ["#000080","#00008B"], "midnight": ["#191970","#003153"]},
        "recommended_hair_colors": ["#000000","#0A0A0A","#1C1C1C","#080808","#0F0F0F"],
        "recommended_makeup": {
            "lipstick":   ["#8B0000","#C71585","#DC143C","#800020"],
            "blush":      ["#DC143C","#C71585","#8B0000"],
            "eyeshadow":  ["#000000","#1C1C1C","#191970","#4169E1"]
        }
    },
    "Winter_Cool": {
        "palette": ["#F8F8FF","#E8E8F8","#C0C0C0","#A8A8C8","#6A5ACD","#483D8B","#191970","#DC143C"],
        "color_groups": {"icy_white": ["#F8F8FF","#E8E8F8"], "cool_silver": ["#C0C0C0","#A8A8C8"], "royal": ["#6A5ACD","#483D8B"]},
        "recommended_hair_colors": ["#1A1A2E","#16213E","#0F3460","#2C2C54","#1B1B2F"],
        "recommended_makeup": {
            "lipstick":   ["#DC143C","#C71585","#FF0080","#B22222"],
            "blush":      ["#C71585","#FF69B4","#DB7093"],
            "eyeshadow":  ["#C0C0C0","#A8A8C8","#6A5ACD","#483D8B"]
        }
    },
    "Winter_Clear": {
        "palette": ["#FFFFFF","#F0F0FF","#00FFFF","#00FF00","#FF00FF","#0000FF","#FF0000","#FFD700"],
        "color_groups": {"pure_white": ["#FFFFFF","#F0F0FF"], "vivid_primary": ["#FF0000","#0000FF"], "neon_accent": ["#00FFFF","#FF00FF"]},
        "recommended_hair_colors": ["#000000","#1A1A1A","#2C2C2C","#0A0A0A","#151515"],
        "recommended_makeup": {
            "lipstick":   ["#FF0000","#FF0080","#FF1493","#DC143C"],
            "blush":      ["#FF69B4","#FF1493","#DB7093"],
            "eyeshadow":  ["#00FFFF","#0000FF","#8B00FF","#FF00FF"]
        }
    },
    "Winter_Bright": {
        "palette": ["#F5F5F5","#E0E0FF","#FF4444","#4444FF","#FF44FF","#44FFFF","#FFFF44","#FF8C00"],
        "color_groups": {"bright_white": ["#F5F5F5","#E0E0FF"], "vibrant_cool": ["#4444FF","#FF44FF"], "high_contrast": ["#FF4444","#44FFFF"]},
        "recommended_hair_colors": ["#0A0A0A","#1C1C1C","#000000","#2A2A2A","#080808"],
        "recommended_makeup": {
            "lipstick":   ["#FF4444","#FF0066","#CC0044","#FF1155"],
            "blush":      ["#FF69B4","#FF85A1","#FFB6C1"],
            "eyeshadow":  ["#4444FF","#44FFFF","#FF44FF","#FFFF44"]
        }
    },
}

metadata = {
    "feature_names": feature_names,
    "classes": list(le.classes_),
    "n_classes": len(le.classes_),
    "palettes": PALETTES,
}

meta_path = MODEL_DIR / "model_metadata.json"
with open(meta_path, "w", encoding="utf-8") as f:
    json.dump(metadata, f, indent=2, ensure_ascii=False)
print(f"💾 Saved: {meta_path}")
print("\n✅ Export complete!")
