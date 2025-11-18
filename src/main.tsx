// Polyfills must be imported first for browser compatibility
import "./lib/polyfills";

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Dynamically import Excalidraw CSS - respects Vite alias configuration
// In Lovable: resolves to npm package CSS (no fork aliases)
// In local dev: resolves to fork CSS (fork aliases active)
import("@excalidraw/excalidraw/index.css");

// Disable MSW in Tauri desktop production builds
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
const isDev = import.meta.env.DEV;

// Only initialize MSW in development mode and not in Tauri
if (isDev && !isTauri) {
  // MSW initialization would go here if you had it
  console.log('[Dev] Running in browser development mode');
}

if (isTauri) {
  console.log('[Tauri] Running in desktop mode');
}

createRoot(document.getElementById("root")!).render(<App />);
