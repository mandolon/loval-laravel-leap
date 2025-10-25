import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  useDetailLibraryCategories, 
  useDetailLibraryFiles, 
  useDetailLibraryItems,
  useUpdateDetailFile,
  useUpdateDetailFileColor,
  useDeleteDetailItem,
} from '@/lib/api/hooks/useDetailLibrary';
import SimplePDFViewer from './SimplePDFViewer';
import SimpleImageViewer from './SimpleImageViewer';
import CardEditModal from './CardEditModal';
import { 
  Search, 
  ChevronRight, 
  FileText, 
  Image as ImageIcon, 
  MoreHorizontal,
  ChevronLeft,
  Trash,
  Upload,
  Download,
  Folder,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface DetailLibraryViewerProps {
  workspaceId: string;
}

const colorMap = {
  slate: "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
  green: "bg-lime-100 text-lime-900 dark:bg-lime-900/30 dark:text-lime-100",
  amber: "bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100",
  violet: "bg-violet-100 text-violet-900 dark:bg-violet-900/30 dark:text-violet-100",
  pink: "bg-pink-100 text-pink-900 dark:bg-pink-900/30 dark:text-pink-100",
  cyan: "bg-cyan-100 text-cyan-900 dark:bg-cyan-900/30 dark:text-cyan-100",
};

const swatchBg = {
  slate: "bg-slate-300",
  green: "bg-lime-300",
  amber: "bg-amber-300",
  violet: "bg-violet-300",
  pink: "bg-pink-300",
  cyan: "bg-cyan-300",
};

// Helper functions
function baseTitleFromName(name: string): string {
  const dot = name.lastIndexOf(".");
  const raw = dot > 0 ? name.slice(0, dot) : name;
  return raw.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function firstNameOnly(name: string): string {
  const t = (name || "").trim();
  if (!t) return "—";
  const first = t.split(/\s+/)[0];
  return first.replace(/,+$/, "");
}

function footerMeta(f: { updatedAt?: string; authorName?: string }): string {
  const updated = f.updatedAt ? formatDistanceToNow(new Date(f.updatedAt), { addSuffix: true }) : "recently";
  const author = firstNameOnly(f.authorName || "Unknown");
  return `${updated} by ${author}`;
}

function avatarInitials(name: string): string {
  const t = (name || "").trim();
  if (!t) return "";
  const parts = t.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "";
  let second = "";
  if (parts[1]) {
    for (const ch of parts[1]) { 
      if (/[A-Za-z]/.test(ch)) { 
        second = ch; 
        break; 
      } 
    }
  }
  return (first + second).toUpperCase();
}

function formatBytes(n: number): string {
  if (!isFinite(n) || n < 0) return "—";
  const kb = 1024;
  const mb = kb * 1024;
  if (n < kb) return `${n} B`;
  if (n < mb) return `${Math.round((n / kb) * 10) / 10} KB`;
  return `${Math.round((n / mb) * 10) / 10} MB`;
}

export default function DetailLibraryViewer({ workspaceId }: DetailLibraryViewerProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editModalState, setEditModalState] = useState<{
    open: boolean;
    file: any;
    categoryId: string | null;
  }>({ open: false, file: null, categoryId: null });
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const [tempDescription, setTempDescription] = useState('');

  const { data: categories } = useDetailLibraryCategories(workspaceId);
  const { data: files } = useDetailLibraryFiles(workspaceId, selectedCategoryId || undefined);
  const { data: items } = useDetailLibraryItems(selectedFileId || undefined);
  const updateMutation = useUpdateDetailFile();
  const updateColorMutation = useUpdateDetailFileColor();
  const deleteItemMutation = useDeleteDetailItem();

  const selectedCategory = categories?.find(c => c.id === selectedCategoryId);
  const selectedFile = files?.find(f => f.id === selectedFileId);
  const selectedItem = items?.find(i => i.id === selectedItemId);

  // Auto-select first category
  useEffect(() => {
    if (categories?.length && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  // Update temp values when file changes
  useEffect(() => {
    if (selectedFile) {
      setTempTitle(selectedFile.title);
      setTempDescription(selectedFile.description || '');
    }
  }, [selectedFile]);

  // Fetch signed URL for preview
  useEffect(() => {
    if (selectedItemId && items) {
      const item = items.find(i => i.id === selectedItemId);
      if (item) {
        supabase.storage
          .from('detail-library')
          .createSignedUrl(item.storagePath, 3600)
          .then(({ data }) => setFileUrl(data?.signedUrl || null));
      }
    } else if (selectedFileId && !selectedItemId && files) {
      const file = files.find(f => f.id === selectedFileId);
      if (file) {
        supabase.storage
          .from('detail-library')
          .createSignedUrl(file.storagePath, 3600)
          .then(({ data }) => setFileUrl(data?.signedUrl || null));
      }
    } else {
      setFileUrl(null);
    }
  }, [selectedItemId, selectedFileId, items, files]);

  const filteredItems = items?.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleFileClick = (fileId: string) => {
    setSelectedFileId(fileId);
    setSelectedItemId(null);
    setSearchQuery('');
  };

  const handleBackToCards = () => {
    setSelectedFileId(null);
    setSelectedItemId(null);
    setSearchQuery('');
  };

  const handleUpdateTitle = async () => {
    if (!selectedFile || !tempTitle.trim()) return;
    await updateMutation.mutateAsync({
      fileId: selectedFile.id,
      title: tempTitle.trim(),
    });
    setEditingTitle(false);
  };

  const handleUpdateDescription = async () => {
    if (!selectedFile) return;
    await updateMutation.mutateAsync({
      fileId: selectedFile.id,
      description: tempDescription.trim(),
    });
    setEditingDescription(false);
  };

  const handleColorChange = async (color: string) => {
    if (!selectedFile) return;
    await updateColorMutation.mutateAsync({
      fileId: selectedFile.id,
      colorTag: color as any,
    });
  };

  const handleDeleteItem = async (itemId: string) => {
    await deleteItemMutation.mutateAsync({ itemId });
    if (selectedItemId === itemId) {
      setSelectedItemId(null);
    }
  };

  const renderCardsGrid = () => {
    if (!files?.length) {
      return (
        <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
          No files in this category
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {files.map((file) => {
          const isPDF = file.mimetype === 'application/pdf';
          const itemCount = items?.filter(i => i.parentFileId === file.id).length || 0;
          
          return (
            <div
              key={file.id}
              role="button"
              tabIndex={0}
              onClick={() => handleFileClick(file.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleFileClick(file.id);
                }
              }}
              className={cn(
                "group relative h-full flex flex-col text-left rounded-3xl p-3 md:p-4 transition-shadow border border-black/5 shadow-sm hover:shadow-md cursor-pointer",
                colorMap[file.colorTag as keyof typeof colorMap]
              )}
            >
              {/* 3-dot menu */}
              <div className="absolute top-2 right-2 transition opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                <button
                  aria-label="Card menu"
                  className="p-1.5 rounded-md border bg-white/80 backdrop-blur hover:bg-white shadow-sm dark:bg-neutral-900/80 dark:hover:bg-neutral-900"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditModalState({ open: true, file, categoryId: selectedCategoryId });
                  }}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>

              {/* Badge */}
              <div className="flex items-center gap-2 text-xs opacity-80 min-h-[20px]">
                {isPDF ? (
                  <FileText className="h-4 w-4" />
                ) : (
                  <ImageIcon className="h-4 w-4" />
                )}
                <span>{isPDF ? 'Assembly' : 'Detail'}</span>
              </div>

              {/* Title - split into 2 lines */}
              <div className="mt-auto leading-[1.1] min-h-[3.5rem] md:min-h-[4rem] flex flex-col justify-end">
                <h3 className="text-xl md:text-2xl font-semibold tracking-tight text-neutral-800 dark:text-neutral-200">
                  {file.title.split(" ").slice(0, 2).join(" ")}
                </h3>
                <p className="text-xl md:text-2xl font-semibold tracking-tight text-neutral-800 dark:text-neutral-200 min-h-[1.75rem] md:min-h-[2rem]">
                  {file.title.split(" ").slice(2).join(" ")}
                </p>
              </div>

              {/* Footer */}
              <div className="mt-2 flex items-center justify-between text-xs opacity-80">
                <span>{footerMeta(file)}</span>
                <span className="opacity-80">{itemCount} files</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDetailList = () => {
    if (!selectedFile) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between h-10">
          <button
            onClick={handleBackToCards}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 border-black/10"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back</span>
          </button>
          <div className="text-sm text-muted-foreground">{filteredItems.length} items</div>
        </div>

        <div className="space-y-2">
          {filteredItems.map((item, index) => {
            const isActive = item.id === selectedItemId;
            const isPDF = item.mimetype === 'application/pdf';
            
            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedItemId(item.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedItemId(item.id);
                  }
                }}
                className={cn(
                  "group relative w-full flex items-center gap-3 rounded-xl border px-2.5 py-2 text-left transition-colors cursor-pointer",
                  isActive
                    ? "bg-neutral-50 dark:bg-neutral-800/60 border-black/10"
                    : "hover:bg-neutral-50 dark:hover:bg-neutral-800/40 border-black/10"
                )}
              >
                {/* Thumbnail */}
                <div className="h-10 w-8 rounded-md border border-dashed border-black/10 bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center shrink-0">
                  {isPDF ? (
                    <FileText className="h-4 w-4 opacity-70" />
                  ) : (
                    <ImageIcon className="h-4 w-4 opacity-70" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    Detail {String(index + 1).padStart(2, '0')}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate">
                      {isPDF ? 'PDF' : 'IMAGE'} • {formatBytes(item.filesize)} • {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                {/* Hover delete */}
                <button
                  aria-label="Delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteItem(item.id);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md opacity-0 group-hover:opacity-100 transition border border-black/10 bg-white/80 hover:bg-white dark:bg-neutral-900/70"
                >
                  <Trash className="h-4 w-4 opacity-70" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPreviewPanel = () => {
    const previewFile = selectedItem || selectedFile;
    
    if (!previewFile) {
      return (
        <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
          Select a file to preview
        </div>
      );
    }

    const isPDF = previewFile.mimetype === 'application/pdf';

    return (
      <div className="space-y-3">
        {/* Viewer */}
        <div className="aspect-[4/3] bg-muted rounded-xl overflow-hidden border border-black/10">
          {fileUrl ? (
            isPDF ? (
              <SimplePDFViewer file={{ url: fileUrl, name: previewFile.filename }} />
            ) : (
              <SimpleImageViewer file={{ url: fileUrl, name: previewFile.filename }} />
            )
          ) : (
            <div className="flex items-center justify-center h-full">
              Loading preview...
            </div>
          )}
        </div>

        {/* File Properties */}
        {selectedFile && (
          <div className="rounded-2xl border border-black/10 bg-white/60 p-4 backdrop-blur-sm dark:bg-neutral-900/60">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-medium text-muted-foreground">File Properties</h4>
            </div>
            <div className="grid grid-cols-1 md:[grid-template-columns:1.5fr_1fr] gap-6 md:gap-8">
              {/* Left column */}
              <dl className="grid grid-cols-3 gap-y-3 text-sm">
                <dt className="opacity-60">Name</dt>
                <dd className="col-span-2">
                  <textarea
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    onBlur={handleUpdateTitle}
                    onFocus={() => setEditingTitle(true)}
                    rows={1}
                    className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm font-medium focus:bg-white focus:shadow-sm bg-white/70 dark:bg-neutral-900/60 resize-none overflow-hidden"
                  />
                </dd>

                <dt className="opacity-60">Description</dt>
                <dd className="col-span-2">
                  <textarea
                    value={tempDescription}
                    onChange={(e) => setTempDescription(e.target.value)}
                    onBlur={handleUpdateDescription}
                    onFocus={() => setEditingDescription(true)}
                    rows={4}
                    placeholder="Add a description..."
                    className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:bg-white focus:shadow-sm bg-white/70 dark:bg-neutral-900/60"
                  />
                </dd>
              </dl>

              {/* Right column */}
              <dl className="grid grid-cols-3 gap-y-3 text-sm">
                <dt className="opacity-60">Type</dt>
                <dd className="col-span-2">{isPDF ? 'PDF' : 'IMAGE'}</dd>

                <dt className="opacity-60">Size</dt>
                <dd className="col-span-2">{formatBytes(previewFile.filesize)}</dd>

                <dt className="opacity-60">Updated</dt>
                <dd className="col-span-2">{formatDistanceToNow(new Date(previewFile.updatedAt), { addSuffix: true })}</dd>

                <dt className="opacity-60">Author</dt>
                <dd className="col-span-2">{selectedFile.authorName || '—'}</dd>

                <dt className="opacity-60">Color</dt>
                <dd className="col-span-2">
                  <span className={cn(
                    "inline-flex items-center gap-2 rounded-md border px-2 py-0.5 text-xs text-black/70 dark:text-white/80 border-black/10",
                    swatchBg[selectedFile.colorTag as keyof typeof swatchBg] || "bg-neutral-200"
                  )}>
                    <span className="h-2 w-2 rounded-full bg-current" />
                    <span className="capitalize">{selectedFile.colorTag}</span>
                  </span>
                </dd>
              </dl>
            </div>

            {/* Color Swatches */}
            <div className="mt-4 pt-4 border-t border-black/10">
              <div className="grid grid-cols-6 gap-2">
                {Object.keys(swatchBg).map((color) => (
                  <button
                    key={color}
                    type="button"
                    title={color}
                    className={cn(
                      "h-7 w-full rounded-md border border-black/10",
                      swatchBg[color as keyof typeof swatchBg],
                      selectedFile.colorTag === color && "ring-2 ring-black/30 dark:ring-white/30"
                    )}
                    onClick={() => handleColorChange(color)}
                  />
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-4 pt-4 border-t border-black/10 flex gap-2">
              <button className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 border-black/10">
                <Upload className="h-4 w-4" />
                <span>Upload</span>
              </button>
              <button className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 border-black/10">
                <Download className="h-4 w-4" />
                <span>Download</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full mx-auto max-w-7xl p-4 md:p-6">
      {/* Breadcrumbs + Search */}
      <div className="mb-4 md:mb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center text-sm text-muted-foreground gap-1">
            <span className="font-medium">Detail Library</span>
            <ChevronRight className="h-4 w-4 opacity-60" />
            <span>{selectedCategory?.name || 'All'}</span>
            {selectedFile && (
              <>
                <ChevronRight className="h-4 w-4 opacity-60" />
                <span>{selectedFile.title}</span>
              </>
            )}
          </div>
          {selectedFileId && (
            <div role="search" className="relative w-48 sm:w-56 md:w-64 h-8">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-70" />
              <label htmlFor="lib-search" className="sr-only">Search</label>
              <input
                id="lib-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search details..."
                className="h-8 w-full rounded-xl border border-black/10 bg-white/60 pl-7 pr-3 text-xs outline-none ring-0 placeholder:opacity-60 focus:bg-white focus:shadow-sm dark:bg-neutral-900/60 dark:focus:bg-neutral-900"
              />
            </div>
          )}
        </div>
      </div>

      {/* Folder Tabs */}
      <div className="flex flex-wrap gap-3 mb-6">
        {categories?.map((category) => (
          <button
            key={category.id}
            onClick={() => {
              setSelectedCategoryId(category.id);
              setSelectedFileId(null);
              setSelectedItemId(null);
            }}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm transition-all",
              selectedCategoryId === category.id
                ? "border-black/10 bg-white shadow-sm dark:bg-neutral-900"
                : "border-black/10 bg-neutral-50 hover:bg-white dark:bg-neutral-800/50 dark:hover:bg-neutral-800"
            )}
          >
            <Folder className="h-4 w-4 opacity-70" />
            <span>{category.name}</span>
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* LEFT: Cards or Detail List */}
        <div className={cn("col-span-12", selectedFile ? "lg:col-span-5" : "lg:col-span-12")}>
          {!selectedFile ? renderCardsGrid() : renderDetailList()}
        </div>

        {/* RIGHT: Preview Panel - hidden when no file selected */}
        {selectedFile && (
          <div className="col-span-12 lg:col-span-7 space-y-3">
            {renderPreviewPanel()}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <CardEditModal
        open={editModalState.open}
        onOpenChange={(open) => setEditModalState({ ...editModalState, open })}
        file={editModalState.file}
        workspaceId={workspaceId}
        categoryId={editModalState.categoryId || ''}
      />
    </div>
  );
}
