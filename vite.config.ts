import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from "fs";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Auto-detect if fork exists AND is built (local dev) or not (Lovable build)
  // Check for both entry point and built CSS to ensure fork is fully ready
  const forkEntryPath = path.resolve(__dirname, "./excalidraw-fork 2/packages/excalidraw/index.tsx");
  const forkCSSPath = path.resolve(__dirname, "./excalidraw-fork 2/packages/excalidraw/dist/prod/index.css");
  
  // Production-aware fork detection:
  // - Production: Only check if source exists (CSS built by build:packages before Vite runs)
  // - Development: Check both source and built CSS exist
  const hasFork = mode === 'production'
    ? fs.existsSync(forkEntryPath)
    : fs.existsSync(forkEntryPath) && fs.existsSync(forkCSSPath);
  
  // Check if web-ifc-viewer source exists (for local development/forking)
  const webIfcViewerSourcePath = path.resolve(__dirname, "./web-ifc-viewer-source/viewer/src/index.ts");
  const hasWebIfcViewerFork = fs.existsSync(webIfcViewerSourcePath);
  
  console.log('🔍 Excalidraw fork detection:', {
    mode,
    hasFork,
    forkEntryExists: fs.existsSync(forkEntryPath),
    forkCSSExists: fs.existsSync(forkCSSPath)
  });
  
  console.log('🔍 web-ifc-viewer fork detection:', {
    hasWebIfcViewerFork,
    sourcePath: webIfcViewerSourcePath
  });
  
  // Base aliases (always applied)
  const alias: any[] = [
    {
      find: "@",
      replacement: path.resolve(__dirname, "./src"),
    },
    // Force fork packages to use main project's React to avoid type conflicts
    {
      find: /^react$/,
      replacement: path.resolve(__dirname, "./node_modules/react"),
    },
    {
      find: /^react\/jsx-runtime$/,
      replacement: path.resolve(__dirname, "./node_modules/react/jsx-runtime"),
    },
    {
      find: /^react\/jsx-dev-runtime$/,
      replacement: path.resolve(__dirname, "./node_modules/react/jsx-dev-runtime"),
    },
    {
      find: /^react-dom$/,
      replacement: path.resolve(__dirname, "./node_modules/react-dom"),
    },
    {
      find: /^react-dom\/client$/,
      replacement: path.resolve(__dirname, "./node_modules/react-dom/client"),
    },
  ];
  
  // Only add fork aliases when fork exists (local dev)
  if (hasFork) {
    alias.push(
      // Use excalidraw-fork-2 packages instead of npm packages
      {
        find: /^@excalidraw\/common$/,
        replacement: path.resolve(__dirname, "./excalidraw-fork 2/packages/common/src/index.ts"),
      },
      {
        find: /^@excalidraw\/common\/(.*)$/,
        replacement: path.resolve(__dirname, "./excalidraw-fork 2/packages/common/src/$1"),
      },
      {
        find: /^@excalidraw\/element$/,
        replacement: path.resolve(__dirname, "./excalidraw-fork 2/packages/element/src/index.ts"),
      },
      {
        find: /^@excalidraw\/element\/(.*)$/,
        replacement: path.resolve(__dirname, "./excalidraw-fork 2/packages/element/src/$1"),
      },
      {
        find: /^@excalidraw\/excalidraw$/,
        replacement: path.resolve(__dirname, "./excalidraw-fork 2/packages/excalidraw/index.tsx"),
      },
      {
        find: /^@excalidraw\/excalidraw\/index\.css$/,
        replacement: path.resolve(__dirname, "./excalidraw-fork 2/packages/excalidraw/dist/prod/index.css"),
      },
      {
        find: /^@excalidraw\/excalidraw\/(.*)$/,
        replacement: path.resolve(__dirname, "./excalidraw-fork 2/packages/excalidraw/$1"),
      },
      {
        find: /^@excalidraw\/math$/,
        replacement: path.resolve(__dirname, "./excalidraw-fork 2/packages/math/src/index.ts"),
      },
      {
        find: /^@excalidraw\/math\/(.*)$/,
        replacement: path.resolve(__dirname, "./excalidraw-fork 2/packages/math/src/$1"),
      },
      {
        find: /^@excalidraw\/utils$/,
        replacement: path.resolve(__dirname, "./excalidraw-fork 2/packages/utils/src/index.ts"),
      },
      {
        find: /^@excalidraw\/utils\/(.*)$/,
        replacement: path.resolve(__dirname, "./excalidraw-fork 2/packages/utils/src/$1"),
      },
    );
  }
  
  // Add web-ifc-viewer fork alias if source exists
  if (hasWebIfcViewerFork) {
    alias.push(
      {
        find: /^web-ifc-viewer$/,
        replacement: path.resolve(__dirname, "./web-ifc-viewer-source/viewer/src/index.ts"),
      },
      {
        find: /^web-ifc-viewer\/(.*)$/,
        replacement: path.resolve(__dirname, "./web-ifc-viewer-source/viewer/src/$1"),
      },
    );
    console.log('✅ Using local web-ifc-viewer source from:', path.resolve(__dirname, "./web-ifc-viewer-source/viewer/src"));
  }
  
  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias,
    },
    optimizeDeps: {
      // Only exclude Excalidraw when using fork (local dev)
      // When fork doesn't exist (Lovable), use the npm package which is pre-bundled correctly
      exclude: hasFork ? ["@excalidraw/excalidraw"] : [],
      // Include CommonJS dependencies that Excalidraw uses - these need pre-bundling
      include: [
        "es6-promise-pool",
        "png-chunks-extract",
        "png-chunks-encode",
        "png-chunk-text",
        "jotai-scope",
        "jotai",
      ],
      entries: ['index.html', 'src/**/*.{ts,tsx,js,jsx}'],
      esbuildOptions: {
        // Ensure React is resolved correctly during optimization
        alias: {
          react: path.resolve(__dirname, "./node_modules/react"),
          "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
        },
      },
    },
  };
});
