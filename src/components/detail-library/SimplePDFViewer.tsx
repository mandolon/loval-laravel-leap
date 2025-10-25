import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { pdfjs } from 'react-pdf';
import PDFCanvas from '../files/PDFCanvas';
import { logger } from '@/utils/logger';

// React-PDF v10.1.0 with PDF.js v5.3.93 - Updated to match embedded viewer
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure worker - use CDN for reliable cross-environment compatibility
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

logger.info('[SimplePDFViewer] PDF.js v5.3.93 worker configured with CDN and performance optimizations');

interface SimplePDFViewerProps {
  file: any;
  className?: string;
}

const SimplePDFViewer = ({ file, className = '' }: SimplePDFViewerProps) => {
  console.log('[SimplePDFViewer] Rendering with file:', file);
  
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1); // Locked to page 1
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0); // Locked to 0°
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchStatus, setFetchStatus] = useState('checking'); // checking | ok | missing | error
  const [workerOk, setWorkerOk] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewerSize, setViewerSize] = useState({ width: 0, height: 0 });
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  // Fit handling: support width, height, and page; default to height-fit on load
  const [fitWidthScale, setFitWidthScale] = useState(1.0);
  const [fitHeightScale, setFitHeightScale] = useState(1.0);
  const [fitPageScale, setFitPageScale] = useState(1.0);
  const [fitMode, setFitMode] = useState('height'); // 'width' | 'height' | 'page'
  const [scrollMode, setScrollMode] = useState<'centered' | 'continuous'>('centered'); // centered = single page centered, continuous = free scroll
  const prevFitScaleRef = useRef(1.0);
  const suppressFitAdjustRef = useRef(false);
  const hasSuppressedInitialFitRef = useRef(false);
  const skipAutoFitRef = useRef(false);

  // Use BASE_URL for proper path resolution in all environments
  // Whitelist the PDFs we actually ship locally to avoid attempting to load non-existent placeholders
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
      // We know this file does not exist locally; return a sentinel value
      return '__MISSING_LOCAL_PDF__';
    }
  // @ts-ignore - Vite injects import.meta.env at build time
  const src = `${import.meta.env.BASE_URL}sample-pdfs/${encodeURIComponent(file.name)}`;
    return src;
  }, [file, LOCAL_PDF_WHITELIST]);

  // Track viewer container size for proper fit calculations
  useEffect(() => {
    if (!containerRef.current) return;
    
    let resizeTimeout: ReturnType<typeof setTimeout>;
    let rafId: number;
    
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        
        // Debounce: only update state after resize stops for 150ms
        clearTimeout(resizeTimeout);
        if (rafId) cancelAnimationFrame(rafId);
        
        resizeTimeout = setTimeout(() => {
          rafId = requestAnimationFrame(() => {
            setViewerSize((prev) => {
              // Only update if dimensions actually changed significantly (>5px)
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

  // Fit scaling: compute width, height, and page fits; maintain relative zoom to the active fit mode
  useEffect(() => {
    if (!viewerSize.width || !pageSize.width || !pageSize.height) return;
    const PADDING_X = 0; // container uses p-0
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

    // If a manual zoom just happened (which may have toggled scrollbars and viewer size),
    // skip this cycle's proportional scale adjustment to avoid tiny flicker.
    if (suppressFitAdjustRef.current) {
      prevFitScaleRef.current = activeFit;
      suppressFitAdjustRef.current = false;
      return;
    }

    if (skipAutoFitRef.current) {
      prevFitScaleRef.current = activeFit;
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

  // Only reset state when documentFileSource actually changes (new file loaded)
  const prevDocSourceRef = useRef(documentFileSource);
  const hasInitializedRef = useRef(false);
  
  useEffect(() => {
    const docSourceChanged = prevDocSourceRef.current !== documentFileSource;
    prevDocSourceRef.current = documentFileSource;

    // Only reset if document source actually changed
    if (!docSourceChanged) {
      return;
    }

    hasInitializedRef.current = true;
    setError(null);
    setLoading(true);
    setPageNumber(1); // Always locked to page 1
    setRotation(0); // Always locked to 0°
    setScale(1.0);
    setPageSize({ width: 0, height: 0 });
    // Ensure new files start in fit-to-height mode
    setFitMode('height');
    setScrollMode('centered');
    prevFitScaleRef.current = 1.0;
    skipAutoFitRef.current = false;
  }, [documentFileSource, file]);

  // Add timeout to detect if Document component never initializes
  useEffect(() => {
    if (!loading || !documentFileSource) return;
    
    const timeoutId = setTimeout(() => {
      logger.warn('[SimplePDFViewer] Document loading timeout - no progress after 10 seconds:', {
        file: file?.name,
        documentFileSource,
        fetchStatus,
        loading,
        error
      });
    }, 10000);
    
    return () => clearTimeout(timeoutId);
  }, [loading, documentFileSource, fetchStatus, file?.name, error]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  };

  const onPageLoadSuccess = useCallback((page: any) => {
    // Respect the PDF's intrinsic rotation when measuring natural page size
    const intrinsic = typeof page.rotate === 'number' ? page.rotate : 0;
    const viewport = page.getViewport({ scale: 1, rotation: intrinsic });
    setPageSize({ width: viewport.width, height: viewport.height });
    if (!hasSuppressedInitialFitRef.current) {
      suppressFitAdjustRef.current = true;
      hasSuppressedInitialFitRef.current = true;
    }
  }, []);

  const onDocumentLoadError = (err: any) => {
    logger.error('[SimplePDFViewer] Document load error:', {
      error: err,
      message: err?.message,
      name: err?.name,
      file: file?.name,
      source: documentFileSource
    });
    
    setError(`Failed to load PDF file: ${err?.message || 'Unknown error'}`);
    setLoading(false);
  };

  // Comprehensive diagnostics - check if PDF file exists
  useEffect(() => {
    if (!documentFileSource) {
      setFetchStatus('no-source');
      return;
    }
    if (documentFileSource === '__MISSING_LOCAL_PDF__') {
      setFetchStatus('missing');
      return; // Don't attempt network request for something we know is absent
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
        logger.error('[SimplePDFViewer] PDF file fetch failed:', e);
        if (!aborted) setFetchStatus('error');
      }
    })();
    return () => { aborted = true; };
  }, [documentFileSource]);

  // Simple worker status check
  useEffect(() => {
    const isWorkerConfigured = !!pdfjs.GlobalWorkerOptions.workerSrc;
    setWorkerOk(isWorkerConfigured);
  }, []);

  // Compute active fit scale (for min zoom floor)
  const getActiveFitScale = useCallback(() => (
    fitMode === 'page' ? fitPageScale : (fitMode === 'width' ? fitWidthScale : fitHeightScale)
  ), [fitMode, fitPageScale, fitWidthScale, fitHeightScale]);

  // Anchor-preserving zoom at a given cursor location
  const zoomAt = useCallback((direction: 'in' | 'out', clientX?: number, clientY?: number) => {
    const container = containerRef.current;
    if (!container) return;

    const pageW = (rotation % 180 === 0) ? pageSize.width : pageSize.height;
    const pageH = (rotation % 180 === 0) ? pageSize.height : pageSize.width;
    if (!pageW || !pageH) return;

    const containerRect = container.getBoundingClientRect();
    const rawVx = clientX != null ? (clientX - containerRect.left) : (container.clientWidth / 2);
    const rawVy = clientY != null ? (clientY - containerRect.top) : (container.clientHeight / 2);
    const vx = Math.min(Math.max(rawVx, 0), container.clientWidth);
    const vy = Math.min(Math.max(rawVy, 0), container.clientHeight);

    const oldScale = scale;
    const factor = 1.2;
    const proposed = direction === 'in' ? oldScale * factor : oldScale / factor;
    const minScale = getActiveFitScale() * 0.5;
    const newScale = Math.min(6.0, Math.max(proposed, minScale));
    if (newScale === oldScale) return;

    const oldW = pageW * oldScale;
    const oldH = pageH * oldScale;
    const newW = pageW * newScale;
    const newH = pageH * newScale;

    const frames = Array.from(container.querySelectorAll<HTMLElement>('.pdf-page-frame'));
    let frame: HTMLElement | null = null;

    if (clientX != null && clientY != null && typeof document !== 'undefined' && document.elementsFromPoint) {
      const elementsAtPoint = document.elementsFromPoint(clientX, clientY);
      frame = elementsAtPoint.find((el): el is HTMLElement => (
        el instanceof HTMLElement && el.classList.contains('pdf-page-frame')
      )) ?? null;
    }

    if (!frame && frames.length) {
      frame = frames[0];
    }

    let frameLeft = 0;
    let frameTop = 0;
    let targetPageNumber = pageNumber;

    if (frame) {
      const frameRect = frame.getBoundingClientRect();
      frameLeft = frameRect.left - containerRect.left + container.scrollLeft;
      frameTop = frameRect.top - containerRect.top + container.scrollTop;
      const pageAttr = frame.dataset.pageNumber;
      const parsed = pageAttr ? parseInt(pageAttr, 10) : NaN;
      if (!Number.isNaN(parsed) && parsed > 0) {
        targetPageNumber = parsed;
      }
    } else {
      frameLeft = Math.max((container.scrollWidth - oldW) / 2, 0);
      frameTop = Math.max((targetPageNumber - 1) * oldH, 0);
    }

    const pointerInFrameX = container.scrollLeft + vx - frameLeft;
    const pointerInFrameY = container.scrollTop + vy - frameTop;
    const clampedPointerX = Math.min(Math.max(pointerInFrameX, 0), Math.max(oldW, 1));
    const clampedPointerY = Math.min(Math.max(pointerInFrameY, 0), Math.max(oldH, 1));
    const anchorRatioX = oldW > 0 ? clampedPointerX / oldW : 0.5;
    const anchorRatioY = oldH > 0 ? clampedPointerY / oldH : 0.5;

    suppressFitAdjustRef.current = true;
    setScale(newScale);

    const tolerance = 0.05;
    const maxAttempts = 30;

    const checkAndAdjustScroll = (attempts = 0) => {
      if (attempts > maxAttempts) {
        suppressFitAdjustRef.current = false;
        return;
      }

      let newFrame: HTMLElement | null = null;
      if (targetPageNumber) {
        newFrame = container.querySelector<HTMLElement>(`.pdf-page-frame[data-page-number="${targetPageNumber}"]`);
      }
      if (!newFrame) {
        newFrame = container.querySelector<HTMLElement>('.pdf-page-frame');
      }
      if (!newFrame) {
        suppressFitAdjustRef.current = false;
        return;
      }

      const updatedContainerRect = container.getBoundingClientRect();
      const newFrameRect = newFrame.getBoundingClientRect();

      if (Math.abs(newFrameRect.width - newW) > newW * tolerance ||
          Math.abs(newFrameRect.height - newH) > newH * tolerance) {
        requestAnimationFrame(() => checkAndAdjustScroll(attempts + 1));
        return;
      }

      const newFrameLeft = newFrameRect.left - updatedContainerRect.left + container.scrollLeft;
      const newFrameTop = newFrameRect.top - updatedContainerRect.top + container.scrollTop;

      const targetScrollLeft = newFrameLeft + (anchorRatioX * newW) - vx;
      const targetScrollTop = newFrameTop + (anchorRatioY * newH) - vy;

      const maxLeft = Math.max(container.scrollWidth - container.clientWidth, 0);
      const maxTop = Math.max(container.scrollHeight - container.clientHeight, 0);

      container.scrollLeft = Math.min(Math.max(targetScrollLeft, 0), maxLeft);
      container.scrollTop = Math.min(Math.max(targetScrollTop, 0), maxTop);

      suppressFitAdjustRef.current = false;
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        checkAndAdjustScroll();
      });
    });
  }, [containerRef, pageSize.width, pageSize.height, rotation, scale, pageNumber, getActiveFitScale]);

  // Shift + wheel to zoom-at-cursor (only when wheel occurs over the PDF container)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.shiftKey) return; // preserve default scrolling unless Shift is held
      e.preventDefault();
      const dir = e.deltaY < 0 ? 'in' : 'out';
      zoomAt(dir, e.clientX, e.clientY);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt, containerRef]);

  if (!file) {
    return (
      <div className="flex items-center justify-center h-full bg-background dark:bg-slate-900/30">
        <div className="text-muted-foreground text-[10px]">No PDF selected</div>
      </div>
    );
  }

  return (
    <div 
      className={`flex flex-col bg-background dark:bg-slate-900/30 min-h-0 overflow-hidden ${className}`}
    >
      {/* PDF Content (rotation passed here is user-applied only; intrinsic page rotation handled inside PDFCanvas/React-PDF) */}
      {documentFileSource !== '__MISSING_LOCAL_PDF__' && (
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

export default SimplePDFViewer;