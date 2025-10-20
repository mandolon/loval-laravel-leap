import React, { useCallback, useMemo, useState } from 'react';

/** --------------------- Design Tokens --------------------- */
const T = {
  radius: 'rounded-[8px]',
  text: 'text-[12px]',
  focus: 'focus:outline-none focus:ring-1 focus:ring-[#3b82f6]/40',
  panel: 'bg-[#0F1219] dark:bg-[#0F1219] border border-[#1d2230]/60 dark:border-[#1d2230]/60',
  panelSoft: 'bg-[#10141D] dark:bg-[#10141D] border border-[#1a1f2c]/50 dark:border-[#1a1f2c]/50',
  panelElev: 'bg-[#0E1118] dark:bg-[#0E1118] border border-[#1a2030]/50 dark:border-[#1a2030]/50',
};

/** --------------------- Small Primitives --------------------- */
function IconBtn({ title, ariaLabel, onClick, children }: { title: string; ariaLabel?: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={ariaLabel || title}
      onClick={onClick}
      className={`h-8 w-8 grid place-items-center border border-[#283046]/50 dark:border-[#283046]/50 ${T.radius} text-neutral-400 dark:text-neutral-400 hover:bg-[#141C28] dark:hover:bg-[#141C28] ${T.focus}`}
    >
      {children}
    </button>
  );
}

function SectionHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="h-9 px-3 border-b border-[#1d2230] dark:border-[#1d2230] flex items-center justify-between text-neutral-500 dark:text-neutral-500 bg-[#0E1118] dark:bg-[#0E1118]">
      <span>{title}</span>
      {right}
    </div>
  );
}

/** --------------------- SCHEMA (nav + lists) --------------------- */
const NAV_SCHEMA = [
  { key: 'Home', icon: '⌂', items: ['Inbox', 'Replies', 'My Tasks', 'Posts'] },
  { key: 'Projects', icon: '▦', items: ['Creative Team', 'Dean P.', 'Campaign Agent', 'Vision & Strategy'] },
  { key: 'Tasks', icon: '☰', items: ['Open Tasks', 'In Progress', 'Blocked', 'Done'] },
  { key: 'AI', icon: '✦', items: ['Ask Rehome AI', 'Draft Brief', 'Summarize Thread', 'Generate Action Items'] },
];

/** --------------------- Sidebar: Rail (64px) --------------------- */
function SidebarRail({ active, onNav, secondaryOpen, onToggleSecondary }: { active: string; onNav: (key: string) => void; secondaryOpen: boolean; onToggleSecondary: () => void }) {
  return (
    <aside
      className={`h-full mt-0 mb-1 ${T.text} text-neutral-300 dark:text-neutral-300 select-none flex flex-col items-center gap-2`}
      aria-label="Primary"
      style={{ width: 64 }}
    >
      {/* Top: toggle secondary */}
      <div className="h-9 w-full flex items-center justify-center mb-0">
        <button
          type="button"
          aria-label={secondaryOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          onClick={onToggleSecondary}
          className="h-8 w-8 grid place-items-center text-neutral-400 dark:text-neutral-400 hover:text-blue-300 dark:hover:text-blue-300 focus:outline-none focus:ring-1 focus:ring-[#3b82f6]/40"
        >
          {secondaryOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          )}
        </button>
      </div>

      {/* Nav icons */}
      <nav className="mt-1 flex-1 flex flex-col items-center gap-2" aria-label="Primary icons">
        {NAV_SCHEMA.map((b) => (
          <button
            key={b.key}
            type="button"
            title={b.key}
            onClick={() => onNav(b.key)}
            className={`${T.panelSoft} ${T.radius} h-10 w-10 grid place-items-center hover:bg-[#161B26] dark:hover:bg-[#161B26] ${T.focus} ${active === b.key ? 'ring-1 ring-blue-500/40' : ''}`}
          >
            <span className="text-neutral-300 dark:text-neutral-300 text-[16px] md:text-[18px] leading-none" aria-hidden>
              {b.icon}
            </span>
          </button>
        ))}
      </nav>

      {/* Footer avatar / switcher */}
      <div className="w-full px-2 pb-3">
        <button
          type="button"
          className={`${T.radius} border border-[#283046]/50 dark:border-[#283046]/50 hover:bg-[#161B26] dark:hover:bg-[#161B26] ${T.focus} h-10 w-10 grid place-items-center mx-auto`}
        >
          <div className="h-7 w-7 rounded-full bg-neutral-700/40 dark:bg-neutral-700/40" title="Avatar" />
        </button>
      </div>
    </aside>
  );
}

/** --------------------- Sidebar: Secondary (0|200px) --------------------- */
function SidebarSecondary({ open, active }: { open: boolean; active: string }) {
  const current = useMemo(() => NAV_SCHEMA.find((n) => n.key === active), [active]);
  return (
    <aside
      className={`h-full mt-0 mb-1 ml-[2px] ${T.text} text-neutral-300 dark:text-neutral-300 select-none flex flex-col overflow-hidden`}
      aria-label="Secondary"
      style={{ width: open ? 200 : 0 }}
    >
      <div
        className={`h-full mt-0.5 ${T.panel} ${T.radius} rounded-l-none ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity duration-150 grid grid-rows-[auto_1fr_auto]`}
        aria-hidden={!open}
      >
        <div className="h-10 px-3 flex items-center justify-between border-b border-[#1d2230] dark:border-[#1d2230] bg-[#0E1118] dark:bg-[#0E1118]">
          <span className="text-neutral-400 dark:text-neutral-400">{current?.key || ''}</span>
        </div>

        {/* Lists */}
        <div className="flex-1 overflow-auto min-w-0">
          {(current?.items || []).map((label) => (
            <button
              key={label}
              type="button"
              className={`w-full text-left px-3 py-2 border-l-2 border-transparent text-neutral-300 dark:text-neutral-300 hover:bg-[#151A24] dark:hover:bg-[#151A24] hover:text-blue-300 dark:hover:text-blue-300 hover:border-blue-400 dark:hover:border-blue-400 ${T.focus}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Footer link */}
        <div className="h-9 px-3 flex items-center border-t border-[#1d2230] dark:border-[#1d2230] bg-[#0E1118] dark:bg-[#0E1118] text-neutral-400 dark:text-neutral-400">
          <button type="button" className={`px-2 py-0.5 border border-[#283046]/60 dark:border-[#283046]/60 ${T.radius} hover:bg-[#161B26] dark:hover:bg-[#161B26] ${T.focus}`}>
            Manage sidebar
          </button>
        </div>
      </div>
    </aside>
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
      className={`h-12 ${T.text} grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 bg-[#0E1118] dark:bg-[#0E1118] border-b border-[#1a2030]/60 dark:border-[#1a2030]/60`}
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
        <div className={`px-1 py-0.5 bg-[#0E1118] dark:bg-[#0E1118] border border-[#1a2030]/60 dark:border-[#1a2030]/60 ${T.radius} flex gap-1`} role="tablist" aria-label="Views">
          {NAV.map((tab) => {
            const isActive = active === tab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(tab)}
                className={`px-2.5 py-1 ${T.radius} transition-colors ${isActive ? 'bg-[#141C28] dark:bg-[#141C28] text-blue-300 dark:text-blue-300' : 'text-neutral-400 dark:text-neutral-400 hover:bg-[#141C28] dark:hover:bg-[#141C28] hover:text-blue-300 dark:hover:text-blue-300'} ${T.focus}`}
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
        style={{ gridTemplateColumns: 'clamp(100px,12vw,140px) clamp(160px,18vw,220px) minmax(0,1fr)' }}
        role="region"
        aria-label="File explorer"
      >
        {/* Root */}
        <div className={`flex flex-col justify-start min-w-0 bg-[#0E1118] dark:bg-[#0E1118] border border-[#1a2030]/60 dark:border-[#1a2030]/60 rounded-r-none`}>
          <div className="flex flex-col items-start justify-start px-3 py-3 space-y-2">
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
                className={`w-full text-left px-3 py-2 border-l-2 ${folder === f ? 'border-blue-400 dark:border-blue-400 bg-[#141C28] dark:bg-[#141C28] text-blue-300 dark:text-blue-300' : 'border-transparent text-neutral-300 dark:text-neutral-300 hover:bg-[#151A24] dark:hover:bg-[#151A24]'}`}
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
                className={`w-full grid ${compact ? 'grid-cols-[minmax(0,1fr)]' : 'grid-cols-[minmax(0,1fr)_max-content_max-content_56px]'} gap-2 items-center px-3 py-2 text-left ${sel === f.id ? 'bg-[#141C28] dark:bg-[#141C28] text-blue-300 dark:text-blue-300' : 'hover:bg-[#151A24] dark:hover:bg-[#151A24] text-neutral-300 dark:text-neutral-300'}`}
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

      {/* Footer with search bar */}
      <div className="h-9 px-3 flex items-center border-t border-[#1a2030]/40 dark:border-[#1a2030]/40 bg-[#0E1118] dark:bg-[#0E1118]">
        <input
          placeholder="Search files…"
          className={`w-full h-7 px-3 bg-[#0E1118] dark:bg-[#0E1118] border border-[#1d2230] dark:border-[#1d2230] rounded-[6px] text-[12px] text-neutral-300 dark:text-neutral-300 placeholder:text-neutral-500 dark:placeholder:text-neutral-500 ${T.focus}`}
        />
      </div>
    </div>
  );
});

/** --------------------- Chat --------------------- */
const ChatPanel = React.memo(function ChatPanel({ onClose, className = '' }: { onClose: () => void; className?: string }) {
  return (
    <div
      className={`relative z-20 h-full ${T.panel} ${T.radius} bg-[#0F1219] dark:bg-[#0F1219] border-l border-[#1d2230]/60 dark:border-[#1d2230]/60 grid grid-rows-[auto_1fr_auto] overflow-hidden pb-0 ${className}`}
      role="complementary"
      aria-label="Project chat"
    >
      <div className="h-10 px-3 flex items-center justify-between border-b border-[#1d2230] dark:border-[#1d2230] bg-[#0E1118] dark:bg-[#0E1118]">
        <span className="text-neutral-300 dark:text-neutral-300">Project Chat</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Collapse chat"
          className={`h-7 w-7 grid place-items-center border border-[#283046]/60 dark:border-[#283046]/60 ${T.radius} text-neutral-400 dark:text-neutral-400 hover:bg-[#161B26] dark:hover:bg-[#161B26] ${T.focus}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <div className="overflow-auto p-3 space-y-2 text-neutral-300 dark:text-neutral-300 min-h-0">
        <div className="text-neutral-500 dark:text-neutral-500">No messages yet.</div>
        <div className="bg-[#141C28] dark:bg-[#141C28] border border-[#1a2030]/60 dark:border-[#1a2030]/60 p-2 rounded-[6px] w-fit max-w-[85%]">Welcome to the project chat.</div>
      </div>

      <form className="px-2 pt-2 pb-0 border-t border-[#1d2230] dark:border-[#1d2230] bg-[#0E1118] dark:bg-[#0E1118] grid grid-cols-[1fr_auto] gap-2" onSubmit={(e) => e.preventDefault()}>
        <input
          placeholder="Type a message…"
          className={`h-8 px-2 bg-[#0E1118] dark:bg-[#0E1118] border border-[#283046]/60 dark:border-[#283046]/60 ${T.radius} text-neutral-200 dark:text-neutral-200 placeholder:text-neutral-500 dark:placeholder:text-neutral-500 ${T.focus}`}
        />
        <button type="submit" className={`h-8 px-3 border border-[#283046]/60 dark:border-[#283046]/60 ${T.radius} text-neutral-300 dark:text-neutral-300 hover:bg-[#161B26] dark:hover:bg-[#161B26] ${T.focus}`}>
          Send
        </button>
      </form>
    </div>
  );
});

/** --------------------- Page --------------------- */
export default function SandboxPage() {
  const [chatOpen, setChatOpen] = useState(true);
  const toggleChat = useCallback(() => setChatOpen((v) => !v), []);

  const [secondaryOpen, setSecondaryOpen] = useState(true);
  const toggleSecondary = useCallback(() => setSecondaryOpen((v) => !v), []);

  const [active, setActive] = useState('Home');

  return (
    <div
      className={`h-screen w-full ${T.text} overflow-hidden bg-[#0B0E14] dark:bg-[#0B0E14] text-neutral-200 dark:text-neutral-200 grid gap-y-1 gap-x-0 p-1`}
      style={{ gridTemplateColumns: `64px ${secondaryOpen ? '200px' : '0px'} 1fr` }}
    >
      {/* Left rail */}
      <SidebarRail active={active} onNav={setActive} secondaryOpen={secondaryOpen} onToggleSecondary={toggleSecondary} />

      {/* Secondary sidebar (schema-driven lists) */}
      <SidebarSecondary open={secondaryOpen} active={active} />

      {/* Main column */}
      <div className={`relative min-h-0 grid grid-rows-[1fr] gap-1 w-full overflow-hidden ${secondaryOpen ? 'ml-2' : ''}`}>
        {/* Main content & chat */}
        <div className={`min-h-0 h-full grid items-stretch gap-1 relative ${chatOpen ? 'md:grid-cols-[minmax(0,1fr)_clamp(280px,32vw,360px)]' : 'md:grid-cols-[minmax(0,1fr)]'}`}>
          {/* Main panel */}
          <div className={`relative z-10 ${T.panel} ${T.radius} min-h-0 min-w-0 grid grid-rows-[auto_1fr] overflow-hidden`}>
            <TabsHeader chatOpen={chatOpen} onToggleChat={toggleChat} />

            {/* Viewer (top) + Explorer (bottom) */}
            <div className="min-h-0 grid" style={{ gridTemplateRows: 'minmax(200px,55%) minmax(0,45%)' }}>
              <div className="min-h-[200px]">
                <div className={`${T.panelElev} ${T.text} grid grid-rows-[auto_1fr] overflow-hidden`}>
                  <div className="h-9 px-3 flex items-center justify-between border-b border-[#1a2030]/40 dark:border-[#1a2030]/40">
                    <div className="text-neutral-500 dark:text-neutral-500">Viewer</div>
                  </div>
                  <div className="grid place-items-center text-neutral-500 dark:text-neutral-500">No file selected</div>
                </div>
              </div>

              <div className="relative flex-1 min-h-0">
                <Explorer compact={chatOpen} />
              </div>
            </div>
          </div>

          {/* Chat panel */}
          {chatOpen && (
            <>
              {/* Mobile overlay backdrop */}
              <button type="button" aria-label="Close chat overlay" onClick={() => setChatOpen(false)} className="md:hidden fixed inset-0 bg-black/40 z-20" />
              <ChatPanel
                onClose={() => setChatOpen(false)}
                className="md:static md:z-10 md:h-full md:block fixed right-1 left-auto top-[56px] bottom-1 z-30 w-[92vw] max-w-[480px] min-w-[280px] md:w-auto md:top-auto md:bottom-auto md:right-auto"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
