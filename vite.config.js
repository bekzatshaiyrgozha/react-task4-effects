import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const SW_SOURCE = fileURLToPath(new URL("./src/sw/service-worker.js", import.meta.url));

// Files from /public that belong to the application shell.
const PUBLIC_SHELL_FILES = [
  "/index.html",
  "/offline.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/icon.svg",
];

/**
 * Builds /sw.js from src/sw/service-worker.js.
 * The service worker is written by hand; this plugin only injects
 *  - the list of built JS/CSS files (they have hashes in their names)
 *  - a build version, used in cache names, so every deploy gets new caches.
 */
function serviceWorkerPlugin() {
  return {
    name: "mini-library-service-worker",
    apply: "build",
    generateBundle(_options, bundle) {
      const builtFiles = Object.keys(bundle)
        .filter((file) => /\.(js|css|svg|png|woff2?)$/.test(file))
        .map((file) => "/" + file);

      const precache = [...PUBLIC_SHELL_FILES, ...builtFiles].sort();
      const template = readFileSync(SW_SOURCE, "utf8");
      const version = createHash("sha256")
        .update(template + precache.join("\n"))
        .digest("hex")
        .slice(0, 10);

      const source = template
        .replace("self.__PRECACHE_MANIFEST", JSON.stringify(precache, null, 2))
        .replaceAll("__BUILD_VERSION__", version);

      this.emitFile({ type: "asset", fileName: "sw.js", source });
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ version, builtAt: new Date().toISOString() }),
      });
    },
  };
}

export default defineConfig({
  // absolute base: the app has nested routes like /discover/OL123W
  base: "/",
  plugins: [react(), serviceWorkerPlugin()],
});
