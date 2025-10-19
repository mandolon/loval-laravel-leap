import { useState } from 'react';

// --- Data ---
const navTabs = ["Files", "Tasks", "Invoices", "Links", "Project", "Client", "Notes"];
const ROOT_FOLDERS = ["Attachments", "Build", "Design", "Permit", "Photos", "Plans"];
const SUB_FOLDERS = ["In Progress", "Pending", "Completed", "Archived"];
const FILES = [
  { id: 1, name: "RES-2427762 - INVOICE.pdf", size: "63.0 KB", modified: "Oct 17, 02:46 AM", type: "PDF" },
  { id: 2, name: "Receipt-2482-0266.pdf", size: "20.2 KB", modified: "Oct 17, 02:39 AM", type: "PDF" },
  { id: 3, name: "Flattened_Partial_Set_10.13.25.pdf", size: "5.3 MB", modified: "Oct 17, 02:38 AM", type: "PDF" },
  { id: 4, name: "Invoice-INV-01.pdf", size: "3.3 KB", modified: "Oct 17, 02:36 AM", type: "PDF" },
];

// --- Sidebar ---
function Sidebar() {
  return (
    <aside className="h-full w-[72px] bg-white dark:bg-[#0F1219] border-r border-gray-200 dark:border-neutral-800 text-[12px] text-gray-600 dark:text-neutral-300 select-none flex flex-col items-center">
      <div className="h-12 w-full flex items-center justify-center border-b border-gray-200 dark:border-neutral-800 text-gray-500 dark:text-neutral-400 tracking-wider">RH</div>
      <nav className="mt-2 flex-1 flex flex-col items-center gap-1">
        {[
          { k: 'Home', label: 'H' },
          { k: 'Files', label: 'F' },
          { k: 'Tasks', label: 'T' },
          { k: 'AI', label: 'A' },
        ].map((i) => (
          <button key={i.k} title={i.k} className="h-10 w-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-[#141821] focus:outline-none border border-transparent hover:border-gray-300 dark:hover:border-neutral-700">
            <span className="text-gray-500 dark:text-neutral-400">{i.label}</span>
          </button>
        ))}
      </nav>
      <div className="w-full border-t border-gray-200 dark:border-neutral-800 py-2 flex flex-col items-center gap-2">
        <div className="h-8 w-8 rounded bg-gray-200 dark:bg-neutral-700/40" title="Avatar" />
        <button className="text-[11px] text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-200">Switch</button>
      </div>
    </aside>
  );
}

// --- Header (centered tabs; Chat toggle lives here) ---
function HeaderNav({ chatOpen, onToggleChat }: { chatOpen: boolean; onToggleChat: () => void }) {
  const [active, setActive] = useState(navTabs[0]);
  const handleSetActive = (tab: string) => { setActive(tab); };
  return (
    <header className="relative flex items-center justify-center h-12 border-b border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-[#10131A] select-none">
      {/* Centered tabs */}
      <nav className="flex gap-6">
        {navTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => handleSetActive(tab)}
            className={`relative px-4 py-1.5 text-[13px] font-medium tracking-wide transition-colors duration-200 rounded-md focus:outline-none ${
              active === tab 
                ? 'text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-[#1a2230] border border-blue-300 dark:border-blue-500/40 shadow-sm dark:shadow-[0_0_4px_rgba(0,0,0,0.5)]' 
                : 'text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#181C25] border border-transparent'
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>
      {/* Right actions */}
      <div className="absolute right-3 inset-y-0 flex items-center gap-2">
        <button
          onClick={onToggleChat}
          className={`px-3 py-1 text-[12px] border transition ${
            chatOpen 
              ? 'border-blue-400 text-blue-600 dark:text-blue-300' 
              : 'border-gray-300 dark:border-neutral-600 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-300'
          }`}
          title="Toggle Project Chat"
        >
          Chat
        </button>
      </div>
    </header>
  );
}

// --- PDF viewer toolbar ---
function ViewerToolbar() {
  return (
    <div className="flex items-center justify-between h-9 border-b border-gray-200 dark:border-neutral-700 bg-gray-100 dark:bg-[#1B1F2A] text-[12px] text-gray-600 dark:text-neutral-300 px-4 select-none">
      <div className="flex items-center gap-2">
        <button className="px-3 py-1 border border-gray-300 dark:border-neutral-600 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition" title="Zoom out">-</button>
        <span className="text-xs text-gray-500 dark:text-neutral-400">100%</span>
        <button className="px-3 py-1 border border-gray-300 dark:border-neutral-600 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition" title="Zoom in">+</button>
      </div>
      <div className="text-xs text-gray-500 dark:text-neutral-400">PDF Placeholder</div>
      <div className="flex items-center gap-2">
        <button className="px-2 py-1 border border-gray-300 dark:border-neutral-600 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition" title="Fit to screen">Fit</button>
        <button className="px-2 py-1 border border-gray-300 dark:border-neutral-600 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition" title="Fullscreen">Full</button>
      </div>
    </div>
  );
}

function PdfPlaceholder() {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-[#0E1118] text-gray-400 dark:text-neutral-500 text-sm">PDF Viewer Placeholder</div>
  );
}

// --- File Explorer (3-column; dark, crisp aesthetic) ---
function FileExplorer() {
  const [selectedRoot, setSelectedRoot] = useState("Attachments");
  const [selectedFolder, setSelectedFolder] = useState("In Progress");
  const [selectedFile, setSelectedFile] = useState(1);

  return (
    <div className="border-t border-gray-200 dark:border-neutral-800 bg-white dark:bg-[#0F1219] text-[12px] text-gray-600 dark:text-neutral-300 select-none">
      <div className="grid grid-cols-[130px_220px_1fr] h-[260px] overflow-hidden divide-x divide-gray-200 dark:divide-neutral-800">
        {/* Root (fixed backend folders) */}
        <div className="bg-gray-50 dark:bg-[#0E121A] flex flex-col border-r border-gray-200 dark:border-neutral-800">
          <div className="flex-1 overflow-auto">
            {ROOT_FOLDERS.map((r) => (
              <div
                key={r}
                onClick={() => setSelectedRoot(r)}
                className={`px-3 py-2 cursor-pointer border-l-2 text-[12px] transition ${
                  selectedRoot === r 
                    ? 'border-blue-400 text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-[#1C2433]' 
                    : 'border-transparent hover:bg-gray-100 dark:hover:bg-[#181C25] text-gray-600 dark:text-neutral-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-sm bg-gray-400 dark:bg-neutral-500/50" />
                  <span className="truncate">{r}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Folders */}
        <div className="bg-gray-50 dark:bg-[#10141D] flex flex-col">
          <div className="px-3 py-2 text-[11px] text-gray-500 dark:text-neutral-500 uppercase tracking-wide border-b border-gray-200 dark:border-neutral-800 flex items-center justify-between">
            <span>Folders</span>
            <button className="text-gray-400 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-300" title="Add folder">＋</button>
          </div>
          <div className="flex-1 overflow-auto">
            {SUB_FOLDERS.map((s) => (
              <div
                key={s}
                onClick={() => setSelectedFolder(s)}
                className={`px-4 py-2 cursor-pointer border-l-2 transition ${
                  selectedFolder === s 
                    ? 'border-blue-400 text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-[#1C2433]' 
                    : 'border-transparent hover:bg-gray-100 dark:hover:bg-[#181C25]'
                }`}
              >
                {s}
              </div>
            ))}
          </div>
        </div>

        {/* Files */}
        <div className="bg-white dark:bg-[#10141D] flex flex-col">
          <div className="px-3 py-2 text-[11px] text-gray-500 dark:text-neutral-500 uppercase tracking-wide border-b border-gray-200 dark:border-neutral-800 flex items-center justify-between">
            <span>Files</span>
            <button className="text-gray-400 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-300" title="Add file">＋</button>
          </div>
          <div className="flex-1 overflow-auto">
            {FILES.map((f) => (
              <div
                key={f.id}
                onClick={() => setSelectedFile(f.id)}
                className={`grid grid-cols-[1fr_100px_140px_60px] items-center px-4 py-2 cursor-pointer transition ${
                  selectedFile === f.id 
                    ? 'bg-blue-50 dark:bg-[#1C2433] text-blue-600 dark:text-blue-300' 
                    : 'hover:bg-gray-100 dark:hover:bg-[#181C25]'
                }`}
              >
                <div className="truncate">{f.name}</div>
                <div className="text-gray-500 dark:text-neutral-400">{f.size}</div>
                <div className="text-gray-500 dark:text-neutral-400">{f.modified}</div>
                <div className="text-gray-500 dark:text-neutral-400">{f.type}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="h-8 px-4 flex items-center justify-between border-t border-gray-200 dark:border-neutral-800 text-[11px] text-gray-500 dark:text-neutral-500 bg-gray-50 dark:bg-[#10131A]">
        <span>{FILES.length} files</span>
        <span>27.7 MB total</span>
      </div>
    </div>
  );
}

// --- Project Chat (collapsible, full-height) ---
function ProjectChat({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState([
    { id: 1, author: 'Alex', text: 'Kickoff notes posted in Files > In Progress.' },
    { id: 2, author: 'Sam', text: 'Please review page 3 of the PDF.' },
  ]);
  const [draft, setDraft] = useState('');

  const send = () => {
    const t = draft.trim();
    if (!t) return;
    setMessages((m) => [...m, { id: m.length + 1, author: 'You', text: t }]);
    setDraft('');
  };

  return (
    <aside className="h-full w-[340px] bg-white dark:bg-[#0F1219] border-l border-gray-200 dark:border-neutral-800 text-[12px] text-gray-900 dark:text-neutral-200 flex flex-col min-w-0">
      <div className="h-12 px-3 border-b border-gray-200 dark:border-neutral-800 flex items-center justify-between bg-gray-50 dark:bg-[#10131A]">
        <div className="uppercase tracking-wide text-[11px] text-gray-500 dark:text-neutral-400">Project Chat</div>
        <button onClick={onClose} className="text-gray-400 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-300" title="Close">×</button>
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {messages.map((m) => (
          <div key={m.id}>
            <div className="text-gray-500 dark:text-neutral-400 text-[11px] mb-0.5">{m.author}</div>
            <div className="bg-gray-100 dark:bg-[#141821] border border-gray-200 dark:border-neutral-800 px-3 py-2">{m.text}</div>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-200 dark:border-neutral-800 p-2 bg-gray-50 dark:bg-[#10131A]">
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
            placeholder="Message…"
            className="flex-1 h-8 px-2 bg-white dark:bg-[#0E1118] border border-gray-300 dark:border-neutral-800 text-gray-900 dark:text-neutral-200 outline-none"
          />
          <button onClick={send} className="px-3 h-8 border border-gray-300 dark:border-neutral-700 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-300">Send</button>
        </div>
      </div>
    </aside>
  );
}

// --- Page wrapper that shows sidebar + header + viewer + explorer + chat ---
export default function SandboxPage() {
  const [chatOpen, setChatOpen] = useState(true);

  return (
    <div className="h-screen w-full bg-white dark:bg-[#0E1118] text-gray-900 dark:text-neutral-200 grid grid-cols-[72px_1fr]">
      {/* Left sidebar */}
      <Sidebar />

      {/* Right side: 2-column grid when chat is open; chat spans from header to footer */}
      <div
        className={`min-h-0 grid ${
          chatOpen ? 'grid-cols-[1fr_340px]' : 'grid-cols-1'
        } grid-rows-[auto_1fr]`}
      >
        {/* Row 1, Col 1: header */}
        <div className="col-start-1 row-start-1">
          <HeaderNav chatOpen={chatOpen} onToggleChat={() => setChatOpen((v) => !v)} />
        </div>

        {/* Row 2, Col 1: main viewer + explorer */}
        <div className="col-start-1 row-start-2 min-h-0 flex flex-col">
          <ViewerToolbar />
          <PdfPlaceholder />
          <FileExplorer />
        </div>

        {/* Col 2 (spans both rows): persistent project chat full height */}
        {chatOpen && (
          <div className="col-start-2 row-start-1 row-span-2 min-h-0">
            <ProjectChat onClose={() => setChatOpen(false)} />
          </div>
        )}
      </div>
    </div>
  );
}
