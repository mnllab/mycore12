import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 하위 경로 배포(GitHub Pages 등)에서는 VITE_BASE 로 base 경로를 지정한다.
// 예: VITE_BASE=/mycore12/  → 에셋이 /mycore12/assets/... 로 생성된다.
const base = process.env.VITE_BASE ?? "/";

// 단일 파일 빌드: 외부 에셋 참조를 아예 만들지 않는다 (경로 문제 원천 차단)
const single = process.env.VITE_SINGLE === "1";

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    outDir: single ? "dist-single" : "dist",
    cssCodeSplit: !single,
    assetsInlineLimit: single ? 100_000_000 : 4096,
    rollupOptions: {
      output: single
        ? { format: "iife", inlineDynamicImports: true, entryFileNames: "app.js" }
        : {
        // 64유형 콘텐츠(약 1.2MB)를 별도 청크로 분리해 초기 로드를 줄인다
        manualChunks(id) {
          if (id.includes("positive_64_type_dataset")) return "mycore12-types";
          if (id.includes("positive_144_situational")) return "mycore12-bank";
          if (id.includes("node_modules")) return "vendor";
        }
      }
    },
    chunkSizeWarningLimit: 900
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    environmentMatchGlobs: [["tests/**/*.test.tsx", "jsdom"]]
  }
} as any);
