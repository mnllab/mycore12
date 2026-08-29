import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
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
