# 🎨 Personal Color AI

**🌐 Language / Ngôn ngữ / 言語:** [Tiếng Việt](./README.md) · **English** · [日本語](./README.ja.md)

AI-powered Personal Color Analysis — **100% client-side**. No data (images or results) is ever sent to any server in any form.

> UI languages: 🇻🇳 Tiếng Việt · 🇬🇧 English · 🇯🇵 日本語 (the choice is saved in `localStorage`).

---

## 📐 Architecture overview

```
User photo
      ↓
[Browser] BiSeNet face_parsing.onnx  → segment skin / hair / neck / eyes
[Browser] MediaPipe FaceMesh         → iris landmarks (eye color)
      ↓
[Browser] Canvas API → LAB skin/hair/eye/neck (outlier filtering + median trimmed)
      ↓
[Browser] Open-Meteo API → uv_index, cloud, sun_angle (lighting conditions)
      ↓
[Browser] ONNX Runtime Web → RandomForest inference (50 features)
      ↓
Result: season · sub_season · confidence
      ↓
[Recommendation layer — pure logic, not part of the model]
   • Re-prioritize colors by Context (time of day + event)
   • Ethnicity baseline adjusts residuals for accuracy
   • Let the user re-pick skin/eye/hair colors → suggestions update
```

- **Python** is used only to generate the dataset and train the model → produces `model.onnx`.
- **Node.js / Vite** is used only to bundle the frontend → produces the static `dist/`.
- **No AI backend** runs on a server. All inference happens in the browser via WebAssembly.

---

## 📂 Project structure

```
personal-color-analysis/
├── dataset/
│   ├── synthetic_personal_color.csv     ← produced by generate_dataset.py (7,200 samples)
│   ├── dataset_stats.json
│   └── dataset_report.txt
├── model/
│   ├── model.pkl                         ← scikit-learn pipeline (RandomForest)
│   ├── model.onnx                        ← model used on the web (~100 MB)
│   ├── scaler.pkl · label_encoder.pkl
│   ├── feature_names.json                ← 50 features in exact order
│   ├── model_metadata.json               ← class names + palettes
│   ├── confusion_matrix.csv · feature_importance.csv
│   └── training_report.txt
├── python/
│   ├── generate_dataset.py               ← generate the synthetic dataset
│   ├── train_model.py                    ← feature engineering + train RandomForest
│   ├── export_model.py                   ← export ONNX + metadata
│   └── download_parsing_model.py         ← download BiSeNet face_parsing.onnx
├── web/
│   ├── src/
│   │   ├── index.html                    ← Bootstrap 5 UI (with data-i18n)
│   │   ├── app.js                        ← main pipeline (extract → infer → render)
│   │   ├── colorData.js                  ← palettes/makeup/hair/clothing for 16 sub-seasons
│   │   ├── i18n.js                        ← VI/EN/JA i18n + color-name translation
│   │   └── style.css
│   ├── public/                           ← model.onnx · face_parsing.onnx · *.wasm · sample.jpg
│   ├── vite.config.js
│   └── dist/                             ← static build output
├── COLOR_RECOMMENDATION.md               ← color trends & recommendation logic (detailed)
└── README.md
```

---

## 🚀 Getting started

### 1. Python deps + download the face-parsing model

```bash
pip install numpy pandas scipy scikit-learn skl2onnx onnx onnxruntime pillow
cd python
python download_parsing_model.py    # downloads BiSeNet face_parsing.onnx (~51 MB) into web/public/
```

### 2. Generate dataset → Train → Export ONNX

```bash
python generate_dataset.py           # dataset/synthetic_personal_color.csv (7,200 rows, 50 features)
python train_model.py                # model/*.pkl + feature_names.json + training_report.txt
python export_model.py               # model/model.onnx + model_metadata.json
```

> On Windows, if the console throws a Unicode error (cp1252), run `set PYTHONUTF8=1` first.

### 3. Copy the model into web/public

```powershell
Copy-Item model\model.onnx web\public\model.onnx
```

### 4. Run the web app

```bash
cd web
npm install
npm run dev          # http://localhost:5173
npm run build        # produces web/dist/ for deployment (GitHub Pages / Netlify / Vercel / Nginx)
```

---

## 🧠 AI Model

| Property | Value |
|---|---|
| Model type | RandomForestClassifier (400 trees) + StandardScaler |
| Classes | 16 sub-seasons |
| Features | 50 (37 base + 13 engineered) |
| Dataset | 7,200 synthetic samples (450/class, 3 ethnicity baselines) |
| Test accuracy | ~61% sub-season · ~93% season (see note) |
| Export format | ONNX opset 12 |

**Accuracy note:** neighboring sub-seasons (e.g. Spring_Clear ↔ Spring_Bright) inherently overlap, so a ~60–70% sub-season accuracy is reasonable; distinguishing the 4 major seasons reaches ~93%. The model is designed so that **skin + undertone** are the primary signals and hair darkness does **not** dominate — this is why people with light skin + dark hair (common in East Asia) are still classified correctly.

### 16 Sub-seasons

| Season | Sub-seasons |
|---|---|
| 🌸 Spring | Light · Warm · Clear · Bright |
| ☀️ Summer | Light · Cool · Soft · Muted |
| 🍂 Autumn | Warm · Deep · Soft · Muted |
| ❄️ Winter | Deep · Cool · Clear · Bright |

### 50 Features (summary)

- **Face / neck skin:** L, a, b, chroma, redness, uniformity + face↔body delta.
- **Hair / eyes:** L, chroma, undertone, clarity.
- **Contrast:** face↔hair, face↔eye, overall.
- **Lighting:** uv_index, cloud_cover, sun_angle, ambient, white_balance, shadow, highlight, noise.
- **Makeup:** foundation, lipstick, contour, blush (correlated with uniformity/redness).
- **Ethnicity baseline:** L/a/b (Asian · Caucasian · African).
- **Engineered (13):** ITA face/body, warmth/depth/clarity score, ΔE face-hair, chroma ratio, skin quality, light intensity, baseline residuals, hair warmth.

---

## 🌐 Web features

### Analysis
- Drag & drop / pick an image, or run **Demo** with `sample.jpg`.
- Segmentation via **BiSeNet** (skin/hair/neck/eyes); eye color refined with **MediaPipe iris**.
- LAB extraction with **outlier filtering** (boundary erosion + median trimmed ΔE) so lips/brows/shadows don't skew the tone.
- **Color distribution chart** (a*×b* scatter + lightness histogram) per region to inspect the filter.

### Manual region selection (fullscreen fallback)
- When segmentation fails to detect a face → open the modal tool and drag rectangles for skin/hair/eye/neck.

### Ethnicity
- Choose ethnicity (Asian / Caucasian / African / Auto) → use a **real baseline** to normalize residuals → more accurate classification.

### Usage context (recommendation layer — does not change your season)
- **Time of day** (Morning / Afternoon / Evening) and **Event** (Gala / Birthday / Date / Office / Indoor / Outdoor / Casual).
- Palette, makeup, hair and clothing are **re-sorted + marked with ★** to fit the context. Rule details: see [`COLOR_RECOMMENDATION.en.md`](./COLOR_RECOMMENDATION.en.md).

### Custom colors
- The user can **re-pick skin/eye/hair colors** via a color picker → suggestions update automatically (re-runs the model). A "restore original" button is provided.

### Multilingual
- VI / EN / JA; switching language updates instantly, including **color names** and **season descriptions**. Technical terms (face_L/a/b) appear in natural language (Skin lightness / Red tone / Yellow tone).

### Result
- Season & sub-season + confidence ring; palette (click to copy HEX); makeup / hair / clothing suggestions; analysis metrics; probability chart for all 16 sub-seasons.

---

## 🔧 Tech stack

| Layer | Technology |
|---|---|
| AI Training | Python · scikit-learn · pandas · numpy · scipy |
| Model Export | skl2onnx · onnx · onnxruntime |
| Face parsing | BiSeNet ResNet18 (ONNX) + MediaPipe FaceMesh |
| Frontend | HTML5 · CSS3 · Bootstrap 5 · Vanilla JS · Vite 5 |
| AI Inference | ONNX Runtime Web (WebAssembly) |
| Colour Science | CIE LAB (D65) via Canvas API |
| Weather | Open-Meteo (free, no API key) |

---

## ⚡ Performance & notes

- The **~25 s startup** is mostly `InferenceSession.create()` parsing the ~100 MB ONNX model (RandomForest, 400 trees) on WASM — **not** file download (cache read ~0.8 s). To speed it up: reduce tree count/depth, or switch to a lighter model (LightGBM/MLP).
- `model.onnx` (~100 MB) and `face_parsing.onnx` (~51 MB) are cached via the **Cache Storage API**; bump the cache name (`pca-model-vN`) when replacing a model.
- The dataset is **synthetic** — real-photo accuracy will differ; fine-tune with real data for serious use.
- **Geolocation** requires HTTPS or localhost.
- Vite serves `.onnx`/`.wasm` from `public/` — do **not** add a watcher-ignore rule for these files (it makes the dev server return HTML instead of the binary).

---

## 📝 License

MIT — free to use, modify, and distribute.
