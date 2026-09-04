# 🎨 Personal Color AI

**🌐 言語 / Language / Ngôn ngữ:** [Tiếng Việt](./README.md) · [English](./README.en.md) · **日本語**

AIによるパーソナルカラー診断 — **100%クライアント処理**。画像や結果などのデータは、いかなる形でも外部サーバーに送信されません。

> UI言語：🇻🇳 Tiếng Việt · 🇬🇧 English · 🇯🇵 日本語（選択は `localStorage` に保存されます）。

---

## 📐 アーキテクチャ概要

```
ユーザーの写真
      ↓
[ブラウザ] BiSeNet face_parsing.onnx  → 肌 / 髪 / 首 / 目 を領域分割
[ブラウザ] MediaPipe FaceMesh         → 虹彩ランドマーク（目の色）
      ↓
[ブラウザ] Canvas API → 肌/髪/目/首のLAB（外れ値除去 + median trimmed）
      ↓
[ブラウザ] Open-Meteo API → uv_index, cloud, sun_angle（光条件）
      ↓
[ブラウザ] ONNX Runtime Web → RandomForest 推論（50特徴量）
      ↓
結果：season · sub_season · 信頼度
      ↓
[提案レイヤー — 純粋なロジック、モデルは介さない]
   • シーン（時間帯 + イベント）で色を優先順位付け
   • 人種ベースラインで残差を補正し精度を向上
   • ユーザーが肌/目/髪の色を再指定 → 提案が更新
```

- **Python** はデータセット生成とモデル学習のみに使用 → `model.onnx` を出力。
- **Node.js / Vite** はフロントエンドのバンドルのみに使用 → 静的な `dist/` を出力。
- サーバー上で動く **AIバックエンドはありません**。推論はすべてブラウザ内の WebAssembly で行われます。

---

## 📂 プロジェクト構成

```
personal-color-analysis/
├── dataset/
│   ├── synthetic_personal_color.csv     ← generate_dataset.py が生成（7,200サンプル）
│   ├── dataset_stats.json
│   └── dataset_report.txt
├── model/
│   ├── model.pkl                         ← scikit-learn パイプライン（RandomForest）
│   ├── model.onnx                        ← Web で使用するモデル（約100 MB）
│   ├── scaler.pkl · label_encoder.pkl
│   ├── feature_names.json                ← 50特徴量（正しい順序）
│   ├── model_metadata.json               ← クラス名 + パレット
│   ├── confusion_matrix.csv · feature_importance.csv
│   └── training_report.txt
├── python/
│   ├── generate_dataset.py               ← 合成データセットを生成
│   ├── train_model.py                    ← 特徴量エンジニアリング + RandomForest 学習
│   ├── export_model.py                   ← ONNX + メタデータをエクスポート
│   └── download_parsing_model.py         ← BiSeNet face_parsing.onnx をダウンロード
├── web/
│   ├── src/
│   │   ├── index.html                    ← Bootstrap 5 UI（data-i18n 付き）
│   │   ├── app.js                        ← メインパイプライン（抽出 → 推論 → 描画）
│   │   ├── colorData.js                  ← 16サブシーズンのパレット/メイク/髪/服
│   │   ├── i18n.js                        ← VI/EN/JA 多言語 + 色名翻訳
│   │   └── style.css
│   ├── public/                           ← model.onnx · face_parsing.onnx · *.wasm · sample.jpg
│   ├── vite.config.js
│   └── dist/                             ← 静的ビルド出力
├── COLOR_RECOMMENDATION.md               ← 色のトレンドと提案ロジック（詳細）
└── README.md
```

---

## 🚀 使い方

### 1. Python 依存関係 + 顔解析モデルのダウンロード

```bash
pip install numpy pandas scipy scikit-learn skl2onnx onnx onnxruntime pillow
cd python
python download_parsing_model.py    # BiSeNet face_parsing.onnx（約51 MB）を web/public/ に取得
```

### 2. データセット生成 → 学習 → ONNX エクスポート

```bash
python generate_dataset.py           # dataset/synthetic_personal_color.csv（7,200行、50特徴量）
python train_model.py                # model/*.pkl + feature_names.json + training_report.txt
python export_model.py               # model/model.onnx + model_metadata.json
```

> Windows でコンソールが Unicode エラー（cp1252）を出す場合は、先に `set PYTHONUTF8=1` を実行してください。

### 3. モデルを web/public にコピー

```powershell
Copy-Item model\model.onnx web\public\model.onnx
```

### 4. Web アプリを起動

```bash
cd web
npm install
npm run dev          # http://localhost:5173
npm run build        # web/dist/ を出力（GitHub Pages / Netlify / Vercel / Nginx でデプロイ）
```

---

## 🧠 AIモデル

| 項目 | 値 |
|---|---|
| モデル種別 | RandomForestClassifier（400本）+ StandardScaler |
| クラス数 | 16サブシーズン |
| 特徴量 | 50（ベース37 + エンジニアリング13） |
| データセット | 合成7,200サンプル（クラスあたり450、人種ベースライン3種） |
| テスト精度 | サブシーズン約61% · シーズン約93%（注記参照） |
| エクスポート形式 | ONNX opset 12 |

**精度に関する注記：** 隣接するサブシーズン（例：Spring_Clear ↔ Spring_Bright）は本質的に重なるため、サブシーズン精度が約60〜70%なのは妥当です。4大シーズンの判別は約93%に達します。モデルは **肌 + アンダートーン** を主要な信号とし、髪の暗さが支配しないよう設計されています。そのため肌が明るく髪が黒い人（東アジアに多い）も正しく分類されます。

### 16サブシーズン

| シーズン | サブシーズン |
|---|---|
| 🌸 スプリング | Light · Warm · Clear · Bright |
| ☀️ サマー | Light · Cool · Soft · Muted |
| 🍂 オータム | Warm · Deep · Soft · Muted |
| ❄️ ウィンター | Deep · Cool · Clear · Bright |

### 50特徴量（概要）

- **顔・首の肌：** L, a, b, chroma, redness, uniformity + 顔↔体のdelta。
- **髪・目：** L, chroma, undertone, clarity。
- **コントラスト：** 顔↔髪, 顔↔目, 全体。
- **光条件：** uv_index, cloud_cover, sun_angle, ambient, white_balance, shadow, highlight, noise。
- **メイク：** foundation, lipstick, contour, blush（uniformity/redness と相関）。
- **人種ベースライン：** L/a/b（Asian · Caucasian · African）。
- **エンジニアリング（13）：** ITA 顔/体、warmth/depth/clarity スコア、ΔE face-hair、chroma 比、skin quality、light intensity、ベースライン残差、hair warmth。

---

## 🌐 Web機能

### 分析
- 画像をドラッグ&ドロップ／選択、または `sample.jpg` で **デモ** 実行。
- **BiSeNet** で領域分割（肌/髪/首/目）、目の色は **MediaPipe iris** で微調整。
- **外れ値除去**（境界エロージョン + median trimmed ΔE）付きの LAB 抽出で、唇/眉/影がトーンを歪めないようにします。
- 各領域の **色分布チャート**（a*×b* 散布図 + 明度ヒストグラム）でフィルタを確認できます。

### 手動領域選択（全画面フォールバック）
- 顔検出が失敗した場合 → モーダルツールを開き、肌/髪/目/首の矩形をドラッグします。

### 人種
- 人種を選択（アジア系 / 白人系 / アフリカ系 / 自動）→ **実ベースライン** で残差を正規化 → 分類がより正確に。

### 使用シーン（提案レイヤー — シーズンは変わりません）
- **時間帯**（朝 / 昼 / 夜）と **イベント**（パーティー / 誕生日 / デート / オフィス / 屋内 / 屋外 / 普段着）。
- パレット・メイク・髪・服がシーンに合わせて **並べ替え + ★印** されます。ルールの詳細：[`COLOR_RECOMMENDATION.ja.md`](./COLOR_RECOMMENDATION.ja.md) を参照。

### カスタムカラー
- ユーザーはカラーピッカーで **肌/目/髪の色を再指定** できます → 提案が自動更新（モデルを再実行）。「元に戻す」ボタンあり。

### 多言語
- VI / EN / JA。言語切替は即時反映され、**色名** や **シーズンの説明** も含まれます。技術用語（face_L/a/b）は自然な言葉（肌の明るさ / 赤み / 黄み）で表示されます。

### 結果
- シーズン & サブシーズン + 信頼度リング、パレット（クリックで HEX コピー）、メイク/髪/服の提案、分析指標、全16サブシーズンの確率チャート。

---

## 🔧 技術スタック

| レイヤー | 技術 |
|---|---|
| AI 学習 | Python · scikit-learn · pandas · numpy · scipy |
| モデルエクスポート | skl2onnx · onnx · onnxruntime |
| 顔解析 | BiSeNet ResNet18（ONNX）+ MediaPipe FaceMesh |
| フロントエンド | HTML5 · CSS3 · Bootstrap 5 · Vanilla JS · Vite 5 |
| AI 推論 | ONNX Runtime Web（WebAssembly） |
| 色科学 | CIE LAB (D65) via Canvas API |
| 天気 | Open-Meteo（無料・APIキー不要） |

---

## ⚡ パフォーマンスと注意点

- **起動に約25秒** かかるのは主に `InferenceSession.create()` が約100 MB の ONNX モデル（RandomForest 400本）を WASM 上で解析するためで、ファイルのダウンロード（キャッシュ読み込み約0.8秒）ではありません。高速化するには：木の本数/深さを減らす、または軽量モデル（LightGBM/MLP）に切り替える。
- `model.onnx`（約100 MB）と `face_parsing.onnx`（約51 MB）は **Cache Storage API** でキャッシュされます。モデルを差し替える際はキャッシュ名（`pca-model-vN`）を更新してください。
- データセットは **合成** です。実写真での精度は異なります。実運用には実データでのファインチューニングが必要です。
- **Geolocation** は HTTPS または localhost が必要です。
- Vite は `public/` から `.onnx`/`.wasm` を配信します。これらのファイルに対して watcher の無視ルールを **追加しないでください**（開発サーバーがバイナリの代わりに HTML を返してしまいます）。

---

## 📝 ライセンス

MIT — 自由に使用・改変・配布できます。
