import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { pdfjs } from 'react-pdf';
import PDFCanvas from './PDFCanvas';
import { PDFAnnotationLayer } from './PDFAnnotationLayer';
import { AnnotationToolbar } from './AnnotationToolbar';
import { useAnnotationTools } from '@/hooks/useAnnotationTools';
import { useGridSnapping } from '@/hooks/useGridSnapping';
import type { GridSizeKey } from '@/types/annotations';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  ChevronLeft, 
  ChevronRight,
} from 'lucide-react';
import { logger } from '@/utils/logger';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure worker - use CDN for reliable cross-environment compatibility
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

logger.info('[AnnotationEditorModal] PDF.js worker configured');

interface AnnotationEditorModalProps {
  file: any;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (annotations: any) => void;
}

export const AnnotationEditorModal = ({
  file,
  isOpen,
  onClose,
  onSave,
}: AnnotationEditorModalProps) => {
  // Debugging state
  const modalMountIdRef = useRef(Math.random().toString(36).slice(2, 8));
  const renderCountRef = useRef(0);
  const MODAL_ID = modalMountIdRef.current;

  // PDF Viewer State (copied from PDFViewer)
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchStatus, setFetchStatus] = useState('checking');
  const [workerOk, setWorkerOk] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewerSize, setViewerSize] = useState({ width: 0, height: 0 });
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [pdfPage, setPdfPage] = useState<any>(null); // Store real PDF.js page object
  const [fitWidthScale, setFitWidthScale] = useState(1.0);
  const [fitHeightScale, setFitHeightScale] = useState(1.0);
  const [fitPageScale, setFitPageScale] = useState(1.0);
  const [fitMode, setFitMode] = useState('height');
  const scrollMode = 'centered'; // Force centered mode for annotations
  const prevFitScaleRef = useRef(1.0);
  const suppressFitAdjustRef = useRef(false);

  // Annotation State
  const [gridSize, setGridSize] = useState<GridSizeKey>('12"');
  const [gridVisible, setGridVisible] = useState(true);
  const annotationTools = useAnnotationTools();
  const { snapToPdfGrid } = useGridSnapping(gridSize, gridVisible);

  // ===== COMPREHENSIVE PARENT TRACKING =====
  
  // Track every render
  renderCountRef.current++;
  console.log(`[AnnotationEditorModal:${MODAL_ID}] 🔄 RENDER #${renderCountRef.current}`, {
    isOpen,
    hasFile: !!file,
    fileName: file?.name,
    loading,
    error,
    scale,
    rotation,
    pageSizeWidth: pageSize.width,
    timestamp: new Date().toISOString(),
  });

  // Track mount/unmount
  useEffect(() => {
    console.log(`[AnnotationEditorModal:${MODAL_ID}] ✅ MOUNTED`);
    return () => {
      console.log(`[AnnotationEditorModal:${MODAL_ID}] ❌ UNMOUNTING`);
    };
  }, [MODAL_ID]);

  // Track state changes that might cause re-renders
  useEffect(() => {
    console.log(`[AnnotationEditorModal:${MODAL_ID}] 📊 State changed`, {
      loading,
      error: error ? 'exists' : 'null',
      scale,
      rotation,
      pageSize: pageSize.width > 0 ? `${pageSize.width}x${pageSize.height}` : 'not set',
    });
  }, [loading, error, scale, rotation, pageSize, MODAL_ID]);

  // File source logic (copied from PDFViewer)
  const LOCAL_PDF_WHITELIST = useMemo(() => new Set([
    'test.pdf'.toLowerCase(),
    'One Chat Journal.pdf'.toLowerCase(),
    'sample-pdf.pdf'.toLowerCase()
  ]), []);

  const documentFileSource = useMemo(() => {
    if (!file?.name) return null;
    if (file.url) {
      return file.url;
    }
    if (!LOCAL_PDF_WHITELIST.has(file.name.toLowerCase())) {
      return '__MISSING_LOCAL_PDF__';
    }
    // @ts-ignore - Vite injects import.meta.env at build time
    const src = `${import.meta.env.BASE_URL}sample-pdfs/${encodeURIComponent(file.name)}`;
    return src;
  }, [file, LOCAL_PDF_WHITELIST]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPageNumber(1);
      setNumPages(null);
      setError(null);
      setLoading(true);
      setRotation(0);
      setScale(1.0);
      setPageSize({ width: 0, height: 0 });
      setFitMode('height');
      prevFitScaleRef.current = 1.0;
      annotationTools.clearAll();
    }
  }, [isOpen]);

  // Track viewer container size for proper fit calculations
  useEffect(() => {
    if (!containerRef.current) return;
    
    let resizeTimeout: ReturnType<typeof setTimeout>;
    let rafId: number;
    
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        
        clearTimeout(resizeTimeout);
        if (rafId) cancelAnimationFrame(rafId);
        
        resizeTimeout = setTimeout(() => {
          rafId = requestAnimationFrame(() => {
            setViewerSize((prev) => {
              if (Math.abs(prev.width - width) > 5 || Math.abs(prev.height - height) > 5) {
                return { width, height };
              }
              return prev;
            });
          });
        }, 150);
      }
    });
    
    resizeObserver.observe(containerRef.current);
    return () => {
      resizeObserver.disconnect();
      clearTimeout(resizeTimeout);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // Fit scaling: compute width, height, and page fits
  useEffect(() => {
    if (!viewerSize.width || !pageSize.width || !pageSize.height) return;
    const PADDING_X = 0;
    const PADDING_Y = 0;

    const availableWidth = Math.max(viewerSize.width - PADDING_X, 100);
    const availableHeight = Math.max(viewerSize.height - PADDING_Y, 100);

    const pageW = (rotation % 180 === 0) ? pageSize.width : pageSize.height;
    const pageH = (rotation % 180 === 0) ? pageSize.height : pageSize.width;

    const widthFit = availableWidth / Math.max(pageW, 1);
    const heightFit = availableHeight / Math.max(pageH, 1);
    const pageFit = Math.min(widthFit, heightFit);

    setFitWidthScale(widthFit);
    setFitHeightScale(heightFit);
    setFitPageScale(pageFit);

    const activeFit = fitMode === 'page' ? pageFit : (fitMode === 'width' ? widthFit : heightFit);
    const prevFit = prevFitScaleRef.current || activeFit;

    if (suppressFitAdjustRef.current) {
      prevFitScaleRef.current = activeFit;
      suppressFitAdjustRef.current = false;
      return;
    }

    setScale(prev => {
      const next = (prev === 1.0 && prevFit === 1.0)
        ? activeFit
        : prev * (activeFit / prevFit);
      return Math.max(next, 0.1);
    });
    prevFitScaleRef.current = activeFit;
  }, [viewerSize, pageSize, rotation, fitMode]);

  // Check if PDF file exists
  useEffect(() => {
    if (!documentFileSource) {
      setFetchStatus('no-source');
      return;
    }
    if (documentFileSource === '__MISSING_LOCAL_PDF__') {
      setFetchStatus('missing');
      return;
    }
    if (documentFileSource.startsWith('blob:') || documentFileSource.startsWith('data:')) {
      setFetchStatus('ok');
      return;
    }
    
    let aborted = false;
    setFetchStatus('checking');
    
    (async () => {
      try {
        const resp = await fetch(documentFileSource, { method: 'HEAD' });
        if (aborted) return;
        
        if (resp.ok) {
          setFetchStatus('ok');
        } else if (resp.status === 404) {
          setFetchStatus('missing');
        } else {
          setFetchStatus('error');
        }
      } catch (e) {
        logger.error('[AnnotationEditorModal] PDF file fetch failed:', e);
        if (!aborted) setFetchStatus('error');
      }
    })();
    return () => { aborted = true; };
  }, [documentFileSource]);

  // Worker status check
  useEffect(() => {
    const isWorkerConfigured = !!pdfjs.GlobalWorkerOptions.workerSrc;
    setWorkerOk(isWorkerConfigured);
  }, []);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    console.log('[AnnotationEditorModal] PDF loaded successfully, pages:', numPages);
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  };

  const onPageLoadSuccess = useCallback((page: any) => {
    setPdfPage(page); // Store the real page object
    const intrinsic = typeof page.rotate === 'number' ? page.rotate : 0;
    const viewport = page.getViewport({ scale: 1, rotation: intrinsic });
    const newPageSize = { width: viewport.width, height: viewport.height };
    
    console.log('[AnnotationEditorModal] Page loaded, setting size', {
      newPageSize,
      scale,
      computedViewport: {
        width: newPageSize.width * scale,
        height: newPageSize.height * scale
      }
    });
    
    setPageSize(newPageSize);
  }, [scale]);

  const onDocumentLoadError = (err: any) => {
    logger.error('[AnnotationEditorModal] Document load error:', {
      error: err,
      message: err?.message,
      name: err?.name,
      file: file?.name,
      source: documentFileSource
    });
    
    setError(`Failed to load PDF file: ${err?.message || 'Unknown error'}`);
    setLoading(false);
  };

  const handleZoomIn = useCallback(() => {
    suppressFitAdjustRef.current = true;
    setScale(prev => Math.min(prev * 1.2, 6.0));
    requestAnimationFrame(() => { suppressFitAdjustRef.current = false; });
  }, []);

  const handleZoomOut = useCallback(() => {
    suppressFitAdjustRef.current = true;
    setScale(prev => {
      const activeFit = fitMode === 'page' ? fitPageScale : (fitMode === 'width' ? fitWidthScale : fitHeightScale);
      const newScale = prev / 1.2;
      return Math.max(newScale, activeFit * 0.5);
    });
    requestAnimationFrame(() => { suppressFitAdjustRef.current = false; });
  }, [fitMode, fitPageScale, fitWidthScale, fitHeightScale]);

  const handleRotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  const handlePrevPage = useCallback(() => {
    setPageNumber(prev => Math.max(prev - 1, 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setPageNumber(prev => Math.min(prev + 1, numPages || 1));
  }, [numPages]);

  const handleSave = () => {
    if (onSave) {
      onSave(annotationTools.annotations);
    }
    toast.success('Annotations saved');
    onClose();
  };

  const handleCancel = () => {
    annotationTools.clearAll();
    onClose();
  };

  // Calculate real PDF.js viewport (CRITICAL: must have convertToPdfPoint method)
  const computedViewport = useMemo(() => {
    if (!pdfPage) return null;
    const intrinsic = typeof pdfPage.rotate === 'number' ? pdfPage.rotate : 0;
    return pdfPage.getViewport({ scale, rotation: intrinsic + rotation });
  }, [pdfPage, scale, rotation]);

  console.log('[AnnotationEditorModal] Rendering modal, isOpen:', isOpen, 'file:', file, 'documentFileSource:', documentFileSource);

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Edit Annotations - {file?.name}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {/* Annotation Toolbar */}
          <div className="px-6 py-3 border-b bg-muted/30">
            <AnnotationToolbar
              currentTool={annotationTools.activeTool}
              onToolChange={annotationTools.setActiveTool}
              currentColor={annotationTools.activeColor}
              onColorChange={annotationTools.setActiveColor}
              currentStrokeWidth={annotationTools.strokeWidth}
              onStrokeWidthChange={annotationTools.setStrokeWidth}
              currentGridSize={gridSize}
              onGridSizeChange={setGridSize}
              gridVisible={gridVisible}
              onGridToggle={setGridVisible}
              onUndo={() => annotationTools.undo(null, null)}
              onRedo={() => annotationTools.redo(null, null)}
              onSave={handleSave}
            />
          </div>

          {/* PDF Viewer Controls (copied from PDFViewer) */}
          <div className="flex items-center justify-between px-3 py-1 bg-card border-b border-border flex-shrink-0">
            {/* Left section - empty for now */}
            <div className="flex items-center gap-1 min-w-0 flex-1">
            </div>
            
            {/* Center section - Page navigation */}
            <div className="flex items-center gap-1">
              {numPages && (
                <>
                  <button
                    onClick={handlePrevPage}
                    disabled={pageNumber <= 1}
                    className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed text-muted-foreground"
                    title="Previous page"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="px-2 text-[11px] text-muted-foreground min-w-max flex items-center">
                    {`${pageNumber} / ${numPages}`}
                  </span>
                  <button
                    onClick={handleNextPage}
                    disabled={pageNumber >= (numPages || 1)}
                    className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed text-muted-foreground"
                    title="Next page"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
            
            {/* Right section - Zoom and Rotate */}
            <div className="flex items-center gap-1 flex-1 justify-end">
              {numPages && (
                <>
                  <button
                    onClick={handleZoomOut}
                    className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
                    title="Zoom out"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <span className="px-2 text-[11px] text-muted-foreground min-w-max flex items-center">
                    {Math.round(scale * 100)}%
                  </span>
                  <button
                    onClick={handleZoomIn}
                    className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
                    title="Zoom in"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                  <div className="w-px h-4 bg-border mx-1" />
                  <button
                    onClick={handleRotate}
                    className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
                    title="Rotate"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

        {/* PDF Content (using PDFCanvas like PDFViewer) */}
        <div className="relative flex-1 min-h-0">
          {documentFileSource !== '__MISSING_LOCAL_PDF__' && (
            <>
              <PDFCanvas
                ref={containerRef}
                file={file}
                pageNumber={pageNumber}
                scale={scale}
                rotation={rotation}
                fetchStatus={fetchStatus}
                loading={loading}
                error={error}
                documentFileSource={documentFileSource === '__MISSING_LOCAL_PDF__' ? null : documentFileSource}
                workerOk={workerOk}
                onDocumentLoadSuccess={onDocumentLoadSuccess}
                onDocumentLoadError={onDocumentLoadError}
                onPageLoadSuccess={onPageLoadSuccess}
                viewerSize={viewerSize}
                pageSize={pageSize}
                numPages={numPages}
                scrollMode={scrollMode}
                annotationMode={true}
              />
              
              {/* Annotation Layer - positioned absolutely over the PDF */}
              {(() => {
                const shouldRender = !loading && !error && computedViewport !== null;
                if (shouldRender) {
                  console.log(`[AnnotationEditorModal:${MODAL_ID}] ✅ About to render PDFAnnotationLayer`, {
                    loading,
                    error,
                    pageSize,
                    scale,
                    viewport: computedViewport ? {
                      width: computedViewport.width,
                      height: computedViewport.height
                    } : null
                  });
                  return (
                    <PDFAnnotationLayer
                      pageNumber={pageNumber}
                      pdfPage={pdfPage}
                      scale={scale}
                      rotation={rotation}
                      visible={true}
                      viewport={computedViewport}
                    />
                  );
                } else {
                  console.log(`[AnnotationEditorModal:${MODAL_ID}] ⚠️  NOT rendering PDFAnnotationLayer`, {
                    loading,
                    error,
                    hasViewport: computedViewport !== null
                  });
                  return null;
                }
              })()}
            </>
          )}
          {documentFileSource === '__MISSING_LOCAL_PDF__' && (
            <div className="flex-1 flex items-center justify-center text-[10px] text-muted-foreground">
              PDF asset not included in demo build.
            </div>
          )}
        </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Annotations</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
