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
    // Exclude Excalidraw itself (using fork)
    exclude: ["@excalidraw/excalidraw"],
    // Include CommonJS dependencies that Excalidraw uses - these need pre-bundling
    include: [
      "es6-promise-pool",
      "png-chunks-extract",
      "png-chunks-encode",
      "png-chunk-text",
    ],
    entries: ['index.html', 'src/**/*.{ts,tsx,js,jsx}'],
  },
}));
