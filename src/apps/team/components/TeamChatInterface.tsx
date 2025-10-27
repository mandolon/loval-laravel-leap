import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronRightIcon, ChevronDownIcon, HamburgerMenuIcon, FileIcon, StarIcon, PlusIcon, ArrowUpIcon } from "@radix-ui/react-icons";
import { useUser } from "@/contexts/UserContext";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useProjects } from "@/lib/api/hooks/useProjects";
import { useProjectMessages, useCreateMessage, useUpdateMessage, useDeleteMessage } from "@/lib/api/hooks/useProjectChat";
import { useProjectFiles } from "@/lib/api/hooks/useProjectFiles";
import { supabase } from "@/integrations/supabase/client";

// --- Mock data for future workspace chat (not implemented yet) --------------
const MOCK_WORKSPACE_CHAT = {
  id: "workspace_chat_mock",
  projectId: "workspace",
  title: "Workspace chat",
  type: "workspace_chat" as const,
  lastMessageAt: new Date().toISOString()
};

// --- Utils ----------------------------------------------------------------
const cx = (...cn: any[]) => cn.filter(Boolean).join(" ");
const initials = (name?: string) => (name?.match(/\b\w/g) || []).slice(0, 2).join("").toUpperCase() || "?";
const timeAgo = (iso: string) => { 
  const d = Date.now() - new Date(iso).getTime(); 
  const m = Math.round(d / 60000); 
  if (m < 1) return "just now"; 
  if (m < 60) return `${m}m ago`; 
  const h = Math.round(m / 60); 
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`; 
};
const sortByAccess = (ps: any[]) => [...ps].sort((a, b) => +new Date(b.updatedAt || b.updated_at || 0) - +new Date(a.updatedAt || a.updated_at || 0));
const depthOf = (m: any, map: Map<string, any>) => { 
  let d = 0; 
  let c = m.replyToMessageId ? map.get(m.replyToMessageId) : undefined; 
  while (c) { d++; c = c.replyToMessageId ? map.get(c.replyToMessageId) : undefined; } 
  return d; 
};
const toggleThumb = (prev: Record<string, string>, id: string, dir: string) => { 
  const cur = prev[id]; 
  const next = { ...prev }; 
  if (cur === dir) delete next[id]; 
  else next[id] = dir; 
  return next; 
};
function useMessageTree(messages: any[]) { 
  const map = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]); 
  return useMemo(() => messages.map((m) => ({ ...m, depth: depthOf(m, map) })), [messages, map]); 
}

// --- Small components -----------------------------------------------------
const Avatar = ({ name }: { name?: string }) => (
  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-medium text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200">
    {initials(name)}
  </div>
);

const SectionHeader = ({ title }: { title: string }) => (
  <div className="sticky top-0 z-10 flex items-center justify-between bg-white/70 px-2 py-1 text-[11px] font-medium uppercase tracking-wide backdrop-blur dark:bg-neutral-900/70">
    <div className="text-neutral-500 dark:text-neutral-400">{title}</div>
  </div>
);

const SidebarProjectItem = ({ project, active, onClick, showMeta = true }: any) => {
  const projectIcon = useMemo(() => {
    const phaseIcons: Record<string, string> = {
      'Pre-Design': '📋',
      'Design': '✏️',
      'Permit': '📜',
      'Build': '🏗️',
    };
    return phaseIcons[project.phase] || '📁';
  }, [project.phase]);

  return (
    <button onClick={onClick} className={cx(
      "group flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition",
      active ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white" : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
    )}>
      <div className="grid h-7 w-7 place-items-center rounded-md bg-neutral-100 text-base dark:bg-neutral-800" aria-hidden>
        {projectIcon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{project.name}</div>
        {showMeta && (
          <div className="truncate text-[11px] text-neutral-500">Accessed {timeAgo(project.updatedAt || project.updated_at)}</div>
        )}
      </div>
    </button>
  );
};

const AttachmentThumb = ({ a, onRemove }: any) => (
  <div className="relative h-10 w-10 overflow-hidden rounded-md ring-1 ring-inset ring-neutral-200 dark:ring-neutral-800">
    {a.type?.startsWith("image") ? (
      <img src={a.url} alt="" className="h-full w-full object-cover" />
    ) : (
      <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-neutral-500 dark:bg-neutral-900">
        <FileIcon />
      </div>
    )}
    {onRemove && (
      <button
        onClick={() => onRemove(a.id)}
        className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-neutral-800 text-[10px] text-white shadow ring-1 ring-white dark:bg-neutral-700"
      >
        ×
      </button>
    )}
  </div>
);

const BubbleAttachments = ({ list }: { list: any[] }) => (
  <div className="mt-2 grid grid-cols-6 gap-2 sm:grid-cols-8">{list.map((a) => <AttachmentThumb key={a.id} a={a} />)}</div>
);

function formatAttachmentLabel(name: string, type: string, maxChars = 18) {
  const str = String(name || "");
  let base = str, ext = "";
  const dot = str.lastIndexOf(".");
  if (dot > 0 && dot < str.length - 1) { base = str.slice(0, dot); ext = str.slice(dot); }
  else if (type && typeof type === "string" && type.includes("/")) { const maybe = type.split("/").pop(); ext = maybe ? `.${maybe}` : ""; }
  if (!ext) ext = ".file";
  const reserve = ext.length;
  if (base.length + reserve > maxChars) base = base.slice(0, Math.max(1, maxChars - reserve - 1)) + "…";
  return base + ext;
}

const AttachmentChip = ({ a, onRemove }: any) => (
  <div className="inline-flex h-7 w-28 items-center rounded-md ring-1 ring-inset ring-neutral-200 bg-white px-2 text-[11px] font-medium text-neutral-700 shadow-sm dark:ring-neutral-700 dark:bg-neutral-900 dark:text-neutral-200" title={a.name} role="group">
    <span className="truncate select-none">{formatAttachmentLabel(a.name, a.type, 18)}</span>
    {onRemove && (
      <button onClick={() => onRemove(a.id)} className="ml-2 inline-flex items-center justify-center text-[12px] leading-none text-neutral-400 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200" aria-label={`Remove ${a.name}`} title="Remove">×</button>
    )}
  </div>
);

const ComposerAttachments = ({ list, onRemove }: any) => (
  <div className="mt-0.5 mb-3 flex flex-wrap gap-2">{list.map((a: any) => <AttachmentChip key={a.id} a={a} onRemove={onRemove} />)}</div>
);

const ActionButton = ({ icon: Icon, onClick, pressed, label, title, variant = "neutral" }: any) => (
  <button onClick={onClick} aria-pressed={pressed} className={cx("inline-flex h-7 w-7 items-center justify-center rounded-md transition", variant === "delete" ? "text-red-600 dark:text-red-400" : "hover:bg-neutral-100 dark:hover:bg-neutral-800", pressed && "bg-neutral-100 dark:bg-neutral-800")} aria-label={label} title={title}>
    <Icon className="h-4 w-4" />
  </button>
);

const IconThumbsUp = ({ className = "h-4 w-4" }) => (<svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-1 7H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h8.5a2 2 0 0 0 2-1.5l1.38-6.2A2 2 0 0 0 14.93 9H14z"/></svg>);
const IconThumbsDown = ({ className = "h-4 w-4" }) => (<svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l1-7h5a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H10.5a2 2 0 0 0-2 1.5L7.12 12.7A2 2 0 0 0 9.07 15H10z"/></svg>);
const IconReply = ({ className = "h-4 w-4" }) => (<svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 8V5L3 12l7 7v-3h4a6 6 0 0 0 6-6v-1"/></svg>);
const IconEdit = ({ className = "h-4 w-4" }) => (<svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"/><path d="M14.06 4.94l3.75 3.75"/></svg>);
const IconDelete = ({ className = "h-4 w-4" }) => (<svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>);
const IconList = ({ className = "h-5 w-5" }) => (<svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>);
const IconGrid = ({ className = "h-5 w-5" }) => (<svg viewBox="0 0 24 24" className={className} fill="currentColor"><rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/></svg>);
const IconCheck = ({ className = "h-5 w-5" }) => (<svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12l2.5 2.5L16 9"/></svg>);

const ActionBar = ({ isMe, rating, onThumb, onReply, onEdit, onDelete, mid }: any) => (
  <div className="mt-1 hidden min-h-[28px] flex-wrap items-center gap-1 text-xs text-neutral-500 transition-opacity md:flex md:opacity-0 md:pointer-events-none md:peer-hover:opacity-100 md:peer-hover:pointer-events-auto md:peer-focus-within:opacity-100 md:peer-focus-within:pointer-events-auto">
    <ActionButton icon={IconThumbsUp} onClick={() => onThumb("up", mid)} pressed={rating === "up"} label="Thumbs up" title="Thumbs up" />
    <ActionButton icon={IconThumbsDown} onClick={() => onThumb("down", mid)} pressed={rating === "down"} label="Thumbs down" title="Thumbs down" />
    <ActionButton icon={IconReply} onClick={() => onReply(mid)} label="Reply" title="Reply" />
    {isMe && <ActionButton icon={IconEdit} onClick={() => onEdit(mid)} label="Edit" title="Edit" />}
    {isMe && <ActionButton icon={IconDelete} onClick={() => onDelete(mid)} label="Delete" title="Delete" variant="delete" />}
  </div>
);

// --- Message bubble -------------------------------------------------------
const MessageBubble = ({ m, meId, rating, onThumb, onReply, onEdit, onDelete, attachmentFiles }: any) => {
  const isMe = m.userId === meId;
  const indent = Math.min(6, (m?.depth || 0) * 4) * 4;
  const [menuOpen, setMenuOpen] = useState(false);
  const lpTimer = useRef<any>(null);
  const startLP = () => { if (lpTimer.current) clearTimeout(lpTimer.current); lpTimer.current = setTimeout(() => setMenuOpen(true), 500); };
  const cancelLP = () => { if (lpTimer.current) { clearTimeout(lpTimer.current); lpTimer.current = null; } };
  
  return (
    <div 
      className={cx("relative flex gap-2 w-full px-2", isMe ? "justify-end" : "justify-start")} 
      style={isMe ? { paddingRight: indent } : { paddingLeft: indent }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {!isMe && (
        <div className="flex-shrink-0">
          <Avatar name={m.user?.name} />
        </div>
      )}
      <div className={cx("flex min-w-0 max-w-[72ch] flex-col", isMe ? "items-end" : "items-start")}>
        <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenu.Trigger asChild>
            <div
              className={cx(
                "peer w-full rounded-2xl px-3 py-2 shadow-[0_1px_1px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_1px_rgba(0,0,0,0.35)] transition select-text",
                isMe ? "bg-white dark:bg-neutral-800" : "bg-neutral-50 dark:bg-neutral-900"
              )}
              onTouchStart={startLP} onTouchEnd={cancelLP} onTouchCancel={cancelLP}
            >
              <div className={cx("mb-1 flex items-center gap-2", isMe && "justify-end")}> 
                <div className={cx("text-xs font-medium text-neutral-700 dark:text-neutral-200", isMe && "order-2 text-right")}>{m.user?.name || "User"}</div>
                <div className={cx("text-[11px] text-neutral-500", isMe && "order-1")}>{timeAgo(m.createdAt)}</div>
              </div>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-800 dark:text-neutral-100">{m.content}</div>
              {attachmentFiles && attachmentFiles.length > 0 && <BubbleAttachments list={attachmentFiles} />}
            </div>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content side={isMe ? "left" : "right"} align="start" className="z-[60] mt-1 grid grid-flow-col gap-1 rounded-lg border bg-white p-1 shadow-xl md:hidden dark:border-neutral-800 dark:bg-neutral-900">
              <DropdownMenu.Item onSelect={(e) => { e.preventDefault(); onThumb("up", m.id); setMenuOpen(false); }} className="cursor-pointer rounded p-2 outline-none hover:bg-neutral-100 dark:hover:bg-neutral-800"><IconThumbsUp className="h-5 w-5"/></DropdownMenu.Item>
              <DropdownMenu.Item onSelect={(e) => { e.preventDefault(); onThumb("down", m.id); setMenuOpen(false); }} className="cursor-pointer rounded p-2 outline-none hover:bg-neutral-100 dark:hover:bg-neutral-800"><IconThumbsDown className="h-5 w-5"/></DropdownMenu.Item>
              <DropdownMenu.Item onSelect={(e) => { e.preventDefault(); onReply(m.id); setMenuOpen(false); }} className="cursor-pointer rounded p-2 outline-none hover:bg-neutral-100 dark:hover:bg-neutral-800"><IconReply className="h-5 w-5"/></DropdownMenu.Item>
              {isMe && <DropdownMenu.Item onSelect={(e) => { e.preventDefault(); onEdit(m.id); setMenuOpen(false); }} className="cursor-pointer rounded p-2 outline-none hover:bg-neutral-100 dark:hover:bg-neutral-800"><IconEdit className="h-5 w-5"/></DropdownMenu.Item>}
              {isMe && <DropdownMenu.Item onSelect={(e) => { e.preventDefault(); onDelete(m.id); setMenuOpen(false); }} className="cursor-pointer rounded p-2 outline-none hover:bg-red-50 focus:bg-red-50 dark:hover:bg-neutral-800"><IconDelete className="h-5 w-5"/></DropdownMenu.Item>}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
        <ActionBar isMe={isMe} rating={rating} onThumb={(dir: string) => onThumb(dir, m.id)} onReply={onReply} onEdit={onEdit} onDelete={onDelete} mid={m.id} />
      </div>
      {isMe && (
        <div className="flex-shrink-0">
          <Avatar name={m.user?.name} />
        </div>
      )}
    </div>
  );
};

// --- Files view -----------------------------------------------------------
export function inferAssetType(file: any) {
  const mt = (file.mimetype || file.type || "").toLowerCase();
  const name = (file.filename || file.name || "").toLowerCase();
  if (mt.includes("pdf") || name.endsWith(".pdf")) return "pdf";
  if (mt.startsWith("image/")) return "image";
  if (name.endsWith(".dwg") || name.endsWith(".dxf")) return "cad";
  if (mt.includes("word") || mt.includes("officedocument") || name.endsWith(".doc") || name.endsWith(".docx")) return "doc";
  return "file";
}

const FileCard = ({ asset, selectable = false, selected = false, onToggle }: any) => (
  <div onClick={() => selectable && onToggle && onToggle(asset.id)} className={cx("group relative rounded-xl border p-3 shadow-sm transition hover:shadow dark:border-neutral-800", selectable && "cursor-pointer", selected && "ring-2 ring-blue-500")}> 
    <div className="mb-2 flex items-center justify-between text-sm">
      <div className="flex items-center gap-2"><FileIcon /><span className="truncate font-medium">{asset.name}</span></div>
      <StarIcon className="h-4 w-4 opacity-40 group-hover:opacity-100"/>
    </div>
    {asset.type === 'image' && asset.url ? (
      <img src={asset.url} alt="" className="aspect-video w-full rounded-lg object-cover ring-1 ring-inset ring-neutral-200 dark:ring-neutral-800"/>
    ) : (
      <div className="aspect-video w-full rounded-lg bg-neutral-100 ring-1 ring-inset ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800"/>
    )}
    <div className="mt-2 text-[11px] text-neutral-500">Added {timeAgo(asset.createdAt)}</div>
    {selectable && (
      <div className={cx("absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full ring-1 ring-inset", selected ? "bg-blue-600 text-white ring-blue-600" : "bg-white/90 text-neutral-600 ring-neutral-300 dark:bg-neutral-900/90 dark:text-neutral-200 dark:ring-neutral-700")}> 
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 12l2.5 2.5L16 9"/></svg>
      </div>
    )}
  </div>
);

const FileListItem = ({ asset, selectable = false, selected = false, onToggle }: any) => (
  <button onClick={() => selectable && onToggle && onToggle(asset.id)} className={cx("flex w-full items-center justify-between px-3 py-2 text-sm rounded-lg transition", selectable ? "hover:bg-neutral-50 dark:hover:bg-neutral-900" : "")}> 
    <div className="flex min-w-0 items-center gap-2">
      {selectable && (
        <span className={cx("grid h-5 w-5 place-items-center rounded-full ring-1 ring-inset", selected ? "bg-blue-600 text-white ring-blue-600" : "bg-white text-neutral-600 ring-neutral-300 dark:bg-neutral-900 dark:text-neutral-200 dark:ring-neutral-700")}> 
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 12l2 2 4-4"/></svg>
        </span>
      )}
      <FileIcon /><span className="truncate font-medium">{asset.name}</span>
    </div>
    <div className="text-[11px] text-neutral-500">{asset.type.toUpperCase()} · {timeAgo(asset.createdAt)}</div>
  </button>
);

const FilesView = ({ assets, project, view, selectionMode = false, selectedIds, onToggleSelect }: any) => {
  const filtered = project ? assets.filter((a: any) => a.projectId === project.id) : assets;
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-auto p-4">
        {view === "grid" ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((a: any) => (
              <FileCard key={a.id} asset={a} selectable={selectionMode} selected={!!selectedIds?.has(a.id)} onToggle={onToggleSelect} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border dark:border-neutral-800">
            {filtered.map((a: any) => (
              <FileListItem key={a.id} asset={a} selectable={selectionMode} selected={!!selectedIds?.has(a.id)} onToggle={onToggleSelect} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Desktop sidebar ------------------------------------------------------
function DesktopSidebar({ recentProjects, otherProjects, selectedProjectId, onSelectProject }: any) {
  return (
    <aside 
      className="hidden md:flex h-full w-72 flex-col border-r bg-white dark:border-neutral-800 dark:bg-neutral-950"
      style={{
        transition: "width 260ms cubic-bezier(0.22, 1, 0.36, 1), transform 260ms cubic-bezier(0.22, 1, 0.36, 1)"
      }}
    >
      <ScrollArea.Root className="h-full min-h-0"><ScrollArea.Viewport className="h-full w-full">
        <div className="p-2">
          {/* Workspace chat section - mock for future */}
          <SectionHeader title="Workspace" />
          <div className="px-1 pb-2">
            <div className="mt-1 space-y-1">
              <button
                className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm transition opacity-50 cursor-not-allowed"
                disabled
              >
                <div className="min-w-0 truncate flex items-center gap-2">
                  <div className="grid h-6 w-6 place-items-center rounded bg-neutral-100 text-xs dark:bg-neutral-800">💬</div>
                  <div>
                    <div className="truncate font-medium text-neutral-400">Workspace chat</div>
                    <div className="truncate text-[11px] text-neutral-400">Coming soon</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
          <SectionHeader title="Recent Projects" />
          <div className="px-1 pb-2 space-y-1">{recentProjects.map((p: any) => (<SidebarProjectItem key={p.id} project={p} active={p.id === selectedProjectId} onClick={() => onSelectProject(p.id)} />))}</div>
          <SectionHeader title="All Projects" />
          <div className="px-1 pb-2 space-y-1">{otherProjects.map((p: any) => (<SidebarProjectItem key={p.id} project={p} active={p.id === selectedProjectId} onClick={() => onSelectProject(p.id)} showMeta={false} />))}</div>
        </div>
      </ScrollArea.Viewport><ScrollArea.Scrollbar className="w-2" orientation="vertical" /></ScrollArea.Root>
    </aside>
  );
}

// --- Main component -------------------------------------------------------
export default function TeamChatInterface() {
  const { user } = useUser();
  const { currentWorkspaceId } = useWorkspaces();
  
  // Fetch real data
  const { data: projects = [] } = useProjects(currentWorkspaceId || '');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const { data: rawMessages = [] } = useProjectMessages(selectedProjectId || '');
  const { data: projectFiles = [] } = useProjectFiles(selectedProjectId || '');
  const createMessage = useCreateMessage();
  const updateMessage = useUpdateMessage();
  const deleteMessage = useDeleteMessage();
  
  // UI state
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileSideOpen, setMobileSideOpen] = useState(false);
  const [page, setPage] = useState("chat");
  const [filesView, setFilesView] = useState("grid");
  const [ratings, setRatings] = useState<Record<string, string>>({});
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<string | undefined>(undefined);
  const [pendingAttachments, setPendingAttachments] = useState<any[]>([]);
  const [filesSelectMode, setFilesSelectMode] = useState(false);
  const [selectedAssetIds, setSelectedAssetIds] = useState(new Set<string>());
  const endRef = useRef<HTMLDivElement>(null); 
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Messages are already transformed by useProjectMessages hook
  const messages = useMemo(() => {
    return rawMessages.map((m: any) => ({
      ...m,
      // Ensure user data is available
      user: m.user || { id: m.userId, name: 'Unknown' }
    }));
  }, [rawMessages]);

  // Transform files to assets format
  const assets = useMemo(() => {
    return projectFiles.map((f: any) => ({
      id: f.id,
      projectId: f.project_id,
      name: f.filename,
      type: inferAssetType(f),
      url: `${supabase.storage.from('project-files').getPublicUrl(f.storage_path).data.publicUrl}`,
      createdAt: f.created_at,
    }));
  }, [projectFiles]);

  // Build message tree with depth
  const treeMessages = useMessageTree(messages);

  // Get file attachments for messages
  const getMessageAttachments = useCallback((message: any) => {
    if (!message.referencedFiles || message.referencedFiles.length === 0) return [];
    return assets.filter((a: any) => message.referencedFiles.includes(a.id));
  }, [assets]);

  const selectedProject = useMemo(() => projects.find((p: any) => p.id === selectedProjectId), [projects, selectedProjectId]);
  const recentProjects = useMemo(() => sortByAccess(projects).slice(0, 3), [projects]);
  const otherProjects = useMemo(() => projects.filter((p: any) => !recentProjects.find((rp: any) => rp.id === p.id)), [projects, recentProjects]);
  const recentProjectChats = useMemo(() => {
    return recentProjects.map((p: any) => ({
      id: `chat_${p.id}`,
      projectId: p.id,
      title: "All messages",
      type: "group",
      lastMessageAt: p.updatedAt || p.updated_at
    }));
  }, [recentProjects]);

  // Auto-select first project
  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const handleSelectProject = useCallback((projectId: string) => { 
    setSelectedProjectId(projectId); 
    setMobileSideOpen(false); 
  }, []);

  const handleSend = useCallback(async () => { 
    if (!input.trim() && pendingAttachments.length === 0) return; 
    if (!selectedProjectId || !user) return;
    
    // For now, just create message with content (file uploads to be implemented)
    createMessage.mutate({
      projectId: selectedProjectId,
      content: input,
      referencedFiles: [],
      referencedTasks: [],
      replyToMessageId: replyTo
    });
    
    setInput(""); 
    setReplyTo(undefined); 
    setPendingAttachments([]);
    if (fileInputRef.current) fileInputRef.current.value = ''; 
  }, [input, selectedProjectId, user, replyTo, pendingAttachments, createMessage]);

  const handleDeleteMessage = useCallback((id: string) => {
    if (!selectedProjectId) return;
    deleteMessage.mutate({ id, projectId: selectedProjectId });
  }, [selectedProjectId, deleteMessage]);

  const handleAddFiles = useCallback((files: FileList) => { 
    const picked = Array.from(files).map((f, i) => ({ 
      id: `temp_${Date.now()}_${i}`, 
      name: f.name, 
      type: f.type || 'application/octet-stream', 
      url: URL.createObjectURL(f) 
    })); 
    setPendingAttachments((prev) => [...prev, ...picked]); 
  }, []);

  const handleRemovePending = useCallback((id: string) => setPendingAttachments((prev) => prev.filter((a) => a.id !== id)), []);

  const toggleAssetSelect = useCallback((id: string) => setSelectedAssetIds((prev) => { 
    const next = new Set(prev); 
    if (next.has(id)) next.delete(id); 
    else next.add(id); 
    return next; 
  }), []);

  const clearSelection = useCallback(() => setSelectedAssetIds(new Set()), []);

  const handleShareSelected = useCallback(() => { 
    if (selectedAssetIds.size === 0) return; 
    const selected = assets.filter((a: any) => selectedAssetIds.has(a.id)); 
    const chips = selected.map((a: any, i: number) => ({ 
      id: `pick_${a.id}_${Date.now()}_${i}`, 
      name: a.name, 
      type: a.type === 'image' ? 'image/*' : a.type, 
      url: a.url 
    })); 
    setPendingAttachments((prev) => [...prev, ...chips]); 
    setPage('chat'); 
    clearSelection(); 
    setFilesSelectMode(false); 
  }, [assets, selectedAssetIds, clearSelection]);

  const handleDownloadSelected = useCallback(() => { 
    const selected = assets.filter((a: any) => selectedAssetIds.has(a.id)); 
    selected.forEach((a: any) => { 
      if (a.url && a.url !== '#') { 
        const link = document.createElement('a'); 
        link.href = a.url; 
        link.download = a.name || 'file'; 
        document.body.appendChild(link); 
        link.click(); 
        link.remove(); 
      } 
    }); 
  }, [assets, selectedAssetIds]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [treeMessages]);

  return (
    <div className="flex h-full w-full bg-[#f9f9f9] dark:bg-neutral-950 overflow-hidden">
      {/* Desktop Sidebar - Full Height */}
      <div 
        className="hidden md:block h-full overflow-hidden"
        style={{
          width: sidebarExpanded ? "18rem" : "0",
          transition: "width 260ms cubic-bezier(0.22, 1, 0.36, 1)"
        }}
      >
        <DesktopSidebar
          recentProjects={recentProjects}
          otherProjects={otherProjects}
          selectedProjectId={selectedProjectId}
          onSelectProject={handleSelectProject}
        />
      </div>

      {/* Mobile Sidebar */}
      <div 
        className={`fixed inset-0 z-30 bg-black/30 backdrop-blur-sm md:hidden transition-opacity duration-200 ${
          mobileSideOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`} 
        onClick={() => setMobileSideOpen(false)} 
      />
      <aside 
        className="fixed inset-y-0 left-0 z-40 w-[80vw] max-w-[480px] border-r bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-950 md:hidden"
        style={{
          transform: mobileSideOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)'
        }}
      >
            <ScrollArea.Root className="h-full min-h-0"><ScrollArea.Viewport className="h-full w-full">
              <div className="p-2">
                <SectionHeader title="Workspace" />
                <div className="px-2 pb-2">
                  <div className="mt-1 space-y-1">
                    <button
                      className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm transition opacity-50 cursor-not-allowed"
                      disabled
                    >
                      <div className="min-w-0 truncate flex items-center gap-2">
                        <div className="grid h-6 w-6 place-items-center rounded bg-neutral-100 text-xs dark:bg-neutral-800">💬</div>
                        <div>
                          <div className="truncate font-medium text-neutral-400">Workspace chat</div>
                          <div className="truncate text-[11px] text-neutral-400">Coming soon</div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
                <SectionHeader title="Recent Projects" />
                <div className="px-2 pb-2">{recentProjects.map((p: any) => <SidebarProjectItem key={p.id} project={p} active={p.id === selectedProjectId} onClick={() => handleSelectProject(p.id)} />)}</div>
                <SectionHeader title="All Projects" />
                <div className="px-2 pb-2">{otherProjects.map((p: any) => <SidebarProjectItem key={p.id} project={p} active={p.id === selectedProjectId} onClick={() => handleSelectProject(p.id)} showMeta={false} />)}</div>
              </div>
          </ScrollArea.Viewport><ScrollArea.Scrollbar className="w-2" orientation="vertical" /></ScrollArea.Root>
        </aside>

      {/* Main Content Area - Right Side */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex-none z-20 grid h-12 grid-cols-3 items-center px-2 backdrop-blur-md bg-white/30 dark:bg-neutral-950/20 border-b border-neutral-200/50 dark:border-neutral-800/50">
          <div className="flex items-center gap-2 min-w-0 justify-self-start">
            <button onClick={() => { if (window.innerWidth < 768) setMobileSideOpen(true); else setSidebarExpanded((v) => !v); }} className="rounded-lg p-1.5 transition hover:bg-neutral-100/60 dark:hover:bg-neutral-900/60"><HamburgerMenuIcon className="h-5 w-5"/></button>
          </div>
        <div className="col-start-2 flex min-w-0 items-center justify-center">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="inline-flex max-w-[70vw] items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-neutral-800 hover:bg-neutral-100/60 dark:text-neutral-200 dark:hover:bg-neutral-900/60">
                <span className="truncate md:max-w-[30vw]">{selectedProject?.name || 'Select project'}</span>
                <ChevronDownIcon className="h-4 w-4 opacity-70"/>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content align="center" sideOffset={6} className="z-50 min-w-[260px] rounded-lg border bg-white p-1 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
                <DropdownMenu.Label className="px-2 py-1 text-[11px] uppercase tracking-wide text-neutral-500">Recent Project Chats</DropdownMenu.Label>
                {recentProjectChats.map((t: any) => { 
                  const p = projects.find((pp: any) => pp.id === t.projectId); 
                  const projectIcon = p ? (() => {
                    const phaseIcons: Record<string, string> = {
                      'Pre-Design': '📋',
                      'Design': '✏️',
                      'Permit': '📜',
                      'Build': '🏗️',
                    };
                    return phaseIcons[p.phase] || '📁';
                  })() : '📁';
                  
                  return (
                    <DropdownMenu.Item key={t.id} className="group cursor-pointer rounded-md px-2 py-2 outline-none hover:bg-neutral-100 dark:hover:bg-neutral-800" onSelect={(e) => { e.preventDefault(); setSelectedProjectId(t.projectId); }}>
                      <div className="flex items-center gap-2">
                        <div className="grid h-6 w-6 place-items-center rounded bg-neutral-100 text-xs dark:bg-neutral-800">{projectIcon}</div>
                        <div className="min-w-0"><div className="truncate text-sm font-medium">{p?.name || "Project"}</div><div className="truncate text-[11px] text-neutral-500">{t.title || "Thread"}</div></div>
                        <div className="ml-auto text-[11px] text-neutral-500">{timeAgo(t.lastMessageAt || new Date().toISOString())}</div>
                      </div>
                    </DropdownMenu.Item>
                  ); 
                })}
                {recentProjectChats.length === 0 && (<div className="px-2 py-2 text-sm text-neutral-500">No recent chats</div>)}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
        <div className="flex items-center gap-2 justify-self-end">
          {page === "files" && (
            <>
              <button onClick={() => setFilesView(filesView === "grid" ? "list" : "grid")} className="rounded-lg p-1.5 transition hover:bg-neutral-100/60 dark:hover:bg-neutral-900/60" aria-label={filesView === "grid" ? "Switch to list view" : "Switch to grid view"} title={filesView === "grid" ? "List view" : "Grid view"}>{filesView === "grid" ? <IconList/> : <IconGrid/>}</button>
              <button onClick={() => setFilesSelectMode((v) => { const nv = !v; if (!nv) clearSelection(); return nv; })} aria-pressed={filesSelectMode} className={cx("rounded-full p-1.5 transition ring-1 ring-inset hover:bg-neutral-100/60 dark:hover:bg-neutral-900/60", filesSelectMode ? "bg-neutral-200/80 dark:bg-neutral-700/80 ring-neutral-300 dark:ring-neutral-700" : "bg-transparent ring-neutral-200/60 dark:ring-neutral-700/60")} title={filesSelectMode ? "Exit select" : "Select files"}><IconCheck/></button>
            </>
          )}
          <button onClick={() => setPage(page === "files" ? "chat" : "files")} className={cx("relative z-10 rounded-lg p-1.5 transition bg-neutral-100/70 dark:bg-neutral-800/70 hover:bg-neutral-100/90 dark:hover:bg-neutral-800/90 ring-1 ring-inset ring-neutral-200/60 dark:ring-neutral-700/60", page === "files" && "bg-neutral-200/80 dark:bg-neutral-700/80")} aria-label="Files" title="Files"><FileIcon className="h-5 w-5"/></button>
        </div>
        </header>

        {/* Chat/Files Content Area */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {page === "chat" ? (
            <div className="flex flex-1 min-h-0 flex-col bg-[#f9f9f9] dark:bg-transparent overflow-hidden">
              <ScrollArea.Root className="min-h-0 flex-1">
                <ScrollArea.Viewport className="h-full w-full overscroll-contain bg-[#f9f9f9] dark:bg-transparent touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
                  <div className="p-4 space-y-3 md:space-y-2 w-full">
                    {treeMessages.map((m: any) => (
                      <MessageBubble 
                        key={m.id} 
                        m={m} 
                        meId={user?.id} 
                        rating={ratings[m.id]} 
                        onThumb={(dir: string) => setRatings((r) => toggleThumb(r, m.id, dir))} 
                        onReply={setReplyTo} 
                        onEdit={() => console.log('Edit', m.id)} 
                        onDelete={handleDeleteMessage}
                        attachmentFiles={getMessageAttachments(m)}
                      />
                    ))}
                    <div ref={endRef} />
                  </div>
                </ScrollArea.Viewport>
                <ScrollArea.Scrollbar className="w-2" orientation="vertical" />
              </ScrollArea.Root>

              <div className="flex-none border-t p-3 dark:border-neutral-800">
                {replyTo && (
                  <div className="mb-2 flex items-center justify-between rounded-lg bg-neutral-100 p-2 text-sm dark:bg-neutral-900">
                    <span>Replying to message</span>
                    <button onClick={() => setReplyTo(undefined)} className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">×</button>
                  </div>
                )}
                {pendingAttachments.length > 0 && <ComposerAttachments list={pendingAttachments} onRemove={handleRemovePending} />}
                <div className="flex gap-2">
                  <input type="file" ref={fileInputRef} multiple hidden onChange={(e) => e.target.files && handleAddFiles(e.target.files)} />
                  <button onClick={() => fileInputRef.current?.click()} className="rounded-lg p-2 transition hover:bg-neutral-100 dark:hover:bg-neutral-900" title="Attach files"><PlusIcon className="h-5 w-5"/></button>
                  <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} placeholder="Message..." className="flex-1 rounded-lg border bg-neutral-50 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900" />
                  <button onClick={handleSend} className="rounded-lg bg-blue-500 px-3 py-2 text-white transition hover:bg-blue-600" aria-label="Send"><ArrowUpIcon className="h-5 w-5"/></button>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative flex flex-1 min-h-0 flex-col overflow-hidden">
              <FilesView assets={assets} project={selectedProject} view={filesView} selectionMode={filesSelectMode} selectedIds={selectedAssetIds} onToggleSelect={toggleAssetSelect} />
              {filesSelectMode && (
                <div className="sticky bottom-0 z-10 mt-auto">
                  <div className="mx-4 mb-4 flex items-center gap-2 rounded-xl border bg-white/90 p-2 shadow-lg backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90">
                    <div className="flex-1 text-sm">{selectedAssetIds.size} selected</div>
                    <button onClick={handleShareSelected} className="rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-700">Share to chat</button>
                    <button onClick={handleDownloadSelected} className="rounded-lg border px-3 py-2 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">Download</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
