import { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page } from 'react-pdf';
import { Download, Share2, Maximize2 } from 'lucide-react';
import '../../lib/pdf-config';

interface PDFViewerPaneProps {
  file: any;
  onClose?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  isFillPage?: boolean;
  onToggleFillPage?: () => void;
  isActive?: boolean;
  onViewerStatus?: (status: any) => void;
  darkMode?: boolean;
  onClick?: () => void;
  className?: string;
  initialState?: {
    pageNumber?: number;
    scale?: number;
    rotation?: number;
    scrollMode?: 'centered' | 'continuous';
    fitMode?: 'width' | 'height' | 'page';
    numPages?: number | null;
    pageSize?: { width: number; height: number };
    scrollPosition?: { left: number; top: number };
  };
  onStateChange?: (state: {
    pageNumber: number;
    scale: number;
    rotation: number;
    scrollMode: 'centered' | 'continuous';
    fitMode: 'width' | 'height' | 'page';
    numPages: number | null;
    pageSize: { width: number; height: number };
    scrollPosition: { left: number; top: number };
  }) => void;
}

export default function PDFViewerPane({ 
  file,
  onClose,
  isFullscreen = false,
  onToggleFullscreen,
  isFillPage = false,
  onToggleFillPage,
  isActive = false,
  onViewerStatus,
  darkMode = false,
  onClick,
  className = '',
  initialState,
  onStateChange
}: PDFViewerPaneProps) {
  const fileUrl = file?.url || '';
  const fileName = file?.name || 'document.pdf';
  
  const [numPages, setNumPages] = useState<number>(initialState?.numPages || 0);
  const [pageNumber, setPageNumber] = useState<number>(initialState?.pageNumber || 1);
  const [scale, setScale] = useState<number>(initialState?.scale || 1.0);
  const [pageWidth, setPageWidth] = useState<number>(800);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const measureAttempts = useRef(0);

  const updateWidth = useCallback(() => {
    if (!containerRef.current) return;
    
    const width = containerRef.current.clientWidth - 32;
    
    if (width > 0) {
      setPageWidth(width);
      measureAttempts.current = 0;
    } else if (measureAttempts.current < 10) {
      measureAttempts.current++;
      setTimeout(updateWidth, 100);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(updateWidth, 50);
    window.addEventListener('resize', updateWidth);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateWidth);
    };
  }, [updateWidth]);

  useEffect(() => {
    if (fileUrl) {
      setIsLoading(true);
      setTimeout(updateWidth, 100);
    }
  }, [fileUrl, updateWidth]);

  useEffect(() => {
    if (onViewerStatus) {
      onViewerStatus({ 
        type: 'pdf',
        name: fileName,
        size: file?.size,
        modified: file?.modified,
        pageNumber, 
        numPages, 
        scale,
        loading: isLoading
      });
    }
  }, [pageNumber, numPages, scale, isLoading, onViewerStatus, fileName, file]);

  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        pageNumber,
        scale,
        rotation: 0,
        scrollMode: 'centered',
        fitMode: 'width',
        numPages,
        pageSize: { width: pageWidth, height: 0 },
        scrollPosition: { left: 0, top: 0 }
      });
    }
  }, [pageNumber, scale, numPages, pageWidth]); // Removed onStateChange from deps to prevent infinite loop

  return (
    <div className={`h-full flex flex-col bg-muted/30 overflow-hidden ${className}`} onClick={onClick}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-background border-b flex-shrink-0">
        <button 
          onClick={() => setPageNumber(p => Math.max(1, p - 1))}
          disabled={pageNumber <= 1}
          className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-muted"
        >
          ← Prev
        </button>
        
        <span className="text-sm font-medium">
          Page {pageNumber} / {numPages || '?'}
        </span>
        
        <button 
          onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
          disabled={pageNumber >= numPages}
          className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-muted"
        >
          Next →
        </button>
        
        <div className="flex-1" />
        
        <button 
          onClick={() => setScale(s => Math.max(0.5, s - 0.2))}
          className="px-3 py-1 border rounded hover:bg-muted"
        >
          -
        </button>
        
        <span className="text-sm min-w-[60px] text-center">
          {Math.round(scale * 100)}%
        </span>
        
        <button 
          onClick={() => setScale(s => Math.min(3.0, s + 0.2))}
          className="px-3 py-1 border rounded hover:bg-muted"
        >
          +
        </button>

        {fileName && (
          <span className="ml-4 text-sm text-muted-foreground truncate max-w-xs">
            {fileName}
          </span>
        )}

        {onToggleFillPage && (
          <button
            onClick={onToggleFillPage}
            className="px-3 py-1 border rounded hover:bg-muted"
            title="Toggle Fill Page"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* PDF Container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto p-4"
      >
        <div className="min-h-full flex items-center justify-center">
          <Document
            file={fileUrl}
            onLoadSuccess={({ numPages }) => {
              setNumPages(numPages);
              setIsLoading(false);
              setTimeout(updateWidth, 50);
            }}
            onLoadError={(error) => {
              console.error('❌ PDF load error:', error);
              setIsLoading(false);
            }}
            loading={
              <div className="text-muted-foreground text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-2" />
                <div>Loading PDF...</div>
              </div>
            }
            error={
              <div className="text-destructive text-center">
                <div className="text-4xl mb-2">⚠️</div>
                <div>Failed to load PDF</div>
                <div className="text-sm mt-2">Check console for details</div>
              </div>
            }
          >
            <Page 
              pageNumber={pageNumber}
              width={pageWidth * scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              loading={<div className="text-muted-foreground">Loading page...</div>}
              className="shadow-lg"
            />
          </Document>
        </div>
      </div>
    </div>
  );
}
