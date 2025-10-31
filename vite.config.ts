import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Force fork packages to use main project's React to avoid type conflicts
      "react": path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
    },
  },
  optimizeDeps: {
    exclude: ["@excalidraw/excalidraw"],
    include: ["es6-promise-pool"], // Pre-bundle to fix default export issue
    entries: ['index.html', 'src/**/*.{ts,tsx,js,jsx}'], // Only scan our source files, not fork
  },
}));
