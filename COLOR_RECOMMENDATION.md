# 🎨 Xu hướng & cách đề xuất màu — Personal Color AI

**🌐 Ngôn ngữ / Language / 言語:** **Tiếng Việt** · [English](./COLOR_RECOMMENDATION.en.md) · [日本語](./COLOR_RECOMMENDATION.ja.md)

Tài liệu này mô tả **cách hệ thống đề xuất màu**: từ việc xác định "mùa cá nhân" (personal season) bằng model AI, đến tầng gợi ý theo **hoàn cảnh** (thời điểm + sự kiện) và cá nhân hoá bằng **sắc tộc** / **màu tự chỉnh**.

---

## 1. Hai tầng tách biệt: Phân loại vs Gợi ý

Điểm cốt lõi của thiết kế:

| Tầng | Đầu vào | Đầu ra | Có thay đổi theo hoàn cảnh? |
|---|---|---|---|
| **Phân loại mùa (Model AI)** | Da, tóc, mắt, ánh sáng (50 features) | 1 trong 16 sub-seasons + độ tin cậy | ❌ Không. Đây là đặc tính cố định của cơ thể. |
| **Gợi ý màu (Logic)** | Mùa đã xác định + hoàn cảnh | Bảng màu được **sắp xếp lại + đánh dấu ★** | ✅ Có. Thời điểm/sự kiện chỉ đổi *thứ tự ưu tiên*. |

> **Nguyên tắc:** Thời điểm trong ngày và loại sự kiện **KHÔNG** làm đổi mùa cá nhân. Một người "Autumn Deep" thì sáng hay tối, đi tiệc hay ở nhà, vẫn là "Autumn Deep". Chúng chỉ quyết định **màu nào trong bảng màu của mùa đó** phù hợp nhất cho hoàn cảnh. Vì vậy các yếu tố này nằm ở **tầng gợi ý**, không phải input của model.

---

## 2. Mùa cá nhân được xác định thế nào

Model (RandomForest, 50 features) học từ 4 trục lý thuyết personal color:

- **Warmth (ấm ↔ lạnh):** dựa trên `a*` (đỏ) và `b*` (vàng) của da + undertone tóc.
  Ấm → Spring / Autumn · Lạnh → Summer / Winter.
- **Depth (sáng ↔ đậm):** `depth_score = 0.7·(100−face_L) + 0.3·(100−hair_L)`.
  **Da chi phối (0.7)**, tóc chỉ phụ (0.3) — để người da sáng + tóc đen không bị nhầm sang mùa "deep".
- **Clarity (trong trẻo ↔ dịu):** tương phản tổng thể + độ trong của mắt.
  Cao → Clear/Bright · Thấp → Soft/Muted.
- **ITA (Individual Typology Angle):** thước đo phototype da chuẩn khoa học.

**Ethnicity baseline** (Á / Âu / Phi) được dùng để tính *residual* `face_L_res = face_L − baseline_L`, giúp đánh giá "da này sáng/tối so với nền sắc tộc của chính người đó" thay vì so tuyệt đối.

---

## 3. Đặc tính màu — cách "chấm điểm" một màu

Mỗi mã màu HEX được chuyển sang LAB và rút ra 3 đặc tính (`hexToColorTraits`):

| Đặc tính | Ý nghĩa | Công thức |
|---|---|---|
| **L** (lightness) | Sáng ↔ tối | `L` trong LAB (0–100) |
| **chroma** | Độ rực/bão hoà | `√(a² + b²)` |
| **warmth** | Ấm ↔ lạnh | `b + 0.3·a` (b: trục vàng/xanh; a: thêm chút đỏ ấm) |

Ba hàm chấm điểm cơ bản (trả về 0…1):

- `prefHigh(v, min, max)` — càng lớn càng tốt (vd ưu tiên màu sáng).
- `prefLow(v, min, max)` — càng nhỏ càng tốt (vd ưu tiên màu đậm).
- `near(v, target, tol)` — càng gần một giá trị mục tiêu càng tốt (vd trung tính).

---

## 4. Luật ưu tiên theo THỜI ĐIỂM

| Thời điểm | Triết lý | Điểm số (tổng có trọng số) |
|---|---|---|
| **Sáng** | Ánh sáng ban ngày mạnh → tông sáng, tươi, bão hoà vừa | `0.5·prefHigh(L,40,90) + 0.3·near(chroma,35) + 0.2·prefHigh(warmth)` |
| **Chiều** | Trung tính, hơi ấm | `0.4·near(L,60) + 0.3·near(chroma,40) + 0.3·prefHigh(warmth)` |
| **Tối** | Ánh sáng nhân tạo làm màu nhạt bị "trôi" → đậm, rực, tương phản cao | `0.5·prefLow(L) + 0.4·prefHigh(chroma,20,70) + 0.1·prefLow(warmth)` |

---

## 5. Luật ưu tiên theo SỰ KIỆN

| Sự kiện | Triết lý | Ưu tiên chính |
|---|---|---|
| **Dạ tiệc** | Sang trọng, ấn tượng | Màu đậm + rực (`prefLow(L)` + `prefHigh(chroma)`) |
| **Sinh nhật** | Vui tươi, nổi bật | Sáng + rực + hơi ấm |
| **Hẹn hò** | Mềm mại, tôn da | Tông trung bình, ấm nhẹ (`near(L,62)` + `prefHigh(warmth)`) |
| **Công sở** | Nhã nhặn, chuyên nghiệp | Trung tính + **ít rực** (`prefLow(chroma)`) |
| **Trong nhà** | Đèn ấm nhân tạo | Tông ấm, sáng vừa |
| **Ngoài trời** | Ánh sáng ban ngày | Sáng, tươi, mát nhẹ (`prefHigh(L)` + `prefLow(warmth)`) |
| **Thường ngày** | Thoải mái, cân bằng | `near(L,60)` + `near(chroma,35)` |

---

## 6. Cách tổng hợp điểm & đánh dấu ★

```
score(màu) =
    time = "any"  và event = "any"  → 0.5 (trung lập, không sắp xếp lại)
    chỉ có time                     → điểm theo thời điểm
    chỉ có event                    → điểm theo sự kiện
    có cả hai                       → 0.5·time + 0.5·event
```

Sau đó (`applyContextPreferences`):

1. **Sắp xếp giảm dần** theo điểm (ổn định — màu điểm bằng nhau giữ thứ tự gốc).
2. **Đánh dấu ★** cho **top ~40 %** màu (được ưu tiên cho hoàn cảnh).
3. Áp cho **mọi mục**: bảng màu, nhóm màu, makeup (son/má/mắt), màu tóc, trang phục (áo/quần).
   Riêng nhóm **"Nên tránh"** không áp — luôn nên tránh bất kể hoàn cảnh.

Khi `time = any` và `event = any` → hiển thị nguyên thứ tự gốc, **không** ★, **không** banner giải thích.

---

## 7. Cá nhân hoá thêm

### Sắc tộc (Ethnicity)
Người dùng chọn Á / Âu / Phi → dùng **baseline LAB thật** (khớp dataset training) thay vì tự ước lượng từ ảnh. Điều này **chạy lại model** (đổi feature `face_*_res`), cải thiện độ chính xác — đặc biệt cho người da sáng + tóc đen.

### Tự chỉnh màu (Color override)
Người dùng có thể chỉnh lại **màu da / mắt / tóc / cổ** bằng color picker. Khi đó:

```
hex người chọn → LAB → thay vào feature vector → chạy lại model AI
             → mùa mới (nếu đổi) → toàn bộ gợi ý cập nhật theo màu đã chỉnh
```

Có nút **khôi phục màu gốc** để quay lại màu đo được từ ảnh.

---

## 8. Lưu ý về chất lượng gợi ý

- Các luật trên là **heuristic dựa trên lý thuyết màu**, không phải học từ dữ liệu phản hồi người dùng. Chúng nhằm *sắp xếp lại hợp lý*, không phải "chân lý tuyệt đối".
- Muốn tinh chỉnh: sửa `TIME_PROFILES` / `EVENT_PROFILES` trong `web/src/app.js` (mục 6b). Mỗi profile là một hàm nhận `{L, chroma, warmth}` trả về 0…1.
- Tỷ lệ đánh dấu ★ (mặc định 40 %) chỉnh qua tham số `highlightRatio` của `applyContextPreferences`.
- Ngưỡng target (vd `near(L, 60)`) có thể điều chỉnh nếu muốn gu đậm/nhạt khác.

---

## 9. Sơ đồ luồng đề xuất

```
Ảnh ──► Trích xuất LAB (da/tóc/mắt) ──► [Ethnicity baseline] ──► Model AI ──► Mùa cá nhân
                                                                                   │
                                          (color override của user) ───────────────┤
                                                                                   ▼
                            Bảng màu gốc của mùa  ──►  applyContextPreferences(thời điểm, sự kiện)
                                                                                   ▼
                                       Gợi ý cuối: sắp xếp lại + đánh dấu ★ + banner giải thích
```
