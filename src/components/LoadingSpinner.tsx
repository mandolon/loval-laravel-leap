import React, { useMemo } from "react";

const HARSH_MESSAGES = [
  "Cooking.....",
  "Crunching.....",
  "Tinkering.....",
  "Shimmying.....",
  "Computing.....",
  "Wrangling.....",
  "Manifesting.....",
  "Meandering.....",
  "Unravelling.....",
  "Creating.....",
  "Spelunking.....",
  "Cogitating.....",
  "Frolicking.....",
  "Discombobulating.....",
  "Booping.....",
  "Stewing.....",
  "Ideating.....",
  "Effecting.....",
  "Baking.....",
  "Schlepping.....",
  "Churning.....",
  "Hatching.....",
  "Imagining.....",
  "Processing.....",
  "Ruminating.....",
  "Reticulating.....",
  "Channelling.....",
  "Philosophising.....",
  "Spinning.....",
];

const SESSION_KEY = "rehome_loading_message";
const PAGE_LOAD_KEY = "rehome_page_load_id";

const FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const CSS_VARS: React.CSSProperties = {
  "--text": "#202020",
  "--muted": "#646464",
  "--primary": "#00639b",
} as React.CSSProperties;

const RAIL_GRADIENT =
  "linear-gradient(180deg,hsl(222 47% 10%) 0%,hsl(222 47% 8%) 55%,hsl(222 47% 6%) 100%),radial-gradient(80% 50% at 50% 0%,hsl(213 94% 68% / 0.14),transparent),radial-gradient(80% 50% at 50% 100%,hsl(259 94% 68% / 0.12),transparent)";

// Set page load ID immediately when module loads (before any component mounts)
const currentPageLoadId = Date.now().toString();
const storedPageLoadId = typeof window !== "undefined" && typeof window.sessionStorage !== "undefined" 
  ? sessionStorage.getItem(PAGE_LOAD_KEY) 
  : null;

// If this is a new page load, pick and store a new message
if (typeof window !== "undefined" && typeof window.sessionStorage !== "undefined" && storedPageLoadId !== currentPageLoadId) {
  sessionStorage.setItem(PAGE_LOAD_KEY, currentPageLoadId);
  const randomIndex = Math.floor(Math.random() * HARSH_MESSAGES.length);
  sessionStorage.setItem(SESSION_KEY, HARSH_MESSAGES[randomIndex]);
}

function getLoadingMessage(): string {
  if (typeof window === "undefined" || typeof window.sessionStorage === "undefined") {
    return HARSH_MESSAGES[0];
  }

  try {
    const stored = window.sessionStorage.getItem(SESSION_KEY);
    if (stored) return stored;

    const randomIndex = Math.floor(Math.random() * HARSH_MESSAGES.length);
    const message = HARSH_MESSAGES[randomIndex];
    window.sessionStorage.setItem(SESSION_KEY, message);
    return message;
  } catch {
    return HARSH_MESSAGES[0];
  }
}

export function LoadingSpinner({ message }: { message?: string }) {
  // If message prop is provided, use it directly. Otherwise use the session-persisted random message
  const displayMessage = message || useMemo(() => getLoadingMessage(), []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch"
      style={{ fontFamily: FONT, ...CSS_VARS }}
    >
      <style>{`
        @keyframes rehomeLoadingBar {
          0% { transform: translateX(-60%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(110%); }
        }
      `}</style>

      {/* Background gradient to match app */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(45rem 30rem at 50% 4%, hsl(215 75% 94%) 0%, hsl(220 35% 97%) 35%, hsl(0 0% 100%) 100%)",
        }}
      />

      {/* Left rail skeleton */}
      <aside
        className="absolute left-1.5 top-1.5 bottom-1.5 w-14 rounded-xl border border-white/5 shadow-lg backdrop-blur-md flex flex-col items-center pt-3 space-y-3"
        style={{ background: RAIL_GRADIENT }}
      >
        <div className="h-8 w-8 rounded-xl border border-white/15 bg-white/5" />
        <div className="h-px w-8 bg-white/10" />

        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <div className="h-9 w-9 rounded-xl border border-white/15 bg-white/5" />
            <div className="h-1.5 w-8 rounded-full bg-white/8" />
          </div>
        ))}

        <div className="mt-auto w-full flex flex-col items-center space-y-2 pb-2">
          <div className="h-px w-8 bg-white/10" />
          <div className="h-8 w-8 rounded-xl border border-white/15 bg-white/5" />
        </div>
      </aside>

      {/* Top header skeleton (search + avatar) */}
      <header
        className="absolute z-40 h-9 flex items-center"
        style={{
          top: "0.375rem",
          left: "calc(0.375rem + 3.5rem + 0.75rem)",
          right: "0.375rem",
        }}
      >
        <div className="w-full px-2">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-8 rounded-full bg-slate-200/40" />
            </div>
            <div className="flex items-center justify-center">
              <div className="h-8 w-[380px] max-w-[48vw] rounded-lg bg-slate-200/30" />
            </div>
            <div className="flex items-center justify-end pr-1">
              <div className="h-7 w-10 rounded-full bg-slate-200/40" />
            </div>
          </div>
        </div>
      </header>

      {/* Content surface outline */}
      <div
        className="absolute rounded-xl border border-slate-200/80 bg-white/60 backdrop-blur-md shadow-sm overflow-hidden"
        style={{
          top: "calc(0.375rem + 2.25rem + 0.75rem)",
          bottom: "1rem",
          right: "0.75rem",
          left: "calc(0.375rem + 3.5rem + 0.75rem)",
        }}
      >
        <div className="h-full flex flex-col">
          <div className="h-10 border-b border-slate-200/80 bg-white/80 flex items-center px-4 gap-3">
            <div className="h-4 w-24 rounded-full bg-slate-200/30" />
            <div className="ml-auto">
              <div className="h-6 w-6 rounded-full bg-slate-100/50" />
            </div>
          </div>
          <div className="flex-1 min-h-0 p-4">
            <div className="h-full w-full rounded-lg bg-slate-50/60" />
          </div>
        </div>
      </div>

      {/* Loading message + animated bar */}
      <div className="absolute bottom-6 right-6 flex items-center gap-3">
        <div className="text-xs text-slate-600 bg-white/90 rounded-full px-3 py-1 shadow-sm">
          {displayMessage}
        </div>
        <div className="h-1.5 w-40 rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full w-2/3 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, #00639b, #38bdf8, #00639b)",
              animation: "rehomeLoadingBar 1.2s ease-in-out infinite",
            }}
          />
        </div>
      </div>
    </div>
  );
}
