import { useEffect } from "react";
import { useLocation } from "react-router";

// "/offline" is served as /offline.html by Vercel and by the service worker.
// This route only runs when the SPA itself opens /offline (dev server, vite preview).
function OfflineRedirect() {
  const location = useLocation();

  useEffect(() => {
    window.location.replace("/offline.html" + location.search);
  }, [location.search]);

  return null;
}

export default OfflineRedirect;
