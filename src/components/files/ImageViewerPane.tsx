import { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Download, Share2, Maximize2 } from 'lucide-react';

interface ImageViewerPaneProps {
  imageUrl: string;
  fileName: string;
  onDownload?: () => void;
  onShare?: () => void;
  onMaximize?: () => void;
}

export default function ImageViewerPane({ 
  imageUrl, 
  fileName,
  onDownload,
  onShare,
  onMaximize
}: ImageViewerPaneProps) {
  const [zoom, setZoom] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);

  return (
    <div className="h-full flex flex-col bg-muted/30 overflow-hidden">
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

        {(onDownload || onShare || onMaximize) && (
          <>
            <div className="flex-1" />
            {onDownload && (
              <button
                onClick={onDownload}
                className="px-3 py-1 border rounded hover:bg-muted"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </button>
            )}
            {onShare && (
              <button
                onClick={onShare}
                className="px-3 py-1 border rounded hover:bg-muted"
                title="Share"
              >
                <Share2 className="h-4 w-4" />
              </button>
            )}
            {onMaximize && (
              <button
                onClick={onMaximize}
                className="px-3 py-1 border rounded hover:bg-muted"
                title="Maximize"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            )}
          </>
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
