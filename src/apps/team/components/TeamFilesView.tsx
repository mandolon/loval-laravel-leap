import { useState, useMemo } from 'react';
import { FileIcon, Star, Grid3x3, List, CheckCircle2 } from 'lucide-react';
import { useProjectFiles } from '@/lib/api/hooks/useProjectFiles';

interface TeamFilesViewProps {
  projectId: string;
  onFileSelect?: (fileId: string) => void;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  selectMode?: boolean;
  onSelectModeChange?: (mode: boolean) => void;
  selectedFiles?: Set<string>;
  onSelectedFilesChange?: (files: Set<string>) => void;
  onShareToChat?: () => void;
}

const THEME = {
  background: "#fcfcfc",
  card: "#ffffff",
  border: "#e2e8f0",
  text: "#0f172a",
  textSecondary: "#475569",
  accent: "#4C75D1",
  hover: "#f1f5f9",
};

export default function TeamFilesView({ 
  projectId, 
  onFileSelect,
  viewMode: externalViewMode,
  onViewModeChange,
  selectMode: externalSelectMode,
  onSelectModeChange,
  selectedFiles: externalSelectedFiles,
  onSelectedFilesChange,
  onShareToChat
}: TeamFilesViewProps) {
  const { data: files = [], isLoading } = useProjectFiles(projectId);
  const [internalViewMode, setInternalViewMode] = useState<'grid' | 'list'>('grid');
  const [internalSelectMode, setInternalSelectMode] = useState(false);
  const [internalSelectedFiles, setInternalSelectedFiles] = useState<Set<string>>(new Set());

  const viewMode = externalViewMode ?? internalViewMode;
  const selectMode = externalSelectMode ?? internalSelectMode;
  const selectedFiles = externalSelectedFiles ?? internalSelectedFiles;

  const setViewMode = (mode: 'grid' | 'list') => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    } else {
      setInternalViewMode(mode);
    }
  };

  const setSelectMode = (mode: boolean) => {
    if (onSelectModeChange) {
      onSelectModeChange(mode);
    } else {
      setInternalSelectMode(mode);
    }
  };

  const setSelectedFiles = (files: Set<string>) => {
    if (onSelectedFilesChange) {
      onSelectedFilesChange(files);
    } else {
      setInternalSelectedFiles(files);
    }
  };

  const handleFileClick = (fileId: string) => {
    if (selectMode) {
      const next = new Set(selectedFiles);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      setSelectedFiles(next);
    } else if (onFileSelect) {
      onFileSelect(fileId);
    }
  };

  const handleShareToChat = () => {
    if (onShareToChat) {
      onShareToChat();
    } else {
      // Share selected files to chat
      selectedFiles.forEach((fileId) => {
        if (onFileSelect) onFileSelect(fileId);
      });
    }
    setSelectedFiles(new Set());
    setSelectMode(false);
  };

  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => 
      new Date(b.updated_at || b.created_at).getTime() - 
      new Date(a.updated_at || a.created_at).getTime()
    );
  }, [files]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center" style={{ color: THEME.textSecondary }}>
          Loading files...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Files Grid/List */}
      <div className="flex-1 overflow-y-auto p-4">
        {sortedFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16">
            <FileIcon className="h-16 w-16 mb-4 opacity-20" />
            <div className="text-center">
              <p className="text-lg font-medium mb-2" style={{ color: THEME.text }}>
                No files yet
              </p>
              <p className="text-sm" style={{ color: THEME.textSecondary }}>
                Upload files from the chat to see them here
              </p>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {sortedFiles.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                selectable={selectMode}
                selected={selectedFiles.has(file.id)}
                onToggle={() => handleFileClick(file.id)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {sortedFiles.map((file) => (
              <FileListItem
                key={file.id}
                file={file}
                selectable={selectMode}
                selected={selectedFiles.has(file.id)}
                onToggle={() => handleFileClick(file.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface FileCardProps {
  file: {
    id: string;
    filename: string;
    mimetype?: string;
    filesize?: number;
    storage_path?: string;
  };
  selectable: boolean;
  selected: boolean;
  onToggle: () => void;
}

function FileCard({ file, selectable, selected, onToggle }: FileCardProps) {
  const isImage = file.mimetype?.startsWith('image/');
  const isPDF = file.mimetype === 'application/pdf';

  return (
    <div
      onClick={onToggle}
      className="group relative rounded-xl border p-3 shadow-sm transition-all hover:shadow-md cursor-pointer"
      style={{
        borderColor: selected ? THEME.accent : THEME.border,
        background: THEME.card,
        ...(selected && { boxShadow: `0 0 0 2px ${THEME.accent}` }),
      }}
    >
      {selectable && (
        <div className="absolute top-2 right-2 z-10">
          <div
            className="h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all"
            style={{
              borderColor: selected ? THEME.accent : THEME.border,
              background: selected ? THEME.accent : THEME.card,
            }}
          >
            {selected && <CheckCircle2 className="h-4 w-4 text-white" />}
          </div>
        </div>
      )}

      <div className="aspect-square mb-2 rounded-lg overflow-hidden" style={{ background: THEME.hover }}>
        {isImage ? (
          <img
            src={file.storage_path || '#'}
            alt={file.filename}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FileIcon className="h-12 w-12" style={{ color: THEME.textSecondary }} />
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate" style={{ color: THEME.text }}>
            {file.filename}
          </div>
          {file.filesize && (
            <div className="text-xs" style={{ color: THEME.textSecondary }}>
              {formatFileSize(file.filesize)}
            </div>
          )}
        </div>
        <Star className="h-4 w-4 opacity-0 group-hover:opacity-40 transition-opacity" />
      </div>
    </div>
  );
}

interface FileListItemProps {
  file: {
    id: string;
    filename: string;
    mimetype?: string;
    filesize?: number;
    updated_at?: string;
    created_at: string;
  };
  selectable: boolean;
  selected: boolean;
  onToggle: () => void;
}

function FileListItem({ file, selectable, selected, onToggle }: FileListItemProps) {
  return (
    <div
      onClick={onToggle}
      className="flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-sm cursor-pointer"
      style={{
        borderColor: selected ? THEME.accent : THEME.border,
        background: THEME.card,
        ...(selected && { boxShadow: `0 0 0 2px ${THEME.accent}` }),
      }}
    >
      {selectable && (
        <div
          className="h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
          style={{
            borderColor: selected ? THEME.accent : THEME.border,
            background: selected ? THEME.accent : THEME.card,
          }}
        >
          {selected && <CheckCircle2 className="h-4 w-4 text-white" />}
        </div>
      )}

      <div className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: THEME.hover }}>
        <FileIcon className="h-5 w-5" style={{ color: THEME.textSecondary }} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate" style={{ color: THEME.text }}>
          {file.filename}
        </div>
        <div className="text-xs" style={{ color: THEME.textSecondary }}>
          {file.filesize && `${formatFileSize(file.filesize)} • `}
          {formatDate(file.updated_at || file.created_at)}
        </div>
      </div>

      <Star className="h-4 w-4 opacity-0 group-hover:opacity-40 transition-opacity flex-shrink-0" />
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}
