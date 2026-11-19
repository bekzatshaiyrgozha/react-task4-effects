import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { usePwaState } from "../pwa/hooks";
import {
  applyUpdate,
  checkConnection,
  dismissOfflineReady,
  dismissUpdate,
  promptInstall,
  reportPageVisit,
} from "../pwa/pwa";

const LINKS = [
  { to: "/", label: "My library", icon: "📚", end: true },
  { to: "/discover", label: "Discover", icon: "🔎" },
  { to: "/dashboard", label: "Dashboard", icon: "📊" },
];

function AppLayout() {
  const location = useLocation();
  const { online, updateReady, offlineReady, installPrompt, installed } = usePwaState();
  const [menuOpen, setMenuOpen] = useState(false);
  const [checking, setChecking] = useState(false);

  // close the mobile menu after navigation, remember the page for offline use
  useEffect(() => {
    setMenuOpen(false);
    reportPageVisit(window.location.href);
  }, [location.pathname, location.search]);

  // close the mobile menu with Escape
  useEffect(() => {
    if (!menuOpen) return;
    function handleKeyDown(e) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  // hide "ready to work offline" after a few seconds
  useEffect(() => {
    if (!offlineReady) return;
    const timer = setTimeout(dismissOfflineReady, 6000);
    return () => clearTimeout(timer);
  }, [offlineReady]);

  async function handleRetry() {
    setChecking(true);
    await checkConnection();
    setChecking(false);
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <NavLink to="/" className="brand" end>
            <img src="/icons/icon-192.png" alt="" width="32" height="32" />
            <span>Mini Library</span>
          </NavLink>

          <span
            className={`net-pill ${online ? "net-online" : "net-offline"}`}
            role="status"
            aria-live="polite"
            title={online ? "Connected to the internet" : "No internet connection"}
          >
            {online ? "Online" : "Offline"}
          </span>

          <button
            type="button"
            className="menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="main-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className={`burger ${menuOpen ? "burger-open" : ""}`} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>

          <nav id="main-nav" className={`nav ${menuOpen ? "nav-open" : ""}`} aria-label="Main">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
              >
                <span aria-hidden="true">{link.icon}</span> {link.label}
              </NavLink>
            ))}

            {installPrompt && !installed && (
              <button type="button" className="btn btn-primary nav-install" onClick={promptInstall}>
                ⬇ Install app
              </button>
            )}
          </nav>
        </div>
      </header>

      {menuOpen && <div className="nav-backdrop" onClick={() => setMenuOpen(false)} />}

      {!online && (
        <div className="offline-banner" role="alert">
          <span>
            <strong>You are offline.</strong> Saved pages and data are still available.
          </span>
          <button type="button" className="btn btn-small" onClick={handleRetry} disabled={checking}>
            {checking ? "Checking..." : "Retry connection"}
          </button>
        </div>
      )}

      <main className="content" id="content">
        <Outlet />
      </main>

      <footer className="footer">
        Mini Library · React PWA · data from your device and{" "}
        <a href="https://openlibrary.org" target="_blank" rel="noreferrer">
          Open Library
        </a>
      </footer>

      {updateReady && (
        <div className="update-toast" role="alert">
          <span>
            <strong>New version available.</strong> Update to get the latest changes.
          </span>
          <div className="update-actions">
            <button type="button" className="btn btn-primary" onClick={applyUpdate}>
              Update now
            </button>
            <button type="button" className="btn" onClick={dismissUpdate}>
              Later
            </button>
          </div>
        </div>
      )}

      {offlineReady && !updateReady && (
        <div className="update-toast" role="status">
          <span>✅ The app is ready to work offline.</span>
          <button type="button" className="btn" onClick={dismissOfflineReady}>
            OK
          </button>
        </div>
      )}
    </div>
  );
}

export default AppLayout;
