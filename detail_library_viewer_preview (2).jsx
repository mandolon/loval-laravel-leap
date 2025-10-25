import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, ChevronLeft, Download, FileText, Folder, Image as ImageIcon, MoreHorizontal, Search, Upload, X, Trash } from "lucide-react";

// ------------------------------------------------------
// Mock Data
// ------------------------------------------------------

type FileItem = {
  id: string;
  title: string;
  type: "pdf" | "image"; // maps to badge: pdf=>Assembly, image=>Detail
  updated: string;
  size: string;
  author: string;
  description?: string;
  color: "slate" | "green" | "amber" | "violet" | "pink" | "cyan";
};

type FolderT = {
  id: string;
  title: string;
  files: FileItem[];
};

const MOCK_FOLDERS: FolderT[] = [
  {
    id: "foundation",
    title: "Foundation",
    files: [
      { id: "fdn1", title: "Footings", type: "pdf", updated: "2 hours ago", size: "3.0 MB", author: "V. Rivera", color: "slate" },
      { id: "fdn2", title: "Grade Beams", type: "image", updated: "1 day ago", size: "1.2 MB", author: "K. Chen", color: "amber" },
      { id: "fdn3", title: "Slab-on-Grade", type: "pdf", updated: "3 days ago", size: "2.4 MB", author: "M. Diaz", color: "green" },
      { id: "fdn4", title: "Basement Walls", type: "image", updated: "5 days ago", size: "980 KB", author: "S. Patel", color: "violet" },
    ],
  },
  {
    id: "wall",
    title: "Wall",
    files: [
      { id: "wal1", title: "Exterior Walls", type: "pdf", updated: "2 days ago", size: "2.1 MB", author: "J. Kim", color: "amber" },
      { id: "wal2", title: "Interior Walls", type: "image", updated: "4 days ago", size: "1.1 MB", author: "B. Soto", color: "slate" },
      { id: "wal3", title: "Curtain Walls", type: "pdf", updated: "6 days ago", size: "1.0 MB", author: "C. Moe", color: "green" },
      { id: "wal4", title: "Party Walls", type: "image", updated: "1 week ago", size: "900 KB", author: "R. Gomez", color: "violet" },
    ],
  },
  {
    id: "floor-ceiling",
    title: "Floor/Ceiling",
    files: [
      { id: "flc1", title: "Floor Framing", type: "pdf", updated: "2 days ago", size: "1.9 MB", author: "D. Ortiz", color: "slate" },
      { id: "flc2", title: "Ceiling Joists", type: "image", updated: "3 days ago", size: "1.1 MB", author: "J. Kim", color: "green" },
      { id: "flc3", title: "Floor/Ceiling Transitions", type: "pdf", updated: "5 days ago", size: "1.6 MB", author: "A. Lee", color: "amber" },
      { id: "flc4", title: "Acoustic Ceilings", type: "image", updated: "1 week ago", size: "900 KB", author: "K. Chen", color: "violet" },
    ],
  },
  {
    id: "roof",
    title: "Roof",
    files: [
      { id: "rf1", title: "Pitched Roofs", type: "image", updated: "3 days ago", size: "740 KB", author: "S. Patel", color: "violet" },
      { id: "rf2", title: "Flat Roofs", type: "pdf", updated: "4 days ago", size: "2.3 MB", author: "V. Rivera", color: "green" },
      { id: "rf3", title: "Roof-to-Wall Connections", type: "pdf", updated: "1 week ago", size: "3.1 MB", author: "T. Nguyen", color: "slate" },
      { id: "rf4", title: "Skylights", type: "image", updated: "2 weeks ago", size: "1.4 MB", author: "K. Chen", color: "amber" },
    ],
  },
  {
    id: "stair",
    title: "Stair",
    files: [
      { id: "str1", title: "Stair Sections", type: "pdf", updated: "3 days ago", size: "1.8 MB", author: "V. Rivera", color: "green" },
      { id: "str2", title: "Handrails", type: "image", updated: "6 days ago", size: "820 KB", author: "K. Chen", color: "violet" },
      { id: "str3", title: "Landings", type: "pdf", updated: "1 week ago", size: "1.5 MB", author: "T. Nguyen", color: "amber" },
      { id: "str4", title: "Connections", type: "image", updated: "2 weeks ago", size: "600 KB", author: "A. Lee", color: "slate" },
    ],
  },
  {
    id: "finish",
    title: "Finish",
    files: [
      { id: "fin1", title: "Flooring", type: "pdf", updated: "2 days ago", size: "1.2 MB", author: "C. Moe", color: "slate" },
      { id: "fin2", title: "Ceilings", type: "image", updated: "5 days ago", size: "1.1 MB", author: "A. Lee", color: "green" },
      { id: "fin3", title: "Wall Finishes", type: "pdf", updated: "1 week ago", size: "900 KB", author: "R. Gomez", color: "violet" },
      { id: "fin4", title: "Trim & Molding", type: "image", updated: "2 weeks ago", size: "1.4 MB", author: "S. Patel", color: "cyan" },
    ],
  },
];

// ------------------------------------------------------
// Utilities
// ------------------------------------------------------

const colorMap: Record<FileItem["color"], string> = {
  slate: "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
  green: "bg-lime-100 text-lime-900 dark:bg-lime-900/30 dark:text-lime-100",
  amber: "bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100",
  violet: "bg-violet-100 text-violet-900 dark:bg-violet-900/30 dark:text-violet-100",
  pink: "bg-pink-100 text-pink-900 dark:bg-pink-900/30 dark:text-pink-100",
  cyan: "bg-cyan-100 text-cyan-900 dark:bg-cyan-900/30 dark:text-cyan-100",
};

export const COLOR_KEYS: FileItem["color"][] = ["slate", "green", "amber", "violet", "pink", "cyan"];

const swatchBg: Record<FileItem["color"], string> = {
  slate: "bg-slate-300",
  green: "bg-lime-300",
  amber: "bg-amber-300",
  violet: "bg-violet-300",
  pink: "bg-pink-300",
  cyan: "bg-cyan-300",
};

function clsx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

// Filename helpers
function baseTitleFromName(name: string): string {
  const dot = name.lastIndexOf(".");
  const raw = dot > 0 ? name.slice(0, dot) : name;
  return raw.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function inferType(mime: string, name: string): FileItem["type"] {
  if (mime?.startsWith("image/") || /\.(png|jpe?g|gif|svg|webp)$/i.test(name)) return "image";
  return "pdf"; // best-fit into our two-type model
}

function formatBytes(n: number): string {
  if (!isFinite(n) || n < 0) return "\u2014";
  const kb = 1024;
  const mb = kb * 1024;
  if (n < kb) return `${n} B`;
  if (n < mb) return `${Math.round((n / kb) * 10) / 10} KB`;
  return `${Math.round((n / mb) * 10) / 10} MB`;
}

// ------------------------------------------------------
// Pure helpers (exported for tests)
// ------------------------------------------------------
export type DetailItem = {
  id: string;
  title: string;
  type: "pdf" | "image";
  updated: string;
  size: string;
  author: string;
};

export function generateDetailList(base: FileItem | null): DetailItem[] {
  if (!base) return [];
  const names = ["Detail 01", "Detail 02", "Detail 03", "Detail 04", "Detail 05", "Detail 06"];
  return names.map((n, i) => ({
    id: `${base.id}-d${i + 1}`,
    title: `${base.title} \u2014 ${n}`,
    type: i % 2 === 0 ? "pdf" : "image",
    updated: `${i + 1} days ago`,
    size: i % 2 === 0 ? "1.7 MB" : "850 KB",
    author: base.author,
  }));
}

export function cardBadgeLabel(t: FileItem["type"]): string {
  return t === "pdf" ? "Assembly" : "Detail";
}

export function changeFileColor(
  folders: FolderT[],
  fileId: string,
  newColor: FileItem["color"]
): FolderT[] {
  return folders.map((fol) => ({
    ...fol,
    files: fol.files.map((fl) => (fl.id === fileId ? { ...fl, color: newColor } : fl)),
  }));
}

export function updateFileMeta(
  folders: FolderT[],
  fileId: string,
  patch: Partial<Pick<FileItem, "title" | "color" | "type" | "description">>
): FolderT[] {
  return folders.map((fol) => ({
    ...fol,
    files: fol.files.map((fl) => (fl.id === fileId ? { ...fl, ...patch } : fl)),
  }));
}

export function addFilesToFolder(
  folders: FolderT[],
  folderId: string,
  items: { name: string; type: string; size: number }[]
): FolderT[] {
  const nowId = Date.now();
  return folders.map((fol) => {
    if (fol.id !== folderId) return fol;
    const newFiles: FileItem[] = items.map((it, i) => ({
      id: `upl-${nowId}-${i}`,
      title: baseTitleFromName(it.name) || it.name,
      type: inferType(it.type, it.name),
      updated: "just now",
      size: formatBytes(it.size),
      author: "You",
      description: "",
      color: "slate",
    }));
    return { ...fol, files: [...fol.files, ...newFiles] };
  });
}

export function filterByQuery<T extends { title: string; author?: string; type?: string }>(
  items: T[],
  query: string
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  const tokens = q.split(/\s+/).filter(Boolean);
  return items.filter((it) => {
    const hay = `${it.title} ${it.author ?? ""} ${it.type ?? ""}`.toLowerCase();
    return tokens.every((tk) => hay.includes(tk));
  });
}

export function firstNameOnly(name: string): string {
  const t = (name || "").trim();
  if (!t) return "\u2014";
  const first = t.split(/\s+/)[0];
  return first.replace(/,+$/, "");
}

export function footerMeta(f: { updated: string; author: string }): string {
  return `${f.updated} by ${firstNameOnly(f.author)}`;
}

export function avatarInitials(name: string): string {
  const t = (name || "").trim();
  if (!t) return "";
  const parts = t.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "";
  let second = "";
  if (parts[1]) {
    for (const ch of parts[1]) { if (/[A-Za-z]/.test(ch)) { second = ch; break; } }
  }
  return (first + second).toUpperCase();
}

// For global search we add folder context to files
type FlatFile = FileItem & { folderId: string; folderTitle: string };

// ------------------------------------------------------
// UI components
// ------------------------------------------------------
function CardButton({
  file,
  parentFolderId,
  onClick,
  onOpenEdit,
  folderCount,
}: {
  file: FileItem;
  parentFolderId: string;
  onClick: () => void;
  onOpenEdit: (file: FileItem, folderId: string) => void;
  folderCount: number;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={clsx(
        "group relative h-full flex flex-col text-left rounded-3xl p-3 md:p-4 transition-shadow border border-black/5 shadow-sm hover:shadow-md",
        colorMap[file.color]
      )}
    >
      {/* Hover 3-dot menu -> opens modal */}
      <div className="absolute top-2 right-2 transition opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
        <button
          aria-label="Card menu"
          className="p-1.5 rounded-md border bg-white/80 backdrop-blur hover:bg-white shadow-sm"
          onClick={(e) => {
            e.stopPropagation();
            onOpenEdit(file, parentFolderId);
          }}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs opacity-80 min-h-[20px]">
        {file.type === "pdf" ? (
          <FileText className="h-4 w-4" />
        ) : (
          <ImageIcon className="h-4 w-4" />
        )}
        <span>{cardBadgeLabel(file.type)}</span>
      </div>

      <div className="mt-auto leading-[1.1] min-h-[3.5rem] md:min-h-[4rem] flex flex-col justify-end">
        <h3 className="text-xl md:text-2xl font-semibold tracking-tight text-neutral-800 dark:text-neutral-200">
          {file.title.split(" ").slice(0, 2).join(" ")}
        </h3>
        <p className="text-xl md:text-2xl font-semibold tracking-tight text-neutral-800 dark:text-neutral-200 min-h-[1.75rem] md:min-h-[2rem]">
          {file.title.split(" ").slice(2).join(" ")}
        </p>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs opacity-80">
        <span>{footerMeta(file)}</span>
        <span className="opacity-80">{folderCount} files</span>
      </div>
    </div>
  );
}

function DetailRowButton({ d, active, onClick, onDelete }: { d: DetailItem; active: boolean; onClick: () => void; onDelete?: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      className={clsx(
        "group relative w-full flex items-center gap-3 rounded-xl border px-2.5 py-2 text-left transition-colors",
        active
          ? "bg-neutral-50 dark:bg-neutral-800/60 border-black/10"
          : "hover:bg-neutral-50 dark:hover:bg-neutral-800/40 border-black/10"
      )}
    >
      <div className="h-10 w-8 rounded-md border border-dashed border-black/10 bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center shrink-0">
        {d.type === "pdf" ? (
          <FileText className="h-4 w-4 opacity-70" />
        ) : (
          <ImageIcon className="h-4 w-4 opacity-70" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{d.title}</div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div
            className="h-5 w-5 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-[10px] font-medium text-neutral-700 dark:text-neutral-200"
            title={d.author}
            aria-label={`Author ${d.author}`}
          >
            {avatarInitials(d.author)}
          </div>
          <span className="truncate">{d.type.toUpperCase()} • {d.size} • {d.updated}</span>
        </div>
      </div>
      {/* Hover delete */}
      <button
        aria-label="Delete"
        onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md opacity-0 group-hover:opacity-100 transition border border-black/10 bg-white/80 hover:bg-white dark:bg-neutral-900/70"
      >
        <Trash className="h-4 w-4 opacity-70" />
      </button>
    </div>
  );
}

// ------------------------------------------------------
// Modal: Edit Card (title, color, badge/type) + Upload
// ------------------------------------------------------
function CardEditModal({
  open,
  file,
  folderId,
  onClose,
  onSave,
  onUpload,
}: {
  open: boolean;
  file: FileItem | null;
  folderId: string | null;
  onClose: () => void;
  onSave: (fileId: string, patch: Partial<Pick<FileItem, "title" | "color" | "type" | "description">>) => void;
  onUpload: (folderId: string, files: FileList | null) => void;
}) {
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [color, setColor] = useState<FileItem["color"]>("slate");
  const [type, setType] = useState<FileItem["type"]>("pdf");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (file) {
      setTitle(file.title);
      setColor(file.color);
      setType(file.type);
      setDescription(file.description ?? "");
    }
  }, [file, open]);

  if (!open || !file || !folderId) return null;

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const files = e.dataTransfer.files;
    onUpload(folderId, files);
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border bg-white p-4 shadow-xl dark:bg-neutral-900">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium">Edit Card</div>
            <button className="p-1 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Title */}
          <label className="block text-xs opacity-70 mb-1">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full mb-3 rounded-lg border border-black/10 px-3 py-2 text-sm focus:bg-white focus:shadow-sm bg-white/70 dark:bg-neutral-900/60"
          />

          {/* Description */}
          <label className="block text-xs opacity-70 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full mb-3 rounded-lg border border-black/10 px-3 py-2 text-sm focus:bg-white focus:shadow-sm bg-white/70 dark:bg-neutral-900/60"
          />

          {/* Badge/Type */}
          <label className="block text-xs opacity-70 mb-1">Badge</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as FileItem["type"])}
            className="w-full mb-3 rounded-lg border border-black/10 px-3 py-2 text-sm bg-white/70 dark:bg-neutral-900/60"
          >
            <option value="pdf">Assembly (PDF)</option>
            <option value="image">Detail (Image)</option>
          </select>

          {/* Color */}
          <div className="mb-3">
            <div className="text-xs opacity-70 mb-1">Color</div>
            <div className="grid grid-cols-6 gap-2">
              {COLOR_KEYS.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  className={clsx("h-7 w-7 rounded-md border", swatchBg[c], c === color && "ring-2 ring-black/30")}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          {/* Upload */}
          <div
            className="mb-4 rounded-lg border border-dashed border-black/15 p-3 text-xs text-muted-foreground"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <input
              ref={hiddenInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => onUpload(folderId, e.target.files)}
            />
            <div className="flex items-center justify-between gap-3">
              <div>
                Drop files here to upload to this folder.
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs hover:bg-neutral-50 dark:hover:bg-neutral-800"
                onClick={() => hiddenInputRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5" />
                Select files
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-md border px-3 py-1.5 text-sm bg-black text-white border-black hover:bg-black/90 dark:bg-white dark:text-black dark:border-white/80"
              onClick={() => {
                onSave(file.id, { title: title.trim() || file.title, color, type, description: description.trim() });
                onClose();
              }}
            >
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------
// Component
// ------------------------------------------------------

export default function FilePreviewer() {
  const [folders, setFolders] = useState<FolderT[]>(MOCK_FOLDERS);
  const [activeFolderId, setActiveFolderId] = useState(MOCK_FOLDERS[0].id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [editModal, setEditModal] = useState<{ open: boolean; file: FileItem | null; folderId: string | null }>({ open: false, file: null, folderId: null });
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [inlineTitle, setInlineTitle] = useState("");
  const [inlineDesc, setInlineDesc] = useState("");

  const activeFolder = useMemo(
    () => folders.find((f) => f.id === activeFolderId)!,
    [folders, activeFolderId]
  );

  // Flatten all files across folders for global search
  const allFiles: FlatFile[] = useMemo(
    () =>
      folders.flatMap((f) =>
        f.files.map((fl) => ({ ...fl, folderId: f.id, folderTitle: f.title }))
      ),
    [folders]
  );

  // Identify the selected file inside the current active folder
  const selectedFile = useMemo(
    () => activeFolder.files.find((f) => f.id === selectedId) || null,
    [activeFolder, selectedId]
  );

  // Sync inline editors with the currently selected file
  useEffect(() => {
    setInlineTitle(selectedFile?.title ?? "");
    setInlineDesc(selectedFile?.description ?? "");
  }, [selectedFile]);

  // Build per-file details (local) and global details (all files) for search
  const detailList = useMemo(() => generateDetailList(selectedFile), [selectedFile]);
  const allDetails: (DetailItem & { baseId: string; folderId: string })[] = useMemo(
    () =>
      allFiles.flatMap((fl) =>
        generateDetailList(fl).map((d) => ({ ...d, baseId: fl.id, folderId: fl.folderId }))
      ),
    [allFiles]
  );

  // Derive selected detail by ID from the local list (after switching files it will match)
  const selectedDetail = useMemo(
    () => detailList.find((d) => d.id === selectedDetailId) || null,
    [detailList, selectedDetailId]
  );

  const previewTarget = selectedDetail || selectedFile;

  function handleUploadToFolder(folderId: string, files: FileList | null) {
    if (!files || files.length === 0) return;
    const items = Array.from(files).map((f) => ({ name: f.name, type: f.type, size: f.size }));
    setFolders((prev) => addFilesToFolder(prev, folderId, items));
  }

  function handleSaveMeta(fileId: string, patch: Partial<Pick<FileItem, "title" | "color" | "type" | "description">>) {
    setFolders((prev) => updateFileMeta(prev, fileId, patch));
  }

  // Global-filtered details only (query applies to lists, not cards)
  const filteredDetails = useMemo(
    () => filterByQuery(allDetails, query) as (DetailItem & { baseId: string; folderId: string })[],
    [allDetails, query]
  );

  const visibleDetails = useMemo(
    () => (query ? filteredDetails : detailList).filter((d) => !dismissedIds.has(d.id)),
    [query, filteredDetails, detailList, dismissedIds]
  );

  // Card grid shows current folder
  const filesToShow: (FileItem | FlatFile)[] = activeFolder.files;

  const placeholder = "Search details...";

  return (
    <div className="w-full mx-auto max-w-7xl p-4 md:p-6">
      {/* Header + Breadcrumbs */}
      <div className="mb-4 md:mb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center text-sm text-muted-foreground gap-1">
            <span className="font-medium">Detail Library</span>
            <ChevronRight className="h-4 w-4 opacity-60" />
            <span>{activeFolder.title}</span>
            {selectedFile && (
              <>
                <ChevronRight className="h-4 w-4 opacity-60" />
                <span>{selectedFile.title}</span>
              </>
            )}
          </div>
          {/* Inline, compact search on the same row (top-right aligned) */}
          <div role="search" className="relative w-48 sm:w-56 md:w-64 h-8">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-70" />
            <label htmlFor="lib-search" className="sr-only">Search</label>
            <input
              id="lib-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="h-8 w-full rounded-xl border border-black/10 bg-white/60 pl-7 pr-3 text-xs outline-none ring-0 placeholder:opacity-60 focus:bg-white focus:shadow-sm dark:bg-neutral-900/60 dark:focus:bg-neutral-900"
            />
          </div>
        </div>
      </div>

      {/* Folder Switcher */}
      <div className="flex flex-wrap gap-3 mb-6">
        {folders.map((folder) => (
          <button
            key={folder.id}
            onClick={() => {
              setActiveFolderId(folder.id);
              setSelectedId(null);
              setSelectedDetailId(null);
            }}
            className={clsx(
              "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm transition-all",
              activeFolderId === folder.id
                ? "border-black/10 bg-white shadow-sm dark:bg-neutral-900"
                : "border-black/10 bg-neutral-50 hover:bg-white dark:bg-neutral-800/50 dark:hover:bg-neutral-800"
            )}
          >
            <Folder className="h-4 w-4 opacity-70" />
            <span>{folder.title}</span>
          </button>
        ))}
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* LEFT: Cards Grid */}
        <div className={clsx("col-span-12", selectedFile ? "lg:col-span-5" : "lg:col-span-12")}>          
          {!selectedFile ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filesToShow.map((file) => (
                <CardButton
                  key={file.id}
                  file={file}
                  parentFolderId={activeFolderId}
                  onClick={() => {
                    setSelectedId(file.id);
                    setSelectedDetailId(null);
                  }}
                  onOpenEdit={(f, folderId) => setEditModal({ open: true, file: f, folderId })}
                  folderCount={activeFolder.files.length}
                />
              ))}
              {filesToShow.length === 0 && (
                <div className="col-span-full text-sm text-muted-foreground p-4 border border-dashed rounded-xl">
                  No results.
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between h-10">
                <button
                  onClick={() => {
                    setSelectedId(null);
                    setSelectedDetailId(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Back</span>
                </button>
                <div className="text-sm text-muted-foreground">{visibleDetails.length} items</div>
              </div>

              <div className="space-y-2">
                {visibleDetails.map((d) => (
                  <DetailRowButton
                    key={d.id}
                    d={d}
                    active={d.id === selectedDetailId}
                    onClick={() => {
                      const g: any = d as any;
                      if (g.baseId) setSelectedId(g.baseId);
                      setSelectedDetailId(d.id);
                    }}
                    onDelete={() => setDismissedIds((prev) => { const s = new Set(prev); s.add(d.id); return s; })}
                  />
                ))}
                {visibleDetails.length === 0 && (
                  <div className="text-sm text-muted-foreground p-3 border border-dashed rounded-xl">
                    No details match.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Preview Panel */}
        <div className={clsx("col-span-12 lg:col-span-7 space-y-3", !selectedFile && "hidden")}>          
          <div className="flex items-center justify-between h-10">
            <div className="flex items-center gap-2">
              <input
                ref={uploadInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleUploadToFolder(activeFolderId, e.target.files)}
              />
              <button
                disabled={!selectedFile}
                onClick={() => uploadInputRef.current?.click()}
                className={clsx(
                  "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm",
                  selectedFile
                    ? "border-black/10 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    : "border-black/10 opacity-50"
                )}
              >
                <Upload className="h-4 w-4" />
                <span>Upload</span>
              </button>
            </div>
            <button
              disabled={!previewTarget}
              className={clsx(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm",
                previewTarget
                  ? "border-black/10 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  : "border-black/10 opacity-50"
              )}
            >
              <Download className="h-4 w-4" />
              <span>Download</span>
            </button>
          </div>

          {/* Placeholder preview box for scale */}
          <div className="rounded-2xl border border-dashed border-black/10 bg-neutral-50 dark:bg-neutral-900 aspect-[4/3] w-full flex items-center justify-center">
            {previewTarget ? (
              <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
                {previewTarget.type === "pdf" ? (
                  <FileText className="h-8 w-8 opacity-70" />
                ) : (
                  <ImageIcon className="h-8 w-8 opacity-70" />
                )}
                <div className="text-center">
                  <div className="font-medium">{previewTarget.title}</div>
                  <div className="opacity-70">
                    {previewTarget.type.toUpperCase()} preview placeholder
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                {selectedFile ? "Select a detail to preview" : "Select a card to preview"}
              </div>
            )}
          </div>

          {/* File Properties */}
          <div className="rounded-2xl border border-black/10 bg-white/60 p-4 backdrop-blur-sm dark:bg-neutral-900/60">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-medium text-muted-foreground">File Properties</h4>
              <div />
            </div>
            <div className="grid grid-cols-1 md:[grid-template-columns:1.5fr_1fr] gap-6 md:gap-8">
              {/* Left column */}
              <dl className="grid grid-cols-3 gap-y-3 text-sm">
                <dt className="opacity-60">Name</dt>
                <dd className="col-span-2">
                  {selectedFile ? (
                    <textarea
                      aria-label="Edit title"
                      value={inlineTitle}
                      onChange={(e) => setInlineTitle(e.target.value)}
                      onBlur={() => selectedFile && handleSaveMeta(selectedFile.id, { title: inlineTitle.trim() || selectedFile.title })}
                      rows={1}
                      className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm font-medium focus:bg-white focus:shadow-sm bg-white/70 dark:bg-neutral-900/60 resize-none overflow-hidden"
                    />
                  ) : ("—")}
                </dd>

                <dt className="opacity-60">Description</dt>
                <dd className="col-span-2">
                  {selectedFile ? (
                    <textarea
                      aria-label="Edit description"
                      value={inlineDesc}
                      onChange={(e) => setInlineDesc(e.target.value)}
                      onBlur={() => selectedFile && handleSaveMeta(selectedFile.id, { description: inlineDesc.trim() })}
                      rows={4}
                      className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:bg-white focus:shadow-sm bg-white/70 dark:bg-neutral-900/60"
                    />
                  ) : ("—")}
                </dd>
              </dl>

              {/* Right column */}
              <dl className="grid grid-cols-3 gap-y-3 text-sm">
                <dt className="opacity-60">Type</dt>
                <dd className="col-span-2">
                  {previewTarget ? previewTarget.type.toUpperCase() : "—"}
                </dd>

                <dt className="opacity-60">Size</dt>
                <dd className="col-span-2">
                  {previewTarget ? previewTarget.size : "—"}
                </dd>

                <dt className="opacity-60">Updated</dt>
                <dd className="col-span-2">
                  {previewTarget ? previewTarget.updated : "—"}
                </dd>

                <dt className="opacity-60">Author</dt>
                <dd className="col-span-2">
                  {previewTarget ? previewTarget.author : "—"}
                </dd>

                <dt className="opacity-60">Color</dt>
                <dd className="col-span-2">
                  {previewTarget ? (
                    <span className={clsx(
                      "inline-flex items-center gap-2 rounded-md border px-2 py-0.5 text-xs text-black/70 dark:text-white/80 border-black/10",
                      swatchBg[previewTarget.color as keyof typeof swatchBg] || "bg-neutral-200"
                    )}>
                      <span className="h-2 w-2 rounded-full bg-current" />
                      <span className="capitalize">{previewTarget.color}</span>
                    </span>
                  ) : (
                    "—"
                  )}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Mount */}
      <CardEditModal
        open={editModal.open}
        file={editModal.file}
        folderId={editModal.folderId}
        onClose={() => setEditModal({ open: false, file: null, folderId: null })}
        onSave={handleSaveMeta}
        onUpload={handleUploadToFolder}
      />
    </div>
  );
}

// ------------------------------------------------------
// Lightweight Dev Tests (won't throw in production)
// ------------------------------------------------------
try {
  const base: FileItem = {
    id: "t1",
    title: "Test Title",
    type: "pdf",
    updated: "now",
    size: "0.0 MB",
    author: "Tester",
    color: "slate",
  };
  const list = generateDetailList(base);
  console.assert(Array.isArray(list) && list.length === 6, "detail list should have 6 items");
  console.assert(list.every((d) => d.title.startsWith(base.title)), "detail titles should start with base title");
  console.assert(list.every((d, i) => (i % 2 === 0 ? d.type === "pdf" : d.type === "image")), "types alternate");
  console.assert(list[0].size.endsWith("MB") && list[1].size.endsWith("KB"), "sizes follow pattern");

  // color map coverage
  console.assert(COLOR_KEYS.every((k) => Object.prototype.hasOwnProperty.call(colorMap, k)), "color map coverage");

  // search
  const sample = [
    { title: "Floor Framing", author: "A" },
    { title: "Ceiling Joists", author: "B" },
  ];
  console.assert(filterByQuery(sample, "floor").length === 1, "search finds floor");
  console.assert(filterByQuery(sample, "floor joists").length === 0, "tokens are ANDed");
  console.assert(filterByQuery(sample, "FLOOR").length === 1, "case-insensitive");

  // addFilesToFolder
  const beforeUpload = JSON.parse(JSON.stringify(MOCK_FOLDERS)) as FolderT[];
  const afterUpload = addFilesToFolder(beforeUpload, "foundation", [
    { name: "New Drawing.pdf", type: "application/pdf", size: 2_500_000 },
    { name: "photo.jpg", type: "image/jpeg", size: 350_000 },
  ]);
  const fnd = afterUpload.find((f) => f.id === "foundation")!;
  console.assert(
    fnd.files.length === (MOCK_FOLDERS.find((f) => f.id === "foundation")!.files.length + 2),
    "files appended"
  );
  const lastTwo = fnd.files.slice(-2);
  console.assert(lastTwo[0].type === "pdf" && lastTwo[1].type === "image", "type inference works");
  console.assert(/MB$/.test(lastTwo[0].size) && /[MK]B$/.test(lastTwo[1].size), "size formatting");

  // updateFileMeta
  const beforeMeta = JSON.parse(JSON.stringify(MOCK_FOLDERS)) as FolderT[];
  const updatedMeta = updateFileMeta(beforeMeta, "fdn1", { title: "Footings Revised", type: "image", color: "pink" });
  const oldF = beforeMeta[0].files.find((f) => f.id === "fdn1")!;
  const newF = updatedMeta[0].files.find((f) => f.id === "fdn1")!;
  console.assert(oldF !== newF, "file object replaced");
  console.assert(newF.title === "Footings Revised" && newF.type === "image" && newF.color === "pink", "patch applied");

  // footer meta + firstNameOnly
  console.assert(footerMeta({ updated: "5 days ago", author: "Armando" }) === "5 days ago by Armando", "footer meta (single name)");
  console.assert(footerMeta({ updated: "2 days ago", author: "V. Rivera" }) === "2 days ago by V.", "footer meta uses first name only");
  console.assert(firstNameOnly("  Maria-Elena Gomez ") === "Maria-Elena", "hyphenated first name retained");
  console.assert(firstNameOnly("") === "\u2014", "empty author yields em dash");

  // avatar initials
  console.assert(avatarInitials("V. Rivera") === "VR", "initials from dotted first + last");
  console.assert(avatarInitials("Mary Jane") === "MJ", "two-letter initials");
  console.assert(avatarInitials("Solo") === "S", "single name initial");

  // filename + type + size helpers
  console.assert(baseTitleFromName("My_file-name.v2.pdf") === "My file name.v2", "basename strips extension + normalizes");
  console.assert(inferType("image/png", "file.png") === "image", "image type by mime/ext");
  console.assert(inferType("application/pdf", "doc.pdf") === "pdf", "pdf type by mime/ext");
  console.assert(formatBytes(500) === "500 B", "bytes formatting");
  console.assert(formatBytes(1500) === "1.5 KB", "kb formatting");
  console.assert(formatBytes(2_500_000) === "2.4 MB", "mb formatting");

  // description meta update
  const beforeDesc = JSON.parse(JSON.stringify(MOCK_FOLDERS)) as FolderT[];
  const withDesc = updateFileMeta(beforeDesc, "fdn1", { description: "Footings and rebar schedule" });
  const fdn1Desc = withDesc[0].files.find((f) => f.id === "fdn1")!;
  console.assert(fdn1Desc.description === "Footings and rebar schedule", "description updated via meta");

  // uploaded file has description string
  const afterUpload2 = addFilesToFolder(JSON.parse(JSON.stringify(MOCK_FOLDERS)) as FolderT[], "foundation", [{ name: "x.pdf", type: "application/pdf", size: 1000 }]);
  const newFile = afterUpload2.find((f) => f.id === "foundation")!.files.slice(-1)[0] as any;
  console.assert(typeof newFile.description === "string", "new file has description field");
} catch (e) {
  // no-op, safe for environments without console or during SSR
}
