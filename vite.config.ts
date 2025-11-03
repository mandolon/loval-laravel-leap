import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Detect if running in Lovable environment
  // Lovable sets this automatically, or you can set VITE_LOVABLE=true in Lovable
  const isLovable = process.env.VITE_LOVABLE === 'true' || process.env.LOVABLE === 'true';
  
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
  
  // Only add fork aliases when NOT in Lovable (use npm package in Lovable)
  if (!isLovable) {
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
      // Only exclude Excalidraw when using fork (not in Lovable)
      // In Lovable, use the npm package which is pre-bundled correctly
      exclude: isLovable ? [] : ["@excalidraw/excalidraw"],
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
