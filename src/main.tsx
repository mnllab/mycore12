import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App";
import { LocaleProvider } from "./i18n/LocaleProvider";
import { resetStaleLocalData } from "./lib/storage";
import "./styles/global.css";

// 테스트 단계: 데이터 버전이 바뀌었으면 로컬 데이터를 초기화하고 새로 시작한다.
// 렌더보다 먼저 실행되어야 오래된 세션이 화면에 뜨지 않는다.
resetStaleLocalData();

/**
 * 라우터 선택.
 *
 * GitHub Pages 처럼 (1) 저장소 이름이 하위 경로가 되고 (2) 서버 rewrite 설정을
 * 넣을 수 없는 정적 호스팅에서는 HashRouter 를 쓴다. 주소가 `/mycore12/#/result/…`
 * 형태가 되어 어떤 하위 경로에 올려도 base 설정 없이 동작하고, 딥링크 새로고침도
 * 404 없이 열린다.
 *
 * 자체 도메인·Netlify·Vercel 처럼 rewrite 가 가능한 곳에서는 기본값인
 * BrowserRouter 를 그대로 쓴다 (주소에 # 이 붙지 않는다).
 */
const useHashRouter = import.meta.env.VITE_ROUTER === "hash";
const Router = useHashRouter ? HashRouter : BrowserRouter;
const routerProps = useHashRouter ? {} : { basename: import.meta.env.BASE_URL };

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LocaleProvider>
      <Router {...routerProps}>
        <App />
      </Router>
    </LocaleProvider>
  </React.StrictMode>
);
