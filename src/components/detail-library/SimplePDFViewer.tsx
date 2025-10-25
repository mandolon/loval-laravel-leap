import { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { logger } from '@/utils/logger';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface SimplePDFViewerProps {
  file: { url: string; name?: string };
  className?: string;
}

const SimplePDFViewer = ({ file, className = '' }: SimplePDFViewerProps) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewerSize, setViewerSize] = useState({ width: 0, height: 0 });
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [fitHeightScale, setFitHeightScale] = useState(1.0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const scrollStartRef = useRef({ left: 0, top: 0 });

  // Track container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setViewerSize({ width, height });
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Calculate fit-to-height scale
  useEffect(() => {
    if (!viewerSize.height || !pageSize.height) return;
    const availableHeight = Math.max(viewerSize.height - 32, 100);
    const heightFit = availableHeight / Math.max(pageSize.height, 1);
    setFitHeightScale(heightFit);
    setScale(heightFit);
  }, [viewerSize, pageSize]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  };

  const onPageLoadSuccess = useCallback((page: any) => {
    const viewport = page.getViewport({ scale: 1, rotation: 0 });
    setPageSize({ width: viewport.width, height: viewport.height });
  }, []);

  const onDocumentLoadError = (err: any) => {
    logger.error('[SimplePDFViewer] Load error:', err);
    setError(`Failed to load PDF: ${err?.message || 'Unknown error'}`);
    setLoading(false);
  };

  // Mouse wheel zoom (Ctrl/Cmd + wheel)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY;
        const factor = 1.1;
        
        setScale((prev) => {
          const newScale = delta < 0 ? prev * factor : prev / factor;
          return Math.max(fitHeightScale, Math.min(newScale, 5.0));
        });
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [fitHeightScale]);

  // Mouse drag pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale <= fitHeightScale) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    scrollStartRef.current = {
      left: containerRef.current?.scrollLeft || 0,
      top: containerRef.current?.scrollTop || 0,
    };
  }, [scale, fitHeightScale]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    containerRef.current.scrollLeft = scrollStartRef.current.left - dx;
    containerRef.current.scrollTop = scrollStartRef.current.top - dy;
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (error) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-auto ${className}`}
      onMouseDown={handleMouseDown}
      style={{ cursor: isDragging ? 'grabbing' : scale > fitHeightScale ? 'grab' : 'default' }}
    >
      <div className="flex items-center justify-center min-h-full p-4">
        <Document
          file={file.url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={<div className="text-muted-foreground">Loading PDF...</div>}
        >
          <Page
            pageNumber={1}
            scale={scale}
            onLoadSuccess={onPageLoadSuccess}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>
      </div>
    </div>
  );
};

export default SimplePDFViewer;
