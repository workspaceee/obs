import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { ScoreWidgetPage, RankWidgetPage } from "@/pages/WidgetPages";
import LoginPage from "@/pages/LoginPage";
import PanelPage from "@/pages/PanelPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/widget/score" element={<ScoreWidgetPage />} />
        <Route path="/widget/rank" element={<RankWidgetPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/panel" element={<PanelPage />} />
        <Route path="*" element={<Navigate to="/panel" replace />} />
      </Routes>
      <Toaster theme="dark" position="bottom-right" toastOptions={{ className: "imba-toast" }} />
    </BrowserRouter>
  );
}

export default App;
