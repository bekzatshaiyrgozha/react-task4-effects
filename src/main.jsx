import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { listenForConnectivity, listenForInstallPrompt, registerServiceWorker } from "./pwa/pwa";

listenForConnectivity();
listenForInstallPrompt();
registerServiceWorker();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
