import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "src/vendor/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        console: "readonly",
        crypto: "readonly",
        globalThis: "readonly",
        __dirname: "readonly",
        require: "readonly"
      }
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-require-imports": "off",
    }
  },
  {
    // 브랜드 가드: 앱 코드에 구 브랜드/비공식 표기를 다시 넣지 못하게 한다.
    // (테스트는 금지 표기 목록 자체를 다뤄야 하므로 대상에서 제외한다)
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/storage.ts"], // legacy migration key 정의부
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Literal[value=/MyCore12|Mycore12|My Core 12|MY CORE 12|MYCORE 12|(^|[^Y])CORE12/]",
          message: "공식 표기는 마이코어12 / MYCORE12 / mycore12 뿐입니다."
        }
      ]
    }
  }
);
