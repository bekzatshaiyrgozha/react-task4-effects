// Service worker registration, update flow, install prompt and connectivity.
// React components read this state through the hooks in ./hooks.js.

let state = {
  updateReady: false, // a new version is installed and waiting
  offlineReady: false, // first install finished: the app now works offline
  installPrompt: null, // the saved beforeinstallprompt event
  installed: false,
  online: typeof navigator === "undefined" ? true : navigator.onLine,
};

const listeners = new Set();
let waitingWorker = null;
let reloadOnControllerChange = false;

function setState(patch) {
  state = { ...state, ...patch }; // new object, so useSyncExternalStore sees the change
  listeners.forEach((listener) => listener());
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState() {
  return state;
}

/* ---------------- service worker ---------------- */

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  // the service worker only exists in the production build (npm run build / preview / deploy)
  if (!import.meta.env.PROD) return;

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none", // always check the server for a new sw.js
      });

      if (registration.waiting && navigator.serviceWorker.controller) {
        showUpdate(registration.waiting);
      }

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;

        worker.addEventListener("statechange", () => {
          if (worker.state !== "installed") return;

          if (navigator.serviceWorker.controller) {
            showUpdate(worker); // an old version controls the page -> ask the user
          } else {
            setState({ offlineReady: true }); // very first install
          }
        });
      });

      // Look for a new version regularly and when the user comes back to the tab.
      setInterval(() => registration.update().catch(() => {}), 30 * 60 * 1000);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") registration.update().catch(() => {});
      });

      reportPageVisit(window.location.href);
    } catch (error) {
      console.warn("Service worker registration failed:", error);
    }
  });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloadOnControllerChange) {
      reloadOnControllerChange = false;
      window.location.reload();
    }
  });
}

function showUpdate(worker) {
  waitingWorker = worker;
  setState({ updateReady: true });
}

// "Update" button: activate the waiting worker, then reload once it takes control.
export function applyUpdate() {
  if (!waitingWorker) {
    window.location.reload();
    return;
  }
  reloadOnControllerChange = true;
  waitingWorker.postMessage({ type: "SKIP_WAITING" });
}

export function dismissUpdate() {
  setState({ updateReady: false });
}

export function dismissOfflineReady() {
  setState({ offlineReady: false });
}

// Tell the service worker which SPA route was opened, so it is available offline later.
export function reportPageVisit(url) {
  navigator.serviceWorker?.controller?.postMessage({ type: "PAGE_VISITED", url });
}

export function getServiceWorkerVersion() {
  const controller = navigator.serviceWorker?.controller;
  if (!controller) return Promise.resolve(null);

  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => resolve(null), 1500);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      resolve(event.data?.version ?? null);
    };
    controller.postMessage({ type: "GET_VERSION" }, [channel.port2]);
  });
}

/* ---------------- install prompt ---------------- */

export function listenForInstallPrompt() {
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
  if (standalone) setState({ installed: true });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); // show our own "Install" button instead of the mini-infobar
    setState({ installPrompt: event });
  });

  window.addEventListener("appinstalled", () => {
    setState({ installPrompt: null, installed: true });
  });
}

export async function promptInstall() {
  const prompt = state.installPrompt;
  if (!prompt) return;
  prompt.prompt();
  await prompt.userChoice.catch(() => null);
  setState({ installPrompt: null });
}

/* ---------------- connectivity ---------------- */

// A real request: navigator.onLine can say "online" on a network without internet.
export async function checkConnection() {
  try {
    const response = await fetch(`/version.json?connectivity-check=${Date.now()}`, { cache: "no-store" });
    // in dev there is no version.json; any answer from the server means we are online
    const online = response.ok || response.status === 404;
    setState({ online });
    return online;
  } catch {
    setState({ online: false });
    return false;
  }
}

export function listenForConnectivity() {
  window.addEventListener("online", () => {
    setState({ online: true });
    checkConnection();
  });
  window.addEventListener("offline", () => setState({ online: false }));
}

export function markOffline() {
  if (state.online) setState({ online: false });
}
