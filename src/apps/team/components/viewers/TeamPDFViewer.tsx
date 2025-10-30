import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { pdfjs } from 'react-pdf';
import TeamPDFCanvas from './TeamPDFCanvas';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  Maximize2,
  Minimize2,
  Maximize
} from 'lucide-react';
import { logger } from '@/utils/logger';

// React-PDF v10.1.0 with PDF.js v5.3.93
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface TeamPDFViewerProps {
  file: any;
}

const TeamPDFViewer = ({ file }: TeamPDFViewerProps) => {
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
  const [fitWidthScale, setFitWidthScale] = useState(1.0);
  const [fitHeightScale, setFitHeightScale] = useState(1.0);
  const [fitPageScale, setFitPageScale] = useState(1.0);
  const [fitMode, setFitMode] = useState('height');
  const [scrollMode, setScrollMode] = useState<'centered' | 'continuous'>('centered');
  const prevFitScaleRef = useRef(1.0);
  const suppressFitAdjustRef = useRef(false);

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
    const src = `${import.meta.env.BASE_URL}sample-pdfs/${encodeURIComponent(file.name)}`;
    return src;
  }, [file, LOCAL_PDF_WHITELIST]);

  // Track viewer container size
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

  // Fit scaling
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

  useEffect(() => {
    setError(null);
    setLoading(true);
    setPageNumber(1);
    setRotation(0);
    setScale(1.0);
    setPageSize({ width: 0, height: 0 });
    setFitMode('height');
    setScrollMode('centered');
    prevFitScaleRef.current = 1.0;
  }, [documentFileSource, file]);

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
        logger.error('[TeamPDFViewer] PDF file fetch failed:', e);
        if (!aborted) setFetchStatus('error');
      }
    })();
    return () => { aborted = true; };
  }, [documentFileSource]);

  useEffect(() => {
    const isWorkerConfigured = !!pdfjs.GlobalWorkerOptions.workerSrc;
    setWorkerOk(isWorkerConfigured);
  }, []);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  };

  const onPageLoadSuccess = useCallback((page: any) => {
    const intrinsic = typeof page.rotate === 'number' ? page.rotate : 0;
    const viewport = page.getViewport({ scale: 1, rotation: intrinsic });
    setPageSize({ width: viewport.width, height: viewport.height });
  }, []);

  const onDocumentLoadError = (err: any) => {
    logger.error('[TeamPDFViewer] Document load error:', err);
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

  const handleZoomToFitWidth = useCallback(() => {
    setFitMode('width');
    setScale(fitWidthScale);
    prevFitScaleRef.current = fitWidthScale;
  }, [fitWidthScale]);

  const handleZoomToFitHeight = useCallback(() => {
    setFitMode('height');
    setScale(fitHeightScale);
    prevFitScaleRef.current = fitHeightScale;
  }, [fitHeightScale]);

  const handleZoomToFitPage = useCallback(() => {
    setFitMode('page');
    setScale(fitPageScale);
    prevFitScaleRef.current = fitPageScale;
  }, [fitPageScale]);

  const handleRotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  const handlePrevPage = useCallback(() => {
    setPageNumber(prev => Math.max(prev - 1, 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setPageNumber(prev => Math.min(prev + 1, numPages || 1));
  }, [numPages]);

  const handleDownload = useCallback(() => {
    // TODO: Implement download
  }, []);

  if (!file) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="text-muted-foreground text-[10px]">No PDF selected</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-background min-h-0 overflow-hidden h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1 bg-card border-b border-border flex-shrink-0">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          {numPages && (
            <button
              onClick={() => setScrollMode(prev => prev === 'centered' ? 'continuous' : 'centered')}
              className={`h-5 px-2 text-[11px] rounded hover:bg-muted ${scrollMode === 'continuous' ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
            >
              {scrollMode === 'centered' ? 'Single' : 'Continuous'}
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {numPages && (
            <>
              <button
                onClick={handlePrevPage}
                disabled={pageNumber <= 1}
                className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed text-muted-foreground"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-2 text-[11px] text-muted-foreground">
                {`${pageNumber} / ${numPages}`}
              </span>
              <button
                onClick={handleNextPage}
                disabled={pageNumber >= (numPages || 1)}
                className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed text-muted-foreground"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-1 flex-1 justify-end">
          {numPages && (
            <>
              <button onClick={handleZoomOut} className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground">
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="px-2 text-[11px] text-muted-foreground">{Math.round(scale * 100)}%</span>
              <button onClick={handleZoomIn} className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground">
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <div className="w-px h-4 bg-border mx-1" />
              <button onClick={handleZoomToFitWidth} className="h-5 px-2 text-[11px] rounded hover:bg-muted text-muted-foreground">Width</button>
              <button onClick={handleZoomToFitHeight} className="h-5 px-2 text-[11px] rounded hover:bg-muted text-muted-foreground">Height</button>
              <button onClick={handleZoomToFitPage} className="h-5 px-2 text-[11px] rounded hover:bg-muted text-muted-foreground">Page</button>
              <div className="w-px h-4 bg-border mx-1" />
              <button onClick={handleRotate} className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground">
                <RotateCw className="h-3.5 w-3.5" />
              </button>
              <button onClick={handleDownload} className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground">
                <Download className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* PDF Content */}
      {documentFileSource !== '__MISSING_LOCAL_PDF__' && (
        <TeamPDFCanvas
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
        />
      )}
      {documentFileSource === '__MISSING_LOCAL_PDF__' && (
        <div className="flex-1 flex items-center justify-center text-[10px] text-muted-foreground">
          PDF asset not included in demo build.
        </div>
      )}
    </div>
  );
};

export default TeamPDFViewer;
