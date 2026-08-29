import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { migrateLegacyStorage } from "./lib/storage";
import "./styles/global.css";

// LEGACY migration: 브랜드 변경 이전 버전의 저장 데이터를 신규 key로 옮긴다.
// 렌더보다 먼저 실행되어야 기존 세션·결과가 그대로 열린다.
migrateLegacyStorage();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
