import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
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
import '../../lib/pdf-config';

interface SimplePDFViewerProps {
  fileUrl: string | null;
  fileName?: string;
  onDownload?: () => void;
  onShare?: () => void;
  onMaximize?: () => void;
}

export default function SimplePDFViewer({ 
  fileUrl,
  fileName,
  onDownload,
  onShare,
  onMaximize
}: SimplePDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [viewerSize, setViewerSize] = useState({ width: 0, height: 0 });
  const [error, setError] = useState<string | null>(null);
  const [scrollMode, setScrollMode] = useState<'centered' | 'continuous'>('centered');
  const [fitMode, setFitMode] = useState<'width' | 'height' | 'page'>('height');
  
  const [fitWidthScale, setFitWidthScale] = useState(1.0);
  const [fitHeightScale, setFitHeightScale] = useState(1.0);
  const [fitPageScale, setFitPageScale] = useState(1.0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const centeredOnceRef = useRef(false);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [renderRange, setRenderRange] = useState({ start: 1, end: 1 });
  const initialContinuousPageMeasuredRef = useRef(false);
  const isMountedRef = useRef(true);
  const prevFitScaleRef = useRef(1.0);
  const skipAutoFitRef = useRef(false);
  const suppressFitAdjustRef = useRef(false);
  
  const debug = true;
  
  // Performance optimization: use canvas mode for faster rendering
  const renderMode = 'canvas' as const;
  
  // Progressive loading: start with lower quality, then upgrade
  const [highQualityEnabled, setHighQualityEnabled] = useState(false);
  
  // Advanced performance: Dynamic quality based on scale
  const shouldRenderTextLayer = useMemo(() => {
    if (!highQualityEnabled) return false;
    return scale >= 0.5 && scale <= 3.0;
  }, [highQualityEnabled, scale]);
  
  const shouldRenderAnnotations = useMemo(() => {
    if (!highQualityEnabled) return false;
    return scale >= 0.75 && scale <= 2.0;
  }, [highQualityEnabled, scale]);
  
  // Dynamic device pixel ratio based on scale
  const dynamicDevicePixelRatio = useMemo(() => {
    if (!highQualityEnabled) return 1;
    if (scale > 2.0) return Math.max(1, window.devicePixelRatio / 2);
    if (scale > 1.5) return Math.max(1, window.devicePixelRatio * 0.75);
    return window.devicePixelRatio;
  }, [highQualityEnabled, scale]);
  
  // Memoize PDF.js options to prevent unnecessary reloads
  const pdfOptions = useMemo(() => ({
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
    enableXfa: false,
    disableAutoFetch: false,
    disableStream: false,
    disableFontFace: false,
    isEvalSupported: false,
    maxImageSize: 16777216,
  }), []);
  
  // Track component mount state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Enable high quality after initial render
  useEffect(() => {
    setHighQualityEnabled(false);
    const timer = setTimeout(() => {
      if (isMountedRef.current) {
        setHighQualityEnabled(true);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [fileUrl]);

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

  const clamp = useCallback((value: number, min: number, max: number) => {
    return Math.min(Math.max(value, min), max);
  }, []);

  const getRenderBuffer = useCallback(() => {
    if (scrollMode !== 'continuous') return 0;
    if (scale >= 2.5) return 0;
    if (scale >= 1.8) return 1;
    if (scale >= 1.1) return 1;
    return 2;
  }, [scrollMode, scale]);

  const updateRenderWindow = useCallback((el: HTMLDivElement) => {
    if (scrollMode !== 'continuous') return;
    if (!numPages || numPages <= 0) return;
    if (!pageSize.width || !pageSize.height) return;

    const rotated = (rotation % 180) !== 0;
    const baseH = rotated ? pageSize.width : pageSize.height;
    const pageHeightPx = baseH * scale;
    if (!pageHeightPx) return;

    const gapPx = 24;
    const paddingPx = 12;
    const totalSpacing = pageHeightPx + gapPx;
    const rawScrollTop = el.scrollTop - paddingPx;
    const viewportHeight = el.clientHeight;

    const approxTop = Math.floor(Math.max(rawScrollTop, 0) / Math.max(totalSpacing, 1)) + 1;
    const approxBottom = Math.ceil(Math.max(rawScrollTop + viewportHeight, 0) / Math.max(totalSpacing, 1)) + 1;
    const buffer = Math.max(getRenderBuffer(), 0);
    const start = clamp(approxTop - buffer, 1, numPages);
    const end = clamp(approxBottom + buffer, 1, numPages);

    setRenderRange(prev => (prev.start === start && prev.end === end) ? prev : { start, end });
  }, [scrollMode, numPages, pageSize.width, pageSize.height, scale, rotation, clamp, getRenderBuffer]);

  useEffect(() => {
    if (scrollMode !== 'continuous') {
      setRenderRange({ start: pageNumber, end: pageNumber });
      return;
    }
    const total = Math.max(numPages ?? pageNumber ?? 1, 1);
    const buffer = Math.max(getRenderBuffer(), 0);
    const start = clamp(pageNumber - buffer, 1, total);
    const end = clamp(pageNumber + buffer, 1, total);
    setRenderRange({ start, end });
  }, [scrollMode, pageNumber, numPages, clamp, getRenderBuffer]);

  useEffect(() => {
    if (scrollMode !== 'continuous') return;
    const el = containerRef.current;
    if (!el) return;

    let ticking = false;
    let lastUpdateTime = 0;
    const throttleDelay = 16;
    
    const handleScroll = () => {
      const now = Date.now();
      if (ticking || (now - lastUpdateTime < throttleDelay)) return;
      
      ticking = true;
      requestAnimationFrame(() => {
        updateRenderWindow(el);
        lastUpdateTime = Date.now();
        ticking = false;
      });
    };
    
    el.addEventListener('scroll', handleScroll, { passive: true });
    requestAnimationFrame(handleScroll);
    
    return () => {
      el.removeEventListener('scroll', handleScroll);
      ticking = false;
    };
  }, [scrollMode, updateRenderWindow]);

  useEffect(() => {
    pageRefs.current.clear();
    initialContinuousPageMeasuredRef.current = false;
    if (scrollMode === 'centered') {
      centeredOnceRef.current = false;
    }
  }, [scrollMode, numPages]);

  // Center the scroll container
  useEffect(() => {
    if (scrollMode !== 'centered') return;
    const el = containerRef.current;
    if (!el) return;
    const center = () => {
      const x = Math.max((el.scrollWidth - el.clientWidth) / 2, 0);
      const y = Math.max((el.scrollHeight - el.clientHeight) / 2, 0);
      el.scrollTo({ left: x, top: y, behavior: 'auto' });
    };
    if (!centeredOnceRef.current && pageSize.width && pageSize.height) {
      requestAnimationFrame(center);
      centeredOnceRef.current = true;
      return;
    }
    if (pageSize.width && pageSize.height) {
      requestAnimationFrame(center);
    }
  }, [scale, pageSize.width, pageSize.height, scrollMode]);

  useEffect(() => {
    if (scrollMode !== 'continuous') return;
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    const attemptScroll = (tries = 0) => {
      if (cancelled) return;
      const pageEl = pageRefs.current.get(pageNumber);
      if (!pageEl) {
        if (tries < 6) {
          requestAnimationFrame(() => attemptScroll(tries + 1));
        }
        return;
      }
      const containerRect = el.getBoundingClientRect();
      const pageRect = pageEl.getBoundingClientRect();
      const targetTop = pageRect.top - containerRect.top + el.scrollTop;
      el.scrollTo({ top: targetTop, behavior: 'smooth' });
    };

    requestAnimationFrame(() => attemptScroll());
    return () => {
      cancelled = true;
    };
  }, [pageNumber, scrollMode, numPages]);

  const handlePageLoadSuccess = useCallback((page: any) => {
    if (debug) {
      logger.log('[PDFCanvas] Page load', {
        pageNumber: page.pageNumber,
        intrinsicRotate: page.rotate,
        viewBox: page.view,
        width: page.view[2] - page.view[0],
        height: page.view[3] - page.view[1],
      });
    }

    const intrinsic = typeof page.rotate === 'number' ? page.rotate : 0;
    const viewport = page.getViewport({ scale: 1, rotation: intrinsic });
    
    if (scrollMode === 'continuous') {
      if (!initialContinuousPageMeasuredRef.current) {
        initialContinuousPageMeasuredRef.current = true;
        setPageSize({ width: viewport.width, height: viewport.height });
      }
      return;
    }

    if (page.pageNumber === pageNumber) {
      setPageSize({ width: viewport.width, height: viewport.height });
    }
  }, [debug, scrollMode, pageNumber]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setError(null);
    logger.log('✅ PDF loaded:', numPages, 'pages');
  }, []);

  const onDocumentLoadError = useCallback((error: any) => {
    logger.error('❌ PDF load error:', error);
    setError('Unable to load PDF');
  }, []);

  // Handlers
  const handlePrevPage = useCallback(() => {
    setPageNumber(prev => Math.max(1, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setPageNumber(prev => Math.min(numPages || 1, prev + 1));
  }, [numPages]);

  const handleZoomIn = useCallback(() => {
    skipAutoFitRef.current = false;
    suppressFitAdjustRef.current = true;
    setScale(prev => Math.min(prev * 1.2, 6.0));
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

  const handleRotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  const handleDownload = useCallback(() => {
    if (onDownload) {
      onDownload();
    } else if (fileUrl) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName || 'document.pdf';
      link.click();
    }
  }, [fileUrl, fileName, onDownload]);

  if (!fileUrl) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        No PDF selected
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-muted/30 overflow-hidden">
      {/* Toolbar (compact) */}
      <div className="flex items-center justify-between px-3 py-1 bg-card border-b border-border flex-shrink-0">
        {/* Left section - Scroll Mode Toggle */}
        <div className="flex items-center gap-1 min-w-0 flex-1">
          {numPages && (
            <>
              {/* Scroll Mode Toggle */}
              <button
                onClick={() => setScrollMode(prev => prev === 'centered' ? 'continuous' : 'centered')}
                className={`h-5 px-2 text-[10px] rounded hover:bg-muted ${scrollMode === 'continuous' ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
                title={scrollMode === 'centered' ? 'Switch to continuous scrolling' : 'Switch to single-page mode'}
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
              <span className="px-2 text-[10px] text-muted-foreground min-w-max flex items-center">
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
              <span className="px-2 text-[10px] text-muted-foreground min-w-max flex items-center">
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
                className="h-5 px-2 text-[10px] rounded hover:bg-muted text-muted-foreground"
                title="Fit to width"
              >
                Width
              </button>
              <button
                onClick={handleZoomToFitHeight}
                className="h-5 px-2 text-[10px] rounded hover:bg-muted text-muted-foreground"
                title="Fit to height"
              >
                Height
              </button>
              <button
                onClick={handleZoomToFitPage}
                className="h-5 px-2 text-[10px] rounded hover:bg-muted text-muted-foreground"
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
              {/* Maximize */}
              {onMaximize && (
                <button
                  onClick={onMaximize}
                  className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
                  title="Maximize"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
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
            </>
          )}
        </div>
      </div>

      {/* PDF Canvas */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-auto pdf-viewer p-0 bg-background"
        style={{
          contain: 'layout style paint',
          contentVisibility: 'auto',
        }}
      >
        {error && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="text-destructive text-4xl mb-2">⚠️</div>
            <div className="text-destructive font-medium">{error}</div>
            <div className="text-muted-foreground text-sm mt-1">
              Please check if the PDF file is valid and accessible.
            </div>
          </div>
        )}

        {!error && fileUrl && (
          <div className="block w-full" style={{ lineHeight: 0, fontSize: 0 }}>
            <Document
              key={fileUrl}
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              options={pdfOptions}
              loading={
                <div 
                  className="flex flex-col items-center justify-center h-64 text-muted-foreground"
                  style={{
                    contain: 'strict',
                    contentVisibility: 'auto',
                  }}
                >
                  <div className="mb-2 animate-pulse">📄</div>
                  <div>Loading PDF…</div>
                </div>
              }
              error={
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className="text-destructive text-4xl mb-2">📄</div>
                  <div className="text-destructive font-medium">Unable to load PDF</div>
                  <div className="text-muted-foreground text-sm mt-1">
                    Check console for details
                  </div>
                </div>
              }
            >
              {(() => {
                const rotated = (rotation % 180) !== 0;
                const hasPageSize = Boolean(pageSize.width && pageSize.height);
                const fallbackBaseW = Math.max(viewerSize.width || 800, 200);
                const fallbackBaseH = Math.max(viewerSize.height || 600, 200);
                const baseW = hasPageSize
                  ? (rotated ? pageSize.height : pageSize.width)
                  : fallbackBaseW;
                const baseH = hasPageSize
                  ? (rotated ? pageSize.width : pageSize.height)
                  : fallbackBaseH;
                const w = baseW * scale;
                const h = baseH * scale;
                const totalPages = Math.max(numPages ?? pageNumber ?? 1, 1);
                const rangeStart = Math.max(renderRange.start, 1);
                const rangeEnd = Math.min(renderRange.end, totalPages);
                const visiblePages = scrollMode === 'continuous'
                  ? Array.from({ length: Math.max(rangeEnd - rangeStart + 1, 0) }, (_, idx) => rangeStart + idx)
                  : [pageNumber];
                const estimatedHeight = h || Math.max(viewerSize.height || 600, 200);
                const spacing = estimatedHeight + 24;
                const topSpacerHeight = scrollMode === 'continuous'
                  ? Math.max((rangeStart - 1) * spacing, 0)
                  : 0;
                const bottomSpacerHeight = scrollMode === 'continuous'
                  ? Math.max((totalPages - rangeEnd) * spacing, 0)
                  : 0;
                const wrapperStyle = scrollMode === 'continuous'
                  ? {
                      width: '100%',
                      lineHeight: 0,
                      fontSize: 0,
                      padding: '12px 0',
                    }
                  : { width: '100%', textAlign: 'center' as const, lineHeight: 0, fontSize: 0 };

                return (
                  <div style={wrapperStyle}>
                    {scrollMode === 'continuous' && topSpacerHeight > 0 && (
                      <div style={{ height: `${Math.round(topSpacerHeight)}px` }} />
                    )}
                    {visiblePages.map((pageNo, index) => {
                      const isLastRendered = index === visiblePages.length - 1;
                      return (
                        <div
                          key={pageNo}
                          data-page-number={pageNo}
                          className="pdf-page-frame"
                          ref={(el) => {
                            if (el) {
                              pageRefs.current.set(pageNo, el);
                            } else {
                              pageRefs.current.delete(pageNo);
                            }
                          }}
                          style={{
                            display: scrollMode === 'continuous' ? 'block' : 'inline-block',
                            verticalAlign: 'top',
                            width: hasPageSize ? `${w}px` : undefined,
                            background: '#fff',
                            borderRadius: 4,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            margin: scrollMode === 'continuous'
                              ? `0 auto ${isLastRendered ? 0 : 24}px`
                              : 0,
                            minHeight: scrollMode === 'continuous'
                              ? `${Math.max(Math.round(estimatedHeight), 1)}px`
                              : undefined,
                            willChange: scrollMode === 'continuous' ? 'transform' : undefined,
                            transform: 'translateZ(0)',
                            backfaceVisibility: 'hidden' as const,
                          }}
                        >
                          <Page
                            key={`page-${pageNo}-${fileUrl}`}
                            pageNumber={pageNo}
                            scale={1}
                            rotate={rotation}
                            renderMode={renderMode}
                            renderTextLayer={shouldRenderTextLayer}
                            renderAnnotationLayer={shouldRenderAnnotations}
                            loading={null}
                            error={null}
                            width={w}
                            onLoadSuccess={handlePageLoadSuccess}
                            onLoadError={(error) => {
                              if (debug && error && !error.message?.includes('sendWithPromise')) {
                                logger.error('[PDFCanvas] Page load error:', error);
                              }
                            }}
                            devicePixelRatio={dynamicDevicePixelRatio}
                          />
                        </div>
                      );
                    })}
                    {scrollMode === 'continuous' && bottomSpacerHeight > 0 && (
                      <div style={{ height: `${Math.round(bottomSpacerHeight)}px` }} />
                    )}
                  </div>
                );
              })()}
            </Document>
          </div>
        )}
      </div>
    </div>
  );
}
