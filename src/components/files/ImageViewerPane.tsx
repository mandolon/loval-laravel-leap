import { useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Download, Share2, Maximize2 } from 'lucide-react';

interface ImageViewerPaneProps {
  file: any;
  onClose?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  isActive?: boolean;
  onViewerStatus?: (status: any) => void;
  darkMode?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function ImageViewerPane({ 
  file,
  onClose,
  isFullscreen = false,
  onToggleFullscreen,
  isActive = false,
  onViewerStatus,
  darkMode = false,
  onClick,
  className = ''
}: ImageViewerPaneProps) {
  const imageUrl = file?.url || '';
  const fileName = file?.name || 'image.jpg';
  
  const [zoom, setZoom] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);

  useEffect(() => {
    if (onViewerStatus && file) {
      onViewerStatus({
        type: 'image',
        name: fileName,
        size: file.size,
        modified: file.modified,
        pixels: { width: 0, height: 0 }
      });
    }
  }, [onViewerStatus, file, fileName]);

  return (
    <div className={`h-full flex flex-col bg-muted/30 overflow-hidden ${className}`} onClick={onClick}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-background border-b flex-shrink-0">
        <button 
          onClick={() => setZoom(z => Math.max(0.5, z - 0.2))}
          className="px-3 py-1 border rounded hover:bg-muted"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        
        <span className="text-sm min-w-[60px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        
        <button 
          onClick={() => setZoom(z => Math.min(3.0, z + 0.2))}
          className="px-3 py-1 border rounded hover:bg-muted"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </button>

        <button 
          onClick={() => setRotation(r => (r + 90) % 360)}
          className="px-3 py-1 border rounded hover:bg-muted ml-2"
          title="Rotate"
        >
          <RotateCw className="h-4 w-4" />
        </button>

        <div className="flex-1" />

        {fileName && (
          <span className="text-sm text-muted-foreground truncate max-w-xs">
            {fileName}
          </span>
        )}

        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            className="px-3 py-1 border rounded hover:bg-muted"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Image Container */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        <img
          src={imageUrl}
          alt={fileName}
          className="max-w-full max-h-full object-contain shadow-lg"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transition: 'transform 0.2s ease-out'
          }}
        />
      </div>
    </div>
  );
}
