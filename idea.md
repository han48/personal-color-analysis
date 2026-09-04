**Được Dang — mình sẽ cập nhật prompt theo hướng mới:**  
👉 **Web demo dùng Node.js để build thành static web**  
👉 Vẫn chạy **100% client‑side** (ONNX Runtime Web)  
👉 Node chỉ dùng để **build**, **bundle**, **serve static**, không làm backend AI.

Dưới đây là **PROMPT TỔNG HỢP MỚI NHẤT**, tối ưu cho việc yêu cầu AI sinh **toàn bộ source code**.

---

# ⭐ **PROMPT TỔNG HỢP — PHIÊN BẢN NODE.JS + STATIC WEB**

**Hãy tạo toàn bộ source code cho một dự án Personal Color AI theo yêu cầu sau:**

# 1. Dataset Synthetic (đầy đủ input)
Sinh dataset synthetic 6000–8000 mẫu với các input:
- Face skin: face_L, face_a, face_b, face_chroma, face_redness, face_uniformity  
- Body skin: body_L, body_a, body_b, body_chroma  
- Face–Body delta: delta_L, delta_a, delta_b  
- Hair: hair_L, hair_chroma, hair_undertone  
- Eyes: eye_L, eye_chroma, eye_clarity  
- Global contrast: contrast_face_hair, contrast_face_eye, contrast_overall  
- Weather: uv_index, cloud_cover, sun_angle, ambient_light_condition  
- Image conditions: white_balance_shift, shadow_level, highlight_level, noise_level  
- Makeup detection: has_foundation, has_lipstick, has_contour, has_blush  
- Ethnicity baseline: ethnicity_baseline_L, ethnicity_baseline_a, ethnicity_baseline_b  
- Output: season + sub_season  

Xuất dataset thành CSV.

---

# 2. Training Model AI bằng Python
- Train Random Forest hoặc SVM  
- Chuẩn hóa dữ liệu bằng StandardScaler  
- Xuất model sang:
  - **ONNX** (model.onnx)

---

# 3. Model Output (phải có bảng màu)
Model phải trả về:
- season  
- sub_season  
- confidence  
- palette (HEX list)  
- color_groups  
- recommended_hair_colors  
- recommended_makeup (lipstick, blush, eyeshadow)  
- key_metrics (face_L, hair_L, contrast, uv_index…)

---

# 4. Web Demo (Node.js build + static web)
## A. Công nghệ frontend
- HTML  
- CSS Bootstrap  
- JavaScript thuần  
- ONNX Runtime Web  

## B. Công nghệ build
- Node.js  
- npm scripts  
- Webpack hoặc Vite để bundle JS  
- Build ra thư mục **dist/** để deploy static  

## C. Chức năng web
### 1. Upload ảnh
- Người dùng upload ảnh khuôn mặt.

### 2. Tự động trích xuất input từ ảnh
Dùng JS + face-api.js hoặc Mediapipe:
- Detect face  
- Detect hair  
- Detect eyes  
- Detect body skin (nếu có cổ/vai)  
- Tính face_L, face_a, face_b  
- Tính body_L, body_a, body_b  
- Tính delta_L, delta_a, delta_b  
- Tính hair_L, eye_L  
- Tính global contrast  
- Phân tích white balance, shadow, highlight, noise  
- Detect makeup (foundation, lipstick, contour, blush)

### 3. Lấy thời tiết theo web location
- Dùng Geolocation API  
- Gọi OpenWeatherMap hoặc WeatherAPI  
- Lấy uv_index, cloud_cover, sun_angle  

### 4. Load model ONNX
- Load model client-side  
- Chuyển input thành tensor  
- Chạy inference  

### 5. Hiển thị kết quả bằng Bootstrap
- Mùa  
- Confidence  
- Bảng màu đề xuất (HEX)  
- Nhóm màu đề xuất  
- Gợi ý makeup  
- Gợi ý màu tóc  
- Các thông số LAB  

---

# 5. Cấu trúc dự án
```
project/
  ├── dataset/
  │     └── synthetic_personal_color.csv
  ├── model/
  │     ├── model.json hoặc model.onnx
  ├── python/
  │     ├── generate_dataset.py
  │     ├── train_model.py
  │     └── export_model.py
  ├── web/
  │     ├── src/
  │     │     ├── index.html
  │     │     ├── app.js
  │     │     └── style.css
  │     ├── package.json
  │     ├── vite.config.js hoặc webpack.config.js
  │     └── dist/ (static build output)
  └── README.md
```

---
# 6. Yêu cầu bổ sung
- Code phải chạy được ngay  
- Giải thích từng bước  
- Không dùng backend AI  
- Node.js chỉ dùng để build và serve static  
- Tối ưu tốc độ load model và inference  
- Tạo ví dụ minh họa kết quả dự đoán  