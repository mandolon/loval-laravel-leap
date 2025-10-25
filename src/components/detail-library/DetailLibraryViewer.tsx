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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  ChevronRight, 
  FileText, 
  Image as ImageIcon, 
  MoreVertical,
  ChevronLeft,
  Trash2,
  Upload,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {files.map((file) => {
          const isPDF = file.mimetype === 'application/pdf';
          const itemCount = items?.filter(i => i.parentFileId === file.id).length || 0;
          
          return (
            <div
              key={file.id}
              className={cn(
                "rounded-3xl p-6 border border-black/10 cursor-pointer transition-all hover:shadow-lg relative",
                colorMap[file.colorTag]
              )}
              onClick={() => handleFileClick(file.id)}
            >
              <div className="absolute top-4 right-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      setEditModalState({ open: true, file, categoryId: selectedCategoryId });
                    }}>
                      Edit Details
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center gap-2 mb-3">
                {isPDF ? (
                  <FileText className="h-4 w-4" />
                ) : (
                  <ImageIcon className="h-4 w-4" />
                )}
                <span className="text-xs font-medium">
                  {isPDF ? 'Assembly' : 'Detail'}
                </span>
              </div>

              <h3 className="text-2xl font-bold mb-4 leading-tight">
                {file.title}
              </h3>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
                  {file.authorName && ` by ${file.authorName}`}
                </span>
                <span className="font-medium">
                  {itemCount} file{itemCount !== 1 ? 's' : ''}
                </span>
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
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackToCards}
          className="mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to {selectedFile.title}
        </Button>

        <div className="space-y-2">
          {filteredItems.map((item, index) => {
            const isActive = item.id === selectedItemId;
            
            return (
              <div
                key={item.id}
                className={cn(
                  "p-4 rounded-xl border border-border cursor-pointer transition-all hover:bg-accent/50 group",
                  isActive && "bg-accent"
                )}
                onClick={() => setSelectedItemId(item.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 border-2 border-dashed border-border rounded-lg flex-shrink-0" />
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">
                      Detail {String(index + 1).padStart(2, '0')}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.mimetype} • {(item.filesize / 1024).toFixed(1)} KB
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteItem(item.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
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
          Select a detail to preview
        </div>
      );
    }

    const isPDF = previewFile.mimetype === 'application/pdf';

    return (
      <div className="space-y-6">
        {/* Viewer */}
        <div className="aspect-[4/3] bg-muted rounded-xl overflow-hidden border border-border">
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

        {/* File Properties - only show for main file, not items */}
        {selectedFile && !selectedItem && (
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Title</label>
              {editingTitle ? (
                <Input
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onBlur={handleUpdateTitle}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdateTitle();
                    if (e.key === 'Escape') setEditingTitle(false);
                  }}
                  autoFocus
                  className="mt-1"
                />
              ) : (
                <div
                  className="mt-1 p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => {
                    setTempTitle(selectedFile.title);
                    setEditingTitle(true);
                  }}
                >
                  <p className="text-sm font-medium">{selectedFile.title}</p>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              {editingDescription ? (
                <Textarea
                  value={tempDescription}
                  onChange={(e) => setTempDescription(e.target.value)}
                  onBlur={handleUpdateDescription}
                  placeholder="Add a description..."
                  rows={3}
                  autoFocus
                  className="mt-1"
                />
              ) : (
                <div
                  className="mt-1 p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors min-h-[60px]"
                  onClick={() => {
                    setTempDescription(selectedFile.description || '');
                    setEditingDescription(true);
                  }}
                >
                  <p className="text-sm text-muted-foreground">
                    {selectedFile.description || 'Click to add description...'}
                  </p>
                </div>
              )}
            </div>

            {/* Author */}
            {selectedFile.authorName && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Author</label>
                <p className="mt-1 text-sm">{selectedFile.authorName}</p>
              </div>
            )}

            {/* Metadata */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{(selectedFile.filesize / 1024).toFixed(1)} KB</span>
              <span>•</span>
              <span>{selectedFile.mimetype}</span>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(selectedFile.updatedAt), { addSuffix: true })}</span>
            </div>

            {/* Color Swatches */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">Color Tag</label>
              <div className="flex gap-2">
                {Object.keys(swatchBg).map((color) => (
                  <button
                    key={color}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all",
                      swatchBg[color as keyof typeof swatchBg],
                      selectedFile.colorTag === color && "ring-2 ring-offset-2 ring-foreground"
                    )}
                    onClick={() => handleColorChange(color)}
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">Detail Library</span>
          {selectedCategory && (
            <>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{selectedCategory.name}</span>
            </>
          )}
        </div>
        
        {selectedFileId && (
          <div className="relative w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {categories?.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategoryId === category.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setSelectedCategoryId(category.id);
              setSelectedFileId(null);
              setSelectedItemId(null);
              setSearchQuery('');
            }}
            className="rounded-xl whitespace-nowrap"
          >
            {category.name}
          </Button>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-12 gap-6 overflow-hidden">
        {/* Left Panel - Cards or Detail List */}
        <div className="col-span-12 lg:col-span-5 overflow-y-auto">
          {selectedFileId ? renderDetailList() : renderCardsGrid()}
        </div>

        {/* Right Panel - Preview */}
        <div className="col-span-12 lg:col-span-7 overflow-y-auto">
          {renderPreviewPanel()}
        </div>
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
