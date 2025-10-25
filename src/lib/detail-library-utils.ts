// Detail Library Utility Functions
// Copied from detail_library_viewer_preview (2).jsx

export type FileItem = {
  id: string;
  title: string;
  type: "pdf" | "image"; // maps to badge: pdf=>Assembly, image=>Detail
  updated: string;
  size: string;
  author: string;
  description?: string;
  color: "slate" | "green" | "amber" | "violet" | "pink" | "cyan";
};

export type FolderT = {
  id: string;
  title: string;
  files: FileItem[];
};

export type DetailItem = {
  id: string;
  title: string;
  type: "pdf" | "image";
  updated: string;
  size: string;
  author: string;
};

// Color system constants
export const COLOR_KEYS: FileItem["color"][] = ["slate", "green", "amber", "violet", "pink", "cyan"];

export const colorMap: Record<FileItem["color"], string> = {
  slate: "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
  green: "bg-lime-100 text-lime-900 dark:bg-lime-900/30 dark:text-lime-100",
  amber: "bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100",
  violet: "bg-violet-100 text-violet-900 dark:bg-violet-900/30 dark:text-violet-100",
  pink: "bg-pink-100 text-pink-900 dark:bg-pink-900/30 dark:text-pink-100",
  cyan: "bg-cyan-100 text-cyan-900 dark:bg-cyan-900/30 dark:text-cyan-100",
};

export const swatchBg: Record<FileItem["color"], string> = {
  slate: "bg-slate-300",
  green: "bg-lime-300",
  amber: "bg-amber-300",
  violet: "bg-violet-300",
  pink: "bg-pink-300",
  cyan: "bg-cyan-300",
};

// Utility function to combine classes
export function clsx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

// Filename helpers
export function baseTitleFromName(name: string): string {
  const dot = name.lastIndexOf(".");
  const raw = dot > 0 ? name.slice(0, dot) : name;
  return raw.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

export function inferType(mime: string, name: string): FileItem["type"] {
  if (mime?.startsWith("image/") || /\.(png|jpe?g|gif|svg|webp)$/i.test(name)) return "image";
  return "pdf"; // best-fit into our two-type model
}

export function formatBytes(n: number): string {
  if (!isFinite(n) || n < 0) return "\u2014";
  const kb = 1024;
  const mb = kb * 1024;
  if (n < kb) return `${n} B`;
  if (n < mb) return `${Math.round((n / kb) * 10) / 10} KB`;
  return `${Math.round((n / mb) * 10) / 10} MB`;
}

// Detail list generation
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

// Badge label mapping
export function cardBadgeLabel(t: FileItem["type"]): string {
  return t === "pdf" ? "Assembly" : "Detail";
}

// File manipulation functions
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

// Search functionality
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

// Display helpers
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

// Mock data for development
export const MOCK_FOLDERS: FolderT[] = [
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

// System folders definition
export const SYSTEM_FOLDERS = [
  { id: "foundation", title: "Foundation" },
  { id: "wall", title: "Wall" },
  { id: "floor-ceiling", title: "Floor/Ceiling" },
  { id: "roof", title: "Roof" },
  { id: "stair", title: "Stair" },
  { id: "finish", title: "Finish" }
];
