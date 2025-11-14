import { useMemo } from 'react';

const HARSH_MESSAGES = [
  "You don't need a north arrow, you need God.",
  "This bar moves more than you today.",
  "Your plans aren't the only thing stuck in 2D.",
  "Everything you need is in this dashboard. Get to work.",
  "You are good, but AI is better.",
  "Client is waiting...",
  "Good job.",
  "Loading up your paycheck..."
];

const SESSION_KEY = 'rehome_loading_message';
const PAGE_LOAD_KEY = 'rehome_page_load_id';

// Set page load ID immediately when module loads (before any component mounts)
const currentPageLoadId = Date.now().toString();
const storedPageLoadId = sessionStorage.getItem(PAGE_LOAD_KEY);

// If this is a new page load, pick and store a new message
if (storedPageLoadId !== currentPageLoadId) {
  sessionStorage.setItem(PAGE_LOAD_KEY, currentPageLoadId);
  const randomIndex = Math.floor(Math.random() * HARSH_MESSAGES.length);
  sessionStorage.setItem(SESSION_KEY, HARSH_MESSAGES[randomIndex]);
}

// Get the message for this page load
function getLoadingMessage(): string {
  const storedMessage = sessionStorage.getItem(SESSION_KEY);
  if (storedMessage) {
    return storedMessage;
  }
  
  // Fallback: pick a new message
  const randomIndex = Math.floor(Math.random() * HARSH_MESSAGES.length);
  const newMessage = HARSH_MESSAGES[randomIndex];
  sessionStorage.setItem(SESSION_KEY, newMessage);
  return newMessage;
}

export function LoadingSpinner({ message }: { message?: string }) {
  // Use the same message for all LoadingSpinner instances during this page load
  const harshMessage = useMemo(() => getLoadingMessage(), []);

  return (
    <div className="fixed inset-0 z-50 bg-background flex">
      {/* Left rail - dark sidebar with icons */}
      <div className="w-14 bg-[#1a1a1a] flex flex-col items-center py-4 space-y-4">
        <div className="w-8 h-8 bg-slate-700 rounded animate-pulse" />
        <div className="w-full h-px bg-slate-700" />
        <div className="w-8 h-8 bg-slate-700 rounded animate-pulse" />
        <div className="w-8 h-8 bg-slate-700 rounded animate-pulse" />
        <div className="w-8 h-8 bg-slate-700 rounded animate-pulse" />
        <div className="w-8 h-8 bg-slate-700 rounded animate-pulse" />
        <div className="w-8 h-8 bg-slate-700 rounded animate-pulse" />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Top header bar */}
        <div className="h-14 border-b border-slate-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <div className="h-6 w-24 bg-slate-200 rounded animate-pulse" />
            <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-20 bg-slate-200 rounded animate-pulse" />
            <div className="h-8 w-20 bg-slate-200 rounded animate-pulse" />
            <div className="h-8 w-8 bg-slate-200 rounded-full animate-pulse" />
          </div>
        </div>

        {/* Content with tabs */}
        <div className="flex-1 flex">
          {/* Center content area */}
          <div className="flex-1 p-6">
            {/* Tab bar */}
            <div className="flex gap-2 mb-6">
              <div className="h-8 w-24 bg-slate-200 rounded animate-pulse" />
              <div className="h-8 w-24 bg-slate-200 rounded animate-pulse" />
              <div className="h-8 w-24 bg-slate-200 rounded animate-pulse" />
              <div className="h-8 w-24 bg-slate-200 rounded animate-pulse" />
            </div>

            {/* Loading message and bar centered in remaining space */}
            <div className="flex items-center justify-center h-[calc(100%-5rem)]">
              <div className="flex flex-col items-center">
                <div className="text-sm mb-3" style={{ color: '#202020' }}>{harshMessage}</div>
                <div className="h-1.5 w-80 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary animate-pulse" style={{ width: '60%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
