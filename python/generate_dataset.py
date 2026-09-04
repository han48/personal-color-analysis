"""
generate_dataset.py — Expert Edition
======================================
Sinh synthetic dataset chất lượng cao cho Personal Color Analysis.

Nguyên tắc chuyên gia:
  1. LAB distribution của da người tuân theo nghiên cứu:
       Tzvi & Keren (2004), Del Bino et al. (2006), ITA (Individual Typology Angle)
  2. Features có correlation thực tế (không independent)
  3. Multi-modal per sub-season (không phải 1 Gaussian)
  4. 3 ethnicity baselines: Asian · Caucasian · African
  5. Noise & lighting augmentation giả lập điều kiện chụp thật
  6. Class overlap tự nhiên để tránh model overfit trivially
  7. Built-in validation: Mahalanobis distance, separability check

Output:
  ../dataset/synthetic_personal_color.csv
  ../dataset/dataset_stats.json
  ../dataset/dataset_report.txt
"""

import json
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import chi2

warnings.filterwarnings("ignore")
np.random.seed(2024)

# ═══════════════════════════════════════════════════════════════════════════════
# A. NGHIÊN CỨU CƠ SỞ — LAB DA NGƯỜI
# ═══════════════════════════════════════════════════════════════════════════════
# Dựa trên ITA (Individual Typology Angle):
#   ITA = arctan((L* - 50) / b*) × 180/π
#   Very Light : ITA > 55°   → L ~ 70-85, b ~  8-18
#   Light      : ITA 41-55°  → L ~ 60-72, b ~ 10-22
#   Intermediate: ITA 28-41° → L ~ 52-64, b ~ 14-26
#   Tan        : ITA 10-28°  → L ~ 44-56, b ~ 18-30
#   Brown      : ITA -30-10° → L ~ 34-48, b ~ 16-26
#   Dark       : ITA < -30°  → L ~ 22-38, b ~  8-20
#
# Seasonal analysis thêm thông tin a* (redness/coolness) và tóc/mắt.
# ═══════════════════════════════════════════════════════════════════════════════

# ── Ethnicity baselines (L*, a*, b* mean ± std) ──────────────────────────────
ETHNICITY_BASELINES = {
    "Asian": {
        "L": (58.0, 8.0),   # mean, std
        "a": (10.0, 3.0),
        "b": (18.0, 4.0),
        "weight": 0.45,     # 45% of dataset
    },
    "Caucasian": {
        "L": (68.0, 9.0),
        "a": (7.0,  3.0),
        "b": (14.0, 4.0),
        "weight": 0.35,
    },
    "African": {
        "L": (38.0, 9.0),
        "a": (8.0,  3.0),
        "b": (16.0, 4.0),
        "weight": 0.20,
    },
}

# ═══════════════════════════════════════════════════════════════════════════════
# B. SUB-SEASON DEFINITIONS — Expert parameters
# ═══════════════════════════════════════════════════════════════════════════════
# Mỗi sub-season có:
#   - face_L_delta: offset từ ethnicity baseline L
#   - face_a_target: mục tiêu a* (warm/cool tone)
#   - face_b_target: mục tiêu b* (yellow/blue tone)
#   - hair_L_range: khoảng hair lightness
#   - hair_undertone: hướng undertone (-1=cool, 0=neutral, +1=warm)
#   - eye_L_range: khoảng eye lightness
#   - contrast_target: mức contrast mong đợi
#   - warmth: 0=cool, 1=warm (ảnh hưởng nhiều feature)
#   - depth: 0=light, 1=deep
#   - clarity: 0=muted/soft, 1=clear/bright
#   - n_modes: số Gaussian components (multi-modal)
# ═══════════════════════════════════════════════════════════════════════════════

SUB_SEASONS = {
    # ── SPRING ───────────────────────────────────────────────────────────────
    "Spring_Light": {
        "season": "Spring",
        "face_L_delta":    (+8,  6),    # sáng hơn baseline
        "face_a_target":   (10,  3.5),  # warm hồng nhẹ
        "face_b_target":   (20,  4.0),  # vàng ấm nhẹ
        "hair_L_range":    (52, 76),
        "hair_warm_bias":  +0.6,
        "eye_L_range":     (38, 62),
        "contrast_target": (0.28, 0.08),
        "warmth":  0.75, "depth": 0.25, "clarity": 0.65,
        "n_modes": 2,
    },
    "Spring_Warm": {
        "season": "Spring",
        "face_L_delta":    (+4,  6),
        "face_a_target":   (14,  4.0),
        "face_b_target":   (26,  5.0),  # vàng đậm hơn
        "hair_L_range":    (42, 68),
        "hair_warm_bias":  +0.9,
        "eye_L_range":     (30, 55),
        "contrast_target": (0.30, 0.09),
        "warmth":  0.95, "depth": 0.45, "clarity": 0.55,
        "n_modes": 2,
    },
    "Spring_Clear": {
        "season": "Spring",
        "face_L_delta":    (+10, 5),
        "face_a_target":   (11,  3.5),
        "face_b_target":   (18,  4.5),
        "hair_L_range":    (48, 72),
        "hair_warm_bias":  +0.5,
        "eye_L_range":     (42, 68),
        "contrast_target": (0.35, 0.08),
        "warmth":  0.70, "depth": 0.20, "clarity": 0.90,
        "n_modes": 2,
    },
    "Spring_Bright": {
        "season": "Spring",
        "face_L_delta":    (+12, 5),
        "face_a_target":   (12,  4.0),
        "face_b_target":   (19,  5.0),
        "hair_L_range":    (50, 74),
        "hair_warm_bias":  +0.6,
        "eye_L_range":     (44, 70),
        "contrast_target": (0.40, 0.08),
        "warmth":  0.72, "depth": 0.15, "clarity": 0.98,
        "n_modes": 2,
    },

    # ── SUMMER ───────────────────────────────────────────────────────────────
    "Summer_Light": {
        "season": "Summer",
        "face_L_delta":    (+6,  6),
        "face_a_target":   (5,   3.0),  # ít redness
        "face_b_target":   (8,   3.5),  # ít yellow
        "hair_L_range":    (44, 66),
        "hair_warm_bias":  -0.3,
        "eye_L_range":     (36, 60),
        "contrast_target": (0.22, 0.07),
        "warmth":  0.25, "depth": 0.25, "clarity": 0.60,
        "n_modes": 2,
    },
    "Summer_Cool": {
        "season": "Summer",
        "face_L_delta":    (+2,  7),
        "face_a_target":   (3,   3.0),
        "face_b_target":   (5,   3.5),  # bluish
        "hair_L_range":    (36, 60),
        "hair_warm_bias":  -0.7,
        "eye_L_range":     (28, 52),
        "contrast_target": (0.26, 0.08),
        "warmth":  0.10, "depth": 0.40, "clarity": 0.55,
        "n_modes": 2,
    },
    "Summer_Soft": {
        "season": "Summer",
        "face_L_delta":    (+4,  6),
        "face_a_target":   (4,   3.0),
        "face_b_target":   (7,   3.5),
        "hair_L_range":    (38, 62),
        "hair_warm_bias":  -0.2,
        "eye_L_range":     (32, 56),
        "contrast_target": (0.20, 0.07),
        "warmth":  0.20, "depth": 0.35, "clarity": 0.30,
        "n_modes": 2,
    },
    "Summer_Muted": {
        "season": "Summer",
        "face_L_delta":    (0,   7),
        "face_a_target":   (3,   2.5),
        "face_b_target":   (6,   3.0),
        "hair_L_range":    (34, 58),
        "hair_warm_bias":  -0.4,
        "eye_L_range":     (26, 50),
        "contrast_target": (0.18, 0.06),
        "warmth":  0.15, "depth": 0.45, "clarity": 0.20,
        "n_modes": 2,
    },

    # ── AUTUMN ───────────────────────────────────────────────────────────────
    "Autumn_Warm": {
        "season": "Autumn",
        "face_L_delta":    (-4,  6),
        "face_a_target":   (16,  4.5),  # redness cao
        "face_b_target":   (28,  5.0),  # yellow-golden
        "hair_L_range":    (24, 50),
        "hair_warm_bias":  +0.9,
        "eye_L_range":     (20, 44),
        "contrast_target": (0.32, 0.09),
        "warmth":  0.95, "depth": 0.60, "clarity": 0.50,
        "n_modes": 3,
    },
    "Autumn_Deep": {
        "season": "Autumn",
        "face_L_delta":    (-10, 6),
        "face_a_target":   (13,  4.0),
        "face_b_target":   (22,  5.0),
        "hair_L_range":    (14, 38),
        "hair_warm_bias":  +0.7,
        "eye_L_range":     (14, 36),
        "contrast_target": (0.38, 0.09),
        "warmth":  0.85, "depth": 0.90, "clarity": 0.45,
        "n_modes": 2,
    },
    "Autumn_Soft": {
        "season": "Autumn",
        "face_L_delta":    (-2,  6),
        "face_a_target":   (11,  3.5),
        "face_b_target":   (22,  4.5),
        "hair_L_range":    (28, 52),
        "hair_warm_bias":  +0.6,
        "eye_L_range":     (24, 46),
        "contrast_target": (0.24, 0.08),
        "warmth":  0.80, "depth": 0.50, "clarity": 0.30,
        "n_modes": 2,
    },
    "Autumn_Muted": {
        "season": "Autumn",
        "face_L_delta":    (-5,  6),
        "face_a_target":   (9,   3.5),
        "face_b_target":   (20,  4.5),
        "hair_L_range":    (22, 46),
        "hair_warm_bias":  +0.5,
        "eye_L_range":     (20, 42),
        "contrast_target": (0.22, 0.07),
        "warmth":  0.70, "depth": 0.55, "clarity": 0.20,
        "n_modes": 2,
    },

    # ── WINTER ───────────────────────────────────────────────────────────────
    "Winter_Deep": {
        "season": "Winter",
        "face_L_delta":    (-12, 7),
        "face_a_target":   (6,   3.5),
        "face_b_target":   (2,   4.0),  # near-neutral/cool
        "hair_L_range":    (8,  28),
        "hair_warm_bias":  -0.8,
        "eye_L_range":     (10, 30),
        "contrast_target": (0.45, 0.09),
        "warmth":  0.10, "depth": 0.98, "clarity": 0.65,
        "n_modes": 2,
    },
    "Winter_Cool": {
        "season": "Winter",
        "face_L_delta":    (+0,  7),
        "face_a_target":   (4,   3.0),
        "face_b_target":   (-1,  4.0),  # slight blue
        "hair_L_range":    (12, 36),
        "hair_warm_bias":  -0.9,
        "eye_L_range":     (14, 38),
        "contrast_target": (0.38, 0.09),
        "warmth":  0.05, "depth": 0.60, "clarity": 0.60,
        "n_modes": 2,
    },
    "Winter_Clear": {
        "season": "Winter",
        "face_L_delta":    (+5,  6),
        "face_a_target":   (7,   3.5),
        "face_b_target":   (0,   4.5),
        "hair_L_range":    (10, 32),
        "hair_warm_bias":  -0.6,
        "eye_L_range":     (16, 42),
        "contrast_target": (0.50, 0.09),
        "warmth":  0.15, "depth": 0.55, "clarity": 0.95,
        "n_modes": 2,
    },
    "Winter_Bright": {
        "season": "Winter",
        "face_L_delta":    (+8,  5),
        "face_a_target":   (8,   3.5),
        "face_b_target":   (1,   4.0),
        "hair_L_range":    (8,  30),
        "hair_warm_bias":  -0.5,
        "eye_L_range":     (18, 44),
        "contrast_target": (0.52, 0.09),
        "warmth":  0.20, "depth": 0.50, "clarity": 0.98,
        "n_modes": 2,
    },
}

# ═══════════════════════════════════════════════════════════════════════════════
# C. WEATHER / LIGHTING DISTRIBUTIONS (thực tế theo mùa địa lý)
# ═══════════════════════════════════════════════════════════════════════════════

WEATHER_PROFILES = {
    "tropical":    {"uv": (6.0, 2.5),  "cloud": (55, 25), "sun": (60, 18), "weight": 0.35},
    "temperate":   {"uv": (4.0, 2.0),  "cloud": (45, 28), "sun": (45, 20), "weight": 0.35},
    "nordic":      {"uv": (2.5, 1.5),  "cloud": (65, 25), "sun": (28, 16), "weight": 0.15},
    "desert":      {"uv": (8.5, 1.8),  "cloud": (15, 12), "sun": (72, 14), "weight": 0.15},
}

# ═══════════════════════════════════════════════════════════════════════════════
# D. HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def clamp(val, lo, hi):
    return float(np.clip(val, lo, hi))

def sample_weather():
    """Lấy mẫu thời tiết theo phân phối địa lý thực tế."""
    profiles = list(WEATHER_PROFILES.values())
    weights  = [p["weight"] for p in profiles]
    idx      = np.random.choice(len(profiles), p=weights)
    p        = profiles[idx]
    uv    = clamp(np.random.normal(*p["uv"]),    0, 11)
    cloud = clamp(np.random.normal(*p["cloud"]), 0, 100)
    sun   = clamp(np.random.normal(*p["sun"]),   0, 90)
    ambient = clamp(1 - cloud / 110 + np.random.normal(0, 0.08), 0.05, 1.0)
    return uv, cloud, sun, ambient

def sample_ethnicity():
    """Lấy mẫu baseline theo ethnicity với trọng số thực tế."""
    names   = list(ETHNICITY_BASELINES.keys())
    weights = [ETHNICITY_BASELINES[n]["weight"] for n in names]
    eth     = np.random.choice(names, p=weights)
    bp      = ETHNICITY_BASELINES[eth]
    base_L  = np.random.normal(*bp["L"])
    base_a  = np.random.normal(*bp["a"])
    base_b  = np.random.normal(*bp["b"])
    return eth, clamp(base_L, 20, 90), clamp(base_a, 0, 25), clamp(base_b, 5, 35)

def apply_lighting_noise(L, a, b, wb_shift, shadow, highlight, noise):
    """
    Giả lập ảnh hưởng của điều kiện chụp lên LAB values.
    - White balance shift: dịch chuyển a* và b* (ấm/lạnh)
    - Shadow: giảm L*
    - Highlight: tăng L*, giảm chroma
    - Noise: nhiễu random
    """
    # White balance ảnh hưởng b* nhiều nhất, sau đó a*
    a_adj = a + wb_shift * 8
    b_adj = b + wb_shift * 12

    # Shadow kéo L* xuống và tăng chroma giả
    L_adj = L - shadow * 18
    # Highlight nâng L* và giảm chroma (overexposed)
    L_adj = L_adj + highlight * 12
    a_adj = a_adj * (1 - highlight * 0.4)
    b_adj = b_adj * (1 - highlight * 0.4)

    # Gaussian noise
    L_adj += np.random.normal(0, noise * 5)
    a_adj += np.random.normal(0, noise * 3)
    b_adj += np.random.normal(0, noise * 3)

    return (
        clamp(L_adj, 5, 98),
        float(np.clip(a_adj, -20, 45)),
        float(np.clip(b_adj, -25, 50)),
    )

def generate_correlated_face_features(cfg, base_L, base_a, base_b):
    """
    Sinh face LAB với correlation thực tế.
    face_L phụ thuộc base_L và delta target.
    face_a và face_b có correlation với warmth/depth.
    """
    delta_L_mean, delta_L_std = cfg["face_L_delta"]
    # Multi-modal: trộn 2-3 Gaussian để tạo phân phối tự nhiên hơn
    n_modes = cfg.get("n_modes", 2)
    mode    = np.random.randint(0, n_modes)
    mode_offset = mode * 3 - (n_modes - 1) * 1.5  # trải đều

    face_L = clamp(
        base_L + np.random.normal(delta_L_mean + mode_offset, delta_L_std),
        18, 96
    )

    a_mean, a_std = cfg["face_a_target"]
    b_mean, b_std = cfg["face_b_target"]

    # Warmth correlation: warm seasons có a* và b* tương quan dương
    warmth_noise = cfg["warmth"] * np.random.normal(0, 1.5)
    face_a = clamp(np.random.normal(a_mean + warmth_noise, a_std), -5, 40)
    face_b = clamp(np.random.normal(b_mean + warmth_noise, b_std), -10, 45)

    face_chroma   = float(np.sqrt(face_a**2 + face_b**2))
    face_redness  = clamp(face_a / 25 * 0.4 + np.random.beta(2, 5) * 0.3, 0.02, 0.55)
    face_uniformity = clamp(
        np.random.beta(5, 2) * 0.35 + 0.60 - cfg["depth"] * 0.05,
        0.50, 0.98
    )
    return face_L, face_a, face_b, face_chroma, face_redness, face_uniformity

def generate_body_features(face_L, face_a, face_b, cfg):
    """
    Body skin thường tối hơn face 2-8 điểm L* (tùy exposure và coverage).
    Correlation với face rất cao.
    """
    body_L = clamp(
        face_L - np.random.gamma(shape=2.0, scale=1.8) - 1,
        15, 92
    )
    body_a = clamp(face_a + np.random.normal(0, 2.0), -5, 38)
    body_b = clamp(face_b + np.random.normal(0, 2.5), -8, 42)
    body_chroma = float(np.sqrt(body_a**2 + body_b**2))
    return body_L, body_a, body_b, body_chroma

def generate_hair_features(cfg, face_L, eth="Caucasian"):
    """
    THIẾT KẾ MỚI: độ TỐI của tóc do ETHNICITY quyết định (Á/Phi → tóc đen ở MỌI mùa),
    còn UNDERTONE (ấm/lạnh) của tóc mới theo mùa. Nhờ vậy tồn tại đủ mẫu
    "Spring/Summer + tóc đen" — điều kiện để người Á da sáng tóc đen được xếp đúng mùa.
    Mùa cá nhân do DA + UNDERTONE quyết định, không phải độ tối tuyệt đối của tóc.
    """
    lo, hi = cfg["hair_L_range"]
    alpha = 2.0 + cfg["depth"] * 2
    beta  = 2.0 + (1 - cfg["depth"]) * 2
    season_hair_L = clamp(lo + np.random.beta(alpha, beta) * (hi - lo), lo - 5, hi + 5)

    # Phân phối hair_L theo ethnicity (độc lập mùa):
    #  - Asian/African: đa số đen/nâu-đen (L thấp), một phần nhuộm sáng.
    #  - Caucasian: trải rộng vàng→nâu→đen theo mùa (dùng season_hair_L).
    if eth == "Asian":
        if np.random.random() < 0.75:               # 75% tóc đen tự nhiên
            hair_L = clamp(np.random.normal(20, 6), 6, 36)
        else:                                        # 25% nhuộm sáng theo mùa
            hair_L = season_hair_L
    elif eth == "African":
        if np.random.random() < 0.88:
            hair_L = clamp(np.random.normal(16, 5), 5, 30)
        else:
            hair_L = season_hair_L
    else:  # Caucasian & khác: theo mùa (đa dạng vàng→đen)
        hair_L = season_hair_L

    # Chroma theo độ sáng thực tế của tóc
    if hair_L > 55:
        hair_chroma = clamp(np.random.gamma(3, 5) + 8, 5, 50)
    elif hair_L > 35:
        hair_chroma = clamp(np.random.gamma(2, 4) + 5, 3, 35)
    else:
        hair_chroma = clamp(np.random.gamma(1.5, 2.5) + 2, 2, 20)

    # Undertone (ấm/lạnh) VẪN theo mùa — đây mới là tín hiệu phân biệt mùa từ tóc
    warm_bias = cfg["hair_warm_bias"]
    hair_undertone = clamp(warm_bias + np.random.normal(0, 0.3), -1, 1)
    return hair_L, hair_chroma, hair_undertone

def generate_eye_features(cfg, face_L, eth="Caucasian"):
    """
    Màu mắt: eye_L có correlation nhẹ với overall depth.
    Người da sáng thường có mắt sáng hơn (thống kê, không tuyệt đối).
    Người Á/Phi phần lớn mắt nâu sẫm/đen tự nhiên → eye_L thấp bất kể mùa.
    """
    lo, hi = cfg["eye_L_range"]
    depth_bias = -cfg["depth"] * 8
    season_eye_L = clamp(
        np.random.normal((lo + hi) / 2 + depth_bias, (hi - lo) / 5),
        lo - 5, hi + 5
    )
    # Độ tối của mắt do ethnicity quyết định (Á/Phi mắt sẫm ở mọi mùa)
    if eth == "Asian":
        eye_L = clamp(np.random.normal(28, 6), 12, 44) if np.random.random() < 0.80 else season_eye_L
    elif eth == "African":
        eye_L = clamp(np.random.normal(24, 5), 10, 38) if np.random.random() < 0.90 else season_eye_L
    else:
        eye_L = season_eye_L
    # Eye chroma: mắt xanh/xanh lá cao, mắt nâu/đen thấp
    if eye_L > 45:
        eye_chroma = clamp(np.random.gamma(3, 5) + 10, 8, 45)
    else:
        eye_chroma = clamp(np.random.gamma(2, 3) + 3, 3, 25)

    eye_clarity = clamp(
        cfg["clarity"] * 0.5 + np.random.beta(3, 2) * 0.5,
        0.20, 1.0
    )
    return eye_L, eye_chroma, eye_clarity

def generate_makeup_detection(cfg, face_uniformity, face_redness):
    """
    Makeup có TÍN HIỆU thực tế (không còn là noise ngẫu nhiên độc lập):
      - has_foundation: nhiều khả năng khi da rất đều màu (uniformity cao).
      - has_blush / has_lipstick: nhiều khả năng khi redness trên mặt cao.
      - has_contour: hiếm hơn, đi kèm foundation.
    Vẫn giữ tính ngẫu nhiên nhưng xác suất phụ thuộc đặc trưng đo được — khớp với
    cách web app suy luận makeup từ uniformity/redness của vùng da.
    """
    base = 0.30 + cfg["clarity"] * 0.12
    # Foundation: kéo theo uniformity cao
    p_found = np.clip(base + (face_uniformity - 0.70) * 1.2, 0.05, 0.95)
    has_foundation = int(np.random.random() < p_found)
    # Blush & lipstick: kéo theo redness
    p_red = np.clip(base + (face_redness - 0.15) * 1.5, 0.05, 0.95)
    has_blush    = int(np.random.random() < p_red)
    has_lipstick = int(np.random.random() < p_red * 0.9)
    # Contour: hiếm, thường đi cùng foundation
    has_contour  = int(has_foundation and np.random.random() < 0.45)
    return has_foundation, has_lipstick, has_contour, has_blush

def generate_image_conditions():
    """
    Giả lập điều kiện chụp ảnh thực tế.
    Phân phối không đều — đa số ảnh có điều kiện vừa phải.
    """
    wb_shift       = clamp(np.random.laplace(0, 0.07),  -0.30, 0.30)
    shadow_level   = clamp(np.random.beta(1.5, 4) * 0.7, 0.00, 0.60)
    highlight_level = clamp(np.random.beta(1.5, 5) * 0.7, 0.00, 0.60)
    noise_level    = clamp(np.random.exponential(0.06),  0.00, 0.40)
    return wb_shift, shadow_level, highlight_level, noise_level

# ═══════════════════════════════════════════════════════════════════════════════
# E. MAIN GENERATION LOOP
# ═══════════════════════════════════════════════════════════════════════════════

N_TOTAL      = 7200
N_PER_CLASS  = N_TOTAL // len(SUB_SEASONS)  # = 450 mỗi sub-season

print("=" * 65)
print("  Personal Color AI — Expert Dataset Generator")
print("=" * 65)
print(f"  Sub-seasons : {len(SUB_SEASONS)}")
print(f"  Per class   : {N_PER_CLASS}")
print(f"  Total target: {N_PER_CLASS * len(SUB_SEASONS)}")
print("=" * 65)

records = []

for sub_season, cfg in SUB_SEASONS.items():
    season = cfg["season"]
    for sample_idx in range(N_PER_CLASS):

        # ── 1. Ethnicity baseline ──────────────────────────────────────────
        eth, base_L, base_a, base_b = sample_ethnicity()

        # ── 2. Image conditions ────────────────────────────────────────────
        wb_shift, shadow, highlight, noise = generate_image_conditions()

        # ── 3. Face features (với correlation) ────────────────────────────
        face_L_raw, face_a_raw, face_b_raw, face_chroma, \
            face_redness, face_uniformity = generate_correlated_face_features(
                cfg, base_L, base_a, base_b
            )

        # ── 4. Apply lighting noise ────────────────────────────────────────
        face_L, face_a, face_b = apply_lighting_noise(
            face_L_raw, face_a_raw, face_b_raw,
            wb_shift, shadow, highlight, noise
        )
        face_chroma = float(np.sqrt(face_a**2 + face_b**2))

        # ── 5. Body features ───────────────────────────────────────────────
        body_L_raw, body_a_raw, body_b_raw, _ = generate_body_features(
            face_L_raw, face_a_raw, face_b_raw, cfg
        )
        body_L, body_a, body_b = apply_lighting_noise(
            body_L_raw, body_a_raw, body_b_raw,
            wb_shift * 0.7, shadow * 0.8, highlight * 0.7, noise * 0.5
        )
        body_chroma = float(np.sqrt(body_a**2 + body_b**2))

        # ── 6. Deltas ──────────────────────────────────────────────────────
        delta_L = float(face_L - body_L)
        delta_a = float(face_a - body_a)
        delta_b = float(face_b - body_b)

        # ── 7. Hair features ───────────────────────────────────────────────
        hair_L, hair_chroma, hair_undertone = generate_hair_features(cfg, face_L, eth)

        # ── 8. Eye features ────────────────────────────────────────────────
        eye_L, eye_chroma, eye_clarity = generate_eye_features(cfg, face_L, eth)

        # ── 9. Contrast ────────────────────────────────────────────────────
        contrast_face_hair = clamp(abs(face_L - hair_L) / 100, 0, 1)
        contrast_face_eye  = clamp(abs(face_L - eye_L)  / 100, 0, 1)
        contrast_overall   = float((contrast_face_hair + contrast_face_eye) / 2)

        # ── 10. Add natural contrast noise ───────────────────────────────
        # (seasonal expectation ± noise)
        c_mean, c_std = cfg["contrast_target"]
        contrast_overall = clamp(
            contrast_overall * 0.5 + np.random.normal(c_mean, c_std) * 0.5,
            0.02, 0.85
        )

        # ── 11. Weather ────────────────────────────────────────────────────
        uv_index, cloud_cover, sun_angle, ambient = sample_weather()

        # ── 12. Makeup (phụ thuộc uniformity & redness — có tín hiệu thật) ──
        has_foundation, has_lipstick, has_contour, has_blush = \
            generate_makeup_detection(cfg, face_uniformity, face_redness)

        # ── 13. Recalculate face_chroma after noise ────────────────────────
        face_chroma = float(np.sqrt(face_a**2 + face_b**2))

        records.append({
            # Face skin
            "face_L":           round(face_L, 3),
            "face_a":           round(face_a, 3),
            "face_b":           round(face_b, 3),
            "face_chroma":      round(face_chroma, 3),
            "face_redness":     round(face_redness, 4),
            "face_uniformity":  round(face_uniformity, 4),
            # Body skin
            "body_L":           round(body_L, 3),
            "body_a":           round(body_a, 3),
            "body_b":           round(body_b, 3),
            "body_chroma":      round(body_chroma, 3),
            # Deltas
            "delta_L":          round(delta_L, 3),
            "delta_a":          round(delta_a, 3),
            "delta_b":          round(delta_b, 3),
            # Hair
            "hair_L":           round(hair_L, 3),
            "hair_chroma":      round(hair_chroma, 3),
            "hair_undertone":   round(hair_undertone, 4),
            # Eyes
            "eye_L":            round(eye_L, 3),
            "eye_chroma":       round(eye_chroma, 3),
            "eye_clarity":      round(eye_clarity, 4),
            # Contrast
            "contrast_face_hair": round(contrast_face_hair, 4),
            "contrast_face_eye":  round(contrast_face_eye, 4),
            "contrast_overall":   round(contrast_overall, 4),
            # Weather
            "uv_index":                  round(uv_index, 2),
            "cloud_cover":               round(cloud_cover, 2),
            "sun_angle":                 round(sun_angle, 2),
            "ambient_light_condition":   round(ambient, 4),
            # Image quality
            "white_balance_shift":  round(wb_shift, 4),
            "shadow_level":         round(shadow, 4),
            "highlight_level":      round(highlight, 4),
            "noise_level":          round(noise, 4),
            # Makeup
            "has_foundation": has_foundation,
            "has_lipstick":   has_lipstick,
            "has_contour":    has_contour,
            "has_blush":      has_blush,
            # Ethnicity baseline
            "ethnicity_baseline_L": round(base_L, 3),
            "ethnicity_baseline_a": round(base_a, 3),
            "ethnicity_baseline_b": round(base_b, 3),
            # Labels
            "ethnicity":  eth,
            "season":     season,
            "sub_season": sub_season,
        })

    print(f"  ✓ {sub_season:<22} {N_PER_CLASS} samples")

# ═══════════════════════════════════════════════════════════════════════════════
# F. SHUFFLE & SAVE
# ═══════════════════════════════════════════════════════════════════════════════
df = pd.DataFrame(records)
df = df.sample(frac=1, random_state=42).reset_index(drop=True)

OUT_DIR = Path(__file__).parent.parent / "dataset"
OUT_DIR.mkdir(parents=True, exist_ok=True)
csv_path = OUT_DIR / "synthetic_personal_color.csv"
df.to_csv(csv_path, index=False)

# ═══════════════════════════════════════════════════════════════════════════════
# G. VALIDATION & QUALITY REPORT
# ═══════════════════════════════════════════════════════════════════════════════

FEATURE_COLS = [c for c in df.columns if c not in ("ethnicity", "season", "sub_season")]

print(f"\n{'='*65}")
print("  DATASET VALIDATION")
print(f"{'='*65}")

# 1. Basic stats
print(f"\n  Rows   : {len(df):,}")
print(f"  Cols   : {len(df.columns)}")
print(f"  Missing: {df[FEATURE_COLS].isnull().sum().sum()}")

# 2. Class balance
counts = df["sub_season"].value_counts()
balance_ratio = counts.min() / counts.max()
print(f"\n  Class balance ratio : {balance_ratio:.3f}  (1.0 = perfect)")
print(f"  Min samples/class  : {counts.min()}")
print(f"  Max samples/class  : {counts.max()}")

# 3. Feature ranges sanity check
issues = 0
checks = {
    "face_L":         (0, 100),
    "face_a":         (-20, 45),
    "face_b":         (-20, 50),
    "hair_L":         (0, 100),
    "eye_L":          (0, 100),
    "contrast_overall": (0, 1),
    "uv_index":       (0, 11),
    "cloud_cover":    (0, 100),
}
for feat, (lo, hi) in checks.items():
    out = ((df[feat] < lo) | (df[feat] > hi)).sum()
    if out > 0:
        print(f"  ⚠️  {feat}: {out} values out of [{lo}, {hi}]")
        issues += 1
if issues == 0:
    print("  ✅ All feature ranges valid")

# 4. Inter-season separability (mean distance)
print("\n  Season mean face_L (key discriminator):")
for season in ["Spring", "Summer", "Autumn", "Winter"]:
    sub = df[df["season"] == season]
    print(f"    {season:<8}: face_L = {sub['face_L'].mean():.1f} ± {sub['face_L'].std():.1f}"
          f"  |  face_a = {sub['face_a'].mean():.1f}  |  face_b = {sub['face_b'].mean():.1f}")

# 5. Correlation check (face_L vs hair_L should be positive ~0.3-0.6)
corr_L = df[["face_L","hair_L","eye_L","contrast_overall"]].corr()
fl_hl  = corr_L.loc["face_L","hair_L"]
print(f"\n  Correlation face_L ↔ hair_L  : {fl_hl:.3f}  (expected: 0.3–0.6)")
fl_el  = corr_L.loc["face_L","eye_L"]
print(f"  Correlation face_L ↔ eye_L   : {fl_el:.3f}  (expected: 0.2–0.5)")

# 6. Mahalanobis outlier detection (per class, flag >99.9% chi2)
print("\n  Outlier detection (Mahalanobis, p>0.999):")
key_feats = ["face_L","face_a","face_b","hair_L","contrast_overall"]
total_outliers = 0
for ss in df["sub_season"].unique():
    sub  = df[df["sub_season"] == ss][key_feats].values.astype(float)
    mean = sub.mean(axis=0)
    cov  = np.cov(sub.T)
    try:
        cov_inv = np.linalg.pinv(cov)
        diff    = sub - mean
        dist    = np.einsum("ij,jk,ik->i", diff, cov_inv, diff)
        threshold = chi2.ppf(0.999, df=len(key_feats))
        n_out = (dist > threshold).sum()
        total_outliers += n_out
    except Exception:
        pass
outlier_pct = 100 * total_outliers / len(df)
print(f"    Total outliers (per class): {total_outliers} ({outlier_pct:.2f}%)  "
      f"{'✅' if outlier_pct < 3 else '⚠️'}")

# 7. Ethnicity distribution
print("\n  Ethnicity distribution:")
for eth, cnt in df["ethnicity"].value_counts().items():
    print(f"    {eth:<12}: {cnt:4d}  ({100*cnt/len(df):.1f}%)")

# ── Save stats JSON ────────────────────────────────────────────────────────────
stats = {
    "total_samples":   len(df),
    "n_features":      len(FEATURE_COLS),
    "n_classes":       df["sub_season"].nunique(),
    "balance_ratio":   round(float(balance_ratio), 4),
    "outlier_pct":     round(float(outlier_pct), 3),
    "corr_face_hair_L": round(float(fl_hl), 4),
    "face_L_mean_by_season": {
        s: round(float(df[df["season"]==s]["face_L"].mean()), 2)
        for s in ["Spring","Summer","Autumn","Winter"]
    },
    "ethnicity_dist": df["ethnicity"].value_counts().to_dict(),
    "feature_stats": {
        col: {
            "mean":  round(float(df[col].mean()), 4),
            "std":   round(float(df[col].std()),  4),
            "min":   round(float(df[col].min()),  4),
            "max":   round(float(df[col].max()),  4),
        }
        for col in key_feats
    },
}
with open(OUT_DIR / "dataset_stats.json", "w") as f:
    json.dump(stats, f, indent=2)

# ── Save report TXT ────────────────────────────────────────────────────────────
report_lines = [
    "PERSONAL COLOR AI — DATASET REPORT",
    "=" * 50,
    f"Generated  : {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M')}",
    f"Total rows : {len(df):,}",
    f"Features   : {len(FEATURE_COLS)}",
    f"Classes    : {df['sub_season'].nunique()} sub-seasons",
    "",
    "Sub-season counts:",
] + [f"  {k:<22}: {v}" for k, v in df["sub_season"].value_counts().sort_index().items()] + [
    "",
    "Feature statistics (key):",
] + [
    f"  {k:<22}: mean={v['mean']:.2f}  std={v['std']:.2f}  "
    f"[{v['min']:.1f}, {v['max']:.1f}]"
    for k, v in stats["feature_stats"].items()
]

with open(OUT_DIR / "dataset_report.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(report_lines))

print(f"\n{'='*65}")
print(f"  ✅ CSV    saved : {csv_path}")
print(f"  ✅ Stats  saved : {OUT_DIR/'dataset_stats.json'}")
print(f"  ✅ Report saved : {OUT_DIR/'dataset_report.txt'}")
print(f"{'='*65}\n")
