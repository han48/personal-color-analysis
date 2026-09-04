# 🎨 Personal Color AI

**🌐 Ngôn ngữ / Language / 言語:** **Tiếng Việt** · [English](./README.en.md) · [日本語](./README.ja.md)

Phân tích màu sắc cá nhân (Personal Color Analysis) bằng AI — **100% client-side**, không gửi bất kỳ dữ liệu nào (ảnh hay kết quả) lên server dưới bất kỳ hình thức nào.

> Ngôn ngữ giao diện: 🇻🇳 Tiếng Việt · 🇬🇧 English · 🇯🇵 日本語 (lưu lựa chọn vào `localStorage`).

---

## 📐 Kiến trúc tổng quan

```
Ảnh người dùng
      ↓
[Browser] BiSeNet face_parsing.onnx  → phân vùng da / tóc / cổ / mắt
[Browser] MediaPipe FaceMesh         → iris landmarks (màu mắt)
      ↓
[Browser] Canvas API → LAB skin/hair/eye/neck (lọc outlier + median trimmed)
      ↓
[Browser] Open-Meteo API → uv_index, cloud, sun_angle (điều kiện ánh sáng)
      ↓
[Browser] ONNX Runtime Web → RandomForest inference (50 features)
      ↓
Kết quả: season · sub_season · confidence
      ↓
[Tầng gợi ý — thuần logic, không qua model]
   • Ưu tiên màu theo Hoàn cảnh (thời điểm + sự kiện)
   • Ethnicity baseline chỉnh residual cho chính xác
   • Cho phép user tự chỉnh màu da/mắt/tóc → gợi ý cập nhật
```

- **Python** chỉ dùng để sinh dataset và train model → xuất `model.onnx`.
- **Node.js / Vite** chỉ dùng để bundle frontend → xuất `dist/` static.
- **Không có backend AI** nào chạy trên server. Mọi suy luận diễn ra trong trình duyệt qua WebAssembly.

---

## 📂 Cấu trúc dự án

```
personal-color-analysis/
├── dataset/
│   ├── synthetic_personal_color.csv     ← sinh bởi generate_dataset.py (7 200 mẫu)
│   ├── dataset_stats.json
│   └── dataset_report.txt
├── model/
│   ├── model.pkl                         ← scikit-learn pipeline (RandomForest)
│   ├── model.onnx                        ← model dùng trên web (~100 MB)
│   ├── scaler.pkl · label_encoder.pkl
│   ├── feature_names.json                ← 50 feature theo đúng thứ tự
│   ├── model_metadata.json               ← class names + palettes
│   ├── confusion_matrix.csv · feature_importance.csv
│   └── training_report.txt
├── python/
│   ├── generate_dataset.py               ← sinh dataset synthetic
│   ├── train_model.py                    ← feature engineering + train RandomForest
│   ├── export_model.py                   ← export ONNX + metadata
│   └── download_parsing_model.py         ← tải BiSeNet face_parsing.onnx
├── web/
│   ├── src/
│   │   ├── index.html                    ← Bootstrap 5 UI (gắn data-i18n)
│   │   ├── app.js                        ← pipeline chính (extract → infer → render)
│   │   ├── colorData.js                  ← palettes/makeup/hair/clothing 16 sub-seasons
│   │   ├── i18n.js                        ← đa ngôn ngữ VI/EN/JA + dịch tên màu
│   │   └── style.css
│   ├── public/                           ← model.onnx · face_parsing.onnx · *.wasm · sample.jpg
│   ├── vite.config.js
│   └── dist/                             ← static build output
├── COLOR_RECOMMENDATION.md               ← xu hướng & cách đề xuất màu (tài liệu chi tiết)
└── README.md
```

---

## 🚀 Hướng dẫn chạy

### 1. Python deps + tải model phân vùng khuôn mặt

```bash
pip install numpy pandas scipy scikit-learn skl2onnx onnx onnxruntime pillow
cd python
python download_parsing_model.py    # tải BiSeNet face_parsing.onnx (~51 MB) vào web/public/
```

### 2. Sinh dataset → Train → Export ONNX

```bash
python generate_dataset.py           # dataset/synthetic_personal_color.csv (7 200 dòng, 50 features)
python train_model.py                # model/*.pkl + feature_names.json + training_report.txt
python export_model.py               # model/model.onnx + model_metadata.json
```

> Trên Windows, nếu console báo lỗi Unicode (cp1252), đặt `set PYTHONUTF8=1` trước khi chạy.

### 3. Copy model vào web/public

```powershell
Copy-Item model\model.onnx web\public\model.onnx
```

### 4. Chạy web

```bash
cd web
npm install
npm run dev          # http://localhost:5173
npm run build        # xuất web/dist/ để deploy (GitHub Pages / Netlify / Vercel / Nginx)
```

---

## 🧠 Model AI

| Thông số | Giá trị |
|---|---|
| Loại model | RandomForestClassifier (400 cây) + StandardScaler |
| Classes | 16 sub-seasons |
| Features | 50 (37 base + 13 engineered) |
| Dataset | 7 200 synthetic samples (450/lớp, 3 ethnicity baseline) |
| Test accuracy | ~61 % sub-season · ~93 % season (xem ghi chú) |
| Format export | ONNX opset 12 |

**Ghi chú accuracy:** các sub-season kề nhau (vd Spring_Clear ↔ Spring_Bright) vốn chồng lấn về bản chất, nên accuracy sub-season ~60-70 % là hợp lý; phân biệt 4 mùa lớn đạt ~93 %. Model được thiết kế để **da + undertone** là tín hiệu chính, **không** để độ tối của tóc chi phối — nhờ đó người da sáng + tóc đen (phổ biến ở Á Đông) vẫn được phân loại đúng.

### 16 Sub-seasons

| Mùa | Sub-seasons |
|---|---|
| 🌸 Spring | Light · Warm · Clear · Bright |
| ☀️ Summer | Light · Cool · Soft · Muted |
| 🍂 Autumn | Warm · Deep · Soft · Muted |
| ❄️ Winter | Deep · Cool · Clear · Bright |

### 50 Features (tóm tắt)

- **Da mặt / cổ:** L, a, b, chroma, redness, uniformity + delta face↔body.
- **Tóc / mắt:** L, chroma, undertone, clarity.
- **Tương phản:** face↔hair, face↔eye, overall.
- **Ánh sáng:** uv_index, cloud_cover, sun_angle, ambient, white_balance, shadow, highlight, noise.
- **Makeup:** foundation, lipstick, contour, blush (tương quan với uniformity/redness).
- **Ethnicity baseline:** L/a/b (Asian · Caucasian · African).
- **Engineered (13):** ITA face/body, warmth/depth/clarity score, ΔE face-hair, chroma ratio, skin quality, light intensity, residuals theo baseline, hair warmth.

---

## 🌐 Tính năng Web

### Phân tích
- Kéo thả / chọn ảnh, hoặc **Demo** với `sample.jpg`.
- Phân vùng bằng **BiSeNet** (da/tóc/cổ/mắt), màu mắt tinh chỉnh bằng **MediaPipe iris**.
- Lấy màu LAB có **lọc outlier** (erode ranh giới + median trimmed ΔE) để môi/lông mày/bóng không kéo lệch tông.
- **Biểu đồ phân bố màu** (scatter a*×b* + histogram độ sáng) cho từng vùng để đánh giá bộ lọc.

### Chọn vùng thủ công (fallback toàn màn hình)
- Khi model phân vùng không nhận diện được → mở công cụ modal, kéo chuột vẽ vùng da/tóc/mắt/cổ.

### Ethnicity
- Chọn sắc tộc (Á / Âu / Phi / Tự động) → dùng **baseline thật** để chuẩn hoá residual → phân loại chính xác hơn.

### Hoàn cảnh sử dụng (tầng gợi ý — không đổi mùa cá nhân)
- **Thời điểm** (Sáng / Chiều / Tối) và **Sự kiện** (Dạ tiệc / Sinh nhật / Hẹn hò / Công sở / Trong nhà / Ngoài trời / Thường ngày).
- Bảng màu, makeup, tóc, trang phục được **sắp xếp lại + đánh dấu ★** cho phù hợp hoàn cảnh. Chi tiết luật: xem [`COLOR_RECOMMENDATION.md`](./COLOR_RECOMMENDATION.md).

### Tự chỉnh màu
- Người dùng có thể **chỉnh lại màu da/mắt/tóc** bằng color picker → gợi ý tự cập nhật (chạy lại model). Có nút khôi phục màu gốc.

### Đa ngôn ngữ
- VI / EN / JA; đổi ngôn ngữ cập nhật tức thì, kể cả **tên màu** và **mô tả mùa**. Thuật ngữ kỹ thuật (face_L/a/b) hiển thị bằng ngôn ngữ tự nhiên (Độ sáng da / Sắc đỏ / Sắc vàng).

### Kết quả
- Mùa & sub-season + vòng confidence; bảng màu (click copy HEX); gợi ý makeup / tóc / trang phục; chỉ số phân tích; biểu đồ xác suất 16 sub-seasons.

---

## 🔧 Tech Stack

| Layer | Công nghệ |
|---|---|
| AI Training | Python · scikit-learn · pandas · numpy · scipy |
| Model Export | skl2onnx · onnx · onnxruntime |
| Face parsing | BiSeNet ResNet18 (ONNX) + MediaPipe FaceMesh |
| Frontend | HTML5 · CSS3 · Bootstrap 5 · Vanilla JS · Vite 5 |
| AI Inference | ONNX Runtime Web (WebAssembly) |
| Colour Science | CIE LAB (D65) via Canvas API |
| Weather | Open-Meteo (free, no API key) |

---

## ⚡ Hiệu năng & lưu ý

- **Thời gian khởi động ~25 s** chủ yếu là `InferenceSession.create()` parse model ONNX ~100 MB (RandomForest 400 cây) trên WASM — **không** phải do tải file (cache đọc ~0.8 s). Muốn nhanh hơn: giảm số cây/độ sâu hoặc đổi sang model nhẹ (LightGBM/MLP).
- `model.onnx` (~100 MB) và `face_parsing.onnx` (~51 MB) được cache qua **Cache Storage API**; đổi tên cache (`pca-model-vN`) khi thay model.
- Dataset là **synthetic** — accuracy trên ảnh thật sẽ khác; cần fine-tune với dữ liệu thật để dùng nghiêm túc.
- **Geolocation** cần HTTPS hoặc localhost.
- Vite phục vụ `.onnx`/`.wasm` từ `public/` — **không** thêm rule bỏ qua watcher cho các file này (sẽ khiến dev server trả HTML thay vì binary).

---

## 📝 License

MIT — free to use, modify, and distribute.
