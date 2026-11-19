import { BrowserRouter, Route, Routes } from "react-router";
import AppLayout from "./layout/AppLayout";
import LibraryPage from "./pages/LibraryPage";
import DiscoverPage from "./pages/DiscoverPage";
import WorkDetailsPage from "./pages/WorkDetailsPage";
import DashboardPage from "./pages/DashboardPage";
import OfflineRedirect from "./pages/OfflineRedirect";
import NotFoundPage from "./pages/NotFoundPage";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<LibraryPage />} />
          <Route path="discover" element={<DiscoverPage />} />
          <Route path="discover/:workId" element={<WorkDetailsPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        {/* the real offline page is the static /offline.html (precached by the service worker) */}
        <Route path="offline" element={<OfflineRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
