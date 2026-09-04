"""
train_model.py — Expert Edition v2 (Final)
============================================
Pipeline training chuyên gia cho Personal Color AI.

Chiến lược:
  1. Feature engineering: ITA, warmth/depth/clarity scores, residuals (13 features mới)
  2. RandomForest với tham số tối ưu từ domain knowledge + RandomizedSearch
  3. 3-fold CV để đánh giá robustness
  4. Full evaluation: per-class report, confusion matrix, feature importance
  5. Xuất tất cả artefacts cho ONNX export

Output (model/):
  model.pkl / scaler.pkl / label_encoder.pkl / feature_names.json
  training_report.txt / confusion_matrix.csv / feature_importance.csv
"""

import json
import pickle
import time
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, f1_score
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder, StandardScaler

warnings.filterwarnings("ignore")

ROOT      = Path(__file__).parent.parent
DATA_PATH = ROOT / "dataset" / "synthetic_personal_color.csv"
MODEL_DIR = ROOT / "model"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

t_total = time.time()

print("=" * 65)
print("  Personal Color AI — Expert Training Pipeline v2")
print("=" * 65)

# ═══════════════════════════════════════════════════════════════════════════════
# 1. LOAD DATA
# ═══════════════════════════════════════════════════════════════════════════════
print("\n[DIR] [1/5] Loading dataset…")
df = pd.read_csv(DATA_PATH)
print(f"   Rows {len(df):,}  |  Cols {len(df.columns)}  |  Missing {df.isnull().sum().sum()}")

# ═══════════════════════════════════════════════════════════════════════════════
# 2. FEATURE ENGINEERING
# ═══════════════════════════════════════════════════════════════════════════════
print("\n[ENG] [2/5] Feature engineering…")
eps = 1e-6

# ITA (Individual Typology Angle) — thước đo phototype chuẩn khoa học
df["ita_face"]     = np.degrees(np.arctan2(df["face_L"] - 50, df["face_b"].clip(lower=eps)))
df["ita_body"]     = np.degrees(np.arctan2(df["body_L"] - 50, df["body_b"].clip(lower=eps)))

# Warmth score: phân biệt warm (Spring/Autumn) vs cool (Summer/Winter)
df["warmth_score"] = df["face_a"] * 0.4 + df["face_b"] * 0.4 + df["hair_undertone"] * 10

# Depth score: phân biệt light vs deep — DA chi phối (0.7), tóc chỉ phụ (0.3).
# Lý do: người da sáng nhưng tóc đen (phổ biến ở Á Đông) KHÔNG phải "deep"; nếu để
# tóc trọng số ngang da thì tóc đen kéo nhầm sang Autumn/Winter.
df["depth_score"]  = (100 - df["face_L"]) * 0.7 + (100 - df["hair_L"]) * 0.3

# Clarity score: phân biệt clear/bright vs muted/soft
df["clarity_score"] = df["contrast_overall"] * 0.6 + df["eye_clarity"] * 0.4

# Simplified Delta-E face->hair (Euclidean trong LAB)
df["face_hair_dE"]  = np.sqrt(
    (df["face_L"] - df["hair_L"])**2 + df["face_a"]**2 + df["face_b"]**2
)

# Chroma ratio: face vs body (makeup/exposure indicator)
df["chroma_ratio"]  = df["face_chroma"] / (df["body_chroma"] + eps)

# Skin quality composite
df["skin_quality"]  = df["face_redness"] * df["face_uniformity"]

# Effective light intensity (UV × (1 - cloud))
df["light_intensity"] = df["uv_index"] / 11.0 * (1 - df["cloud_cover"] / 100)

# Ethnicity-adjusted residuals (loại bỏ bias baseline)
df["face_L_res"] = df["face_L"] - df["ethnicity_baseline_L"]
df["face_a_res"] = df["face_a"] - df["ethnicity_baseline_a"]
df["face_b_res"] = df["face_b"] - df["ethnicity_baseline_b"]

# Hair warmth interaction
df["hair_warmth"] = df["hair_chroma"] * (df["hair_undertone"] + 1) / 2

BASE_FEATURES = [
    "face_L","face_a","face_b","face_chroma","face_redness","face_uniformity",
    "body_L","body_a","body_b","body_chroma",
    "delta_L","delta_a","delta_b",
    "hair_L","hair_chroma","hair_undertone",
    "eye_L","eye_chroma","eye_clarity",
    "contrast_face_hair","contrast_face_eye","contrast_overall",
    "uv_index","cloud_cover","sun_angle","ambient_light_condition",
    "white_balance_shift","shadow_level","highlight_level","noise_level",
    "has_foundation","has_lipstick","has_contour","has_blush",
    "ethnicity_baseline_L","ethnicity_baseline_a","ethnicity_baseline_b",
]
ENG_FEATURES = [
    "ita_face","ita_body",
    "warmth_score","depth_score","clarity_score",
    "face_hair_dE","chroma_ratio","skin_quality","light_intensity",
    "face_L_res","face_a_res","face_b_res","hair_warmth",
]
FEATURE_COLS = BASE_FEATURES + ENG_FEATURES

print(f"   Base {len(BASE_FEATURES)} + Engineered {len(ENG_FEATURES)} = Total {len(FEATURE_COLS)}")

X     = df[FEATURE_COLS].values.astype(np.float32)
y_raw = df["sub_season"].values
le    = LabelEncoder()
y     = le.fit_transform(y_raw)
print(f"   Classes ({len(le.classes_)}): {list(le.classes_)}")

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.15, random_state=42, stratify=y
)
print(f"   Train {len(X_train):,}  |  Test {len(X_test):,}")

# ═══════════════════════════════════════════════════════════════════════════════
# 3. TRAIN RANDOMFOREST
# ═══════════════════════════════════════════════════════════════════════════════
# Params từ RandomizedSearch (lần trước): n_estimators=334->400, max_features=0.4,
# min_samples_leaf=1, min_samples_split=4, max_depth=None
# ═══════════════════════════════════════════════════════════════════════════════
print("\n[RUN] [3/5] Training RandomForest…")
t0 = time.time()

model = Pipeline([
    ("scaler", StandardScaler()),
    ("classifier", RandomForestClassifier(
        n_estimators=400,
        max_depth=None,
        max_features=0.4,
        min_samples_leaf=1,
        min_samples_split=4,
        n_jobs=-1,
        random_state=42,
        class_weight="balanced",
    )),
])
model.fit(X_train, y_train)
train_time = time.time() - t0
print(f"   Done in {train_time:.1f}s")

# ═══════════════════════════════════════════════════════════════════════════════
# 4. EVALUATION
# ═══════════════════════════════════════════════════════════════════════════════
print("\n[EVL] [4/5] Evaluation…")

# -- Test set -------------------------------------------------------------------
y_pred    = model.predict(X_test)
y_prob    = model.predict_proba(X_test)
test_acc  = float((y_pred == y_test).mean())
test_f1   = f1_score(y_test, y_pred, average="macro")
test_f1_w = f1_score(y_test, y_pred, average="weighted")

# Season-level accuracy
sm = {c: c.split("_")[0] for c in le.classes_}
season_acc = float(
    (np.array([sm[le.classes_[i]] for i in y_pred]) ==
     np.array([sm[le.classes_[i]] for i in y_test])).mean()
)

print(f"   Test Accuracy   : {test_acc:.4f}  ({test_acc*100:.2f}%)")
print(f"   F1-macro        : {test_f1:.4f}")
print(f"   F1-weighted     : {test_f1_w:.4f}")
print(f"   Season Accuracy : {season_acc:.4f}  ({season_acc*100:.2f}%)")

# -- 3-fold CV ------------------------------------------------------------------
print("\n   3-fold CV on train set…")
t0 = time.time()
cv3 = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)
cv3_acc = cross_val_score(model, X_train, y_train, cv=cv3, scoring="accuracy", n_jobs=-1)
cv3_f1  = cross_val_score(model, X_train, y_train, cv=cv3, scoring="f1_macro",  n_jobs=-1)
print(f"   CV3 Accuracy : {cv3_acc.mean():.4f} +/- {cv3_acc.std():.4f}  [{time.time()-t0:.0f}s]")
print(f"   CV3 F1-macro : {cv3_f1.mean():.4f} +/- {cv3_f1.std():.4f}")

# -- Per-class report ------------------------------------------------------------
report_str = classification_report(y_test, y_pred, target_names=le.classes_, digits=4)
print("\n   Per-class Classification Report:")
print(report_str)

# -- Confusion matrix ------------------------------------------------------------
cm = confusion_matrix(y_test, y_pred)
cm_df = pd.DataFrame(cm, index=le.classes_, columns=le.classes_)
cm_off = cm.copy(); np.fill_diagonal(cm_off, 0)
top_idx = np.dstack(np.unravel_index(np.argsort(cm_off.ravel())[-6:], cm.shape))[0][::-1]
print("   Top confusion pairs:")
for ti, pi in top_idx:
    if cm[ti, pi] > 0:
        print(f"     {le.classes_[ti]:<24} -> {le.classes_[pi]:<24}  ({cm[ti,pi]}×)")

# -- Feature importance ----------------------------------------------------------
clf   = model.named_steps["classifier"]
fi    = clf.feature_importances_
fi_df = (pd.DataFrame({"feature": FEATURE_COLS, "importance": fi})
         .sort_values("importance", ascending=False)
         .reset_index(drop=True))
fi_df.insert(0, "rank", range(1, len(fi_df)+1))

print("\n   Top 20 Feature Importances:")
print(f"   {'Rank':<4} {'Feature':<28} {'Importance':>10}  Bar")
print("   " + "-" * 60)
for _, row in fi_df.head(20).iterrows():
    bar = "#" * int(row["importance"] * 400)
    tag = " *" if row["feature"] in ENG_FEATURES else "  "
    print(f"   {int(row['rank']):>3}. {row['feature']:<28} {row['importance']:.4f}  {bar}{tag}")
print("      * = engineered feature")

# -- Summary by season --------------------------------------------------------
print("\n   Per-season accuracy (test set):")
for season in ["Spring", "Summer", "Autumn", "Winter"]:
    mask = np.array([sm[le.classes_[i]] == season for i in y_test])
    if mask.sum() == 0:
        continue
    s_acc = (y_pred[mask] == y_test[mask]).mean()
    s_f1  = f1_score(y_test[mask], y_pred[mask], average="macro",
                     labels=[i for i, c in enumerate(le.classes_) if c.startswith(season)])
    print(f"   {season:<8}  acc={s_acc:.3f}  f1-macro={s_f1:.3f}  n={mask.sum()}")

# ═══════════════════════════════════════════════════════════════════════════════
# 5. SAVE ARTEFACTS
# ═══════════════════════════════════════════════════════════════════════════════
print("\n[SAV] [5/5] Saving…")

with open(MODEL_DIR / "model.pkl", "wb") as f:
    pickle.dump(model, f)
with open(MODEL_DIR / "scaler.pkl", "wb") as f:
    pickle.dump(model.named_steps["scaler"], f)
with open(MODEL_DIR / "label_encoder.pkl", "wb") as f:
    pickle.dump(le, f)
with open(MODEL_DIR / "feature_names.json", "w") as f:
    json.dump(FEATURE_COLS, f, indent=2)

cm_df.to_csv(MODEL_DIR / "confusion_matrix.csv")
fi_df.to_csv(MODEL_DIR / "feature_importance.csv", index=False)

report = "\n".join([
    "PERSONAL COLOR AI — TRAINING REPORT v2",
    "=" * 60,
    f"Model              : RandomForest (n=400, max_feat=0.4)",
    f"Train time         : {train_time:.1f}s",
    f"Total features     : {len(FEATURE_COLS)} (base={len(BASE_FEATURES)}, eng={len(ENG_FEATURES)})",
    "",
    "-- Test Set ---------------------------------------------",
    f"Accuracy           : {test_acc:.4f}  ({test_acc*100:.2f}%)",
    f"F1-macro           : {test_f1:.4f}",
    f"F1-weighted        : {test_f1_w:.4f}",
    f"Season accuracy    : {season_acc:.4f}  ({season_acc*100:.2f}%)",
    "",
    "-- 3-Fold CV (train set) --------------------------------",
    f"Accuracy  : {cv3_acc.mean():.4f} +/- {cv3_acc.std():.4f}",
    f"F1-macro  : {cv3_f1.mean():.4f} +/- {cv3_f1.std():.4f}",
    "",
    "-- Per-Class Report -------------------------------------",
    report_str,
    "",
    f"Classes: {list(le.classes_)}",
    f"Engineered features: {ENG_FEATURES}",
])
with open(MODEL_DIR / "training_report.txt", "w", encoding="utf-8") as f:
    f.write(report)

for fname in ["model.pkl","scaler.pkl","label_encoder.pkl","feature_names.json",
              "confusion_matrix.csv","feature_importance.csv","training_report.txt"]:
    p = MODEL_DIR / fname
    if p.exists():
        sz = p.stat().st_size
        print(f"   {fname:<35} {sz/1024:>6.0f} KB")

print("[DONE] Training complete! Accuracy: {:.2f}%  F1: {:.4f}  Season: {:.2f}%".format(test_acc*100, test_f1, season_acc*100))
print(f"  ✅  Training complete!   Total time: {time.time()-t_total:.0f}s")
print(f"  Accuracy : {test_acc*100:.2f}%  |  F1-macro  : {test_f1:.4f}")
print(f"  Season   : {season_acc*100:.2f}%  |  CV3 F1   : {cv3_f1.mean():.4f}")
print(f"  Next step: python export_model.py")
print(f"{'='*65}\n")
