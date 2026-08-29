import { Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { SiteFooter, SiteHeader } from "./components/Chrome";
import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";
import How, { Privacy } from "./pages/How";
import Assessment from "./pages/Assessment";
import Result from "./pages/Result";
import History from "./pages/History";

export default function App() {
  const location = useLocation();
  const inAssessment = location.pathname.startsWith("/assessment");

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <>
      {!inAssessment && <SiteHeader />}
      <ErrorBoundary>
        <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/how" element={<How />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/assessment" element={<Assessment />} />
        <Route path="/result/:sessionId" element={<Result />} />
        <Route path="/history" element={<History />} />
        <Route path="*" element={<Home />} />
        </Routes>
      </ErrorBoundary>
      {!inAssessment && <SiteFooter />}
    </>
  );
}
