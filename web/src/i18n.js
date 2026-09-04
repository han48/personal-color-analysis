/**
 * i18n.js — đa ngôn ngữ EN / VI / JP.
 * - Từ điển theo key.
 * - t(key) trả về chuỗi theo ngôn ngữ hiện tại (fallback EN).
 * - applyTranslations() quét [data-i18n] / [data-i18n-html] / [data-i18n-title] và điền text.
 * - setLanguage(lang) lưu vào localStorage + phát sự kiện "languagechange".
 *
 * Thuật ngữ kỹ thuật (face_L/face_a/face_b/chroma…) được thay bằng NGÔN NGỮ TỰ NHIÊN
 * (vd "Độ sáng da", "Tông ấm/lạnh"…) để người dùng phổ thông dễ hiểu.
 */

const STORAGE_KEY = "pca_lang";
export const SUPPORTED = ["vi", "en", "ja"];
const DEFAULT_LANG = "vi";

const DICT = {
  // ── Chung / Navbar / Hero ────────────────────────────────────────────────
  app_title:        { vi: "Personal Color AI", en: "Personal Color AI", ja: "パーソナルカラーAI" },
  model_loading:    { vi: "Đang tải model…", en: "Loading model…", ja: "モデル読み込み中…" },
  model_ready:      { vi: "Model sẵn sàng", en: "Model ready", ja: "モデル準備完了" },
  model_error:      { vi: "Model lỗi", en: "Model error", ja: "モデルエラー" },
  hero_title:       { vi: "Phân Tích Màu Sắc Cá Nhân", en: "Personal Color Analysis", ja: "パーソナルカラー診断" },
  hero_desc:        { vi: "Upload ảnh khuôn mặt → AI phân tích tone da → Gợi ý bảng màu phù hợp 100% client-side.",
                      en: "Upload a face photo → AI analyzes your skin tone → Suggests a matching palette, 100% client-side.",
                      ja: "顔写真をアップロード → AIが肌トーンを分析 → 似合うパレットを提案（100%クライアント処理）" },
  lang_label:       { vi: "Ngôn ngữ", en: "Language", ja: "言語" },

  // ── Init overlay ─────────────────────────────────────────────────────────
  init_booting:     { vi: "Đang khởi động…", en: "Starting up…", ja: "起動中…" },
  init_load_model:  { vi: "Tải model AI", en: "Load AI model", ja: "AIモデルを読み込み" },
  init_load_weather:{ vi: "Lấy vị trí & thời tiết", en: "Get location & weather", ja: "位置情報と天気を取得" },
  init_ready:       { vi: "Sẵn sàng!", en: "Ready!", ja: "準備完了！" },
  init_load_color:  { vi: "Đang tải Color AI model…", en: "Loading Color AI model…", ja: "カラーAIモデルを読み込み中…" },
  init_load_parsing:{ vi: "Đang tải Face Parsing model…", en: "Loading Face Parsing model…", ja: "顔解析モデルを読み込み中…" },

  // ── Upload card ──────────────────────────────────────────────────────────
  card_upload:      { vi: "1. Upload Ảnh", en: "1. Upload Photo", ja: "1. 写真をアップロード" },
  drop_hint:        { vi: "Kéo thả ảnh vào đây hoặc", en: "Drag & drop an image here or", ja: "ここに画像をドラッグ、または" },
  choose_image:     { vi: "Chọn ảnh", en: "Choose image", ja: "画像を選択" },
  btn_clear:        { vi: "Xoá", en: "Clear", ja: "クリア" },
  btn_analyze:      { vi: "Phân tích", en: "Analyze", ja: "分析" },

  // ── Weather card ─────────────────────────────────────────────────────────
  card_weather:     { vi: "2. Thông tin thời tiết", en: "2. Weather Info", ja: "2. 天気情報" },
  weather_desc:     { vi: "Vị trí và thời tiết được lấy tự động khi trang mở. Nhấn nút để cập nhật lại.",
                      en: "Location and weather are fetched automatically on load. Click to refresh.",
                      ja: "位置と天気は起動時に自動取得します。更新するにはボタンを押してください。" },
  btn_update_location:{ vi: "Cập nhật vị trí", en: "Update location", ja: "位置を更新" },
  weather_getting:  { vi: "Đang lấy…", en: "Fetching…", ja: "取得中…" },
  w_uv:             { vi: "UV Index", en: "UV Index", ja: "UV指数" },
  w_cloud:          { vi: "Mây (%)", en: "Clouds (%)", ja: "雲量 (%)" },
  w_sun:            { vi: "Góc MT", en: "Sun angle", ja: "太陽角度" },

  // ── Context card ─────────────────────────────────────────────────────────
  card_context:     { vi: "3. Hoàn cảnh sử dụng", en: "3. Usage Context", ja: "3. 使用シーン" },
  context_desc:     { vi: "Chọn thời điểm & sự kiện — gợi ý màu sẽ được ưu tiên lại cho phù hợp (không thay đổi mùa cá nhân của bạn).",
                      en: "Pick time & event — color suggestions get re-prioritized to fit (your personal season stays the same).",
                      ja: "時間帯とイベントを選択 — 提案色が最適化されます（あなたのパーソナルシーズンは変わりません）。" },
  label_time:       { vi: "Thời điểm", en: "Time of day", ja: "時間帯" },
  label_event:      { vi: "Sự kiện", en: "Event", ja: "イベント" },
  label_ethnicity:  { vi: "Sắc tộc (giúp phân tích chính xác hơn)", en: "Ethnicity (improves accuracy)", ja: "人種（精度向上に役立ちます）" },
  time_any:         { vi: "Bất kỳ", en: "Any", ja: "指定なし" },
  time_morning:     { vi: "Buổi sáng", en: "Morning", ja: "朝" },
  time_afternoon:   { vi: "Buổi chiều", en: "Afternoon", ja: "昼" },
  time_evening:     { vi: "Buổi tối", en: "Evening", ja: "夜" },
  event_any:        { vi: "Bất kỳ", en: "Any", ja: "指定なし" },
  event_gala:       { vi: "Dạ tiệc", en: "Gala", ja: "パーティー" },
  event_birthday:   { vi: "Sinh nhật", en: "Birthday", ja: "誕生日" },
  event_date:       { vi: "Hẹn hò", en: "Date", ja: "デート" },
  event_office:     { vi: "Công sở", en: "Office", ja: "オフィス" },
  event_indoor:     { vi: "Trong nhà", en: "Indoor", ja: "屋内" },
  event_outdoor:    { vi: "Ngoài trời", en: "Outdoor", ja: "屋外" },
  event_casual:     { vi: "Thường ngày", en: "Casual", ja: "普段着" },
  eth_auto:         { vi: "Tự động nhận diện", en: "Auto-detect", ja: "自動判定" },
  eth_asian:        { vi: "Á Đông", en: "Asian", ja: "アジア系" },
  eth_caucasian:    { vi: "Âu / Da trắng", en: "Caucasian", ja: "白人系" },
  eth_african:      { vi: "Phi / Da màu", en: "African", ja: "アフリカ系" },

  // ── Debug card ───────────────────────────────────────────────────────────
  card_debug:       { vi: "Debug — Vùng nhận diện màu", en: "Debug — Detected color regions", ja: "デバッグ — 検出領域" },
  toggle_show:      { vi: "Hiện", en: "Show", ja: "表示" },
  legend_skin:      { vi: "● Da mặt", en: "● Face skin", ja: "● 顔の肌" },
  legend_hair:      { vi: "● Tóc", en: "● Hair", ja: "● 髪" },
  legend_hat:       { vi: "● Mũ (bị loại)", en: "● Hat (excluded)", ja: "● 帽子（除外）" },
  legend_neck:      { vi: "● Cổ", en: "● Neck", ja: "● 首" },
  legend_cloth:     { vi: "● Áo", en: "● Clothing", ja: "● 衣服" },
  legend_eye:       { vi: "● Mắt", en: "● Eyes", ja: "● 目" },

  // ── Manual region card / modal ───────────────────────────────────────────
  card_manual:      { vi: "Chọn vùng màu thủ công", en: "Manual color region", ja: "手動で領域を選択" },
  manual_hint:      { vi: "Dùng khi model tự động không nhận diện được. Mở công cụ toàn màn hình, chọn loại vùng rồi kéo chuột vẽ hình chữ nhật trên ảnh.",
                      en: "Use when auto-detection fails. Open the fullscreen tool, pick a region type, then drag a rectangle on the image.",
                      ja: "自動検出が失敗した場合に使用。全画面ツールを開き、領域を選んで画像上に矩形をドラッグします。" },
  btn_open_manual:  { vi: "Mở công cụ chọn vùng", en: "Open region tool", ja: "領域ツールを開く" },
  manual_modal_hint:{ vi: "Chọn loại vùng rồi kéo chuột vẽ hình chữ nhật trên ảnh để lấy màu. Mỗi loại giữ 1 vùng — vẽ lại sẽ ghi đè.",
                      en: "Pick a region type then drag a rectangle on the image to sample its color. One rectangle per type — redraw to overwrite.",
                      ja: "領域を選び、画像上に矩形をドラッグして色を取得します。種類ごとに1つ — 再描画で上書きされます。" },
  region_skin:      { vi: "Da mặt", en: "Face skin", ja: "顔の肌" },
  region_required:  { vi: "(bắt buộc)", en: "(required)", ja: "（必須）" },
  region_hair:      { vi: "Tóc", en: "Hair", ja: "髪" },
  region_eye:       { vi: "Mắt (tròng mắt)", en: "Eye (iris)", ja: "目（虹彩）" },
  region_neck:      { vi: "Cổ / Da body", en: "Neck / Body skin", ja: "首・体の肌" },
  btn_clear_regions:{ vi: "Xoá tất cả vùng", en: "Clear all regions", ja: "全領域をクリア" },
  btn_analyze_regions:{ vi: "Phân tích vùng đã chọn", en: "Analyze selected regions", ja: "選択領域を分析" },
  manual_none:      { vi: "Chưa chọn vùng nào.", en: "No region selected yet.", ja: "領域が未選択です。" },
  close:            { vi: "Đóng", en: "Close", ja: "閉じる" },

  // ── Detected colors card ─────────────────────────────────────────────────
  card_detected:    { vi: "Màu sắc phân tích từ ảnh", en: "Colors detected from photo", ja: "写真から検出した色" },
  detected_empty:   { vi: "Upload ảnh để xem kết quả phân tích.", en: "Upload a photo to see analysis.", ja: "写真をアップロードすると結果が表示されます。" },
  detected_edit_hint:{ vi: "Nhấn vào ô màu để tự chỉnh lại — gợi ý sẽ cập nhật theo màu bạn chọn.",
                       en: "Click a color swatch to adjust it — suggestions update to your chosen color.",
                       ja: "色見本をクリックして調整 — 選んだ色に合わせて提案が更新されます。" },
  color_edited:     { vi: "đã chỉnh", en: "edited", ja: "編集済" },
  btn_restore_colors:{ vi: "Khôi phục màu gốc từ ảnh", en: "Restore original colors from photo", ja: "写真の元の色に戻す" },
  region_face:      { vi: "Da mặt", en: "Face skin", ja: "顔の肌" },
  region_body:      { vi: "Da cổ", en: "Neck skin", ja: "首の肌" },
  label_hair:       { vi: "Màu tóc", en: "Hair color", ja: "髪の色" },
  label_eye:        { vi: "Màu mắt", en: "Eye color", ja: "目の色" },

  // ── Distribution chart ───────────────────────────────────────────────────
  card_dist:        { vi: "Phân bố màu & lọc đột biến", en: "Color distribution & outlier filter", ja: "色分布と外れ値フィルタ" },
  dist_desc:        { vi: "Mỗi điểm là một pixel mẫu trên trục ấm-lạnh × vàng-xanh. Điểm giữ lại tô đậm, điểm bị loại mờ & gạch chéo. ✕ = màu trung tâm.",
                      en: "Each dot is a sampled pixel on warm-cool × yellow-blue axes. Kept dots are solid, removed (outlier) dots are faded & crossed. ✕ = final center color.",
                      ja: "各点は暖寒×黄青軸上のサンプル画素です。採用点は濃く、除外点は薄く×印。✕ = 最終的な中心色。" },
  dist_l_label:     { vi: "Phân bố độ sáng", en: "Lightness distribution", ja: "明度の分布" },
  dist_stats:       { vi: "Giữ {kept}/{total} pixel ({pct}%), loại {dropped} pixel đột biến (ΔE > {dE}). Tâm màu: sáng {L}, đỏ {a}, vàng {b}.",
                      en: "Kept {kept}/{total} px ({pct}%), removed {dropped} outlier px (ΔE > {dE}). Center: lightness {L}, red {a}, yellow {b}.",
                      ja: "{total}中{kept}画素を採用（{pct}%）、外れ値{dropped}画素を除外（ΔE > {dE}）。中心色：明度{L}・赤み{a}・黄み{b}。" },

  // ── Metrics (thuật ngữ tự nhiên thay cho face_L/a/b) ─────────────────────
  card_metrics:     { vi: "Thông số màu da", en: "Skin color metrics", ja: "肌の色指標" },
  m_face_L:         { vi: "Độ sáng da", en: "Skin lightness", ja: "肌の明るさ" },
  m_face_a:         { vi: "Sắc đỏ da", en: "Skin red tone", ja: "肌の赤み" },
  m_face_b:         { vi: "Sắc vàng da", en: "Skin yellow tone", ja: "肌の黄み" },
  m_face_chroma:    { vi: "Độ tươi màu da", en: "Skin color intensity", ja: "肌の色の鮮やかさ" },
  m_hair_L:         { vi: "Độ sáng tóc", en: "Hair lightness", ja: "髪の明るさ" },
  m_eye_L:          { vi: "Độ sáng mắt", en: "Eye lightness", ja: "目の明るさ" },
  m_contrast:       { vi: "Độ tương phản", en: "Contrast", ja: "コントラスト" },
  undertone:        { vi: "Tông nền", en: "Undertone", ja: "アンダートーン" },
  contrast:         { vi: "Tương phản", en: "Contrast", ja: "コントラスト" },
  tone_warm:        { vi: "Ấm", en: "Warm", ja: "暖" },
  tone_cool:        { vi: "Lạnh", en: "Cool", ja: "寒" },
  tone_neutral:     { vi: "Trung tính", en: "Neutral", ja: "ニュートラル" },
  metric_lightness: { vi: "Độ sáng da", en: "Skin lightness", ja: "肌の明るさ" },
  metric_red:       { vi: "Sắc đỏ", en: "Red tone", ja: "赤み" },
  metric_yellow:    { vi: "Sắc vàng", en: "Yellow tone", ja: "黄み" },
  metric_hairL:     { vi: "Độ sáng tóc", en: "Hair lightness", ja: "髪の明るさ" },
  metric_intensity: { vi: "Độ tươi màu", en: "Color intensity", ja: "色の鮮やかさ" },
  metric_confidence:{ vi: "Độ tin cậy", en: "Confidence", ja: "信頼度" },

  // ── Results section ──────────────────────────────────────────────────────
  card_palette:     { vi: "Bảng màu đề xuất", en: "Recommended palette", ja: "おすすめパレット" },
  card_makeup:      { vi: "Gợi ý Makeup", en: "Makeup suggestions", ja: "メイクの提案" },
  makeup_lipstick:  { vi: "Son môi", en: "Lipstick", ja: "口紅" },
  makeup_blush:     { vi: "Má hồng", en: "Blush", ja: "チーク" },
  makeup_eyeshadow: { vi: "Eyeshadow", en: "Eyeshadow", ja: "アイシャドウ" },
  card_hair:        { vi: "Gợi ý màu tóc", en: "Hair color suggestions", ja: "髪色の提案" },
  card_clothing:    { vi: "Gợi ý Trang phục", en: "Clothing suggestions", ja: "服装の提案" },
  clothing_tops:    { vi: "Màu Áo (Tops)", en: "Tops", ja: "トップス" },
  clothing_bottoms: { vi: "Màu Quần / Váy (Bottoms)", en: "Bottoms", ja: "ボトムス" },
  clothing_avoid:   { vi: "Nên Tránh", en: "Avoid", ja: "避けるべき色" },
  card_analysis:    { vi: "Chỉ số phân tích", en: "Analysis metrics", ja: "分析指標" },
  card_allprobs:    { vi: "Xác suất tất cả mùa", en: "All season probabilities", ja: "全シーズンの確率" },

  // ── Placeholder / spinner ────────────────────────────────────────────────
  placeholder_title:{ vi: "Upload ảnh để bắt đầu", en: "Upload a photo to begin", ja: "写真をアップロードして開始" },
  placeholder_desc: { vi: "AI sẽ phân tích tone màu da, tóc, mắt và gợi ý bảng màu phù hợp.",
                      en: "The AI will analyze your skin, hair and eye tones and suggest a matching palette.",
                      ja: "AIが肌・髪・目のトーンを分析し、似合うパレットを提案します。" },
  btn_demo:         { vi: "Xem ví dụ demo", en: "See demo example", ja: "デモを見る" },
  processing:       { vi: "Đang xử lý…", en: "Processing…", ja: "処理中…" },
  spinner_extract:  { vi: "Đang trích xuất màu sắc từ ảnh…", en: "Extracting colors from image…", ja: "画像から色を抽出中…" },
  spinner_detect:   { vi: "Đang chạy nhận diện khuôn mặt…", en: "Running face detection…", ja: "顔検出を実行中…" },
  spinner_infer:    { vi: "Đang chạy AI inference…", en: "Running AI inference…", ja: "AI推論を実行中…" },
  spinner_wait_parsing:{ vi: "Đang chờ Face Parsing model sẵn sàng…", en: "Waiting for face parsing model…", ja: "顔解析モデルを待機中…" },

  // ── Toasts / messages ────────────────────────────────────────────────────
  toast_copied:     { vi: "Đã copy", en: "Copied", ja: "コピーしました" },
  toast_override_updated:{ vi: "Đã cập nhật gợi ý theo màu bạn chọn.", en: "Suggestions updated to your chosen color.", ja: "選んだ色に合わせて提案を更新しました。" },
  toast_analyze_first:{ vi: "Hãy phân tích một ảnh trước.", en: "Please analyze a photo first.", ja: "先に写真を分析してください。" },
  toast_model_notready:{ vi: "Model chưa sẵn sàng.", en: "Model is not ready.", ja: "モデルの準備ができていません。" },
  toast_need_skin:  { vi: "Cần chọn tối thiểu vùng Da mặt.", en: "At least the Face skin region is required.", ja: "少なくとも顔の肌領域が必要です。" },
  ctx_note_prefix:  { vi: "Gợi ý cho", en: "Suggestions for", ja: "提案：" },
  ctx_note_star:    { vi: "được ưu tiên; thứ tự đã sắp xếp lại cho hoàn cảnh này.",
                      en: "are prioritized; order re-sorted for this context.",
                      ja: "が優先され、このシーンに合わせて並べ替えました。" },
  tip_morning:  { vi: "buổi sáng nên ưu tiên tông sáng & tươi", en: "morning favors light & fresh tones", ja: "朝は明るく爽やかなトーンが好適" },
  tip_afternoon:{ vi: "buổi chiều hợp tông trung tính, hơi ấm", en: "afternoon suits neutral, slightly warm tones", ja: "昼はニュートラルでやや暖かいトーンが好適" },
  tip_evening:  { vi: "buổi tối nên chọn màu đậm, rực và tương phản cao (đèn làm màu nhạt bị trôi)", en: "evening favors deep, vivid, high-contrast colors (dim light washes out pale ones)", ja: "夜は深く鮮やかで高コントラストな色が好適（照明で淡色は飛びやすい）" },
  tip_gala:     { vi: "dạ tiệc hợp màu sang, đậm & rực", en: "gala suits elegant, deep & vivid colors", ja: "パーティーは上品で深く鮮やかな色が好適" },
  tip_birthday: { vi: "sinh nhật hợp màu tươi vui, rực rỡ", en: "birthday suits cheerful, vivid colors", ja: "誕生日は明るく華やかな色が好適" },
  tip_date:     { vi: "hẹn hò nên chọn tông mềm, ấm, tôn da", en: "date favors soft, warm, skin-flattering tones", ja: "デートは柔らかく暖かい肌映えトーンが好適" },
  tip_office:   { vi: "công sở hợp tông trung tính, nhã", en: "office suits neutral, understated tones", ja: "オフィスはニュートラルで控えめなトーンが好適" },
  tip_indoor:   { vi: "trong nhà (đèn ấm) hợp tông ấm, sáng vừa", en: "indoor (warm light) suits warm, medium-bright tones", ja: "屋内（暖色照明）は暖かく中明度のトーンが好適" },
  tip_outdoor:  { vi: "ngoài trời hợp tông sáng, tươi, mát nhẹ", en: "outdoor suits bright, fresh, slightly cool tones", ja: "屋外は明るく爽やかでやや涼しいトーンが好適" },
  tip_casual:   { vi: "thường ngày ưu tiên tông cân bằng, thoải mái", en: "casual favors balanced, comfortable tones", ja: "普段着はバランスの良い快適なトーンが好適" },
  tl_any:       { vi: "bất kỳ", en: "any", ja: "指定なし" },
  tl_morning:   { vi: "buổi sáng", en: "morning", ja: "朝" },
  tl_afternoon: { vi: "buổi chiều", en: "afternoon", ja: "昼" },
  tl_evening:   { vi: "buổi tối", en: "evening", ja: "夜" },
  el_any:       { vi: "bất kỳ", en: "any", ja: "指定なし" },
  el_gala:      { vi: "dạ tiệc", en: "gala", ja: "パーティー" },
  el_birthday:  { vi: "sinh nhật", en: "birthday", ja: "誕生日" },
  el_date:      { vi: "hẹn hò", en: "date", ja: "デート" },
  el_office:    { vi: "công sở", en: "office", ja: "オフィス" },
  el_indoor:    { vi: "trong nhà", en: "indoor", ja: "屋内" },
  el_outdoor:   { vi: "ngoài trời", en: "outdoor", ja: "屋外" },
  el_casual:    { vi: "thường ngày", en: "casual", ja: "普段着" },

  // ── Season names ─────────────────────────────────────────────────────────
  season_Spring:    { vi: "Mùa Xuân", en: "Spring", ja: "スプリング" },
  season_Summer:    { vi: "Mùa Hè", en: "Summer", ja: "サマー" },
  season_Autumn:    { vi: "Mùa Thu", en: "Autumn", ja: "オータム" },
  season_Winter:    { vi: "Mùa Đông", en: "Winter", ja: "ウィンター" },

  footer:           { vi: "Personal Color AI · 100% Client-side · Không gửi dữ liệu lên server",
                      en: "Personal Color AI · 100% Client-side · No data sent to server",
                      ja: "パーソナルカラーAI · 100%クライアント処理 · データ送信なし" },

  // ── Nhãn phụ mùa con (phần trong ngoặc) ──────────────────────────────────
  lbl_Spring_Light: { vi: "Spring Light (Nhẹ nhàng, Tươi sáng)", en: "Spring Light (Soft, Bright)", ja: "スプリング・ライト（柔らか・明るい）" },
  lbl_Spring_Warm:  { vi: "Spring Warm (Ấm áp, Rực rỡ)", en: "Spring Warm (Warm, Vivid)", ja: "スプリング・ウォーム（暖か・鮮やか）" },
  lbl_Spring_Clear: { vi: "Spring Clear (Trong sáng, Tươi)", en: "Spring Clear (Clear, Fresh)", ja: "スプリング・クリア（澄んだ・爽やか）" },
  lbl_Spring_Bright:{ vi: "Spring Bright (Rực rỡ, Nổi bật)", en: "Spring Bright (Vivid, Striking)", ja: "スプリング・ブライト（鮮やか・華やか）" },
  lbl_Summer_Light: { vi: "Summer Light (Nhẹ nhàng, Dịu dàng)", en: "Summer Light (Soft, Gentle)", ja: "サマー・ライト（柔らか・穏やか）" },
  lbl_Summer_Cool:  { vi: "Summer Cool (Mát lạnh, Thanh lịch)", en: "Summer Cool (Cool, Elegant)", ja: "サマー・クール（涼やか・上品）" },
  lbl_Summer_Soft:  { vi: "Summer Soft (Mềm mại, Nhẹ nhàng)", en: "Summer Soft (Soft, Muted)", ja: "サマー・ソフト（柔らか・穏やか）" },
  lbl_Summer_Muted: { vi: "Summer Muted (Mờ dịu, Trầm)", en: "Summer Muted (Muted, Subdued)", ja: "サマー・ミュート（くすみ・落ち着き）" },
  lbl_Autumn_Warm:  { vi: "Autumn Warm (Ấm, Phong Phú)", en: "Autumn Warm (Warm, Rich)", ja: "オータム・ウォーム（暖か・豊か）" },
  lbl_Autumn_Deep:  { vi: "Autumn Deep (Sâu thẳm, Đậm)", en: "Autumn Deep (Deep, Rich)", ja: "オータム・ディープ（深み・濃厚）" },
  lbl_Autumn_Soft:  { vi: "Autumn Soft (Mềm mại, Tự nhiên)", en: "Autumn Soft (Soft, Natural)", ja: "オータム・ソフト（柔らか・ナチュラル）" },
  lbl_Autumn_Muted: { vi: "Autumn Muted (Mờ Đục, Cổ Điển)", en: "Autumn Muted (Muted, Classic)", ja: "オータム・ミュート（くすみ・クラシック）" },
  lbl_Winter_Deep:  { vi: "Winter Deep (Sâu tối, Mạnh mẽ)", en: "Winter Deep (Deep, Bold)", ja: "ウィンター・ディープ（深み・力強い）" },
  lbl_Winter_Cool:  { vi: "Winter Cool (Lạnh, Thanh lịch)", en: "Winter Cool (Cool, Elegant)", ja: "ウィンター・クール（涼やか・上品）" },
  lbl_Winter_Clear: { vi: "Winter Clear (Rõ ràng, Sắc nét)", en: "Winter Clear (Clear, Crisp)", ja: "ウィンター・クリア（明瞭・シャープ）" },
  lbl_Winter_Bright:{ vi: "Winter Bright (Rực rỡ, Tươi sáng)", en: "Winter Bright (Vivid, Bright)", ja: "ウィンター・ブライト（鮮やか・明るい）" },

  // ── Mô tả mùa con ────────────────────────────────────────────────────────
  desc_Spring_Light:{ vi: "Tông ấm nhẹ, da sáng hồng đào, tóc vàng sáng hoặc nâu vàng. Màu tốt nhất là pastel ấm, peach, ivory.",
                      en: "Soft warm tone, light peachy skin, light blond or golden-brown hair. Best colors: warm pastels, peach, ivory.",
                      ja: "柔らかな暖色トーン、明るいピーチ系の肌、明るいブロンドや黄みブラウンの髪。おすすめ：暖かいパステル、ピーチ、アイボリー。" },
  desc_Spring_Warm: { vi: "Da ấm ánh vàng, tóc nâu đỏ đồng hoặc vàng đậm. Màu tốt nhất là cam, vàng, san hô.",
                      en: "Warm golden skin, copper-red or deep golden hair. Best colors: orange, yellow, coral.",
                      ja: "黄みの暖かい肌、赤銅色や濃い金髪。おすすめ：オレンジ、イエロー、コーラル。" },
  desc_Spring_Clear:{ vi: "Da sáng hồng trong, contrast vừa phải. Màu tốt nhất là trong sáng, vàng chanh, xanh ngọc nhẹ.",
                      en: "Bright clear-pink skin, moderate contrast. Best colors: clear tones, lemon yellow, light jade.",
                      ja: "澄んだピンク系の明るい肌、中程度のコントラスト。おすすめ：クリアな色、レモンイエロー、薄い翡翠色。" },
  desc_Spring_Bright:{ vi: "Da sáng, contrast cao, màu mắt và tóc rõ ràng. Màu tốt nhất là màu rực rỡ, sặc sỡ.",
                      en: "Light skin, high contrast, clear eye and hair color. Best colors: vivid, bold hues.",
                      ja: "明るい肌、高コントラスト、はっきりした目と髪の色。おすすめ：鮮やかで大胆な色。" },
  desc_Summer_Light:{ vi: "Da sáng mát, ánh hồng nhẹ. Tóc sáng màu. Màu tốt nhất là pastel mát, lavender, hồng phấn.",
                      en: "Light cool skin with soft pink undertone, light hair. Best colors: cool pastels, lavender, powder pink.",
                      ja: "涼しく明るい肌、淡いピンクの下地、明るい髪。おすすめ：クールなパステル、ラベンダー、パウダーピンク。" },
  desc_Summer_Cool: { vi: "Da mát, tông hồng hoặc xanh nhạt dưới da. Màu tốt nhất là rose, raspberry, blueberry.",
                      en: "Cool skin with pink or bluish undertone. Best colors: rose, raspberry, blueberry.",
                      ja: "ピンクや青みの下地を持つ涼しい肌。おすすめ：ローズ、ラズベリー、ブルーベリー。" },
  desc_Summer_Soft: { vi: "Da mát mịn màng, độ bão hòa thấp. Màu tốt nhất là dusty rose, slate blue, sage.",
                      en: "Smooth cool skin, low saturation. Best colors: dusty rose, slate blue, sage.",
                      ja: "なめらかで涼しい肌、低彩度。おすすめ：ダスティローズ、スレートブルー、セージ。" },
  desc_Summer_Muted:{ vi: "Tông cool mờ đục, da mát xám nhẹ. Màu tốt nhất là slate, sage, dusty mauve.",
                      en: "Muted cool tone, cool grayish skin. Best colors: slate, sage, dusty mauve.",
                      ja: "くすんだ寒色トーン、やや灰みの涼しい肌。おすすめ：スレート、セージ、ダスティモーブ。" },
  desc_Autumn_Warm: { vi: "Da vàng đất ấm, tóc đỏ đồng hoặc nâu vàng. Màu tốt nhất là earth tones, terracotta, mustard.",
                      en: "Warm earthy-yellow skin, copper-red or golden-brown hair. Best colors: earth tones, terracotta, mustard.",
                      ja: "暖かい黄土色の肌、赤銅色や黄みブラウンの髪。おすすめ：アースカラー、テラコッタ、マスタード。" },
  desc_Autumn_Deep: { vi: "Da đậm tông vàng nâu sâu. Màu tốt nhất là burgundy, forest green, dark chocolate.",
                      en: "Deep skin with rich golden-brown tone. Best colors: burgundy, forest green, dark chocolate.",
                      ja: "深い黄みブラウントーンの濃い肌。おすすめ：バーガンディ、フォレストグリーン、ダークチョコレート。" },
  desc_Autumn_Soft: { vi: "Da ấm mềm, tông đất nhạt. Màu tốt nhất là camel, warm beige, dusty peach.",
                      en: "Soft warm skin, light earthy tone. Best colors: camel, warm beige, dusty peach.",
                      ja: "柔らかく暖かい肌、淡いアーストーン。おすすめ：キャメル、ウォームベージュ、ダスティピーチ。" },
  desc_Autumn_Muted:{ vi: "Da ấm mờ đục trung bình. Màu tốt nhất là olive, khaki, muted terracotta.",
                      en: "Medium muted warm skin. Best colors: olive, khaki, muted terracotta.",
                      ja: "中程度でくすんだ暖かい肌。おすすめ：オリーブ、カーキ、くすんだテラコッタ。" },
  desc_Winter_Deep: { vi: "Da rất sâu, tóc đen hoặc rất nâu đậm. Màu tốt nhất là đen, trắng, burgundy, navy.",
                      en: "Very deep skin, black or very dark brown hair. Best colors: black, white, burgundy, navy.",
                      ja: "非常に深い肌、黒髪または濃いダークブラウン。おすすめ：ブラック、ホワイト、バーガンディ、ネイビー。" },
  desc_Winter_Cool: { vi: "Da mát trắng hồng hoặc olive lạnh. Màu tốt nhất là icy white, cool grey, royal purple.",
                      en: "Cool pinkish-white or cool olive skin. Best colors: icy white, cool grey, royal purple.",
                      ja: "涼しいピンク白または寒色オリーブの肌。おすすめ：アイシーホワイト、クールグレー、ロイヤルパープル。" },
  desc_Winter_Clear:{ vi: "Da trắng sứ hoặc da sáng, contrast rất cao. Màu tốt nhất là pure white, black, vivid primaries.",
                      en: "Porcelain or light skin, very high contrast. Best colors: pure white, black, vivid primaries.",
                      ja: "磁器のような白い肌または明るい肌、非常に高いコントラスト。おすすめ：ピュアホワイト、ブラック、鮮やかな原色。" },
  desc_Winter_Bright:{ vi: "Da lạnh sáng, contrast cao. Màu tốt nhất là bright jewel tones, icy pastels with bold accents.",
                      en: "Bright cool skin, high contrast. Best colors: bright jewel tones, icy pastels with bold accents.",
                      ja: "明るく涼しい肌、高コントラスト。おすすめ：鮮やかなジュエルトーン、大胆なアクセントのアイシーパステル。" },
};

let currentLang = DEFAULT_LANG;

// ─────────────────────────────────────────────────────────────────────────────
// Dịch TÊN MÀU theo từ (token). Tên màu trong colorData.js là cụm tiếng Việt kiểu
// "[Màu] [Bổ nghĩa]" (vd "Hồng San Hô", "Xanh Da Trời"). Ta dịch từng token; token
// đã là tiếng Anh / tên màu riêng (Navy, Olive, Coral…) giữ nguyên cho EN.
// ─────────────────────────────────────────────────────────────────────────────

// Cụm nhiều từ (xử lý trước khi tách token).
const COLOR_PHRASES = {
  "San Hô":     { en: "Coral", ja: "コーラル" },
  "Da Trời":    { en: "Sky Blue", ja: "スカイブルー" },
  "Cà Phê":     { en: "Coffee", ja: "コーヒー" },
  "Sô Cô La":   { en: "Chocolate", ja: "チョコレート" },
  "Hạt Dẻ":     { en: "Chestnut", ja: "栗色" },
  "Hổ Phách":   { en: "Amber", ja: "琥珀" },
  "Mù Tạt":     { en: "Mustard", ja: "マスタード" },
  "Cánh Gián":  { en: "Mahogany", ja: "マホガニー" },
  "Ánh Kim":    { en: "Metallic", ja: "メタリック" },
};

// Từ đơn (token). VN → {en, ja}. Token không có trong bảng sẽ giữ nguyên.
const COLOR_WORDS = {
  // màu cơ bản
  "Đỏ": { en: "Red", ja: "赤" }, "Cam": { en: "Orange", ja: "オレンジ" },
  "Vàng": { en: "Yellow", ja: "黄" }, "Xanh": { en: "Blue/Green", ja: "青緑" },
  "Lá": { en: "Green", ja: "緑" }, "Tím": { en: "Purple", ja: "紫" },
  "Hồng": { en: "Pink", ja: "ピンク" }, "Nâu": { en: "Brown", ja: "ブラウン" },
  "Đen": { en: "Black", ja: "ブラック" }, "Trắng": { en: "White", ja: "ホワイト" },
  "Xám": { en: "Gray", ja: "グレー" }, "Bạc": { en: "Silver", ja: "シルバー" },
  "Kim": { en: "Gold", ja: "ゴールド" }, "Đồng": { en: "Copper", ja: "銅色" },
  "Be": { en: "Beige", ja: "ベージュ" }, "Kem": { en: "Cream", ja: "クリーム" },
  "Ngà": { en: "Ivory", ja: "アイボリー" }, "Đất": { en: "Earth", ja: "アース" },
  "Olive": { en: "Olive", ja: "オリーブ" }, "Navy": { en: "Navy", ja: "ネイビー" },
  // bổ nghĩa (độ đậm/sáng/tông)
  "Nhạt": { en: "Light", ja: "ライト" }, "Sáng": { en: "Bright", ja: "明るい" },
  "Đậm": { en: "Deep", ja: "ディープ" }, "Tối": { en: "Dark", ja: "ダーク" },
  "Ấm": { en: "Warm", ja: "ウォーム" }, "Lạnh": { en: "Cool", ja: "クール" },
  "Tươi": { en: "Vivid", ja: "ビビッド" }, "Trầm": { en: "Muted", ja: "くすんだ" },
  "Xỉn": { en: "Dusty", ja: "ダスティ" }, "Mờ": { en: "Soft", ja: "ソフト" },
  "Trong": { en: "Clear", ja: "クリア" }, "Rực": { en: "Bright", ja: "鮮やか" },
  "Sặc": { en: "Vivid", ja: "派手な" }, "Sỡ": { en: "", ja: "" },
  "Neon": { en: "Neon", ja: "ネオン" }, "Pastel": { en: "Pastel", ja: "パステル" },
  "Điện": { en: "Electric", ja: "エレクトリック" }, "Tuyền": { en: "Pure", ja: "純" },
  "Thuần": { en: "Pure", ja: "純" }, "Trung": { en: "Medium", ja: "ミディアム" },
  "Vừa": { en: "Medium", ja: "ミディアム" }, "Sâu": { en: "Deep", ja: "ディープ" },
  "Rất": { en: "Very", ja: "とても" }, "Tinh": { en: "Pure", ja: "純粋な" },
  "Khiết": { en: "", ja: "" }, "Băng": { en: "Icy", ja: "アイシー" },
  "Icy": { en: "Icy", ja: "アイシー" }, "Khói": { en: "Smoky", ja: "スモーキー" },
  "Khói.": { en: "Smoky", ja: "スモーキー" }, "Tro": { en: "Ash", ja: "アッシュ" },
  "Chì": { en: "Lead Gray", ja: "鉛色" }, "Sắt": { en: "Iron", ja: "アイアン" },
  "Gỗ": { en: "Wood", ja: "ウッド" }, "Gạch": { en: "Brick", ja: "レンガ色" },
  "Rượu": { en: "Wine", ja: "ワイン" }, "Rừng": { en: "Forest", ja: "フォレスト" },
  "Bóng": { en: "Glossy", ja: "光沢" }, "Nhánh": { en: "Jet", ja: "漆黒" },
  "Chanh": { en: "Lemon", ja: "レモン" }, "Ngọc": { en: "Jade", ja: "翡翠" },
  "Mint": { en: "Mint", ja: "ミント" }, "Aqua": { en: "Aqua", ja: "アクア" },
  "Đào": { en: "Peach", ja: "ピーチ" }, "Mơ": { en: "Apricot", ja: "アプリコット" },
  "Sữa": { en: "Milky", ja: "ミルキー" }, "Cát": { en: "Sand", ja: "サンド" },
  "Mật": { en: "Honey", ja: "ハニー" }, "Ong": { en: "", ja: "" },
  "Nghệ": { en: "Turmeric", ja: "ターメリック" }, "Cháy": { en: "Burnt", ja: "バーント" },
  "Sánh": { en: "Rich", ja: "濃厚な" }, "Kaki": { en: "Khaki", ja: "カーキ" },
  "Kaki.": { en: "Khaki", ja: "カーキ" }, "Bạch": { en: "Pale", ja: "淡い" },
  "Kim.": { en: "Gold", ja: "ゴールド" }, "Da": { en: "Skin", ja: "肌色" },
  "Phấn": { en: "Powder", ja: "パウダー" }, "Hoa": { en: "Floral", ja: "花" },
  "Bò": { en: "Ochre", ja: "黄土色" }, "Đà": { en: "Taupe", ja: "トープ" },
  "Lạc": { en: "Peanut", ja: "ピーナッツ" }, "Camel": { en: "Camel", ja: "キャメル" },
  "Gỉ": { en: "Rust", ja: "錆色" }, "Rỉ": { en: "Rust", ja: "錆色" },
  "Ri": { en: "Rust", ja: "錆色" }, "Mận": { en: "Plum", ja: "プラム" },
  "Cranberry": { en: "Cranberry", ja: "クランベリー" },
  "Terracotta": { en: "Terracotta", ja: "テラコッタ" },
  "Socola": { en: "Chocolate", ja: "チョコレート" },
};

/** Dịch một tên màu (cụm) sang ngôn ngữ hiện tại. */
export function translateColorName(name, lang = currentLang) {
  if (!name) return name;
  if (lang === "vi") return name;   // gốc đã là tiếng Việt

  // Các "màu cụ thể" — nếu xuất hiện thì bỏ từ màu chung đứng trước (Xanh/Hồng/Đỏ…)
  const SPECIFIC = new Set([
    "Coral","Sky Blue","Mint","Aqua","Peach","Apricot","Lemon","Jade","Navy","Olive",
    "Caramel","Camel","Plum","Rust","Terracotta","Chocolate","Chestnut","Amber","Mustard",
    "Mahogany","Cranberry","Forest","Wine","Brick","Sand","Honey","コーラル","スカイブルー",
    "ミント","アクア","ピーチ","アプリコット","レモン","翡翠","ネイビー","オリーブ",
    "キャメル","プラム","錆色","テラコッタ","チョコレート","栗色","琥珀","マスタード",
  ]);
  const GENERIC = new Set([
    "Blue/Green","Pink","Red","Green","青緑","ピンク","赤","緑",
  ]);

  // 1) thay cụm nhiều từ trước (đánh dấu bằng \u0000…\u0000 để giữ nguyên khối)
  let s = name;
  for (const [vi, tr] of Object.entries(COLOR_PHRASES)) {
    if (s.includes(vi)) s = s.split(vi).join(" \u0000" + (tr[lang] ?? tr.en) + "\u0000 ");
  }
  // 2) tách theo khoảng trắng NHƯNG giữ nguyên khối cụm đã dịch (giữa cặp \u0000).
  // s có dạng: "<vn> \u0000<phrase>\u0000 <vn>" → split cho [vn, phrase, vn, …]
  // phần tử index chẵn là VN cần tách token; index lẻ là phrase đã dịch (giữ nguyên).
  const parts = s.split(/\u0000/);
  let tokens = [];
  parts.forEach((part, idx) => {
    if (idx % 2 === 1) {
      if (part.trim()) tokens.push(part.trim());
    } else {
      part.split(/\s+/).forEach(tok => {
        const key = tok.trim();
        if (!key) return;
        const w = COLOR_WORDS[key];
        tokens.push(w ? (w[lang] ?? w.en ?? key) : tok);
      });
    }
  });

  // 3) nếu có màu cụ thể → bỏ các từ màu chung dư thừa
  const hasSpecific = tokens.some(tk => SPECIFIC.has(tk));
  if (hasSpecific) tokens = tokens.filter(tk => !GENERIC.has(tk));

  // 4) EN: đưa bổ nghĩa lên trước (đảo thứ tự token cho tự nhiên hơn)
  if (lang === "en") tokens = tokens.reverse();

  return tokens.join(lang === "ja" ? "" : " ").replace(/\s{2,}/g, " ").trim();
}

export function getLanguage() { return currentLang; }

export function initLanguage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && SUPPORTED.includes(saved)) {
    currentLang = saved;
  } else {
    const nav = (navigator.language || "vi").slice(0, 2);
    currentLang = SUPPORTED.includes(nav) ? nav : DEFAULT_LANG;
  }
  return currentLang;
}

export function t(key, lang = currentLang) {
  const entry = DICT[key];
  if (!entry) return key;
  return entry[lang] ?? entry.en ?? entry.vi ?? key;
}

/** Điền bản dịch vào mọi phần tử có data-i18n / data-i18n-html / data-i18n-title. */
export function applyTranslations(root = document) {
  root.querySelectorAll("[data-i18n]").forEach(el => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  root.querySelectorAll("[data-i18n-html]").forEach(el => {
    el.innerHTML = t(el.getAttribute("data-i18n-html"));
  });
  root.querySelectorAll("[data-i18n-title]").forEach(el => {
    el.setAttribute("title", t(el.getAttribute("data-i18n-title")));
  });
  root.querySelectorAll("[data-i18n-aria]").forEach(el => {
    el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
  });
  document.documentElement.lang = currentLang;
}

export function setLanguage(lang) {
  if (!SUPPORTED.includes(lang)) return;
  currentLang = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  applyTranslations();
  window.dispatchEvent(new CustomEvent("languagechange", { detail: { lang } }));
}
