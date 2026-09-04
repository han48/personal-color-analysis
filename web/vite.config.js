import { defineConfig } from "vite";

// Root là thư mục src/. index.html nằm ngay trong root nên Vite tự nhận làm
// entry mặc định — KHÔNG khai báo rollupOptions.input thủ công (dễ sai đường dẫn
// tương đối và làm hỏng `vite build`).
export default defineConfig({
  root: "src",
  // publicDir tương đối so với root → ../public = <project>/public.
  // Toàn bộ file trong đây (model.onnx, face_parsing.onnx, *.wasm) được phục vụ
  // nguyên trạng ở "/" cả khi dev lẫn khi build (copy vào dist/).
  publicDir: "../public",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    // Không nén/parse các asset lớn — copy nguyên bản.
    assetsInlineLimit: 0,
  },
  server: {
    port: 5173,
    open: true,
    fs: { strict: false },
  },
  // onnxruntime-web tự nạp wasm runtime → không để Vite pre-bundle.
  optimizeDeps: {
    exclude: ["onnxruntime-web"],
  },
  // Coi .onnx/.wasm là asset tĩnh (phòng khi được import trực tiếp).
  assetsInclude: ["**/*.onnx", "**/*.wasm"],
});
