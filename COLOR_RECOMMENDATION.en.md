# 🎨 Color Trends & Recommendation Logic — Personal Color AI

**🌐 Language / Ngôn ngữ / 言語:** [Tiếng Việt](./COLOR_RECOMMENDATION.md) · **English** · [日本語](./COLOR_RECOMMENDATION.ja.md)

This document explains **how the system recommends colors**: from determining the "personal season" with the AI model, to the recommendation layer driven by **context** (time of day + event) and personalization via **ethnicity** / **custom colors**.

---

## 1. Two separate layers: Classification vs Recommendation

The core design principle:

| Layer | Input | Output | Changes with context? |
|---|---|---|---|
| **Season classification (AI model)** | Skin, hair, eyes, lighting (50 features) | One of 16 sub-seasons + confidence | ❌ No. This is a fixed body attribute. |
| **Color recommendation (logic)** | The determined season + context | Palette **re-sorted + marked with ★** | ✅ Yes. Time/event only change the *priority order*. |

> **Principle:** Time of day and event type do **NOT** change your personal season. Someone who is "Autumn Deep" stays "Autumn Deep" whether it's morning or evening, a party or at home. They only determine **which colors within that season's palette** best fit the occasion. Hence these factors live in the **recommendation layer**, not as model inputs.

---

## 2. How the personal season is determined

The model (RandomForest, 50 features) learns from the 4 axes of personal color theory:

- **Warmth (warm ↔ cool):** based on skin `a*` (red) and `b*` (yellow) + hair undertone.
  Warm → Spring / Autumn · Cool → Summer / Winter.
- **Depth (light ↔ deep):** `depth_score = 0.7·(100−face_L) + 0.3·(100−hair_L)`.
  **Skin dominates (0.7)**, hair is secondary (0.3) — so light skin + dark hair isn't misread as a "deep" season.
- **Clarity (clear ↔ soft):** overall contrast + eye clarity.
  High → Clear/Bright · Low → Soft/Muted.
- **ITA (Individual Typology Angle):** the scientific skin phototype metric.

The **ethnicity baseline** (Asian / Caucasian / African) is used to compute the *residual* `face_L_res = face_L − baseline_L`, judging "how light/dark this skin is relative to the person's own ethnic baseline" rather than in absolute terms.

---

## 3. Color traits — how a color is scored

Each HEX code is converted to LAB and reduced to 3 traits (`hexToColorTraits`):

| Trait | Meaning | Formula |
|---|---|---|
| **L** (lightness) | Light ↔ dark | `L` in LAB (0–100) |
| **chroma** | Vividness/saturation | `√(a² + b²)` |
| **warmth** | Warm ↔ cool | `b + 0.3·a` (b: yellow/blue axis; a: adds a bit of warm red) |

Three basic scoring functions (return 0…1):

- `prefHigh(v, min, max)` — higher is better (e.g. prefer bright colors).
- `prefLow(v, min, max)` — lower is better (e.g. prefer deep colors).
- `near(v, target, tol)` — closer to a target is better (e.g. neutral).

---

## 4. Priority rules by TIME OF DAY

| Time | Philosophy | Score (weighted sum) |
|---|---|---|
| **Morning** | Strong daylight → light, fresh, medium saturation | `0.5·prefHigh(L,40,90) + 0.3·near(chroma,35) + 0.2·prefHigh(warmth)` |
| **Afternoon** | Neutral, slightly warm | `0.4·near(L,60) + 0.3·near(chroma,40) + 0.3·prefHigh(warmth)` |
| **Evening** | Artificial light washes out pale colors → deep, vivid, high contrast | `0.5·prefLow(L) + 0.4·prefHigh(chroma,20,70) + 0.1·prefLow(warmth)` |

---

## 5. Priority rules by EVENT

| Event | Philosophy | Main preference |
|---|---|---|
| **Gala** | Elegant, striking | Deep + vivid (`prefLow(L)` + `prefHigh(chroma)`) |
| **Birthday** | Cheerful, standout | Light + vivid + slightly warm |
| **Date** | Soft, skin-flattering | Medium tone, slightly warm (`near(L,62)` + `prefHigh(warmth)`) |
| **Office** | Understated, professional | Neutral + **low vividness** (`prefLow(chroma)`) |
| **Indoor** | Warm artificial light | Warm tones, medium brightness |
| **Outdoor** | Daylight | Bright, fresh, slightly cool (`prefHigh(L)` + `prefLow(warmth)`) |
| **Casual** | Comfortable, balanced | `near(L,60)` + `near(chroma,35)` |

---

## 6. Combining scores & marking ★

```
score(color) =
    time = "any"  and event = "any"  → 0.5 (neutral, no re-sorting)
    time only                        → time score
    event only                       → event score
    both                             → 0.5·time + 0.5·event
```

Then (`applyContextPreferences`):

1. **Sort descending** by score (stable — colors with equal scores keep their original order).
2. **Mark ★** the **top ~40%** of colors (prioritized for the context).
3. Applied to **every section**: palette, color groups, makeup (lip/blush/eye), hair color, clothing (tops/bottoms).
   The **"Avoid"** group is exempt — always avoid regardless of context.

When `time = any` and `event = any` → show the original order, **no** ★, **no** explanation banner.

---

## 7. Extra personalization

### Ethnicity
The user picks Asian / Caucasian / African → uses a **real LAB baseline** (matching the training dataset) instead of estimating from the photo. This **re-runs the model** (changing the `face_*_res` features), improving accuracy — especially for light skin + dark hair.

### Custom colors (color override)
The user can re-pick **skin / eye / hair / neck colors** with a color picker. Then:

```
picked hex → LAB → replace in the feature vector → re-run the AI model
          → new season (if it changes) → all suggestions update to the chosen color
```

A **restore original** button reverts to the colors measured from the photo.

---

## 8. Notes on recommendation quality

- These rules are **heuristics based on color theory**, not learned from user feedback. They aim to *re-sort sensibly*, not to be absolute truth.
- To tune: edit `TIME_PROFILES` / `EVENT_PROFILES` in `web/src/app.js` (section 6b). Each profile is a function taking `{L, chroma, warmth}` and returning 0…1.
- The ★ ratio (default 40%) is set via the `highlightRatio` parameter of `applyContextPreferences`.
- Target thresholds (e.g. `near(L, 60)`) can be adjusted for a darker/lighter taste.

---

## 9. Recommendation flow diagram

```
Photo ──► Extract LAB (skin/hair/eye) ──► [Ethnicity baseline] ──► AI model ──► Personal season
                                                                                     │
                                          (user color override) ────────────────────┤
                                                                                     ▼
                             Season's base palette  ──►  applyContextPreferences(time, event)
                                                                                     ▼
                                    Final suggestions: re-sorted + ★ marked + explanation banner
```
