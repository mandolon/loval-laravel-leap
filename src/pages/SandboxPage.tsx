import React, { useCallback, useMemo, useState } from 'react';
import { SandboxSidebar } from '@/components/layout/SandboxSidebar';
import { SandboxChatPanel } from '@/components/chat/SandboxChatPanel';
import { ResizableSandboxExplorer } from '@/components/files/ResizableSandboxExplorer';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

/** --------------------- Design Tokens --------------------- */
const T = {
  radius: 'rounded-[8px]',
  text: 'text-[12px]',
  focus: 'focus:outline-none focus:ring-1 focus:ring-[#9ecafc] dark:focus:ring-[#3b82f6]/40',
  panel: 'bg-white dark:bg-[#0F1219] border border-slate-200 dark:border-[#1d2230]/60',
  panelSoft: 'bg-slate-50 dark:bg-[#10141D] border border-slate-200 dark:border-[#1a1f2c]/50',
  panelElev: 'bg-white dark:bg-[#0E1118] border border-slate-200 dark:border-[#1a2030]/50',
};

/** --------------------- Small Primitives --------------------- */
function IconBtn({ title, ariaLabel, onClick, children }: { title: string; ariaLabel?: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={ariaLabel || title}
      onClick={onClick}
      className={`h-8 w-8 grid place-items-center ${T.radius} text-slate-500 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-[#141C28] ${T.focus}`}
    >
      {children}
    </button>
  );
}

function SectionHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="h-9 px-3 border-b border-slate-200 dark:border-[#1d2230] flex items-center justify-between text-slate-500 dark:text-neutral-500 bg-white dark:bg-[#0E1118]">
      <span>{title}</span>
      {right}
    </div>
  );
}



/** --------------------- Tabs Header --------------------- */
function TabsHeader({ chatOpen, onToggleChat }: { chatOpen: boolean; onToggleChat: () => void }) {
  const NAV = useMemo(() => ['Files', 'Tasks', 'Invoices', 'Links', 'Project', 'Client', 'Notes'], []);
  const [active, setActive] = useState(NAV[0]);

  const goBack = useCallback(() => {
    if (window?.history?.back) window.history.back();
  }, []);

  return (
    <div
      className={`h-12 ${T.text} grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 bg-white dark:bg-[#0E1118] border-b border-slate-200 dark:border-[#1a2030]/60`}
      role="navigation"
      aria-label="Secondary"
    >
      {/* Left: Back */}
      <IconBtn title="Back" ariaLabel="Back" onClick={goBack}>
        <svg xmlns="http://www.w3.org/2000/svg" aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
      </IconBtn>

      {/* Center: Tabs (centered between buttons) */}
      <div className="min-w-0 flex justify-center">
        <div className={`px-1 py-0.5 bg-slate-100 dark:bg-[#0E1118] border border-slate-200 dark:border-[#1a2030]/60 ${T.radius} flex gap-1`} role="tablist" aria-label="Views">
          {NAV.map((tab) => {
            const isActive = active === tab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(tab)}
                className={`px-2.5 py-1 ${T.radius} transition-colors ${isActive ? 'bg-white dark:bg-[#141C28] text-[#00639b] dark:text-blue-300 font-medium' : 'text-slate-500 dark:text-neutral-400 hover:bg-white/60 dark:hover:bg-[#141C28] hover:text-slate-700 dark:hover:text-blue-300'} ${T.focus}`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Chat toggle (always right-aligned) */}
      <IconBtn title={chatOpen ? 'Collapse chat' : 'Expand chat'} ariaLabel="Toggle chat" onClick={onToggleChat}>
        {chatOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6l6 6-6 6" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3h9m-9 3h5.25M21 12c0 4.97-4.03 9-9 9a8.96 8.96 0 01-4.49-1.18L3 21l1.18-4.49A8.96 8.96 0 013 12c0-4.97 4.03-9 9-9s9 4.03 9 9z" />
          </svg>
        )}
      </IconBtn>
    </div>
  );
}

/** --------------------- Explorer --------------------- */
const Explorer = React.memo(function Explorer({ compact = false }: { compact?: boolean }) {
  const ROOT = useMemo(() => ['Attachments', 'Build', 'Design', 'Permit', 'Photos', 'Plans'], []);
  const FOLDERS = useMemo(() => ['In Progress', 'Pending', 'Completed', 'Archived'], []);
  const FILES = useMemo(
    () => [
      { id: 1, name: 'RES-2427762 - INVOICE.pdf', size: '63.0 KB', modified: 'Oct 17, 02:46 AM', type: 'PDF' },
      { id: 2, name: 'Receipt-2482-0266.pdf', size: '20.2 KB', modified: 'Oct 17, 02:39 AM', type: 'PDF' },
      { id: 3, name: 'Flattened_Partial_Set_10.13.25.pdf', size: '5.3 MB', modified: 'Oct 17, 02:38 AM', type: 'PDF' },
      { id: 4, name: 'Invoice-INV-01.pdf', size: '3.3 KB', modified: 'Oct 17, 02:36 AM', type: 'PDF' },
    ],
    []
  );

  const [root, setRoot] = useState(ROOT[0]);
  const [folder, setFolder] = useState(FOLDERS[0]);
  const [sel, setSel] = useState(FILES[0].id);
  const selectedFile = FILES.find((f) => f.id === sel);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div
        className={`${T.text} grid gap-x-0 flex-1 items-stretch min-w-0`}
        style={{ gridTemplateColumns: 'clamp(120px,14vw,160px) clamp(160px,18vw,220px) minmax(0,1fr)' }}
        role="region"
        aria-label="File explorer"
      >
        {/* Root */}
        <div className={`flex flex-col justify-start min-w-0 bg-[#0E1118] dark:bg-[#0E1118] border border-[#1a2030]/60 dark:border-[#1a2030]/60 rounded-r-none`}>
          {/* Search bar - aligned with headers */}
          <div className="h-9 px-3 flex items-center border-b border-[#1d2230] dark:border-[#1d2230]">
            <input
              placeholder="Search…"
              className={`w-full h-7 px-2 bg-[#0E1118] dark:bg-[#0E1118] border border-[#1d2230] dark:border-[#1d2230] rounded-[6px] text-[11px] text-neutral-300 dark:text-neutral-300 placeholder:text-neutral-500 dark:placeholder:text-neutral-500 ${T.focus}`}
            />
          </div>
          <div className="flex flex-col items-start justify-start px-3 py-2 space-y-2">
            {ROOT.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoot(r)}
                className={`px-2.5 py-1 ${T.radius} w-full text-left transition-colors ${root === r ? 'bg-[#141C28] dark:bg-[#141C28] text-blue-300 dark:text-blue-300' : 'text-neutral-400 dark:text-neutral-400 hover:bg-[#141C28] dark:hover:bg-[#141C28] hover:text-blue-300 dark:hover:text-blue-300'} ${T.focus}`}
                aria-current={root === r ? 'true' : undefined}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Folders */}
        <div className={`${T.panel} ${T.radius} flex flex-col rounded-l-none rounded-r-none border-l-0 min-w-0`}>
          <SectionHeader
            title="Folders"
            right={
              <button type="button" className={`px-2 py-0.5 border border-[#283046] dark:border-[#283046] ${T.radius} hover:bg-[#161B26] dark:hover:bg-[#161B26] ${T.focus}`} aria-label="Add folder" title="Add folder">
                ＋
              </button>
            }
          />
          <div className="flex-1 overflow-auto min-w-0">
            {FOLDERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFolder(f)}
                className={`w-full text-left px-3 py-1 border-l-2 ${folder === f ? 'border-blue-400 dark:border-blue-400 bg-[#141C28] dark:bg-[#141C28] text-blue-300 dark:text-blue-300' : 'border-transparent text-neutral-300 dark:text-neutral-300 hover:bg-[#151A24] dark:hover:bg-[#151A24]'}`}
                aria-current={folder === f ? 'true' : undefined}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Files */}
        <div className={`${T.panel} ${T.radius} flex flex-col rounded-l-none border-l-0 min-w-0`}>
          <SectionHeader
            title="Files"
            right={
              <button type="button" className={`px-2 py-0.5 border border-[#283046] dark:border-[#283046] ${T.radius} hover:bg-[#161B26] dark:hover:bg-[#161B26] ${T.focus}`} aria-label="Add file" title="Add file">
                ＋
              </button>
            }
          />
          <div className="flex-1 overflow-auto min-w-0">
            {FILES.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSel(f.id)}
                className={`w-full grid ${compact ? 'grid-cols-[minmax(0,1fr)]' : 'grid-cols-[minmax(0,1fr)_max-content_max-content_56px]'} gap-2 items-center px-3 py-1 text-left ${sel === f.id ? 'bg-[#141C28] dark:bg-[#141C28] text-blue-300 dark:text-blue-300' : 'hover:bg-[#151A24] dark:hover:bg-[#151A24] text-neutral-300 dark:text-neutral-300'}`}
                aria-current={sel === f.id ? 'true' : undefined}
              >
                <span className="truncate min-w-0">{f.name}</span>
                <span className={`text-neutral-400 dark:text-neutral-400 whitespace-nowrap ${compact ? 'hidden' : ''}`}>{f.size}</span>
                <span className={`text-neutral-400 dark:text-neutral-400 whitespace-nowrap ${compact ? 'hidden' : ''}`}>{f.modified}</span>
                <span className={`text-neutral-400 dark:text-neutral-400 whitespace-nowrap ${compact ? 'hidden' : ''}`}>{f.type}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer for file properties */}
      <div className="h-7 px-3 flex items-center justify-between border-t border-[#1a2030]/40 dark:border-[#1a2030]/40 bg-[#0E1118] dark:bg-[#0E1118] text-neutral-400 dark:text-neutral-400 text-[10px]">
        <span>Selected File:</span>
        {selectedFile ? (
          <span className="truncate text-neutral-300 dark:text-neutral-300 max-w-[60%]">
            {selectedFile.name} ({selectedFile.size})
          </span>
        ) : (
          <span className="text-neutral-500 dark:text-neutral-500">None</span>
        )}
      </div>
    </div>
  );
});


/** --------------------- Page --------------------- */
export default function SandboxPage() {
  const [chatOpen, setChatOpen] = useState(true);
  const toggleChat = useCallback(() => setChatOpen((v) => !v), []);

  return (
    <div className={`h-screen w-full ${T.text} overflow-hidden bg-slate-50 dark:bg-[#0B0E14] text-slate-700 dark:text-neutral-200 flex gap-1 p-1`}>
      {/* Hybrid Sidebar */}
      <SandboxSidebar />

      {/* Main column */}
      <div className="relative min-h-0 flex-1 w-full overflow-hidden">
        {/* Main content & chat */}
        {chatOpen ? (
          <ResizablePanelGroup direction="horizontal" className="gap-1">
            {/* Main panel */}
            <ResizablePanel defaultSize={68} minSize={40}>
              <div className={`relative z-10 ${T.panel} ${T.radius} min-h-0 min-w-0 grid grid-rows-[auto_1fr] overflow-hidden h-full`}>
                <TabsHeader chatOpen={chatOpen} onToggleChat={toggleChat} />

                {/* Viewer (top) + Explorer (bottom) - Resizable */}
                <ResizablePanelGroup direction="vertical" className="min-h-0">
                  <ResizablePanel defaultSize={55} minSize={20} maxSize={80}>
                    <div className={`${T.panelElev} ${T.text} grid grid-rows-[auto_1fr] overflow-hidden h-full`}>
                      <div className="h-9 px-3 flex items-center justify-between border-b border-slate-200 dark:border-[#1a2030]/40">
                        <div className="text-slate-500 dark:text-neutral-500">Viewer</div>
                      </div>
                      <div className="grid place-items-center text-slate-500 dark:text-neutral-500">No file selected</div>
                    </div>
                  </ResizablePanel>

                  <ResizableHandle className="h-px bg-slate-200 dark:bg-[#1a2030]/60 hover:bg-[#00639b] dark:hover:bg-[#3b82f6]/40 transition-colors" />

                  <ResizablePanel defaultSize={45} minSize={20} maxSize={80}>
                    <div className="h-full min-h-0">
                      <ResizableSandboxExplorer compact={chatOpen} />
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              </div>
            </ResizablePanel>

            <ResizableHandle className="w-px bg-slate-200 dark:bg-[#1a2030]/60 hover:bg-[#00639b] dark:hover:bg-[#3b82f6]/40 transition-colors mx-1" />

            {/* Chat panel */}
            <ResizablePanel defaultSize={32} minSize={20} maxSize={50}>
              <SandboxChatPanel
                onClose={() => setChatOpen(false)}
                className="h-full"
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="h-full">
            {/* Main panel - Full width when chat closed */}
            <div className={`relative z-10 ${T.panel} ${T.radius} min-h-0 min-w-0 grid grid-rows-[auto_1fr] overflow-hidden h-full`}>
              <TabsHeader chatOpen={chatOpen} onToggleChat={toggleChat} />

              {/* Viewer (top) + Explorer (bottom) - Resizable */}
              <ResizablePanelGroup direction="vertical" className="min-h-0">
                <ResizablePanel defaultSize={55} minSize={20} maxSize={80}>
                  <div className={`${T.panelElev} ${T.text} grid grid-rows-[auto_1fr] overflow-hidden h-full`}>
                    <div className="h-9 px-3 flex items-center justify-between border-b border-slate-200 dark:border-[#1a2030]/40">
                      <div className="text-slate-500 dark:text-neutral-500">Viewer</div>
                    </div>
                    <div className="grid place-items-center text-slate-500 dark:text-neutral-500">No file selected</div>
                  </div>
                </ResizablePanel>

                <ResizableHandle className="h-px bg-slate-200 dark:bg-[#1a2030]/60 hover:bg-[#00639b] dark:hover:bg-[#3b82f6]/40 transition-colors" />

                <ResizablePanel defaultSize={45} minSize={20} maxSize={80}>
                  <div className="h-full min-h-0">
                    <ResizableSandboxExplorer compact={chatOpen} />
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
