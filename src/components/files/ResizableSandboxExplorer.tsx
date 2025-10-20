import React, { useState, useMemo } from 'react';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

/** --------------------- Design Tokens --------------------- */
const T = {
  radius: 'rounded-[8px]',
  text: 'text-[12px]',
  focus: 'focus:outline-none focus:ring-1 focus:ring-[#3b82f6]/40',
  panel: 'bg-[#0F1219] dark:bg-[#0F1219] border border-[#1d2230]/60 dark:border-[#1d2230]/60',
  panelSoft: 'bg-[#10141D] dark:bg-[#10141D] border border-[#1a1f2c]/50 dark:border-[#1a1f2c]/50',
  panelElev: 'bg-[#0E1118] dark:bg-[#0E1118] border border-[#1a2030]/50 dark:border-[#1a2030]/50',
};

function SectionHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="h-9 px-3 border-b border-[#1d2230] dark:border-[#1d2230] flex items-center justify-between text-neutral-500 dark:text-neutral-500 bg-[#0E1118] dark:bg-[#0E1118]">
      <span>{title}</span>
      {right}
    </div>
  );
}

export const ResizableSandboxExplorer = React.memo(function ResizableSandboxExplorer({ compact = false }: { compact?: boolean }) {
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
      <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
        {/* Root Panel */}
        <ResizablePanel defaultSize={14} minSize={10} maxSize={25}>
          <div className={`flex flex-col h-full min-w-0 bg-[#0E1118] dark:bg-[#0E1118] border border-[#1a2030]/60 dark:border-[#1a2030]/60 rounded-r-none`}>
            {/* Search bar - aligned with headers */}
            <div className="h-9 px-3 flex items-center border-b border-[#1d2230] dark:border-[#1d2230]">
              <input
                placeholder="Search…"
                className={`w-full h-7 px-2 bg-[#0E1118] dark:bg-[#0E1118] border border-[#1d2230] dark:border-[#1d2230] rounded-[6px] text-[11px] text-neutral-300 dark:text-neutral-300 placeholder:text-neutral-500 dark:placeholder:text-neutral-500 ${T.focus}`}
              />
            </div>
            <div className="flex flex-col items-start justify-start px-3 py-2 space-y-2 overflow-auto">
              {ROOT.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoot(r)}
                  className={`px-2.5 py-1 ${T.radius} w-full text-left transition-colors ${T.text} ${root === r ? 'bg-[#141C28] dark:bg-[#141C28] text-blue-300 dark:text-blue-300' : 'text-neutral-400 dark:text-neutral-400 hover:bg-[#141C28] dark:hover:bg-[#141C28] hover:text-blue-300 dark:hover:text-blue-300'} ${T.focus}`}
                  aria-current={root === r ? 'true' : undefined}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle className="w-px bg-[#1a2030]/60 hover:bg-[#3b82f6]/40 transition-colors" />

        {/* Folders Panel */}
        <ResizablePanel defaultSize={18} minSize={15} maxSize={30}>
          <div className={`${T.panel} flex flex-col h-full rounded-none border-l-0 border-r-0 min-w-0`}>
            <SectionHeader
              title="Folders"
              right={
                <button type="button" className={`px-2 py-0.5 border border-[#283046] dark:border-[#283046] ${T.radius} ${T.text} hover:bg-[#161B26] dark:hover:bg-[#161B26] ${T.focus}`} aria-label="Add folder" title="Add folder">
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
                  className={`w-full text-left px-3 py-1 ${T.text} border-l-2 ${folder === f ? 'border-blue-400 dark:border-blue-400 bg-[#141C28] dark:bg-[#141C28] text-blue-300 dark:text-blue-300' : 'border-transparent text-neutral-300 dark:text-neutral-300 hover:bg-[#151A24] dark:hover:bg-[#151A24]'}`}
                  aria-current={folder === f ? 'true' : undefined}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle className="w-px bg-[#1a2030]/60 hover:bg-[#3b82f6]/40 transition-colors" />

        {/* Files Panel */}
        <ResizablePanel defaultSize={68} minSize={40}>
          <div className={`${T.panel} flex flex-col h-full rounded-l-none border-l-0 min-w-0`}>
            <SectionHeader
              title="Files"
              right={
                <button type="button" className={`px-2 py-0.5 border border-[#283046] dark:border-[#283046] ${T.radius} ${T.text} hover:bg-[#161B26] dark:hover:bg-[#161B26] ${T.focus}`} aria-label="Add file" title="Add file">
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
                  className={`w-full grid ${compact ? 'grid-cols-[minmax(0,1fr)]' : 'grid-cols-[minmax(0,1fr)_max-content_max-content_56px]'} gap-2 items-center px-3 py-1 text-left ${T.text} ${sel === f.id ? 'bg-[#141C28] dark:bg-[#141C28] text-blue-300 dark:text-blue-300' : 'hover:bg-[#151A24] dark:hover:bg-[#151A24] text-neutral-300 dark:text-neutral-300'}`}
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
        </ResizablePanel>
      </ResizablePanelGroup>

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
