/**
 * app.js – Personal Color AI
 * ─────────────────────────────────────────────────────────────────────────────
 * Pipeline:
 *   1. User uploads image
 *   2. MediaPipe FaceMesh extracts face / hair / eye regions
 *   3. LAB colour values are computed from pixel samples
 *   4. Optional: OpenWeatherMap/Open-Meteo fetches uv_index, cloud, sun_angle
 *   5. ONNX Runtime Web runs inference (100 % client-side)
 *   6. Results are rendered with Bootstrap UI components
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as ort from "onnxruntime-web";
import { COLOR_DATA, SEASON_LABELS, SEASON_ACCENT } from "./colorData.js";
import { t, initLanguage, applyTranslations, setLanguage, getLanguage, translateColorName } from "./i18n.js";

// Khởi tạo ngôn ngữ ngay (đọc localStorage / navigator) rồi áp bản dịch tĩnh.
initLanguage();
document.addEventListener("DOMContentLoaded", () => {
  applyTranslations();
  const sel = document.getElementById("lang-select");
  if (sel) {
    sel.value = getLanguage();
    sel.addEventListener("change", e => {
      setLanguage(e.target.value);
      // Render lại kết quả để cập nhật các chuỗi động (mùa, chỉ số, ghi chú…).
      if (lastResult) {
        renderResults(
          { predictedClass: lastResult.predictedClass, confidence: lastResult.confidence,
            probabilities: lastResult.probabilities },
          lastResult.features
        );
      }
      // Cập nhật lại panel màu đã phát hiện nếu đang hiển thị.
      if (lastResult?.features) renderDetectedColors(lastResult.features);
      // Cập nhật lại chart phân bố (nhãn + dòng thống kê động).
      if (typeof renderDistributionChart === "function") renderDistributionChart();
    });
  }
});

// ── ONNX wasm path — served từ public/ (cả dev lẫn build) ───────────────────
ort.env.wasm.wasmPaths = "/";

// ── Feature order MUST match training (feature_names.json — 50 features) ─────
const FEATURE_NAMES = [
  // Base (37)
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
  // Engineered (13) — must match train_model.py engineer_features()
  "ita_face","ita_body",
  "warmth_score","depth_score","clarity_score",
  "face_hair_dE","chroma_ratio","skin_quality","light_intensity",
  "face_L_res","face_a_res","face_b_res","hair_warmth",
];

// Class labels in the SAME order as LabelEncoder in training
const CLASSES = [
  "Autumn_Deep","Autumn_Muted","Autumn_Soft","Autumn_Warm",
  "Spring_Bright","Spring_Clear","Spring_Light","Spring_Warm",
  "Summer_Cool","Summer_Light","Summer_Muted","Summer_Soft",
  "Winter_Bright","Winter_Clear","Winter_Cool","Winter_Deep",
];

// ── State ─────────────────────────────────────────────────────────────────────
let onnxSession = null;
let currentImage = null;
let weatherData  = { uv_index: 5, cloud_cover: 30, sun_angle: 45, ambient: 0.6 };
// Kết quả phân tích gần nhất — để re-render khi đổi hoàn cảnh (thời điểm/sự kiện).
let lastResult = null;

// Sắc tộc người dùng chọn → dùng làm ethnicity baseline THẬT (khớp ETHNICITY_BASELINES
// trong generate_dataset.py). "auto" = tự ước lượng từ khuôn mặt (như trước).
// Baseline giúp feature face_L_res = face_L − baseline_L chính xác, tránh phân loại
// sai cho người da sáng + tóc đen (vd người Á Đông) khi tự đoán baseline.
const ETHNICITY_BASELINES = {
  asian:     { L: 58.0, a: 10.0, b: 18.0 },
  caucasian: { L: 68.0, a: 7.0,  b: 14.0 },
  african:   { L: 38.0, a: 8.0,  b: 16.0 },
};
let userEthnicity = "auto";   // "auto" | "asian" | "caucasian" | "african"

// Override màu do người dùng tự chỉnh (hex) cho từng vùng. null = dùng màu đo từ ảnh.
// Khi có override, gợi ý được tính lại từ màu người dùng chọn.
let colorOverride = { face: null, hair: null, eye: null, body: null };
// Lưu ngữ cảnh trích xuất gần nhất để tính lại feature khi user chỉnh màu.
let lastExtract = null;   // { buf, W, H, mask, faceLab, hairLab, neckLab, eyeLab }

// Manual region selection (fallback khi face_parsing.onnx không dùng được).
// Mỗi loại vùng lưu 1 rectangle {x,y,w,h} theo toạ độ pixel của ảnh gốc (đã scale về ≤512).
const manualRegions = { skin: null, hair: null, eye: null, neck: null };
let manualMode = false;              // true = dùng vùng thủ công thay cho parsing mask
let manualImageDims = { W: 0, H: 0 }; // kích thước ảnh đã scale, để map toạ độ canvas ↔ ảnh

// ── DOM refs ──────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const modelStatusBadge = $("model-status");
const dropZone         = $("drop-zone");
const imageInput       = $("image-input");
const previewContainer = $("preview-container");
const previewImg       = $("preview-img");
const btnClear         = $("btn-clear");
const btnAnalyze       = $("btn-analyze");
const btnWeather       = $("btn-weather");
const btnDemo          = $("btn-demo");
const spinnerSection   = $("spinner-section");
const spinnerMsg       = $("spinner-msg");
const placeholderSection = $("placeholder-section");
const resultSection    = $("result-section");

// ═══════════════════════════════════════════════════════════════════════════════
// 1. ONNX MODEL LOADING
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// 2. IMAGE HANDLING
// ═══════════════════════════════════════════════════════════════════════════════

function handleImageFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = e => {
    currentImage = e.target.result;
    previewImg.src = currentImage;
    dropZone.classList.add("d-none");
    previewContainer.classList.remove("d-none");
    if (onnxSession) btnAnalyze.disabled = false;
    // Ảnh mới → reset vùng thủ công + refresh canvas nếu modal đang mở
    manualRegions.skin = manualRegions.hair = manualRegions.eye = manualRegions.neck = null;
    manualMode = false;
    if ($("manual-modal")?.classList.contains("show")) setupManualCanvas();
    // Cho phép dùng công cụ thủ công (nút mở nằm trong card, hiện sẵn khi có ảnh)
    manualCard()?.classList.remove("d-none");
    updateManualStatus?.();
  };
  reader.readAsDataURL(file);
}

dropZone.addEventListener("click", () => imageInput.click());
dropZone.addEventListener("dragover", e => { e.preventDefault(); dropZone.classList.add("drag-over"); });
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
dropZone.addEventListener("drop", e => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  handleImageFile(e.dataTransfer.files[0]);
});
imageInput.addEventListener("change", () => handleImageFile(imageInput.files[0]));

btnClear.addEventListener("click", () => {
  currentImage = null;
  previewImg.src = "";
  imageInput.value = "";
  previewContainer.classList.add("d-none");
  dropZone.classList.remove("d-none");
  btnAnalyze.disabled = true;
  // Reset manual region state
  manualRegions.skin = manualRegions.hair = manualRegions.eye = manualRegions.neck = null;
  manualMode = false;
  getManualModal()?.hide();
  manualCard()?.classList.add("d-none");
  $("dist-chart-card")?.classList.add("d-none");
  lastColorDistribution = {};
  lastResult = null;
  colorOverride = { face: null, hair: null, eye: null, body: null };
  lastExtract = null;
  updateManualStatus?.();
  hideResults();
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. COLOUR EXTRACTION FROM IMAGE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convert CIE LAB → sRGB hex string.
 * Inverse of rgbToLab – used to display extracted colour swatches.
 */
function labToHex(L, a, b) {
  // LAB → XYZ (D65)
  const fy = (L + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - b / 200;
  const f3 = t => (t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787);
  let X = f3(fx) * 0.95047;
  let Y = f3(fy) * 1.00000;
  let Z = f3(fz) * 1.08883;

  // XYZ → linear sRGB
  let r =  X *  3.2404542 + Y * -1.5371385 + Z * -0.4985314;
  let g =  X * -0.9692660 + Y *  1.8760108 + Z *  0.0415560;
  let bv = X *  0.0556434 + Y * -0.2040259 + Z *  1.0572252;

  // Linear → gamma-corrected sRGB [0-255]
  const gamma = v => {
    v = Math.max(0, Math.min(1, v));
    return Math.round((v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055) * 255);
  };
  const R = gamma(r), G = gamma(g), B = gamma(bv);
  return `#${R.toString(16).padStart(2, "0")}${G.toString(16).padStart(2, "0")}${B.toString(16).padStart(2, "0")}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. COLOUR EXTRACTION — BiSeNet Face Parsing + MediaPipe iris
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * BiSeNet ResNet18 — 19-class face parsing (CelebAMask-HQ)
 * Input:  [1, 3, 512, 512]  float32  RGB  normalized ImageNet
 * Output: [1, 19, H, W]     float32  logits → argmax → class mask
 *
 * Class indices used here:
 *   1  → skin (da mặt)   13 → neck (cổ)
 *   16 → hair            17 → hat (loại bỏ khỏi tóc)
 *   4,5 → l_eye/r_eye   15 → cloth (áo — loại bỏ)
 */
const PARSE_CLASS = {
  BACKGROUND: 0, SKIN: 1, L_BROW: 2, R_BROW: 3,
  L_EYE: 4, R_EYE: 5, EYE_G: 6, L_EAR: 7, R_EAR: 8, EAR_R: 9,
  NOSE: 10, MOUTH: 11, U_LIP: 12, L_LIP: 13, NECK: 14, NECK_L: 15,
  CLOTH: 16, HAIR: 17, HAT: 18,
};

// Input normalization — ImageNet mean/std
const PARSE_MEAN = [0.485, 0.456, 0.406];
const PARSE_STD  = [0.229, 0.224, 0.225];
const PARSE_SIZE = 512;

let parsingSession = null;
let parsingSessionReady = false;   // true = load xong (kể cả khi fail)
let _parsingLoadPromise = null;    // Promise dùng để await nếu chưa load xong

const PARSE_CACHE = "pca-parsing-v1";
const PARSE_URL   = "/face_parsing.onnx";

/**
 * Kiểm tra một ArrayBuffer có phải model ONNX hợp lệ không.
 * Bắt các trường hợp server trả HTML (SPA fallback), file rỗng, hoặc bị cắt.
 * ONNX là protobuf; byte đầu thường là 0x08 (field 1 = ir_version, varint).
 * Ta kiểm tra: đủ lớn + KHÔNG bắt đầu bằng dấu hiệu HTML/text.
 */
function isValidOnnxBuffer(buf, minBytes = 1_000_000) {
  if (!buf || buf.byteLength < minBytes) return false;
  const head = new Uint8Array(buf, 0, Math.min(64, buf.byteLength));
  // Loại HTML/text: '<' (0x3C) hoặc BOM/whitespace mở đầu của trang lỗi.
  const first = head[0];
  if (first === 0x3c) return false;                    // '<' → HTML
  // Chuỗi "<!DOCTYPE" / "<html" phòng khi có khoảng trắng đầu
  const asText = new TextDecoder("utf-8", { fatal: false })
    .decode(head).trim().slice(0, 16).toLowerCase();
  if (asText.startsWith("<!") || asText.startsWith("<html")) return false;
  return true;
}

/**
 * Tải một model ONNX từ URL, dùng Cache API, CÓ kiểm tra tính hợp lệ.
 * - Nếu cache chứa dữ liệu hỏng (vd HTML fallback từ lần trước) → tự xoá, tải lại.
 * - Nếu network trả dữ liệu hỏng → báo lỗi rõ ràng, không cache.
 * Trả về ArrayBuffer sạch, sẵn sàng cho InferenceSession.create().
 */
async function loadValidatedOnnx(url, cacheName, minBytes, label) {
  const validateOrThrow = (buf, source) => {
    if (!isValidOnnxBuffer(buf, minBytes)) {
      throw new Error(
        `${label}: dữ liệu không hợp lệ từ ${source} ` +
        `(${buf?.byteLength ?? 0} bytes — có thể server trả HTML thay vì file .onnx).`
      );
    }
    return buf;
  };

  if (typeof caches !== "undefined") {
    const cache  = await caches.open(cacheName);
    const cached = await cache.match(url);
    if (cached) {
      const buf = await cached.arrayBuffer();
      if (isValidOnnxBuffer(buf, minBytes)) {
        console.log(`[${label}] Loaded from browser cache (${(buf.byteLength/1e6).toFixed(1)} MB).`);
        return buf;
      }
      console.warn(`[${label}] Cache chứa dữ liệu hỏng — xoá và tải lại.`);
      await cache.delete(url);
    }
    console.log(`[${label}] Downloading ${url}…`);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`${label}: HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    validateOrThrow(buf, "network");
    // Chỉ cache khi đã xác nhận hợp lệ.
    await cache.put(url, new Response(buf, { headers: res.headers }));
    return buf;
  }

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${label}: HTTP ${res.status}`);
  return validateOrThrow(await res.arrayBuffer(), "network");
}

/** Fetch bytes của face_parsing.onnx — có kiểm tra hợp lệ + tự chữa cache hỏng. */
async function fetchParsingBuffer() {
  return loadValidatedOnnx(PARSE_URL, PARSE_CACHE, 5_000_000, "parsing");
}

/** @deprecated — dùng fetchParsingBuffer() + InferenceSession.create() trực tiếp */
async function loadParsingModel() {
  try {
    let buf;
    if (typeof caches !== "undefined") {
      const cache  = await caches.open(PARSE_CACHE);
      const cached = await cache.match(PARSE_URL);
      if (cached) {
        console.log("[parsing] Loaded from browser cache.");
        buf = await cached.arrayBuffer();
      } else {
        console.log("[parsing] Downloading face_parsing.onnx…");
        const res = await fetch(PARSE_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await cache.put(PARSE_URL, res.clone());
        buf = await res.arrayBuffer();
      }
    } else {
      const res = await fetch(PARSE_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      buf = await res.arrayBuffer();
    }
    parsingSession = await ort.InferenceSession.create(buf, {
      executionProviders: ["wasm"],
    });
    console.log("[parsing] BiSeNet session ready.");
    console.log("[parsing] Inputs:",  parsingSession.inputNames);
    console.log("[parsing] Outputs:", parsingSession.outputNames);
  } catch (e) {
    console.warn("[parsing] Failed to load face_parsing.onnx:", e.message);
    parsingSession = null;
  }
}

/**
 * Chạy BiSeNet inference trên canvas.
 * Trả về Uint8Array [W × H] — mỗi pixel là class index (0–18).
 * Kích thước = kích thước canvas gốc (sau resize nội bộ).
 */
async function runFaceParsing(canvas) {
  if (!parsingSession) return null;

  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext("2d");
  const raw = ctx.getImageData(0, 0, W, H).data; // RGBA

  // ── Resize về 512×512 và normalize ───────────────────────────────────────
  const tmpCanvas = document.createElement("canvas");
  tmpCanvas.width = PARSE_SIZE; tmpCanvas.height = PARSE_SIZE;
  const tmpCtx = tmpCanvas.getContext("2d");
  tmpCtx.drawImage(canvas, 0, 0, PARSE_SIZE, PARSE_SIZE);
  const resized = tmpCtx.getImageData(0, 0, PARSE_SIZE, PARSE_SIZE).data;

  // RGBA → float32 BCHW normalized
  const tensor = new Float32Array(1 * 3 * PARSE_SIZE * PARSE_SIZE);
  for (let i = 0; i < PARSE_SIZE * PARSE_SIZE; i++) {
    const r = resized[i * 4]     / 255.0;
    const g = resized[i * 4 + 1] / 255.0;
    const b = resized[i * 4 + 2] / 255.0;
    tensor[0 * PARSE_SIZE * PARSE_SIZE + i] = (r - PARSE_MEAN[0]) / PARSE_STD[0]; // R channel
    tensor[1 * PARSE_SIZE * PARSE_SIZE + i] = (g - PARSE_MEAN[1]) / PARSE_STD[1]; // G channel
    tensor[2 * PARSE_SIZE * PARSE_SIZE + i] = (b - PARSE_MEAN[2]) / PARSE_STD[2]; // B channel
  }

  const inputTensor = new ort.Tensor("float32", tensor, [1, 3, PARSE_SIZE, PARSE_SIZE]);
  const feeds = { [parsingSession.inputNames[0]]: inputTensor };

  const t0 = performance.now();
  const out = await parsingSession.run(feeds);
  console.log(`[parsing] Inference: ${(performance.now() - t0).toFixed(0)} ms`);

  const logits = out[parsingSession.outputNames[0]].data; // Float32Array [1, 19, pH, pW]
  const dims   = out[parsingSession.outputNames[0]].dims;
  const pH = dims[2], pW = dims[3];  // output spatial size (thường = 512×512)
  const nC = dims[1];                // 19 classes

  // Argmax per pixel trên 19 channels → class mask [pH × pW]
  const maskSmall = new Uint8Array(pH * pW);
  for (let y = 0; y < pH; y++) {
    for (let x = 0; x < pW; x++) {
      let maxVal = -Infinity, maxCls = 0;
      for (let c = 0; c < nC; c++) {
        const v = logits[c * pH * pW + y * pW + x];
        if (v > maxVal) { maxVal = v; maxCls = c; }
      }
      maskSmall[y * pW + x] = maxCls;
    }
  }

  // Scale mask lại kích thước canvas gốc nếu khác 512×512
  if (pH === H && pW === W) return maskSmall;

  const maskFull = new Uint8Array(W * H);
  const scaleY = pH / H, scaleX = pW / W;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const sy = Math.min(pH - 1, Math.round(y * scaleY));
      const sx = Math.min(pW - 1, Math.round(x * scaleX));
      maskFull[y * W + x] = maskSmall[sy * pW + sx];
    }
  }
  return maskFull;
}

// ── MediaPipe iris landmarks (vẫn dùng cho mắt vì BiSeNet không phân tách iris) ─
const LM = {
  IRIS_LEFT:  [468, 469, 470, 471, 472],
  IRIS_RIGHT: [473, 474, 475, 476, 477],
  FACE_OVAL: [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361,
    288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149,
    150, 136, 172, 58,  132,  93, 234, 127, 162,  21,  54,
    103,  67, 109,
  ],
  CHIN:     152,
  JAW_L:     58,
  JAW_R:    288,
  FOREHEAD:  10,
};

let faceMeshInstance = null;

function getFaceMesh() {
  if (faceMeshInstance) return Promise.resolve(faceMeshInstance);
  return new Promise((resolve, reject) => {
    const fm = new window.FaceMesh({
      locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`,
    });
    fm.setOptions({
      maxNumFaces: 1, refineLandmarks: true,
      minDetectionConfidence: 0.5, minTrackingConfidence: 0.5,
    });
    fm.onResults(() => {});
    fm.initialize().then(() => { faceMeshInstance = fm; resolve(fm); }).catch(reject);
  });
}

function detectFaceLandmarks(fm, imageEl) {
  return new Promise((resolve) => {
    fm.onResults(r => resolve(r.multiFaceLandmarks?.[0] ?? null));
    fm.send({ image: imageEl }).catch(() => resolve(null));
  });
}

// ── Pixel sampling từ buffer + mask ──────────────────────────────────────────

function rgbToLab(r, g, b) {
  const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v+0.055)/1.055, 2.4); };
  let X = lin(r)*0.4124564 + lin(g)*0.3575761 + lin(b)*0.1804375;
  let Y = lin(r)*0.2126729 + lin(g)*0.7151522 + lin(b)*0.0721750;
  let Z = lin(r)*0.0193339 + lin(g)*0.1191920 + lin(b)*0.9503041;
  X /= 0.95047; Z /= 1.08883;
  const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787*t+16/116;
  return { L: 116*f(Y)-16, a: 500*(f(X)-f(Y)), b: 200*(f(Y)-f(Z)) };
}

// Lưu phân bố màu của lần trích xuất gần nhất — dùng để vẽ chart đánh giá.
// { skin: {samples:[{L,a,b,kept}], center:{L,a,b}, kept, total, trimDeltaE}, hair:{...}, ... }
let lastColorDistribution = {};

/**
 * Lọc "khối màu đột biến" (robust central colour) từ tập mẫu LAB.
 * Chiến lược: lấy median làm tâm ban đầu → giữ pixel trong ΔE, tính lại tâm =
 * mean của phần giữ lại → lặp 2 lần (loại được cả CỤM màu lớn lệch, không chỉ
 * pixel đơn lẻ). Trả về tâm + đánh dấu kept/dropped cho từng mẫu (để vẽ chart).
 */
function robustLabFromSamples(Ls, As, Bs, trimDeltaE = 18) {
  const n = Ls.length;
  if (n === 0) return { L: 55, a: 8, b: 12, count: 0, kept: [], center: null };

  const median = arr => {
    const s = [...arr].sort((x, y) => x - y);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };

  // Tâm khởi tạo = median (bền outlier)
  let cL = median(Ls), cA = median(As), cB = median(Bs);
  const kept = new Uint8Array(n);

  for (let iter = 0; iter < 2; iter++) {
    let sL = 0, sA = 0, sB = 0, c = 0;
    for (let k = 0; k < n; k++) {
      const dE = Math.sqrt((Ls[k] - cL) ** 2 + (As[k] - cA) ** 2 + (Bs[k] - cB) ** 2);
      const keep = dE <= trimDeltaE;
      kept[k] = keep ? 1 : 0;
      if (keep) { sL += Ls[k]; sA += As[k]; sB += Bs[k]; c++; }
    }
    if (c > 0) { cL = sL / c; cA = sA / c; cB = sB / c; }  // tâm mới = mean phần giữ
  }

  let sumL = 0, sumA = 0, sumB = 0, count = 0;
  for (let k = 0; k < n; k++) {
    if (kept[k]) { sumL += Ls[k]; sumA += As[k]; sumB += Bs[k]; count++; }
  }
  if (count === 0) return { L: cL, a: cA, b: cB, count: n, kept, center: { L: cL, a: cA, b: cB } };
  return {
    L: sumL / count, a: sumA / count, b: sumB / count, count,
    kept, center: { L: cL, a: cA, b: cB },
  };
}

/** Lưu phân bố (giảm mẫu để chart nhẹ) vào lastColorDistribution[region]. */
function storeDistribution(region, Ls, As, Bs, result, trimDeltaE) {
  const n = Ls.length;
  const MAX_PTS = 600;
  const stride = Math.max(1, Math.floor(n / MAX_PTS));
  const samples = [];
  for (let k = 0; k < n; k += stride) {
    samples.push({ L: Ls[k], a: As[k], b: Bs[k], kept: result.kept ? !!result.kept[k] : true });
  }
  lastColorDistribution[region] = {
    samples, center: result.center, kept: result.count, total: n, trimDeltaE,
  };
}

/**
 * Sample LAB từ các pixel có class ∈ targetClasses (loại excludeClasses),
 * CÓ lọc outlier + lọc khối màu đột biến (robustLabFromSamples).
 *   - erodeBoundary: bỏ pixel da sát ranh giới môi/mắt/lông mày/tóc.
 *   - region: tên vùng để lưu phân bố cho chart ("skin"/"hair"/"neck"…).
 * Trả về {L,a,b,count}.
 */
function sampleMaskedLab(buf, mask, W, H, targetClasses, excludeClasses = [], opts = {}) {
  const { erodeBoundary = false, trimDeltaE = 18, region = null } = opts;
  const targetSet  = new Set(targetClasses);
  const excludeSet = new Set(excludeClasses);

  // Các class "không phải da" cần tránh khi làm sạch ranh giới vùng da.
  const NON_SKIN_NEIGHBORS = new Set([
    PARSE_CLASS.L_BROW, PARSE_CLASS.R_BROW,
    PARSE_CLASS.L_EYE,  PARSE_CLASS.R_EYE, PARSE_CLASS.EYE_G,
    PARSE_CLASS.U_LIP,  PARSE_CLASS.L_LIP, PARSE_CLASS.MOUTH,
    PARSE_CLASS.HAIR,   PARSE_CLASS.HAT,   PARSE_CLASS.CLOTH,
    PARSE_CLASS.BACKGROUND,
  ]);

  const isBoundary = (i) => {
    const x = i % W, y = (i / W) | 0;
    if (x > 0     && NON_SKIN_NEIGHBORS.has(mask[i - 1])) return true;
    if (x < W - 1 && NON_SKIN_NEIGHBORS.has(mask[i + 1])) return true;
    if (y > 0     && NON_SKIN_NEIGHBORS.has(mask[i - W])) return true;
    if (y < H - 1 && NON_SKIN_NEIGHBORS.has(mask[i + W])) return true;
    return false;
  };

  // ── Pass 1: thu thập mẫu LAB hợp lệ ─────────────────────────────────────
  const Ls = [], As = [], Bs = [];
  const step = Math.max(1, Math.floor(W * H / 4000));
  for (let i = 0; i < W * H; i += step) {
    const cls = mask[i];
    if (!targetSet.has(cls) || excludeSet.has(cls)) continue;
    if (erodeBoundary && isBoundary(i)) continue;
    const off = i * 4;
    if (buf[off + 3] < 128) continue;
    const lab = rgbToLab(buf[off], buf[off + 1], buf[off + 2]);
    Ls.push(lab.L); As.push(lab.a); Bs.push(lab.b);
  }

  if (Ls.length === 0) {
    if (erodeBoundary) {
      return sampleMaskedLab(buf, mask, W, H, targetClasses, excludeClasses,
        { ...opts, erodeBoundary: false });
    }
    return { L: 55, a: 8, b: 12, count: 0 };
  }

  // ── Pass 2: lọc khối màu đột biến ─────────────────────────────────────────
  const res = robustLabFromSamples(Ls, As, Bs, trimDeltaE);
  if (region) storeDistribution(region, Ls, As, Bs, res, trimDeltaE);
  return { L: res.L, a: res.a, b: res.b, count: res.count };
}

/** Sample LAB tại các điểm landmark (cho iris). */
function sampleLandmarksLab(buf, landmarks, indices, W, H, patchSize = 7, region = null) {
  const Ls = [], As = [], Bs = [];
  const half = Math.floor(patchSize / 2);
  for (const idx of indices) {
    const lm = landmarks[idx];
    if (!lm) continue;
    const cx = Math.round(lm.x * W), cy = Math.round(lm.y * H);
    for (let dy = -half; dy <= half; dy++) {
      for (let dx = -half; dx <= half; dx++) {
        const px = cx+dx, py = cy+dy;
        if (px < 0 || px >= W || py < 0 || py >= H) continue;
        const off = (py*W+px)*4;
        if (buf[off+3] < 128) continue;
        const lab = rgbToLab(buf[off], buf[off+1], buf[off+2]);
        Ls.push(lab.L); As.push(lab.a); Bs.push(lab.b);
      }
    }
  }
  if (Ls.length === 0) return { L: 40, a: 2, b: 2 };
  const res = robustLabFromSamples(Ls, As, Bs, 22);   // mắt: trim rộng vì mẫu ít
  if (region) storeDistribution(region, Ls, As, Bs, res, 22);
  return { L: res.L, a: res.a, b: res.b };
}

function rectUniformity(buf, mask, W, H, targetClass) {
  const Ls = [];
  const step = Math.max(1, Math.floor(W * H / 3000));
  for (let i = 0; i < W * H; i += step) {
    if (mask[i] !== targetClass) continue;
    const off = i * 4;
    Ls.push(0.299*buf[off] + 0.587*buf[off+1] + 0.114*buf[off+2]);
  }
  if (Ls.length < 2) return 0.8;
  const mean = Ls.reduce((s,v) => s+v, 0) / Ls.length;
  const std  = Math.sqrt(Ls.reduce((s,v) => s+(v-mean)**2, 0) / Ls.length);
  return Math.max(0, Math.min(1, 1 - std/80));
}

function analyseImageQuality(buf, W, H) {
  let sumR=0, sumG=0, sumB=0, shadow=0, highlight=0, n=0;
  const step = Math.max(1, Math.floor(W*H/2000));
  for (let i=0; i<W*H; i+=step) {
    const off=i*4;
    const lum=0.299*buf[off]+0.587*buf[off+1]+0.114*buf[off+2];
    sumR+=buf[off]; sumG+=buf[off+1]; sumB+=buf[off+2];
    if (lum<40) shadow++; if (lum>215) highlight++;
    n++;
  }
  const mean=(sumR+sumG+sumB)/(3*n);
  return {
    white_balance_shift: Math.max(-0.3, Math.min(0.3, (sumR/n-mean)/128)),
    shadow_level:    Math.min(0.6, shadow/n),
    highlight_level: Math.min(0.6, highlight/n),
    noise_level:     Math.random()*0.04+0.01,
  };
}

/**
 * Vẽ debug overlay với class mask từ BiSeNet.
 */
function drawDebugOverlay(srcCanvas, mask, landmarks, regions, W, H) {
  const dbgEl   = document.getElementById("debug-canvas");
  const dbgBody = document.getElementById("debug-overlay-body");
  if (!dbgEl || !document.getElementById("toggle-debug")?.checked) return;
  dbgBody.classList.remove("d-none");

  dbgEl.width = W; dbgEl.height = H;
  const dctx = dbgEl.getContext("2d");
  dctx.drawImage(srcCanvas, 0, 0, W, H);

  // Vẽ color overlay cho từng class
  const CLASS_COLORS = {
    [PARSE_CLASS.SKIN]:  [0, 255, 100, 120],   // xanh lá — da mặt
    [PARSE_CLASS.HAIR]:  [255, 140, 0,  140],   // cam — tóc
    [PARSE_CLASS.HAT]:   [255, 0,   0,  120],   // đỏ — mũ (loại bỏ)
    [PARSE_CLASS.NECK]:  [255, 0,   200, 120],  // hồng — cổ
    [PARSE_CLASS.CLOTH]: [100, 100, 255, 80],   // xanh dương nhạt — áo
    [PARSE_CLASS.L_EYE]: [0,   180, 255, 160],  // cyan — mắt trái
    [PARSE_CLASS.R_EYE]: [0,   220, 255, 160],  // cyan nhạt — mắt phải
  };

  // Vẽ pixel overlay
  const overlayData = dctx.getImageData(0, 0, W, H);
  const od = overlayData.data;
  for (let i = 0; i < W * H; i++) {
    const cls = mask[i];
    const col = CLASS_COLORS[cls];
    if (!col) continue;
    const off = i * 4;
    od[off]   = Math.min(255, od[off]   * 0.5 + col[0] * 0.5);
    od[off+1] = Math.min(255, od[off+1] * 0.5 + col[1] * 0.5);
    od[off+2] = Math.min(255, od[off+2] * 0.5 + col[2] * 0.5);
  }
  dctx.putImageData(overlayData, 0, 0);

  // Vẽ iris landmarks nếu có
  if (landmarks) {
    [...LM.IRIS_LEFT, ...LM.IRIS_RIGHT].forEach(idx => {
      const lm = landmarks[idx]; if (!lm) return;
      dctx.beginPath();
      dctx.arc(lm.x*W, lm.y*H, 4, 0, Math.PI*2);
      dctx.fillStyle = "#00aaff"; dctx.fill();
    });
  }

  // Color chips cho từng vùng
  const chip = (x, y, hex, label) => {
    if (!hex) return;
    x = Math.max(4, Math.min(W-90, Math.round(x)));
    y = Math.max(4, Math.min(H-20, Math.round(y)));
    dctx.fillStyle = hex;
    dctx.fillRect(x, y, 20, 12);
    dctx.strokeStyle = "#fff"; dctx.lineWidth = 1;
    dctx.strokeRect(x, y, 20, 12);
    dctx.fillStyle = "#fff";
    dctx.font = "bold 9px monospace";
    dctx.fillText(hex + " " + label, x+23, y+10);
  };

  if (regions) {
    chip(10, 10, regions.faceHex, "skin");
    chip(10, 28, regions.hairHex, "hair");
    chip(10, 46, regions.eyeHex,  "iris");
    chip(10, 64, regions.neckHex, "neck");
  }
}

/**
 * extractFeatures() — BiSeNet parsing edition.
 * Throws { code: "NO_FACE" } nếu không parse được da mặt.
 */
async function extractFeatures(imageSrc) {
  // ── 1. Load ảnh ───────────────────────────────────────────────────────────
  const img = await new Promise((res, rej) => {
    const el = new Image();
    el.onload = () => res(el);
    el.onerror = rej;
    el.src = imageSrc;
  });

  const MAX = 512;
  const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
  const W = Math.round(img.naturalWidth  * scale);
  const H = Math.round(img.naturalHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, W, H);

  // ── 2. Cache pixel buffer ─────────────────────────────────────────────────
  const buf = ctx.getImageData(0, 0, W, H).data;

  // ── 2b. Manual mode → dùng vùng người dùng đã vẽ, bỏ qua parsing ──────────
  if (manualMode && manualRegions.skin) {
    console.log("[extract] Manual region mode — sampling from user rectangles.");
    return extractFeaturesFromManualRegions(buf, W, H);
  }

  // ── 3. BiSeNet face parsing ───────────────────────────────────────────────
  console.log("[extract] Running BiSeNet face parsing…");

  // Nếu parsing model đang load → đợi nó xong (tối đa khi nào xong thì thôi)
  if (!parsingSessionReady && _parsingLoadPromise) {
    console.log("[extract] Waiting for face parsing model to finish loading…");
    setSpinnerMsg(t("spinner_wait_parsing"));
    await _parsingLoadPromise;
  }

  const mask = await runFaceParsing(canvas);

  if (!mask) {
    // Parsing không dùng được → bật chế độ chọn vùng thủ công cho người dùng.
    showManualRegionCard(true);
    const err = new Error(
      parsingSession === null
        ? "Face parsing model không load được — hãy dùng công cụ 'Chọn vùng màu thủ công' để vẽ vùng lấy màu."
        : "Face parsing trả về kết quả rỗng — hãy dùng công cụ 'Chọn vùng màu thủ công'."
    );
    err.code = "MANUAL_FALLBACK";
    throw err;
  }

  // Đếm pixels mỗi class để debug
  const classCounts = new Array(19).fill(0);
  for (let i = 0; i < mask.length; i++) classCounts[mask[i]]++;
  console.log("[extract] Class pixel counts:", Object.fromEntries(
    Object.entries(PARSE_CLASS).map(([k, v]) => [k, classCounts[v]])
  ));

  // Kiểm tra có da mặt không
  if (classCounts[PARSE_CLASS.SKIN] < 50) {
    showManualRegionCard(true);
    const err = new Error("Không tìm thấy da mặt trong ảnh — hãy dùng công cụ 'Chọn vùng màu thủ công' để vẽ vùng lấy màu.");
    err.code = "MANUAL_FALLBACK";
    throw err;
  }

  // ── 4. DA MẶT — class SKIN, ăn mòn ranh giới (bỏ pixel sát môi/mắt/lông
  //        mày/tóc) + lọc khối màu đột biến để không kéo tông về môi/bóng.
  lastColorDistribution = {};
  const faceLab = sampleMaskedLab(buf, mask, W, H,
    [PARSE_CLASS.SKIN],
    [PARSE_CLASS.CLOTH, PARSE_CLASS.HAT,
     PARSE_CLASS.U_LIP, PARSE_CLASS.L_LIP, PARSE_CLASS.MOUTH,
     PARSE_CLASS.L_BROW, PARSE_CLASS.R_BROW,
     PARSE_CLASS.L_EYE, PARSE_CLASS.R_EYE, PARSE_CLASS.EYE_G],
    { erodeBoundary: true, trimDeltaE: 15, region: "skin" }
  );

  // ── 5. TÓC — class HAIR, loại trừ HAT (lọc outlier nhẹ hơn vì tóc đa sắc) ─
  const hairLab = classCounts[PARSE_CLASS.HAIR] > 30
    ? sampleMaskedLab(buf, mask, W, H, [PARSE_CLASS.HAIR], [PARSE_CLASS.HAT],
        { erodeBoundary: true, trimDeltaE: 25, region: "hair" })
    : { L: 30, a: 3, b: 5, count: 0 };

  // ── 6. CỔ / BODY ──────────────────────────────────────────────────────────
  const neckLab = classCounts[PARSE_CLASS.NECK] > 20
    ? sampleMaskedLab(buf, mask, W, H, [PARSE_CLASS.NECK],
        [PARSE_CLASS.CLOTH, PARSE_CLASS.HAIR], { erodeBoundary: true, trimDeltaE: 18, region: "neck" })
    : { ...faceLab, L: faceLab.L - 4 };   // fallback: ước tính từ face

  // ── 7. MẮT — dùng MediaPipe iris landmarks (BiSeNet không phân tách iris) ─
  let eyeLab = { L: 35, a: 2, b: 3 };
  let faceLandmarks = null;
  try {
    const fm = await getFaceMesh();
    faceLandmarks = await detectFaceLandmarks(fm, canvas);
    if (faceLandmarks) {
      eyeLab = sampleLandmarksLab(
        buf, faceLandmarks, [...LM.IRIS_LEFT, ...LM.IRIS_RIGHT], W, H, 5, "eye"
      );
    }
  } catch { /* iris lấy thất bại — dùng fallback */ }

  // ── 8+. Build feature object (shared với manual-region path) ──────────────
  return buildFeatureObject({
    faceLab, hairLab, neckLab, eyeLab, buf, W, H, mask,
    canvas, faceLandmarks, classCounts,
  });
}

/**
 * buildFeatureObject — tính makeup detection + derived + engineered features
 * từ 4 vùng LAB (face/hair/neck/eye). Dùng chung cho:
 *   - Auto path: mask ≠ null (BiSeNet)  → makeup detect chính xác từ mask
 *   - Manual path: mask == null         → makeup detect suy giảm (dựa trên rectangle skin)
 */
function buildFeatureObject({ faceLab, hairLab, neckLab, eyeLab, buf, W, H, mask,
                              canvas = null, faceLandmarks = null, classCounts = null }) {
  const hasMask = mask != null;

  // Lưu LAB gốc + ngữ cảnh để có thể tính lại khi người dùng chỉnh màu (color override).
  lastExtract = { buf, W, H, mask, classCounts,
    faceLab: { ...faceLab }, hairLab: { ...hairLab },
    neckLab: { ...neckLab }, eyeLab: { ...eyeLab } };

  // Áp override màu người dùng (nếu có) — thay LAB của vùng tương ứng.
  if (colorOverride.face) faceLab = { ...faceLab, ...colorOverride.face };
  if (colorOverride.hair) hairLab = { ...hairLab, ...colorOverride.hair };
  if (colorOverride.eye)  eyeLab  = { ...eyeLab,  ...colorOverride.eye };
  if (colorOverride.body) neckLab = { ...neckLab, ...colorOverride.body };

  // ── Makeup detection ──────────────────────────────────────────────────────
  let has_lipstick = 0;
  if (hasMask && classCounts) {
    const lipPixels = classCounts[PARSE_CLASS.U_LIP] + classCounts[PARSE_CLASS.L_LIP];
    has_lipstick = lipPixels > 20 ? 1 : 0;
  }

  const has_foundation = hasMask && faceLab.count > 100
    ? (rectUniformity(buf, mask, W, H, PARSE_CLASS.SKIN) > 0.72 ? 1 : 0)
    : 0;

  // Blush / redness — trên skin mask nếu có, hoặc trên rectangle skin (manual)
  let cheekRedness = 0, cheekCount = 0;
  const step = Math.max(1, Math.floor(W * H / 2000));
  if (hasMask) {
    for (let i = 0; i < W * H; i += step) {
      if (mask[i] !== PARSE_CLASS.SKIN) continue;
      const off = i * 4;
      if (buf[off] > buf[off + 1] + 20 && buf[off] > buf[off + 2] + 20) cheekRedness++;
      cheekCount++;
    }
  } else if (manualRegions.skin) {
    const r = manualRegions.skin;
    const x0 = Math.max(0, Math.floor(r.x)), y0 = Math.max(0, Math.floor(r.y));
    const x1 = Math.min(W, Math.ceil(r.x + r.w)), y1 = Math.min(H, Math.ceil(r.y + r.h));
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const off = (y * W + x) * 4;
        if (buf[off] > buf[off + 1] + 20 && buf[off] > buf[off + 2] + 20) cheekRedness++;
        cheekCount++;
      }
    }
  }
  const has_blush = cheekCount > 0 && cheekRedness / cheekCount > 0.15 ? 1 : 0;
  const has_contour = 0;

  // ── Derived values ────────────────────────────────────────────────────────
  const face_chroma = Math.sqrt(faceLab.a**2 + faceLab.b**2);
  const body_chroma = Math.sqrt(neckLab.a**2 + neckLab.b**2);
  const hair_chroma = Math.sqrt(hairLab.a**2 + hairLab.b**2);
  const eye_chroma  = Math.sqrt(eyeLab.a**2  + eyeLab.b**2);

  const hair_undertone = hairLab.b > 10 ? 1 : hairLab.b < -2 ? -1 : 0;
  const eye_clarity    = Math.min(1, eye_chroma / 25);

  const contrast_face_hair = Math.abs(faceLab.L - hairLab.L) / 100;
  const contrast_face_eye  = Math.abs(faceLab.L - eyeLab.L)  / 100;
  const contrast_overall   = (contrast_face_hair + contrast_face_eye) / 2;

  const face_redness = cheekCount > 0 ? cheekRedness / cheekCount : 0.1;
  const face_uniformity = has_foundation ? 0.78 : 0.65;

  const quality  = analyseImageQuality(buf, W, H);
  // Ethnicity baseline: dùng giá trị người dùng chọn nếu có, ngược lại tự ước lượng.
  let eth_L, eth_a, eth_b;
  const chosen = ETHNICITY_BASELINES[userEthnicity];
  if (chosen) {
    eth_L = chosen.L; eth_a = chosen.a; eth_b = chosen.b;
  } else {
    eth_L = faceLab.L * 0.9 + 6;
    eth_a = faceLab.a * 0.8;
    eth_b = faceLab.b * 0.8;
  }

  // ── Debug overlay (chỉ khi có mask + canvas) ──────────────────────────────
  if (hasMask && canvas) {
    drawDebugOverlay(canvas, mask, faceLandmarks, {
      faceHex: labToHex(faceLab.L, faceLab.a, faceLab.b),
      hairHex: labToHex(Math.max(5, hairLab.L), hairLab.a, hairLab.b),
      eyeHex:  labToHex(Math.max(5, eyeLab.L),  eyeLab.a,  eyeLab.b),
      neckHex: labToHex(Math.max(5, neckLab.L), neckLab.a, neckLab.b),
    }, W, H);
  }

  // ── Feature object ────────────────────────────────────────────────────────
  const features = {
    face_L: faceLab.L, face_a: faceLab.a, face_b: faceLab.b,
    face_chroma, face_redness, face_uniformity,
    body_L: neckLab.L, body_a: neckLab.a, body_b: neckLab.b, body_chroma,
    delta_L: faceLab.L - neckLab.L,
    delta_a: faceLab.a - neckLab.a,
    delta_b: faceLab.b - neckLab.b,
    hair_L: hairLab.L, hair_chroma, hair_undertone,
    eye_L: eyeLab.L, eye_chroma, eye_clarity,
    contrast_face_hair, contrast_face_eye, contrast_overall,
    uv_index:                weatherData.uv_index,
    cloud_cover:             weatherData.cloud_cover,
    sun_angle:               weatherData.sun_angle,
    ambient_light_condition: weatherData.ambient,
    ...quality,
    has_foundation, has_lipstick, has_contour, has_blush,
    ethnicity_baseline_L: eth_L,
    ethnicity_baseline_a: eth_a,
    ethnicity_baseline_b: eth_b,
  };

  // ── Engineered features ───────────────────────────────────────────────────
  const eps = 1e-6;
  features.ita_face      = (180/Math.PI) * Math.atan2(faceLab.L-50, Math.max(eps, faceLab.b));
  features.ita_body      = (180/Math.PI) * Math.atan2(neckLab.L-50, Math.max(eps, neckLab.b));
  features.warmth_score  = faceLab.a*0.4 + faceLab.b*0.4 + hair_undertone*10;
  features.depth_score   = (100-faceLab.L)*0.7 + (100-hairLab.L)*0.3;  // da chi phối; tóc đen không kéo nhầm sang deep
  features.clarity_score = contrast_overall*0.6 + eye_clarity*0.4;
  features.face_hair_dE  = Math.sqrt((faceLab.L-hairLab.L)**2 + faceLab.a**2 + faceLab.b**2);
  features.chroma_ratio  = face_chroma / (body_chroma + eps);
  features.skin_quality  = face_redness * face_uniformity;
  features.light_intensity = (weatherData.uv_index/11.0)*(1-weatherData.cloud_cover/100);
  features.face_L_res    = faceLab.L - eth_L;
  features.face_a_res    = faceLab.a - eth_a;
  features.face_b_res    = faceLab.b - eth_b;
  features.hair_warmth   = hair_chroma * (hair_undertone+1) / 2;

  console.log(`[extract] Results (${hasMask ? "auto" : "manual"}) →`,
    `skin  L=${faceLab.L.toFixed(1)} a=${faceLab.a.toFixed(1)} b=${faceLab.b.toFixed(1)} (n=${faceLab.count})`,
    `| hair L=${hairLab.L.toFixed(1)} (n=${hairLab.count})`,
    `| neck L=${neckLab.L.toFixed(1)}`,
    `| eye  L=${eyeLab.L.toFixed(1)}`
  );

  return features;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3b. MANUAL REGION SELECTION (fallback)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sample LAB của một rectangle trên pixel buffer (RGBA), CÓ lọc outlier
 * (median + trimmed mean) để môi/lông mày/bóng lọt vào khung không kéo lệch tông.
 * rect: {x,y,w,h} theo toạ độ ảnh gốc (đã scale). Trả về {L,a,b,count}.
 */
function sampleRectLab(buf, W, H, rect, trimDeltaE = 18, region = null) {
  if (!rect || rect.w < 2 || rect.h < 2) return { L: 55, a: 8, b: 12, count: 0 };
  const x0 = Math.max(0, Math.floor(rect.x));
  const y0 = Math.max(0, Math.floor(rect.y));
  const x1 = Math.min(W, Math.ceil(rect.x + rect.w));
  const y1 = Math.min(H, Math.ceil(rect.y + rect.h));

  const Ls = [], As = [], Bs = [];
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const off = (y * W + x) * 4;
      if (buf[off + 3] < 128) continue;
      const lab = rgbToLab(buf[off], buf[off + 1], buf[off + 2]);
      Ls.push(lab.L); As.push(lab.a); Bs.push(lab.b);
    }
  }
  if (Ls.length === 0) return { L: 55, a: 8, b: 12, count: 0 };

  const res = robustLabFromSamples(Ls, As, Bs, trimDeltaE);
  if (region) storeDistribution(region, Ls, As, Bs, res, trimDeltaE);
  return { L: res.L, a: res.a, b: res.b, count: res.count };
}

const MANUAL_REGION_META = {
  skin: { label: "Da mặt", color: "#00c853" },
  hair: { label: "Tóc",    color: "#ff8f00" },
  eye:  { label: "Mắt",    color: "#00b0ff" },
  neck: { label: "Cổ",     color: "#ff4081" },
};

const manualCard    = () => $("manual-region-card");
const manualCanvas  = () => $("manual-canvas");
const manualStatus  = () => $("manual-region-status");   // dòng nhỏ trong sidebar card
const manualModalStatus = () => $("manual-modal-status"); // dòng trong modal
const btnManualAnalyze = () => $("btn-manual-analyze");

let _manualImgEl = null;    // Image element của ảnh hiện tại (dùng để vẽ canvas)
let _manualModal = null;    // bootstrap.Modal instance

/** Lấy (hoặc tạo) bootstrap.Modal cho công cụ chọn vùng. */
function getManualModal() {
  const el = $("manual-modal");
  if (!el) return null;
  if (!_manualModal && window.bootstrap?.Modal) {
    _manualModal = new window.bootstrap.Modal(el);
  }
  return _manualModal;
}

/** Mở modal toàn màn hình + dựng canvas. */
async function openManualModal() {
  if (!currentImage) { showToast("Hãy chọn ảnh trước."); return; }
  manualCard()?.classList.remove("d-none");
  const modal = getManualModal();
  if (modal) modal.show();
  // Canvas cần được dựng SAU khi modal hiển thị (mới có kích thước layout).
  setTimeout(() => setupManualCanvas(), 200);
}

/** Loại vùng đang được chọn từ radio button. */
function currentManualType() {
  return document.querySelector('input[name="manual-region-type"]:checked')?.value ?? "skin";
}

/**
 * Chuẩn bị canvas manual: vẽ ảnh hiện tại lên, set kích thước hiển thị lớn
 * theo khung modal (giữ tỉ lệ). Internal buffer = kích thước ảnh scaled (≤512)
 * để sample chính xác; CSS phóng to cho dễ thao tác.
 */
async function setupManualCanvas() {
  if (!currentImage) return;
  const cv = manualCanvas();
  if (!cv) return;

  // Load ảnh và scale giống extractFeatures (≤512) — để toạ độ rectangle khớp
  // với buffer dùng khi sample trong extractFeaturesFromManualRegions.
  const img = await new Promise((res, rej) => {
    const el = new Image();
    el.onload = () => res(el);
    el.onerror = rej;
    el.src = currentImage;
  });
  _manualImgEl = img;

  const MAX = 512;
  const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
  const W = Math.round(img.naturalWidth * scale);
  const H = Math.round(img.naturalHeight * scale);
  manualImageDims = { W, H };

  cv.width = W;
  cv.height = H;

  // Kích thước HIỂN THỊ: lấp đầy stage (giữ tỉ lệ). CSS max-width/height:100%
  // đã giới hạn, ta chỉ cần set width để phóng to lên gần chiều rộng stage.
  const stage = cv.closest(".manual-stage");
  if (stage) {
    const availW = stage.clientWidth  - 16;
    const availH = stage.clientHeight - 16;
    if (availW > 0 && availH > 0) {
      const dispScale = Math.min(availW / W, availH / H);
      cv.style.width  = `${Math.round(W * dispScale)}px`;
      cv.style.height = `${Math.round(H * dispScale)}px`;
    }
  }

  redrawManualCanvas();
  updateManualStatus();
}

/** Vẽ lại canvas: ảnh + tất cả rectangle đã chọn. */
function redrawManualCanvas(previewRect = null) {
  const cv = manualCanvas();
  if (!cv || !_manualImgEl) return;
  const { W, H } = manualImageDims;
  const ctx = cv.getContext("2d");
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(_manualImgEl, 0, 0, W, H);

  const drawRect = (rect, meta, dashed = false) => {
    if (!rect) return;
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = meta.color;
    if (dashed) ctx.setLineDash([5, 4]);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.setLineDash([]);
    // label chip
    const tag = meta.label;
    ctx.font = "bold 12px system-ui, sans-serif";
    const tw = ctx.measureText(tag).width + 8;
    const ty = Math.max(0, rect.y - 16);
    ctx.fillStyle = meta.color;
    ctx.fillRect(rect.x, ty, tw, 16);
    ctx.fillStyle = "#fff";
    ctx.fillText(tag, rect.x + 4, ty + 12);
    ctx.restore();
  };

  for (const [type, rect] of Object.entries(manualRegions)) {
    drawRect(rect, MANUAL_REGION_META[type], false);
  }
  if (previewRect) drawRect(previewRect, MANUAL_REGION_META[currentManualType()], true);
}

/** Cập nhật trạng thái (sidebar + modal), region list, và enable/disable nút. */
function updateManualStatus() {
  const chosenTypes = Object.entries(manualRegions).filter(([, r]) => r).map(([t]) => t);
  const chosenLabels = chosenTypes.map(t => MANUAL_REGION_META[t].label);

  const summary = chosenLabels.length
    ? `Đã chọn: ${chosenLabels.join(", ")}`
    : "Chưa chọn vùng nào — tối thiểu cần vùng Da mặt.";

  const st = manualStatus();
  if (st) st.textContent = chosenLabels.length ? summary : "";
  const ms = manualModalStatus();
  if (ms) ms.textContent = summary;

  // Region list trong modal — hiện swatch màu trung bình đã sample (nếu có ảnh)
  const list = $("manual-region-list");
  if (list) {
    if (!chosenTypes.length) {
      list.innerHTML = '<p class="text-muted small mb-0">Vẽ vùng đầu tiên để bắt đầu…</p>';
    } else {
      list.innerHTML = chosenTypes.map(t => {
        const meta = MANUAL_REGION_META[t];
        return `<div class="mr-item">
          <span class="mr-swatch" style="background:${meta.color}"></span>
          <span>${meta.label}</span>
        </div>`;
      }).join("");
    }
  }

  const btn = btnManualAnalyze();
  if (btn) btn.disabled = !manualRegions.skin;   // bắt buộc có da mặt
}

/**
 * Hiện manual card (nút mở công cụ). autoOpen=true → mở luôn modal toàn màn hình.
 */
function showManualRegionCard(autoOpen = false) {
  const card = manualCard();
  if (!card) return;
  card.classList.remove("d-none");
  updateManualStatus();
  if (autoOpen) openManualModal();
}

// ── Canvas drag-to-draw handlers ──────────────────────────────────────────────
(function initManualCanvasEvents() {
  const attach = () => {
    const cv = manualCanvas();
    if (!cv) return;

    let drawing = false;
    let startX = 0, startY = 0;

    // Map toạ độ con trỏ (client px) → toạ độ ảnh (canvas px)
    const toCanvasCoords = (clientX, clientY) => {
      const rect = cv.getBoundingClientRect();
      const sx = cv.width / rect.width;
      const sy = cv.height / rect.height;
      return {
        x: Math.max(0, Math.min(cv.width, (clientX - rect.left) * sx)),
        y: Math.max(0, Math.min(cv.height, (clientY - rect.top) * sy)),
      };
    };

    const onDown = (clientX, clientY) => {
      const p = toCanvasCoords(clientX, clientY);
      drawing = true; startX = p.x; startY = p.y;
    };
    const onMove = (clientX, clientY) => {
      if (!drawing) return;
      const p = toCanvasCoords(clientX, clientY);
      const preview = {
        x: Math.min(startX, p.x), y: Math.min(startY, p.y),
        w: Math.abs(p.x - startX), h: Math.abs(p.y - startY),
      };
      redrawManualCanvas(preview);
    };
    const onUp = (clientX, clientY) => {
      if (!drawing) return;
      drawing = false;
      const p = toCanvasCoords(clientX, clientY);
      const rect = {
        x: Math.min(startX, p.x), y: Math.min(startY, p.y),
        w: Math.abs(p.x - startX), h: Math.abs(p.y - startY),
      };
      if (rect.w >= 4 && rect.h >= 4) {
        manualRegions[currentManualType()] = rect;
        updateManualStatus();
      }
      redrawManualCanvas();
    };

    cv.addEventListener("mousedown", e => { e.preventDefault(); onDown(e.clientX, e.clientY); });
    window.addEventListener("mousemove", e => onMove(e.clientX, e.clientY));
    window.addEventListener("mouseup",   e => onUp(e.clientX, e.clientY));

    // Touch support
    cv.addEventListener("touchstart", e => { e.preventDefault(); const t = e.touches[0]; onDown(t.clientX, t.clientY); }, { passive: false });
    cv.addEventListener("touchmove",  e => { e.preventDefault(); const t = e.touches[0]; onMove(t.clientX, t.clientY); }, { passive: false });
    cv.addEventListener("touchend",   e => { const t = e.changedTouches[0]; onUp(t.clientX, t.clientY); });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attach);
  } else {
    attach();
  }
})();

// Nút mở công cụ toàn màn hình
$("btn-open-manual")?.addEventListener("click", () => openManualModal());

// Radio đổi loại vùng — không cần làm gì thêm (currentManualType đọc động)

// Reset các vùng
$("btn-manual-reset")?.addEventListener("click", () => {
  manualRegions.skin = manualRegions.hair = manualRegions.eye = manualRegions.neck = null;
  redrawManualCanvas();
  updateManualStatus();
});

// Phân tích ngay từ các vùng thủ công đã chọn — đóng modal rồi chạy
$("btn-manual-analyze")?.addEventListener("click", () => {
  if (!manualRegions.skin) { showToast(t("toast_need_skin")); return; }
  manualMode = true;
  getManualModal()?.hide();
  runAnalysis(currentImage);
});

// Khi modal hiển thị xong → đảm bảo canvas đã dựng đúng kích thước.
$("manual-modal")?.addEventListener("shown.bs.modal", () => setupManualCanvas());

/**
 * Trích xuất feature từ các rectangle thủ công (không cần parsing mask).
 * Trả về cùng cấu trúc feature object như extractFeatures().
 */
function extractFeaturesFromManualRegions(buf, W, H) {
  lastColorDistribution = {};
  const faceLab = sampleRectLab(buf, W, H, manualRegions.skin, 15, "skin");   // da: trim chặt
  const hairLab = manualRegions.hair
    ? sampleRectLab(buf, W, H, manualRegions.hair, 25, "hair")                // tóc: trim rộng hơn
    : { L: 30, a: 3, b: 5, count: 0 };
  const neckLab = manualRegions.neck
    ? sampleRectLab(buf, W, H, manualRegions.neck, 18, "neck")
    : { ...faceLab, L: faceLab.L - 4 };
  const eyeLab = manualRegions.eye
    ? sampleRectLab(buf, W, H, manualRegions.eye, 20, "eye")
    : { L: 35, a: 2, b: 3, count: 0 };

  return buildFeatureObject({ faceLab, hairLab, neckLab, eyeLab, buf, W, H, mask: null });
}

/** hex "#RRGGBB" → { L, a, b } trong LAB. */
function hexToLab(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return rgbToLab(r, g, b);
}

/**
 * Người dùng chỉnh lại màu 1 vùng (da/tóc/mắt/cổ) → cập nhật override → tính lại
 * feature từ LAB gốc gần nhất + override → chạy lại model → render gợi ý mới.
 * KHÔNG cần phân tích lại ảnh (dùng lastExtract).
 */
async function applyColorOverrideAndRerun(region, hex) {
  if (!lastExtract) { showToast(t("toast_analyze_first")); return; }
  const lab = hexToLab(hex);
  // region: "face" | "hair" | "eye" | "body"
  colorOverride[region] = { L: lab.L, a: lab.a, b: lab.b, count: 999 };

  const { buf, W, H, mask, classCounts,
          faceLab, hairLab, neckLab, eyeLab } = lastExtract;
  // buildFeatureObject sẽ tự áp colorOverride lên các LAB gốc này.
  const features = buildFeatureObject({
    faceLab, hairLab, neckLab, eyeLab, buf, W, H, mask, classCounts,
  });
  updateMetricsPanel(features);

  if (!onnxSession) { showToast(t("toast_model_notready")); return; }
  const inferResult = await runInference(features);
  renderResults(inferResult, features);
  showToast(t("toast_override_updated"));
}

/** Reset toàn bộ override → phân tích lại từ màu đo trên ảnh. */
function resetColorOverride() {
  colorOverride = { face: null, hair: null, eye: null, body: null };
  if (currentImage) runAnalysis(currentImage);
}

// Được gọi từ input color (inline oninput) — debounce nhẹ để không chạy quá dày.
let _overrideTimer = null;
window.onColorPick = function(region, hex) {
  clearTimeout(_overrideTimer);
  _overrideTimer = setTimeout(() => applyColorOverrideAndRerun(region, hex), 250);
};
window.onColorReset = function() { resetColorOverride(); };

// ═══════════════════════════════════════════════════════════════════════════════
// 4. ONNX INFERENCE
// ═══════════════════════════════════════════════════════════════════════════════

async function runInference(features) {
  // Build Float32Array in feature order (50 features — must match training)
  const inputArray = new Float32Array(
    FEATURE_NAMES.map(name => features[name] ?? 0)
  );
  const tensor = new ort.Tensor("float32", inputArray, [1, FEATURE_NAMES.length]);

  console.group("[ONNX inference]");
  console.log("Input tensor shape:", tensor.dims);
  console.log("Feature values:", Object.fromEntries(FEATURE_NAMES.map((n, i) => [n, +inputArray[i].toFixed(4)])));

  const feeds = {};
  feeds[onnxSession.inputNames[0]] = tensor;

  const t0      = performance.now();
  const results = await onnxSession.run(feeds);
  const tInfer  = performance.now() - t0;

  const labelOutput = results[onnxSession.outputNames[0]];
  const probOutput  = results[onnxSession.outputNames[1]];

  const predictedIdx   = Number(labelOutput.data[0]);
  const probabilities  = Array.from(probOutput.data);
  const confidence     = probabilities[predictedIdx];
  const predictedClass = CLASSES[predictedIdx];

  // Log top-5 predictions
  const top5 = probabilities
    .map((p, i) => ({ class: CLASSES[i], prob: p }))
    .sort((a, b) => b.prob - a.prob)
    .slice(0, 5);

  console.log(`Inference time: ${tInfer.toFixed(1)} ms`);
  console.log(`Predicted: ${predictedClass} (confidence: ${(confidence * 100).toFixed(1)}%)`);
  console.table(top5.map(r => ({ "Sub-season": r.class, "Probability": (r.prob * 100).toFixed(2) + "%" })));
  console.log("Raw output tensor (all 16 classes):", Object.fromEntries(CLASSES.map((c, i) => [c, +(probabilities[i] * 100).toFixed(2) + "%"])));
  console.groupEnd();

  return { predictedClass, confidence, probabilities };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. WEATHER  (với localStorage cache)
// ═══════════════════════════════════════════════════════════════════════════════

const CACHE_KEY_WEATHER = "pca_weather_cache";   // { lat, lon, uv, clouds, sunAngle, address, savedAt }
const WEATHER_TTL_MS    = 24 * 60 * 60 * 1000;  // 24 giờ
const LOCATION_THRESHOLD_DEG = 0.05;             // ~5 km — coi là "cùng vị trí"

function getSunAngle(lat) {
  const hour  = new Date().getHours() + new Date().getMinutes() / 60;
  const angle = Math.max(0, 90 - Math.abs(hour - 12) * 10 - Math.abs(lat) * 0.5);
  return Math.round(angle);
}

/** Đọc cache từ localStorage, trả về object hoặc null nếu không có / hết hạn. */
function loadWeatherCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY_WEATHER);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    const age   = Date.now() - (cache.savedAt ?? 0);
    if (age > WEATHER_TTL_MS) {
      localStorage.removeItem(CACHE_KEY_WEATHER);
      return null;
    }
    return cache;
  } catch {
    return null;
  }
}

/** Lưu cache vào localStorage. */
function saveWeatherCache(lat, lon, uv, clouds, sunAngle, address) {
  try {
    localStorage.setItem(CACHE_KEY_WEATHER, JSON.stringify({
      lat, lon, uv, clouds, sunAngle, address,
      savedAt: Date.now(),
    }));
  } catch { /* quota exceeded — bỏ qua */ }
}

/**
 * Kiểm tra tọa độ mới có "tương đương" cache không.
 * Dùng khoảng cách Chebyshev đơn giản (max delta lat hoặc lon).
 */
function isSameLocation(cache, lat, lon) {
  return (
    Math.abs(cache.lat - lat) < LOCATION_THRESHOLD_DEG &&
    Math.abs(cache.lon - lon) < LOCATION_THRESHOLD_DEG
  );
}

/** Áp dụng dữ liệu thời tiết lên UI và weatherData state. */
function applyWeatherToUI(uv, clouds, sunAngle, address, lat, lon) {
  weatherData = {
    uv_index:    uv,
    cloud_cover: clouds,
    sun_angle:   sunAngle,
    ambient:     Math.max(0.1, 1 - clouds / 100),
  };
  $("w-uv").textContent    = uv.toFixed(1);
  $("w-cloud").textContent = clouds + "%";
  $("w-sun").textContent   = sunAngle + "°";

  const locEl = $("w-location");
  if (address) {
    locEl.textContent = "📍 " + address;
    locEl.title       = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  } else {
    locEl.textContent = `📍 ${lat.toFixed(3)}, ${lon.toFixed(3)}`;
    locEl.title       = "";
  }
  $("weather-info").classList.remove("d-none");
  $("weather-manual").classList.add("d-none");
}

/**
 * Reverse-geocode (lat, lon) → human-readable address.
 * Provider 1: BigDataCloud (no CORS, no key).
 * Provider 2: Nominatim (fallback).
 */
async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=vi`
    );
    if (res.ok) {
      const d        = await res.json();
      const district = d.locality || d.city;
      const province = d.principalSubdivision || d.countryName;
      const country  = d.countryName;
      const parts    = [district, province !== country ? province : null, country]
        .filter(Boolean)
        .filter((v, i, arr) => arr.indexOf(v) === i);
      if (parts.length >= 2) return parts.join(", ");
    }
  } catch { /* try next */ }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&accept-language=vi,en`
    );
    if (res.ok) {
      const data = await res.json();
      const a    = data.address ?? {};
      const district = a.city_district || a.district || a.county || a.suburb || a.quarter || a.neighbourhood || a.village;
      const city     = a.city || a.town || a.municipality || a.state;
      const parts    = [district, city, a.country].filter(Boolean);
      if (parts.length >= 2) return parts.join(", ");
      if (data.display_name) return data.display_name.split(",").slice(0, 3).map(s => s.trim()).join(", ");
    }
  } catch { /* give up */ }

  return null;
}

/**
 * Lấy vị trí + thời tiết.
 * - Nếu cache còn hạn (< 24h) VÀ vị trí tương đương → dùng cache, không gọi API.
 * - Nếu cache hết hạn HOẶC vị trí thay đổi → fetch mới, lưu cache.
 * - silent=true: không hiện toast khi bị từ chối / lỗi (dùng lúc auto-load).
 */
async function fetchWeather(silent = false) {
  if (!navigator.geolocation) {
    if (!silent) showToast("Trình duyệt không hỗ trợ Geolocation.");
    const cache = loadWeatherCache();
    if (cache) applyWeatherToUI(cache.uv, cache.clouds, cache.sunAngle, cache.address, cache.lat, cache.lon);
    return;
  }

  btnWeather.disabled = true;
  btnWeather.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>${t("weather_getting")}`;

  // Restore cache ngay lập tức nếu đang auto-load
  const existingCache = loadWeatherCache();
  if (existingCache && silent) {
    applyWeatherToUI(
      existingCache.uv, existingCache.clouds, existingCache.sunAngle,
      existingCache.address, existingCache.lat, existingCache.lon
    );
    console.log("[weather] Restored from cache, age:",
      Math.round((Date.now() - existingCache.savedAt) / 3600000), "h");
  }

  // Bọc getCurrentPosition trong Promise để caller có thể await đúng lúc xong
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude: lat, longitude: lon } = coords;

        // Cache hit — cùng vị trí, còn hạn
        if (existingCache && isSameLocation(existingCache, lat, lon)) {
          applyWeatherToUI(
            existingCache.uv, existingCache.clouds, existingCache.sunAngle,
            existingCache.address, lat, lon
          );
          console.log("[weather] Cache hit — same location, skipping API calls.");
          resetWeatherBtn();
          resolve();
          return;
        }

        // Cache miss — fetch mới
        console.log("[weather] Cache miss — fetching fresh data…");
        try {
          const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=cloudcover,uv_index&forecast_days=1&timezone=auto`;
          const [weatherRes, address] = await Promise.all([
            fetch(weatherUrl),
            reverseGeocode(lat, lon),
          ]);
          const wData    = await weatherRes.json();
          const hour     = new Date().getHours();
          const uv       = wData.hourly?.uv_index?.[hour]   ?? 5;
          const clouds   = wData.hourly?.cloudcover?.[hour] ?? 30;
          const sunAngle = getSunAngle(lat);

          applyWeatherToUI(uv, clouds, sunAngle, address, lat, lon);
          saveWeatherCache(lat, lon, uv, clouds, sunAngle, address);
          console.log("[weather] Saved to cache.");
        } catch (e) {
          console.error("[weather] Fetch error:", e);
          if (!silent) showToast("Không lấy được dữ liệu thời tiết — dùng giá trị thủ công.");
          if (existingCache) {
            applyWeatherToUI(
              existingCache.uv, existingCache.clouds, existingCache.sunAngle,
              existingCache.address, existingCache.lat, existingCache.lon
            );
          }
        }
        resetWeatherBtn();
        resolve();
      },
      (err) => {
        console.warn("[weather] Geolocation error:", err.message);
        if (!silent) showToast("Không được phép truy cập vị trí. Dùng giá trị thủ công.");
        if (existingCache) {
          applyWeatherToUI(
            existingCache.uv, existingCache.clouds, existingCache.sunAngle,
            existingCache.address, existingCache.lat, existingCache.lon
          );
        }
        resetWeatherBtn();
        resolve();   // luôn resolve (không reject) để overlay không bị treo
      },
      { timeout: 8000, maximumAge: 60000 }
    );
  });
}

// Nút "Cập nhật vị trí" — force refresh (xóa cache trước)
btnWeather.addEventListener("click", () => {
  localStorage.removeItem(CACHE_KEY_WEATHER);
  fetchWeather(false);
});

function resetWeatherBtn() {
  btnWeather.disabled = false;
  btnWeather.innerHTML = `<i class="bi bi-geo-alt me-1"></i>${t("btn_update_location")}`;
}

// Sync manual weather inputs
["m-uv","m-cloud","m-sun"].forEach(id => {
  $(id)?.addEventListener("input", () => {
    weatherData.uv_index    = parseFloat($("m-uv").value)    || 5;
    weatherData.cloud_cover = parseFloat($("m-cloud").value) || 30;
    weatherData.sun_angle   = parseFloat($("m-sun").value)   || 45;
    weatherData.ambient     = Math.max(0.1, 1 - weatherData.cloud_cover / 100);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. ANALYSIS PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

btnAnalyze.addEventListener("click", () => {
  manualMode = false;   // nút "Phân tích" luôn chạy pipeline tự động (parsing)
  runAnalysis(currentImage);
});

async function runAnalysis(imageSrc) {
  showSpinner(t("spinner_extract"));
  // Phân tích mới từ ảnh → bỏ các override màu cũ (bắt đầu lại từ màu đo được).
  colorOverride = { face: null, hair: null, eye: null, body: null };

  try {
    // Step 1 – extract features từ ảnh
    setSpinnerMsg(t("spinner_detect"));
    const t0       = performance.now();
    const features = await extractFeatures(imageSrc);
    const tExtract = performance.now() - t0;
    updateMetricsPanel(features);
    console.log(`[analysis] Feature extraction: ${tExtract.toFixed(1)} ms`);
    console.log("[analysis] Features:", features);

    // Step 2 – ONNX inference
    if (!onnxSession) {
      hideSpinner();
      showModelErrorCard();
      return;
    }

    setSpinnerMsg(t("spinner_infer"));
    const inferResult = await runInference(features);

    // Step 3 – render
    renderResults(inferResult, features);
    hideSpinner();

  } catch (err) {
    console.error("[analysis] Error:", err);
    hideSpinner();
    if (err.code === "MANUAL_FALLBACK") {
      // Parsing không dùng được → đã bật card chọn vùng thủ công.
      placeholderSection.classList.remove("d-none");
      resultSection.classList.add("d-none");
      showToast(err.message);
    } else if (err.code === "NO_FACE") {
      showNoFaceError();
    } else {
      showToast("Lỗi phân tích: " + err.message);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6b. CONTEXT PREFERENCES (gợi ý theo thời điểm + sự kiện)
// ═══════════════════════════════════════════════════════════════════════════════
//
// KHÔNG thay đổi mùa cá nhân (kết quả model). Chỉ SẮP XẾP LẠI + đánh dấu màu nào
// trong bảng màu của mùa đó phù hợp nhất với hoàn cảnh, dựa trên đặc tính màu:
//   - lightness L (0..100), chroma (độ rực), warmth (ấm/lạnh theo b*).
// Mỗi hoàn cảnh định nghĩa "hồ sơ ưu tiên" gồm hàm chấm điểm trên 3 chiều này.

/** hex "#RRGGBB" → { L, chroma, warmth } trong không gian LAB. */
function hexToColorTraits(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const lab = rgbToLab(r, g, b);
  return {
    L: lab.L,
    chroma: Math.sqrt(lab.a ** 2 + lab.b ** 2),
    warmth: lab.b + lab.a * 0.3,   // b* là trục vàng(+)/xanh(−); thêm chút a* cho tông đỏ ấm
  };
}

// Hàm phụ trợ: điểm dạng "chuông" — càng gần target càng cao (0..1).
const near = (v, target, tol) => Math.max(0, 1 - Math.abs(v - target) / tol);
// Điểm tuyến tính: cao khi v lớn (prefHigh) hoặc nhỏ (prefLow).
const prefHigh = (v, min, max) => Math.max(0, Math.min(1, (v - min) / (max - min)));
const prefLow  = (v, min, max) => 1 - prefHigh(v, min, max);

/**
 * Trọng số & mục tiêu cho từng THỜI ĐIỂM. Trả về điểm 0..1 cho 1 màu.
 * (dùng trait {L, chroma, warmth})
 */
const TIME_PROFILES = {
  any:       () => 0.5,
  // Sáng: ưu tiên sáng, tươi, bão hòa vừa (ánh sáng ban ngày mạnh → tránh quá đậm/gắt).
  morning:   t => 0.5 * prefHigh(t.L, 40, 90) + 0.3 * near(t.chroma, 35, 40) + 0.2 * prefHigh(t.warmth, -10, 30),
  // Chiều: trung tính, hơi ấm.
  afternoon: t => 0.4 * near(t.L, 60, 45) + 0.3 * near(t.chroma, 40, 45) + 0.3 * prefHigh(t.warmth, -15, 30),
  // Tối: ưu tiên đậm, rực/bão hòa cao, tương phản mạnh (ánh sáng nhân tạo làm màu nhạt bị trôi).
  evening:   t => 0.5 * prefLow(t.L, 20, 85) + 0.4 * prefHigh(t.chroma, 20, 70) + 0.1 * prefLow(t.warmth, -20, 40),
};

/** Trọng số & mục tiêu cho từng SỰ KIỆN. */
const EVENT_PROFILES = {
  any:      () => 0.5,
  // Dạ tiệc: sang trọng, đậm & rực, tương phản cao.
  gala:     t => 0.55 * prefLow(t.L, 15, 80) + 0.45 * prefHigh(t.chroma, 25, 70),
  // Sinh nhật: vui tươi, sáng, rực rỡ.
  birthday: t => 0.45 * prefHigh(t.L, 45, 95) + 0.4 * prefHigh(t.chroma, 30, 75) + 0.15 * prefHigh(t.warmth, -10, 35),
  // Hẹn hò: mềm mại, tôn da, ấm nhẹ.
  date:     t => 0.4 * near(t.L, 62, 40) + 0.3 * near(t.chroma, 38, 35) + 0.3 * prefHigh(t.warmth, -5, 35),
  // Công sở: trung tính, nhã, ít rực.
  office:   t => 0.5 * near(t.L, 55, 45) + 0.5 * prefLow(t.chroma, 10, 55),
  // Trong nhà (ánh sáng ấm nhân tạo): tông ấm, sáng vừa, rực vừa.
  indoor:   t => 0.4 * near(t.L, 60, 45) + 0.25 * near(t.chroma, 40, 40) + 0.35 * prefHigh(t.warmth, -10, 35),
  // Ngoài trời (ánh sáng ban ngày): sáng, tươi, mát nhẹ.
  outdoor:  t => 0.45 * prefHigh(t.L, 45, 92) + 0.35 * near(t.chroma, 40, 40) + 0.2 * prefLow(t.warmth, -20, 35),
  // Thường ngày: cân bằng, thoải mái.
  casual:   t => 0.5 * near(t.L, 60, 50) + 0.5 * near(t.chroma, 35, 45),
};

const TIME_LABEL  = { any: "bất kỳ", morning: "buổi sáng", afternoon: "buổi chiều", evening: "buổi tối" };
const EVENT_LABEL = { any: "bất kỳ", gala: "dạ tiệc", birthday: "sinh nhật", date: "hẹn hò",
                      office: "công sở", indoor: "trong nhà", outdoor: "ngoài trời", casual: "thường ngày" };

/** Đọc hoàn cảnh hiện tại từ 2 dropdown. */
function getContext() {
  return {
    time:  $("ctx-time")?.value  ?? "any",
    event: $("ctx-event")?.value ?? "any",
  };
}

// Đổi hoàn cảnh → render lại kết quả gần nhất (không phân tích lại ảnh/model).
["ctx-time", "ctx-event"].forEach(id => {
  $(id)?.addEventListener("change", () => {
    if (lastResult) {
      renderResults(
        { predictedClass: lastResult.predictedClass, confidence: lastResult.confidence,
          probabilities: lastResult.probabilities },
        lastResult.features
      );
    }
  });
});

// Đổi sắc tộc → thay đổi ethnicity baseline → phải PHÂN TÍCH LẠI (đổi feature, không
// chỉ đổi thứ tự). Chạy lại pipeline nếu đang có ảnh.
$("ctx-ethnicity")?.addEventListener("change", e => {
  userEthnicity = e.target.value;
  if (currentImage && (onnxSession)) {
    runAnalysis(currentImage);
  }
});

/** Điểm ưu tiên 0..1 của 1 màu (hex) theo hoàn cảnh. */
function scoreColorForContext(hex, ctx) {
  const t = hexToColorTraits(hex);
  const tScore = (TIME_PROFILES[ctx.time]  ?? TIME_PROFILES.any)(t);
  const eScore = (EVENT_PROFILES[ctx.event] ?? EVENT_PROFILES.any)(t);
  // Nếu cả hai "any" → giữ trung lập (không ưu tiên gì).
  if (ctx.time === "any" && ctx.event === "any") return 0.5;
  if (ctx.time === "any")  return eScore;
  if (ctx.event === "any") return tScore;
  return 0.5 * tScore + 0.5 * eScore;
}

/**
 * Sắp xếp lại danh sách màu theo hoàn cảnh (ổn định), đánh dấu top là "nổi bật".
 * items: mảng hex (string) HOẶC object {name,hex}. Trả về mảng cùng loại + cờ.
 * Nếu hoàn cảnh = any/any → trả về nguyên thứ tự, không đánh dấu.
 */
function applyContextPreferences(items, ctx, highlightRatio = 0.4) {
  if (!items?.length) return [];
  const neutral = ctx.time === "any" && ctx.event === "any";
  const getHex = it => (typeof it === "string" ? it : it.hex);

  const scored = items.map((it, i) => ({
    it, i, score: neutral ? 0.5 : scoreColorForContext(getHex(it), ctx),
  }));

  if (!neutral) {
    // sort giảm dần theo score, giữ thứ tự gốc khi bằng điểm (ổn định)
    scored.sort((a, b) => (b.score - a.score) || (a.i - b.i));
  }

  const nHi = neutral ? 0 : Math.max(1, Math.round(items.length * highlightRatio));
  return scored.map((s, rank) => ({
    value: s.it,
    hex: getHex(s.it),
    highlight: rank < nHi,
    score: s.score,
  }));
}

/** Câu giải thích ngắn hiển thị trong banner context-note. */
function contextExplanation(ctx) {
  if (ctx.time === "any" && ctx.event === "any") return "";
  const bits = [];
  if (ctx.time !== "any")  bits.push(t("tip_" + ctx.time));
  if (ctx.event !== "any") bits.push(t("tip_" + ctx.event));
  const timeLabel  = t("tl_" + ctx.time);
  const eventLabel = t("el_" + ctx.event);
  return `${t("ctx_note_prefix")} <strong>${timeLabel}</strong> · ` +
         `<strong>${eventLabel}</strong>: ${bits.join("; ")}. ` +
         `<span class="ctx-star">★</span> ${t("ctx_note_star")}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. RENDER RESULTS
// ═══════════════════════════════════════════════════════════════════════════════

function renderResults({ predictedClass, confidence, probabilities }, features) {
  const data = COLOR_DATA[predictedClass];
  if (!data) { showToast("Không tìm thấy dữ liệu cho: " + predictedClass); return; }

  // Lưu lại để re-render khi người dùng đổi hoàn cảnh (không cần phân tích lại).
  lastResult = { predictedClass, confidence, probabilities, features };

  const ctx = getContext();
  const season = data.season;

  // Context note banner
  const note = $("context-note");
  const noteText = $("context-note-text");
  const explanation = contextExplanation(ctx);
  if (note && noteText) {
    if (explanation) { noteText.innerHTML = explanation; note.classList.remove("d-none"); }
    else note.classList.add("d-none");
  }

  // Banner
  const banner = $("season-banner");
  banner.className = `season-banner card mb-4 border-0 shadow season-${season}`;
  $("season-icon").textContent   = { Spring:"🌸", Summer:"☀️", Autumn:"🍂", Winter:"❄️" }[season] ?? "🎨";
  $("result-season-label").textContent = t("season_" + season);
  $("result-sub-season").textContent   = t("lbl_" + predictedClass);
  $("result-description").textContent  = t("desc_" + predictedClass);

  // Confidence ring
  const pct = Math.round(confidence * 100);
  $("result-confidence").textContent = pct + "%";
  $("conf-arc").style.strokeDasharray = `${pct}, 100`;

  // Palette swatches — sắp xếp theo hoàn cảnh, đánh dấu màu nổi bật
  const paletteEl = $("palette-swatches");
  paletteEl.innerHTML = applyContextPreferences(data.palette, ctx).map(({ hex, highlight }) =>
    `<div class="swatch${highlight ? " swatch-ctx" : ""}" style="background:${hex}" title="${hex}${highlight ? " · ưu tiên cho hoàn cảnh" : ""}" onclick="copyHex('${hex}')">
       ${highlight ? '<span class="ctx-star">★</span>' : ""}
       <div class="swatch-tooltip">${hex}</div>
     </div>`
  ).join("");

  // Color groups — sắp xếp trong từng nhóm
  const groupsEl = $("color-groups");
  groupsEl.innerHTML = Object.entries(data.colorGroups).map(([name, hexes]) => `
    <div class="mb-3">
      <div class="color-group-title">${name}</div>
      <div class="d-flex flex-wrap gap-2">
        ${applyContextPreferences(hexes, ctx).map(({ hex, highlight }) =>
          `<div class="swatch${highlight ? " swatch-ctx" : ""}" style="background:${hex}" onclick="copyHex('${hex}')">
            ${highlight ? '<span class="ctx-star">★</span>' : ""}
            <div class="swatch-tooltip">${hex}</div>
          </div>`).join("")}
      </div>
    </div>
  `).join("");

  // Makeup — mỗi loại sắp xếp theo hoàn cảnh
  renderMakeupRow("makeup-lipstick",  data.recommendedMakeup.lipstick,  ctx);
  renderMakeupRow("makeup-blush",     data.recommendedMakeup.blush,     ctx);
  renderMakeupRow("makeup-eyeshadow", data.recommendedMakeup.eyeshadow, ctx);

  // Hair colours — sắp xếp theo hoàn cảnh
  const hairEl = $("hair-colors");
  hairEl.innerHTML = applyContextPreferences(data.recommendedHairColors, ctx).map(({ value, highlight }) => {
    const { name, hex } = value;
    return `
    <div class="hair-item${highlight ? " hair-ctx" : ""}" onclick="copyHex('${hex}')" style="cursor:pointer">
      <div class="hair-dot" style="background:${hex}"></div>
      <div>
        <div class="hair-name">${highlight ? '<span class="ctx-star">★</span> ' : ""}${translateColorName(name)}</div>
        <div class="hair-hex">${hex}</div>
      </div>
    </div>`;
  }).join("");

  // Clothing recommendations (avoid KHÔNG áp context — luôn nên tránh)
  renderClothingRow("clothing-tops",    data.recommendedClothing?.tops    ?? [], false, ctx);
  renderClothingRow("clothing-bottoms", data.recommendedClothing?.bottoms ?? [], false, ctx);
  renderClothingRow("clothing-avoid",   data.recommendedClothing?.avoid   ?? [], true);

  // Key metrics
  renderKeyMetrics(features, confidence, predictedClass);

  // All probabilities
  renderAllProbs(probabilities);

  // Show
  placeholderSection.classList.add("d-none");
  resultSection.classList.remove("d-none");
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderMakeupRow(containerId, items, ctx = { time: "any", event: "any" }) {
  $(containerId).innerHTML = applyContextPreferences(items, ctx).map(({ value, highlight }) => {
    const { name, hex } = value;
    return `
    <div class="makeup-swatch${highlight ? " makeup-ctx" : ""}" onclick="copyHex('${hex}')" title="${hex}">
      <div class="color-dot" style="background:${hex}"></div>
      <div class="color-label">${highlight ? '<span class="ctx-star">★</span> ' : ""}${translateColorName(name)}</div>
    </div>`;
  }).join("");
}

function renderClothingRow(containerId, items, isAvoid = false, ctx = { time: "any", event: "any" }) {
  const ordered = isAvoid
    ? items.map(v => ({ value: v, hex: v.hex, highlight: false }))
    : applyContextPreferences(items, ctx);
  $(containerId).innerHTML = ordered.map(({ value, highlight }) => {
    const { name, hex } = value;
    return `
    <div class="clothing-item${isAvoid ? " clothing-avoid-item" : ""}${highlight ? " clothing-ctx" : ""}" onclick="copyHex('${hex}')" title="${hex}">
      <div class="clothing-dot" style="background:${hex}${isAvoid ? ";opacity:0.65" : ""}">
        ${isAvoid ? '<i class="bi bi-x clothing-avoid-x"></i>' : ""}
      </div>
      <div class="clothing-label">${highlight ? '<span class="ctx-star">★</span> ' : ""}${translateColorName(name)}</div>
    </div>`;
  }).join("");
}

function renderKeyMetrics(features, confidence, subSeason) {
  const metrics = [
    { label: t("metric_lightness"), value: features.face_L?.toFixed(1),   max: 100,  unit: "" },
    { label: t("metric_red"),       value: features.face_a?.toFixed(1),   max: 30,   unit: "" },
    { label: t("metric_yellow"),    value: features.face_b?.toFixed(1),   max: 40,   unit: "" },
    { label: t("metric_hairL"),     value: features.hair_L?.toFixed(1),   max: 100,  unit: "" },
    { label: t("contrast"),         value: (features.contrast_overall * 100)?.toFixed(0), max: 100, unit: "%" },
    { label: "UV Index",            value: features.uv_index?.toFixed(1), max: 11,   unit: "" },
    { label: t("metric_confidence"),value: (confidence * 100)?.toFixed(0), max: 100, unit: "%" },
    { label: t("metric_intensity"), value: features.face_chroma?.toFixed(1), max: 60, unit: "" },
  ];

  $("key-metrics-grid").innerHTML = metrics.map(({ label, value, max, unit }) => {
    const pct = Math.min(100, Math.round((parseFloat(value) / max) * 100));
    return `
      <div class="col-6 col-md-3">
        <div class="metric-card">
          <div class="metric-value">${value}${unit}</div>
          <div class="metric-label">${label}</div>
          <div class="metric-bar">
            <div class="metric-bar-fill" style="width:${pct}%"></div>
          </div>
        </div>
      </div>`;
  }).join("");
}

function renderAllProbs(probs) {
  const sorted = CLASSES
    .map((name, i) => ({ name, prob: probs[i] ?? 0 }))
    .sort((a, b) => b.prob - a.prob);

  $("all-probs").innerHTML = sorted.map(({ name, prob }) => {
    const pct = (prob * 100).toFixed(1);
    const data = COLOR_DATA[name];
    const accent = SEASON_ACCENT[data?.season] ?? "#0d6efd";
    return `
      <div class="prob-row">
        <div class="prob-name">${name.replace("_", " ")}</div>
        <div class="prob-bar-wrap">
          <div class="prob-bar-fill" style="width:${pct}%;background:${accent}"></div>
        </div>
        <div class="prob-val">${pct}%</div>
      </div>`;
  }).join("");
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. DETECTED COLOURS PANEL & METRICS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Renders the "Màu sắc phân tích từ ảnh" panel in the left sidebar.
 * Converts LAB values back to approximate HEX swatches.
 */
function renderDetectedColors(f) {
  const body = $("detected-colors-body");
  if (!body) return;

  // ITA phototype label
  const ita = f.face_L !== undefined
    ? Math.round(Math.atan2(f.face_L - 50, Math.max(0.01, f.face_b)) * 180 / Math.PI)
    : 0;
  const itaLabel = ita > 55 ? "Very Light" : ita > 41 ? "Light" : ita > 28 ? "Intermediate"
                 : ita > 10 ? "Tan" : ita > -30 ? "Brown" : "Dark";
  const undertoneLabel = f.hair_undertone > 0.3 ? t("tone_warm") : f.hair_undertone < -0.3 ? t("tone_cool") : t("tone_neutral");

  const faceHex  = labToHex(f.face_L ?? 60, f.face_a ?? 10, f.face_b ?? 15);
  const bodyHex  = labToHex(f.body_L ?? 55, f.body_a ?? 9,  f.body_b ?? 13);
  const hairHex  = labToHex(
    Math.max(5, f.hair_L ?? 40),
    f.hair_undertone > 0 ? 5 : -2,
    f.hair_undertone > 0 ? 12 : 2
  );
  const eyeHex   = labToHex(
    Math.max(5, f.eye_L ?? 35),
    f.eye_chroma > 15 ? 6 : 2,
    f.eye_chroma > 15 ? -8 : 3
  );

  const detectedItems = [
    { region: "face", label: t("region_face"), hex: faceHex,  L: f.face_L, a: f.face_a, b: f.face_b, icon: "bi-person-fill" },
    { region: "body", label: t("region_body"), hex: bodyHex,  L: f.body_L, a: f.body_a, b: f.body_b, icon: "bi-person" },
    { region: "hair", label: t("label_hair"),  hex: hairHex,  L: f.hair_L, extra: `chroma ${(f.hair_chroma ?? 0).toFixed(1)} · ${undertoneLabel}`, icon: "bi-scissors" },
    { region: "eye",  label: t("label_eye"),   hex: eyeHex,   L: f.eye_L,  extra: `clarity ${((f.eye_clarity ?? 0) * 100).toFixed(0)}%`, icon: "bi-eye" },
  ];

  const anyOverride = colorOverride.face || colorOverride.hair || colorOverride.eye || colorOverride.body;

  body.innerHTML = `
    <p class="text-muted small mb-2">
      <i class="bi bi-palette2 me-1"></i>${t("detected_edit_hint")}
    </p>
    <div class="detected-grid mb-3">
      ${detectedItems.map(({ region, label, hex, L, a, b, extra, icon }) => `
        <div class="detected-item">
          <label class="detected-swatch detected-swatch-edit" style="background:${hex}" title="${label}">
            <i class="bi ${icon} detected-icon" style="color:${isLight(hex) ? "#333" : "#fff"}"></i>
            <i class="bi bi-pencil-fill detected-edit-badge"></i>
            <input type="color" value="${hex}" class="detected-color-input"
                   oninput="onColorPick('${region}', this.value)">
          </label>
          <div class="detected-info">
            <div class="detected-label">${label}${colorOverride[region] ? ` <span class="badge bg-warning-subtle text-warning border">${t("color_edited")}</span>` : ''}</div>
            <div class="detected-hex">${hex}</div>
            <div class="detected-lab">${
              extra
                ? extra
                : `L=${L?.toFixed(0) ?? "–"} a=${a?.toFixed(1) ?? "–"} b=${b?.toFixed(1) ?? "–"}`
            }</div>
          </div>
        </div>
      `).join("")}
    </div>
    ${anyOverride ? `
    <button class="btn btn-sm btn-outline-secondary w-100 mb-3" onclick="onColorReset()">
      <i class="bi bi-arrow-counterclockwise me-1"></i>${t("btn_restore_colors")}
    </button>` : ""}
    <div class="d-flex gap-2 flex-wrap">
      <span class="badge rounded-pill bg-secondary-subtle text-secondary border">
        ITA: ${ita}° (${itaLabel})
      </span>
      <span class="badge rounded-pill bg-secondary-subtle text-secondary border">
        ${t("undertone")}: ${undertoneLabel}
      </span>
      <span class="badge rounded-pill bg-secondary-subtle text-secondary border">
        ${t("contrast")}: ${((f.contrast_overall ?? 0) * 100).toFixed(0)}%
      </span>
    </div>
  `;
}

/** Returns true if a hex colour is perceived as light (use dark text on it). */
function isLight(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 140;
}

function updateMetricsPanel(f) {
  const set = (id, val) => { if ($(id)) $(id).textContent = typeof val === "number" ? val.toFixed(2) : val; };
  set("m-face-L",      f.face_L);
  set("m-face-a",      f.face_a);
  set("m-face-b",      f.face_b);
  set("m-face-chroma", f.face_chroma);
  set("m-hair-L",      f.hair_L);
  set("m-eye-L",       f.eye_L);
  set("m-contrast",    f.contrast_overall);

  // Update detected colours panel whenever features are extracted
  renderDetectedColors(f);

  // Vẽ chart phân bố màu để đánh giá bộ lọc đột biến
  renderDistributionChart();
}

// ── Colour distribution chart (đánh giá bộ lọc outlier) ──────────────────────

/** Chuyển LAB → hex để tô điểm scatter đúng màu thật của pixel. */
function _labHex(L, a, b) { return labToHex(L, a, b); }

/** Vẽ scatter a*–b* + histogram L* cho vùng đang chọn trong dropdown. */
function renderDistributionChart() {
  const card = $("dist-chart-card");
  if (!card) return;

  const regions = Object.keys(lastColorDistribution);
  if (!regions.length) { card.classList.add("d-none"); return; }
  card.classList.remove("d-none");

  // Chỉ để lại option có dữ liệu
  const sel = $("dist-region-select");
  if (sel) {
    [...sel.options].forEach(o => { o.disabled = !lastColorDistribution[o.value]; });
    if (!lastColorDistribution[sel.value]) {
      sel.value = regions[0];
    }
  }
  const region = sel?.value ?? regions[0];
  const dist = lastColorDistribution[region];
  if (!dist) return;

  drawAbScatter($("dist-ab-canvas"), dist);
  drawLHistogram($("dist-l-canvas"), dist);

  const stats = $("dist-stats");
  if (stats && dist.center) {
    const dropped = dist.total - dist.kept;
    const pct = dist.total ? Math.round(100 * dist.kept / dist.total) : 0;
    stats.textContent = t("dist_stats")
      .replace("{kept}", dist.kept).replace("{total}", dist.total)
      .replace("{pct}", pct).replace("{dropped}", dropped)
      .replace("{dE}", dist.trimDeltaE)
      .replace("{L}", dist.center.L.toFixed(1))
      .replace("{a}", dist.center.a.toFixed(1))
      .replace("{b}", dist.center.b.toFixed(1));
  }
}

function _fitCanvas(cv) {
  // Đồng bộ backing store với kích thước hiển thị (nét trên màn hình retina).
  const rect = cv.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(cv.clientHeight || rect.height));
  cv.width = w * dpr; cv.height = h * dpr;
  const ctx = cv.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

/** Scatter a* (x) × b* (y). Điểm kept đậm, dropped mờ + gạch. ✕ = tâm. */
function drawAbScatter(cv, dist) {
  if (!cv) return;
  cv.style.height = "240px";
  const { ctx, w, h } = _fitCanvas(cv);
  ctx.clearRect(0, 0, w, h);

  // Miền a*,b* cố định để so sánh giữa các lần: [-40, 40]
  const MIN = -40, MAX = 40, pad = 24;
  const sx = a => pad + (a - MIN) / (MAX - MIN) * (w - 2 * pad);
  const sy = b => (h - pad) - (b - MIN) / (MAX - MIN) * (h - 2 * pad);

  // Lưới + trục 0
  ctx.strokeStyle = "#e9ecef"; ctx.lineWidth = 1;
  for (let v = MIN; v <= MAX; v += 20) {
    ctx.beginPath(); ctx.moveTo(sx(v), pad); ctx.lineTo(sx(v), h - pad); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad, sy(v)); ctx.lineTo(w - pad, sy(v)); ctx.stroke();
  }
  ctx.strokeStyle = "#adb5bd";
  ctx.beginPath(); ctx.moveTo(sx(0), pad); ctx.lineTo(sx(0), h - pad); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(pad, sy(0)); ctx.lineTo(w - pad, sy(0)); ctx.stroke();
  ctx.fillStyle = "#868e96"; ctx.font = "10px system-ui";
  ctx.fillText("a* →đỏ", w - pad - 34, sy(0) - 4);
  ctx.fillText("b* →vàng", sx(0) + 4, pad + 10);

  // Điểm dropped trước (nền), kept sau (nổi)
  const clampAt = v => Math.max(MIN + 1, Math.min(MAX - 1, v));
  for (const p of dist.samples) {
    if (p.kept) continue;
    const x = sx(clampAt(p.a)), y = sy(clampAt(p.b));
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = _labHex(p.L, p.a, p.b);
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.6; ctx.strokeStyle = "#e03131"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - 3, y - 3); ctx.lineTo(x + 3, y + 3);
    ctx.moveTo(x + 3, y - 3); ctx.lineTo(x - 3, y + 3); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (const p of dist.samples) {
    if (!p.kept) continue;
    ctx.fillStyle = _labHex(p.L, p.a, p.b);
    ctx.beginPath(); ctx.arc(sx(clampAt(p.a)), sy(clampAt(p.b)), 3.2, 0, Math.PI * 2); ctx.fill();
  }

  // Tâm màu cuối cùng
  if (dist.center) {
    const cx = sx(clampAt(dist.center.a)), cy = sy(clampAt(dist.center.b));
    ctx.strokeStyle = "#111"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(cx - 7, cy - 7); ctx.lineTo(cx + 7, cy + 7);
    ctx.moveTo(cx + 7, cy - 7); ctx.lineTo(cx - 7, cy + 7); ctx.stroke();
  }
}

/** Histogram L* (0..100), tách bar kept (xanh) vs dropped (đỏ nhạt). */
function drawLHistogram(cv, dist) {
  if (!cv) return;
  const { ctx, w, h } = _fitCanvas(cv);
  ctx.clearRect(0, 0, w, h);
  const BINS = 40, pad = 4;
  const keptBins = new Array(BINS).fill(0);
  const dropBins = new Array(BINS).fill(0);
  for (const p of dist.samples) {
    const bi = Math.max(0, Math.min(BINS - 1, Math.floor(p.L / 100 * BINS)));
    (p.kept ? keptBins : dropBins)[bi]++;
  }
  const maxV = Math.max(1, ...keptBins.map((v, i) => v + dropBins[i]));
  const bw = (w - 2 * pad) / BINS;
  for (let i = 0; i < BINS; i++) {
    const x = pad + i * bw;
    const kh = (keptBins[i] / maxV) * (h - 8);
    const dh = (dropBins[i] / maxV) * (h - 8);
    ctx.fillStyle = "#e03131aa";
    ctx.fillRect(x, h - kh - dh, bw - 1, dh);
    ctx.fillStyle = "#1c7ed6";
    ctx.fillRect(x, h - kh, bw - 1, kh);
  }
  // vạch tâm L
  if (dist.center) {
    const cx = pad + (dist.center.L / 100) * (w - 2 * pad);
    ctx.strokeStyle = "#111"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
  }
}

// Đổi vùng trong dropdown → vẽ lại chart
$("dist-region-select")?.addEventListener("change", () => renderDistributionChart());

// ═══════════════════════════════════════════════════════════════════════════════
// 9. DEMO MODE
// ═══════════════════════════════════════════════════════════════════════════════

btnDemo.addEventListener("click", async () => {
  // Load sample.jpg from public folder
  const DEMO_URL = "/sample.jpg";

  // Show the image in preview immediately (src loads from public/)
  currentImage = DEMO_URL;
  previewImg.src = DEMO_URL;
  dropZone.classList.add("d-none");
  previewContainer.classList.remove("d-none");
  btnAnalyze.disabled = false;
  manualRegions.skin = manualRegions.hair = manualRegions.eye = manualRegions.neck = null;
  manualMode = false;
  manualCard()?.classList.remove("d-none");

  // Convert URL → dataURL so extractFeatures() can draw it on canvas
  try {
    const res   = await fetch(DEMO_URL);
    const blob  = await res.blob();
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    currentImage = dataUrl;
    await runAnalysis(dataUrl);
  } catch (err) {
    showToast("Không load được ảnh demo: " + err.message);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 10. HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function showSpinner(msg = "Đang xử lý…") {
  spinnerMsg.textContent = msg;
  spinnerSection.classList.remove("d-none");
  placeholderSection.classList.add("d-none");
  resultSection.classList.add("d-none");
}
function setSpinnerMsg(msg) { spinnerMsg.textContent = msg; }
function hideSpinner()      { spinnerSection.classList.add("d-none"); }
function hideResults() {
  resultSection.classList.add("d-none");
  placeholderSection.classList.remove("d-none");
}

/**
 * Hiển thị error card khi model không load được.
 */
function showModelErrorCard() {
  placeholderSection.classList.remove("d-none");
  placeholderSection.innerHTML = `
    <div class="model-error-card">
      <i class="bi bi-exclamation-triangle-fill model-error-icon"></i>
      <h5 class="model-error-title">Không tải được model AI</h5>
      <p class="model-error-desc">
        File <code>model.onnx</code> chưa có hoặc tải thất bại.<br>
        Không thể phân tích màu sắc mà không có model.
      </p>
      <div class="model-error-steps">
        <div class="model-error-step">
          <span class="model-error-num">1</span>
          Chạy pipeline Python để tạo model:
          <pre>cd python
python generate_dataset.py
python train_model.py
python export_model.py</pre>
        </div>
        <div class="model-error-step">
          <span class="model-error-num">2</span>
          Copy model vào thư mục public:
          <pre>copy model\\model.onnx web\\public\\model.onnx</pre>
        </div>
        <div class="model-error-step">
          <span class="model-error-num">3</span>
          Reload lại trang — model sẽ được tải và cache.
        </div>
      </div>
      <button class="btn btn-sm btn-outline-primary mt-3" onclick="location.reload()">
        <i class="bi bi-arrow-clockwise me-1"></i>Reload trang
      </button>
    </div>
  `;
}

/**
 * Hiển thị hướng dẫn khi không detect được mặt trong ảnh.
 */
function showNoFaceError() {
  placeholderSection.classList.remove("d-none");
  placeholderSection.innerHTML = `
    <div class="model-error-card">
      <i class="bi bi-person-x-fill model-error-icon" style="color:#fd7e14"></i>
      <h5 class="model-error-title">Không tìm thấy khuôn mặt</h5>
      <p class="model-error-desc">
        MediaPipe không detect được mặt người trong ảnh này.<br>
        Vui lòng thử lại với ảnh phù hợp hơn.
      </p>
      <div class="model-error-steps">
        <div class="model-error-step">
          <span class="model-error-num" style="background:#fd7e14">✓</span>
          Ảnh chụp <strong>rõ mặt</strong>, nhìn thẳng hoặc hơi nghiêng
        </div>
        <div class="model-error-step">
          <span class="model-error-num" style="background:#fd7e14">✓</span>
          Ánh sáng <strong>đủ sáng</strong>, không ngược sáng
        </div>
        <div class="model-error-step">
          <span class="model-error-num" style="background:#fd7e14">✓</span>
          Mặt <strong>không bị che khuất</strong> bởi khẩu trang, kính râm đậm
        </div>
        <div class="model-error-step">
          <span class="model-error-num" style="background:#fd7e14">✓</span>
          Độ phân giải ảnh <strong>tối thiểu 200×200px</strong>
        </div>
      </div>
      <button class="btn btn-sm btn-outline-warning mt-3" onclick="document.getElementById('btn-clear').click()">
        <i class="bi bi-arrow-left me-1"></i>Chọn ảnh khác
      </button>
    </div>
  `;
}

function showToast(message) {
  const el = document.createElement("div");
  el.className = "toast show copy-toast align-items-center text-bg-dark border-0";
  el.setAttribute("role", "alert");
  el.innerHTML = `<div class="d-flex"><div class="toast-body">${message}</div>
    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// Global helper so inline onclick= can use it
window.copyHex = function(hex) {
  navigator.clipboard?.writeText(hex).then(() => showToast(`${t("toast_copied")} ${hex}`));
};

// ═══════════════════════════════════════════════════════════════════════════════
// INIT — full-page overlay cho đến khi model + weather sẵn sàng
// ═══════════════════════════════════════════════════════════════════════════════

const overlay      = $("init-overlay");
const initMsg      = $("init-msg");
const stepModel    = $("step-model");
const stepWeather  = $("step-weather");

function setStep(el, state) {
  // state: "active" | "done" | "error"
  el.className = "init-step " + state;
  const icon = { active: "", done: "✓ ", error: "✕ " }[state] ?? "";
  // Giữ key i18n cố định cho mỗi bước để không mất bản dịch khi đổi ngôn ngữ.
  const key = el.id === "step-model" ? "init_load_model" : "init_load_weather";
  el.innerHTML = `<span class="init-step-dot"></span>${icon}<span data-i18n="${key}">${t(key)}</span>`;
}

function hideOverlay() {
  overlay.classList.add("hidden");
  // Remove from DOM after transition so it doesn't block anything
  overlay.addEventListener("transitionend", () => overlay.remove(), { once: true });
}

// Track how many of the two init tasks have completed
let initDone = 0;
function onInitTaskDone() {
  initDone++;
  if (initDone >= 2) {
    initMsg.textContent = t("init_ready");
    // Enable analyze button nếu user đã chọn ảnh (demo hoặc upload)
    if (currentImage) btnAnalyze.disabled = false;
    setTimeout(hideOverlay, 400);
  }
}

// ── Kick off both tasks in parallel ──────────────────────────────────────────
setStep(stepModel,   "active");
setStep(stepWeather, "active");
initMsg.textContent = "Đang tải model AI và lấy vị trí…";

// ── Model cache via Cache API ─────────────────────────────────────────────────
// model.onnx (74 MB) được lưu vào browser Cache Storage lần đầu tải.
// Các lần sau load từ cache → không tốn bandwidth, khởi động nhanh hơn nhiều.
const MODEL_URL        = "/model.onnx";
const MODEL_CACHE_NAME = "pca-model-v3";   // đổi tên này khi cần invalidate cache (v3 = model train lại với ethnicity-aware hair/eye)

/**
 * Lấy model.onnx: ưu tiên Cache API → fallback network.
 * Trả về ArrayBuffer để truyền vào InferenceSession.create().
 */
async function fetchModelBuffer() {
  // model.onnx nhỏ hơn parsing nhưng vẫn > 1MB → dùng chung loader có kiểm tra.
  return loadValidatedOnnx(MODEL_URL, MODEL_CACHE_NAME, 1_000_000, "model");
}

// Model
(async () => {
  try {
    // Chỉ load color model trong init — đây là bắt buộc để analyze
    initMsg.textContent = t("init_load_color");
    const modelBuffer = await fetchModelBuffer();
    onnxSession = await ort.InferenceSession.create(modelBuffer, {
      executionProviders: ["wasm"],
    });
    console.log("[model] Color model ready.");
    modelStatusBadge.className = "badge bg-success";
    modelStatusBadge.innerHTML = `<i class="bi bi-check-circle me-1"></i>${t("model_ready")}`;
    setStep(stepModel, "done");

    // Load parsing model SAU — không block init, lỗi chỉ ảnh hưởng độ chính xác màu
    initMsg.textContent = t("init_load_parsing");
    _parsingLoadPromise = (async () => {
      try {
        const parsingBuffer = await fetchParsingBuffer();
        parsingSession = await ort.InferenceSession.create(parsingBuffer, {
          executionProviders: ["wasm"],
        });
        console.log("[parsing] BiSeNet session ready.");
      } catch (pe) {
        console.warn("[parsing] Face parsing unavailable:", pe.message);
        parsingSession = null;
      } finally {
        parsingSessionReady = true;
      }
    })();

  } catch (err) {
    // Chỉ vào đây khi color model thật sự fail
    console.warn("[model] Color model load failed:", err.message);
    modelStatusBadge.className = "badge bg-danger";
    modelStatusBadge.innerHTML = '<i class="bi bi-x-circle me-1"></i>Model lỗi';
    setStep(stepModel, "error");
    showModelErrorCard();
  }
  if (currentImage) btnAnalyze.disabled = false;
  onInitTaskDone();
})();

// Weather (wraps fetchWeather — marks step done when geolocation settles)
initMsg.textContent = "Đang tải model AI và lấy vị trí…";
fetchWeather(true).then(() => {
  setStep(stepWeather, "done");
  onInitTaskDone();
}).catch(() => {
  setStep(stepWeather, "error");
  onInitTaskDone();
});
