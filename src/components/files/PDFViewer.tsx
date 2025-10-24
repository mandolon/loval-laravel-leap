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
  Download, 
  ChevronLeft, 
  ChevronRight,
  Maximize2,
  Minimize2,
  Maximize,
  PenTool
} from 'lucide-react';
import { logger } from '@/utils/logger';

// React-PDF v10.1.0 with PDF.js v5.3.93 - Updated to match embedded viewer
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure worker - use CDN for reliable cross-environment compatibility
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

logger.info('[PDFViewer] PDF.js v5.3.93 worker configured with CDN and performance optimizations');

interface PDFViewerProps {
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
  annotationMode?: boolean;
  onAnnotationModeChange?: (mode: boolean) => void;
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

const PDFViewer = ({ 
  file, 
  onClose, 
  isFullscreen = false, 
  onToggleFullscreen, 
  isFillPage = false,
  onToggleFillPage, 
  isActive = false, 
  onViewerStatus, 
  darkMode: _darkMode = false, 
  onClick, 
  className = '',
  annotationMode = false,
  onAnnotationModeChange,
  initialState,
  onStateChange
}: PDFViewerProps) => {
  console.log('[PDFViewer] Rendering with file:', file)
  console.log('[PDFViewer] isActive:', isActive, 'isFullscreen:', isFullscreen)
  
  const [numPages, setNumPages] = useState<number | null>(initialState?.numPages ?? null);
  const [pageNumber, setPageNumber] = useState(initialState?.pageNumber ?? 1);
  const [scale, setScale] = useState(initialState?.scale ?? 1.0);
  const [rotation, setRotation] = useState(initialState?.rotation ?? 0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchStatus, setFetchStatus] = useState('checking'); // checking | ok | missing | error
  const [workerOk, setWorkerOk] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewerSize, setViewerSize] = useState({ width: 0, height: 0 });
  const [pageSize, setPageSize] = useState(initialState?.pageSize ?? { width: 0, height: 0 });
  // Fit handling: support width, height, and page; default to height-fit on load
  const [fitWidthScale, setFitWidthScale] = useState(1.0);
  const [fitHeightScale, setFitHeightScale] = useState(1.0);
  const [fitPageScale, setFitPageScale] = useState(1.0);
  const [fitMode, setFitMode] = useState(initialState?.fitMode ?? 'height'); // 'width' | 'height' | 'page'
  const [scrollMode, setScrollMode] = useState<'centered' | 'continuous'>(initialState?.scrollMode ?? 'centered'); // centered = single page centered, continuous = free scroll
  const prevFitScaleRef = useRef(1.0);
  const suppressFitAdjustRef = useRef(initialState ? true : false);
  const hasSuppressedInitialFitRef = useRef(false);
  const hasInitialState = Boolean(initialState);
  const skipAutoFitRef = useRef(Boolean(initialState));

  // Annotation mode state
  const [previousScrollMode, setPreviousScrollMode] = useState<'centered' | 'continuous'>('centered');
  const [gridSize, setGridSize] = useState<GridSizeKey>('12"');
  const [gridVisible, setGridVisible] = useState(true);
  const [pdfPageRef, setPdfPageRef] = useState<any>(null);
  const [currentViewport, setCurrentViewport] = useState<any>(null);
  
  const annotationTools = useAnnotationTools();
  const { snapToPdfGrid } = useGridSnapping(gridSize, gridVisible);

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

  // Restore scroll position when tab becomes active and initial state is provided
  const scrollRestoredRef = useRef(false);
  useEffect(() => {
    if (!containerRef.current || !initialState?.scrollPosition) return;
    if (!numPages || loading) return; // Wait until document is loaded
    if (scrollRestoredRef.current) return; // Only restore once
    
    const container = containerRef.current;
    const { left, top } = initialState.scrollPosition;
    
    // Restore scroll position after a short delay to ensure layout is ready
    const timeoutId = setTimeout(() => {
      container.scrollLeft = left;
      container.scrollTop = top;
      scrollRestoredRef.current = true;
    }, 50);
    
    return () => clearTimeout(timeoutId);
  }, [initialState?.scrollPosition, numPages, loading]);

  // Report state changes back to parent for caching
  const lastReportedStateRef = useRef<string>('');

  useEffect(() => {
    hasSuppressedInitialFitRef.current = false;
    suppressFitAdjustRef.current = hasInitialState ? true : false;
    scrollRestoredRef.current = false;
    lastReportedStateRef.current = '';
    skipAutoFitRef.current = hasInitialState;
  }, [documentFileSource, hasInitialState]);
  useEffect(() => {
    if (!onStateChange) return;
    
    const container = containerRef.current;
    const scrollPosition = container
      ? { left: container.scrollLeft, top: container.scrollTop }
      : { left: 0, top: 0 };
    
    const state = {
      pageNumber,
      scale,
      rotation,
      scrollMode,
      fitMode,
      numPages,
      pageSize,
      scrollPosition
    };
    
    // Prevent redundant updates by comparing serialized state
    const stateStr = JSON.stringify(state);
    if (stateStr === lastReportedStateRef.current) return;
    lastReportedStateRef.current = stateStr;
    
    onStateChange(state);
  }, [pageNumber, scale, rotation, scrollMode, fitMode, numPages, pageSize, onStateChange]);

  // Track scroll position changes for state caching
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !onStateChange) return;

    let rafId: number | null = null;
    let isActive = true;
    
    const handleScroll = () => {
      if (rafId || !isActive) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (onStateChange && isActive) {
          const state = {
            pageNumber,
            scale,
            rotation,
            scrollMode,
            fitMode,
            numPages,
            pageSize,
            scrollPosition: {
              left: container.scrollLeft,
              top: container.scrollTop
            }
          };
          
          // Check if state actually changed
          const stateStr = JSON.stringify(state);
          if (stateStr !== lastReportedStateRef.current) {
            lastReportedStateRef.current = stateStr;
            onStateChange(state);
          }
        }
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      isActive = false;
      container.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [pageNumber, scale, rotation, scrollMode, fitMode, numPages, pageSize, onStateChange]);

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

  // If the real fetch fails for the special sample file, we'll swap to embedded; react-pdf doesn't expose direct onError for file fetch
  // so we rely on onDocumentLoadError handler to detect a network issue (status 404) and then retry with embedded.
  // Only reset state when documentFileSource actually changes (new file loaded)
  const prevDocSourceRef = useRef(documentFileSource);
  const hasInitializedRef = useRef(false);
  
  useEffect(() => {
    const docSourceChanged = prevDocSourceRef.current !== documentFileSource;
    prevDocSourceRef.current = documentFileSource;

    // If we have initial state and this is the first mount, just use cached state
    if (!hasInitializedRef.current && initialState) {
      hasInitializedRef.current = true;
      setLoading(initialState.numPages ? false : true);
      skipAutoFitRef.current = true;
      return;
    }

    // Only reset if document source actually changed
    if (!docSourceChanged) {
      return;
    }

    hasInitializedRef.current = true;
    setError(null);
    setLoading(true);
    setPageNumber(initialState?.pageNumber ?? 1);
    setRotation(initialState?.rotation ?? 0);
    setScale(initialState?.scale ?? 1.0);
    setPageSize(initialState?.pageSize ?? { width: 0, height: 0 });
    // Ensure new files start in fit-to-height mode
    setFitMode(initialState?.fitMode ?? 'height');
    setScrollMode(initialState?.scrollMode ?? 'centered');
    prevFitScaleRef.current = 1.0;
    skipAutoFitRef.current = Boolean(initialState);
  }, [documentFileSource, file, initialState]);

  // Add timeout to detect if Document component never initializes
  useEffect(() => {
    if (!loading || !documentFileSource) return;
    
    const timeoutId = setTimeout(() => {
      logger.warn('[PDFViewer] Document loading timeout - no progress after 10 seconds:', {
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
    if (initialState && !hasSuppressedInitialFitRef.current) {
      suppressFitAdjustRef.current = true;
      hasSuppressedInitialFitRef.current = true;
    }
    if (onViewerStatus) {
      onViewerStatus({
        type: 'pdf',
        pixels: { width: Math.round(viewport.width), height: Math.round(viewport.height) },
        size: file?.size,
        modified: file?.modified,
        name: file?.name,
        pageNumber,
        numPages
      });
    }
  }, [onViewerStatus, file, pageNumber, numPages, initialState]);

  const onDocumentLoadError = (err: any) => {
    logger.error('[PDFViewer] Document load error:', {
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
    
    // Skip fetch check if we have cached state (tab switch scenario)
    if (initialState?.numPages) {
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
        logger.error('[PDFViewer] PDF file fetch failed:', e);
        if (!aborted) setFetchStatus('error');
      }
    })();
    return () => { aborted = true; };
  }, [documentFileSource, initialState?.numPages]);

  // Simple worker status check
  useEffect(() => {
    const isWorkerConfigured = !!pdfjs.GlobalWorkerOptions.workerSrc;
    setWorkerOk(isWorkerConfigured);
  }, []);

  const handleZoomIn = useCallback(() => {
    skipAutoFitRef.current = false;
    suppressFitAdjustRef.current = true;
    setScale(prev => Math.min(prev * 1.2, 6.0));
    // Clear suppression on next frame in case no viewerSize change occurs
    requestAnimationFrame(() => { suppressFitAdjustRef.current = false; });
  }, []);

  const handleZoomOut = useCallback(() => {
    skipAutoFitRef.current = false;
    suppressFitAdjustRef.current = true;
    setScale(prev => {
      const activeFit = fitMode === 'page' ? fitPageScale : (fitMode === 'width' ? fitWidthScale : fitHeightScale);
      const newScale = prev / 1.2;
      return Math.max(newScale, activeFit * 0.5);
    });
    requestAnimationFrame(() => { suppressFitAdjustRef.current = false; });
  }, [fitMode, fitPageScale, fitWidthScale, fitHeightScale]);

  const handleZoomToFitWidth = useCallback(() => {
    skipAutoFitRef.current = false;
    setFitMode('width');
    setScale(fitWidthScale);
    prevFitScaleRef.current = fitWidthScale;
  }, [fitWidthScale]);

  const handleZoomToFitHeight = useCallback(() => {
    skipAutoFitRef.current = false;
    setFitMode('height');
    setScale(fitHeightScale);
    prevFitScaleRef.current = fitHeightScale;
  }, [fitHeightScale]);

  const handleZoomToFitPage = useCallback(() => {
    skipAutoFitRef.current = false;
    setFitMode('page');
    setScale(fitPageScale);
    prevFitScaleRef.current = fitPageScale;
  }, [fitPageScale]);

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

  // Keyboard zoom: Shift + '+' to zoom in, Shift + '-' to zoom out
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return; // only when PDF viewer is active
      // Avoid interfering with form inputs or contenteditable
      const target = e.target as HTMLElement;
      const isTyping = target && (
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
      );
      if (isTyping) return;
      if (e.shiftKey && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        handleZoomIn();
      } else if (e.shiftKey && (e.key === '_' || e.key === '-')) {
        e.preventDefault();
        handleZoomOut();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isActive, handleZoomIn, handleZoomOut]);

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
    // TODO: Implement actual download functionality
  }, [file]);

  // Keyboard page nav: Shift + ArrowLeft/Right (placed after handlePrevPage/handleNextPage definitions)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return;
      const target = e.target as HTMLElement;
      const isTyping = target && (
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
      );
      if (isTyping) return;

      if (e.shiftKey && e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextPage();
      } else if (e.shiftKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevPage();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isActive, handleNextPage, handlePrevPage]);

  // Keyboard panning: Arrow keys scroll the zoomed PDF content
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return;
      if (e.shiftKey) return; // Shift+Arrows are reserved for page nav
      const isArrow = e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight';
      if (!isArrow) return;

      const target = e.target as HTMLElement;
      const isTyping = target && (
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
      );
      if (isTyping) return;

      const el = containerRef.current;
      if (!el) return;

      const stepV = Math.max(Math.round(el.clientHeight * 0.15), 24); // vertical step ~15% viewport
      const stepH = Math.max(Math.round(el.clientWidth * 0.15), 24);  // horizontal step ~15% viewport

      const canScrollVertically = el.scrollHeight > el.clientHeight + 1;
      const canScrollHorizontally = el.scrollWidth > el.clientWidth + 1;

      if (e.key === 'ArrowUp') {
        if (!canScrollVertically) return;
        e.preventDefault();
        el.scrollTop = Math.max(0, el.scrollTop - stepV);
      } else if (e.key === 'ArrowDown') {
        if (!canScrollVertically) return;
        e.preventDefault();
        el.scrollTop = Math.min(el.scrollHeight - el.clientHeight, el.scrollTop + stepV);
      } else if (e.key === 'ArrowLeft') {
        if (!canScrollHorizontally) return;
        e.preventDefault();
        el.scrollLeft = Math.max(0, el.scrollLeft - stepH);
      } else if (e.key === 'ArrowRight') {
        if (!canScrollHorizontally) return;
        e.preventDefault();
        el.scrollLeft = Math.min(el.scrollWidth - el.clientWidth, el.scrollLeft + stepH);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isActive]);

  if (!file) {
    return (
      <div className="flex items-center justify-center h-full bg-background dark:bg-slate-900/30">
        <div className={`text-muted-foreground text-[10px]`}>No PDF selected</div>
      </div>
    );
  }

  return (
    <div 
      className={`flex flex-col bg-background dark:bg-slate-900/30 min-h-0 overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50' : ''} ${className}`}
      onClick={onClick}
    >
      {/* Toolbar (compact) */}
  <div className={`flex items-center justify-between px-3 py-1 bg-card border-b border-border flex-shrink-0`}>
        {/* Left section - Scroll Mode Toggle */}
        <div className="flex items-center gap-1 min-w-0 flex-1">
          {numPages && (
            <>
              {/* Annotate Button */}
              <button
                onClick={() => onAnnotationModeChange?.(!annotationMode)}
                className={`h-5 px-2 text-[11px] rounded hover:bg-muted flex items-center gap-1 ${annotationMode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                title={annotationMode ? 'Exit annotation mode' : 'Enter annotation mode'}
              >
                <PenTool className="h-3 w-3" />
                {annotationMode ? 'Annotating' : 'Annotate'}
              </button>
              
              {/* Scroll Mode Toggle */}
              <button
                onClick={() => setScrollMode(prev => prev === 'centered' ? 'continuous' : 'centered')}
                disabled={annotationMode}
                className={`h-5 px-2 text-[11px] rounded hover:bg-muted ${scrollMode === 'continuous' ? 'bg-muted text-foreground' : 'text-muted-foreground'} ${annotationMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={annotationMode ? 'Disabled during annotation' : (scrollMode === 'centered' ? 'Switch to continuous scrolling' : 'Switch to single-page mode')}
              >
                {scrollMode === 'centered' ? 'Single' : 'Continuous'}
              </button>
            </>
          )}
        </div>
        
        {/* Center section - Page navigation */}
        <div className="flex items-center gap-1">
          {numPages && (
            <>
              {/* Navigation */}
              <button
                onClick={handlePrevPage}
                disabled={pageNumber <= 1}
                className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed text-muted-foreground"
                title="Previous page (Shift+←)"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className={`px-2 text-[11px] text-muted-foreground min-w-max flex items-center`}>
                {`${pageNumber} / ${numPages}`}
              </span>
              <button
                onClick={handleNextPage}
                disabled={pageNumber >= (numPages || 1)}
                className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed text-muted-foreground"
                title="Next page (Shift+→)"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
        
        {/* Right section - Fill buttons and other controls */}
        <div className="flex items-center gap-1 flex-1 justify-end">
          {numPages && (
            <>
              {/* Zoom Controls */}
              <button
                onClick={handleZoomOut}
                className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
                title="Zoom out (-)"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className={`px-2 text-[11px] text-muted-foreground min-w-max flex items-center`}>
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
                title="Zoom in (+)"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <div className="w-px h-4 bg-border mx-1" />
              <button
                onClick={handleZoomToFitWidth}
                className={`h-5 px-2 text-[11px] rounded hover:bg-muted text-muted-foreground`}
                title="Fit to width"
              >
                Width
              </button>
              <button
                onClick={handleZoomToFitHeight}
                className={`h-5 px-2 text-[11px] rounded hover:bg-muted text-muted-foreground`}
                title="Fit to height"
              >
                Height
              </button>
              <button
                onClick={handleZoomToFitPage}
                className={`h-5 px-2 text-[11px] rounded hover:bg-muted text-muted-foreground`}
                title="Fit whole page"
              >
                Page
              </button>
              <div className="w-px h-4 bg-border mx-1" />
              {/* Rotate */}
              <button
                onClick={handleRotate}
                className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
                title="Rotate (R)"
              >
                <RotateCw className="h-3.5 w-3.5" />
              </button>
              {/* Fill Page */}
              {onToggleFillPage && (
                <button
                  onClick={onToggleFillPage}
                  className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
                  title={isFillPage ? 'Exit fill page' : 'Fill page'}
                >
                  {isFillPage ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
                </button>
              )}
              {/* Fullscreen */}
              {onToggleFullscreen && (
                <button
                  onClick={onToggleFullscreen}
                  className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
                  title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen (F)'}
                >
                  {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                </button>
              )}
              {/* Download */}
              <button
                onClick={handleDownload}
                className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
                title="Download PDF"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              {onClose && (
                <>
                  <div className="w-px h-4 bg-border mx-1" />
                  <button
                    onClick={onClose}
                    className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
                    title="Close (Esc)"
                  >
                    ×
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Annotation Toolbar (appears when annotation mode is active) */}
      {annotationMode && (
        <AnnotationToolbar
          onToolChange={annotationTools.setActiveTool}
          onColorChange={annotationTools.setActiveColor}
          onStrokeWidthChange={annotationTools.setStrokeWidth}
          onGridSizeChange={setGridSize}
          onGridToggle={setGridVisible}
          onUndo={() => annotationTools.undo(null, currentViewport)}
          onRedo={() => annotationTools.redo(null, currentViewport)}
          onSave={() => console.log('Save annotations:', annotationTools.annotations)}
          currentTool={annotationTools.activeTool}
          currentColor={annotationTools.activeColor}
          currentStrokeWidth={annotationTools.strokeWidth}
          currentGridSize={gridSize}
          gridVisible={gridVisible}
        />
      )}

      {/* PDF Content (rotation passed here is user-applied only; intrinsic page rotation handled inside PDFCanvas/React-PDF) */}
      <div className="relative flex-1 min-h-0">
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
            onPageLoadSuccess={(page: any) => {
              onPageLoadSuccess(page);
              setPdfPageRef(page);
              const viewport = page.getViewport({ scale, rotation });
              setCurrentViewport(viewport);
            }}
            viewerSize={viewerSize}
            pageSize={pageSize}
            numPages={numPages}
            scrollMode={scrollMode}
          />
        )}
        
        {/* Annotation Layer Overlay */}
        {annotationMode && pdfPageRef && currentViewport && (
          <PDFAnnotationLayer
            pageNumber={pageNumber}
            pdfPage={pdfPageRef}
            scale={scale}
            rotation={rotation}
            visible={annotationMode}
            viewport={currentViewport}
          />
        )}
      </div>
      {documentFileSource === '__MISSING_LOCAL_PDF__' && (
        <div className={`flex-1 flex items-center justify-center text-[10px] text-muted-foreground`}>
          PDF asset not included in demo build.
        </div>
      )}
    </div>
  );
};

export default PDFViewer;
