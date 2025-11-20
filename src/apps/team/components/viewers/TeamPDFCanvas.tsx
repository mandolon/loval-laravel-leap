import { useRef, useEffect, forwardRef, useCallback, useState, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { logger } from '@/utils/logger';

interface TeamPDFCanvasProps {
  file: any;
  pageNumber: number;
  scale: number;
  rotation?: number;
  fetchStatus: string;
  loading: boolean;
  error: string | null;
  documentFileSource: string | null;
  workerOk: boolean;
  onDocumentLoadSuccess: (data: { numPages: number }) => void;
  onDocumentLoadError: (error: any) => void;
  onPageLoadSuccess: (page: any) => void;
  viewerSize: { width: number; height: number };
  pageSize: { width: number; height: number };
  numPages: number | null;
  scrollMode?: 'centered' | 'continuous';
  debug?: boolean;
}

const TeamPDFCanvas = forwardRef<HTMLDivElement, TeamPDFCanvasProps>(({
  file: _file,
  pageNumber,
  scale,
  rotation: userRotation = 0,
  fetchStatus: _fetchStatus,
  loading: _loading,
  error,
  documentFileSource,
  workerOk: _workerOk,
  onDocumentLoadSuccess,
  onDocumentLoadError,
  onPageLoadSuccess,
  viewerSize,
  pageSize,
  numPages,
  scrollMode = 'centered',
  debug = false,
}, ref) => {
  const centeredOnceRef = useRef(false);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [renderRange, setRenderRange] = useState({ start: 1, end: 1 });
  const initialContinuousPageMeasuredRef = useRef(false);
  const isMountedRef = useRef(true);
  
  const renderMode = 'canvas' as const;
  
  // Large format PDF optimization: Enable text layer only when zoomed in enough to read
  // For 24"x36" PDFs, text is unreadable at fit-to-screen, only show at zoom
  const shouldRenderTextLayer = useMemo(() => {
    if (scale < 1.2) return false; // Too zoomed out - text unreadable anyway
    if (scale > 4.0) return false; // Too zoomed in - performance hit
    return true; // Sweet spot for reading large format PDFs
  }, [scale]);
  
  const shouldRenderAnnotations = useMemo(() => {
    return scale >= 1.0 && scale <= 3.0; // Only at readable zoom levels
  }, [scale]);
  
  // Large format optimization: Aggressive DPR reduction for huge PDFs
  // 24"x36" @ 300dpi = 7200x10800px - we need to be very conservative
  const dynamicDevicePixelRatio = useMemo(() => {
    if (scale > 4.0) return 1.5; // Very high zoom - bump to 1.5x for clarity
    if (scale > 2.5) return 1.5; // High zoom - increase from 1x to reduce blur
    if (scale > 1.8) return Math.min(2, window.devicePixelRatio * 0.75); // Medium zoom
    if (scale > 1.2) return Math.min(2, window.devicePixelRatio * 0.85); // Increase from 0.75
    return 1; // At fit-to-screen, use 1x for speed (large PDFs are huge)
  }, [scale]);
  
  // Large format PDF optimization (24"x36" architectural/engineering drawings)
  const pdfOptions = useMemo(() => ({
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
    enableXfa: false,
    disableAutoFetch: false,
    disableStream: false, // Enable streaming for faster initial render
    disableFontFace: false,
    isEvalSupported: false,
    maxImageSize: 16777216, // 16MB for large format PDFs (restored from 8MB)
    useSystemFonts: false, // Disabled - large PDFs often use custom fonts
    verbosity: 0,
    pdfBug: false,
    // Large format optimizations
    useWorkerFetch: true, // Offload fetching to worker
    isOffscreenCanvasSupported: typeof OffscreenCanvas !== 'undefined',
  }), []);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const clamp = useCallback((value: number, min: number, max: number) => {
    return Math.min(Math.max(value, min), max);
  }, []);

  // Large format PDF buffer: At high zoom, pages are HUGE - render only visible
  const getRenderBuffer = useCallback(() => {
    if (scrollMode !== 'continuous') return 0;
    if (scale >= 2.5) return 0; // No buffer - high zoom on large PDF = massive memory
    if (scale >= 1.5) return 0; // No buffer - still too large
    if (scale >= 1.0) return 1; // Minimal buffer
    return 1; // Small buffer when zoomed out (whole page visible anyway)
  }, [scrollMode, scale]);

  const updateRenderWindow = useCallback((el: HTMLDivElement) => {
    if (scrollMode !== 'continuous') return;
    if (!numPages || numPages <= 0) return;
    if (!pageSize.width || !pageSize.height) return;

    const rotated = (userRotation % 180) !== 0;
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
  }, [scrollMode, numPages, pageSize.width, pageSize.height, scale, userRotation, clamp, getRenderBuffer]);

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
    const el = ref && 'current' in ref ? ref.current : null;
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
  }, [scrollMode, ref, updateRenderWindow]);

  useEffect(() => {
    pageRefs.current.clear();
    initialContinuousPageMeasuredRef.current = false;
    if (scrollMode === 'centered') {
      centeredOnceRef.current = false;
    }
  }, [scrollMode, numPages]);

  useEffect(() => {
    if (scrollMode !== 'centered') return;
    const el = ref && 'current' in ref ? ref.current : null;
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
  }, [scale, pageSize.width, pageSize.height, ref, scrollMode]);

  useEffect(() => {
    if (scrollMode !== 'continuous') return;
    const el = ref && 'current' in ref ? ref.current : null;
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
  }, [pageNumber, scrollMode, ref, numPages]);

  const handlePageLoadSuccess = useCallback((page: any) => {
    if (debug) {
      logger.log('[TeamPDFCanvas] Page load', {
        pageNumber: page.pageNumber,
        intrinsicRotate: page.rotate,
        appliedUserRotation: userRotation,
      });
    }

    if (!onPageLoadSuccess) return;

    if (scrollMode === 'continuous') {
      if (!initialContinuousPageMeasuredRef.current) {
        initialContinuousPageMeasuredRef.current = true;
        onPageLoadSuccess(page);
      }
      return;
    }

    if (page.pageNumber === pageNumber) {
      onPageLoadSuccess(page);
    }
  }, [debug, onPageLoadSuccess, scrollMode, pageNumber, userRotation]);

  return (
    <div
      ref={ref}
      className="flex-1 min-h-0 overflow-auto pdf-viewer p-0 bg-background"
      style={{
        contain: 'layout style paint',
        contentVisibility: 'auto',
      }}
    >
      {error && (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="text-destructive text-[10px] mb-2">⚠️</div>
          <div className="text-destructive text-[10px] font-medium">{error}</div>
        </div>
      )}

      {!error && documentFileSource && (
        <div className="block w-full" style={{ lineHeight: 0, fontSize: 0 }}>
          <Document
            key={documentFileSource}
            file={documentFileSource}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            options={pdfOptions}
            loading={
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-[10px]">
                <div className="mb-2 animate-pulse">📄</div>
                <div>Loading PDF…</div>
              </div>
            }
            error={
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="text-destructive text-[10px] mb-2">📄</div>
                <div className="text-destructive text-[10px] font-medium">Unable to load PDF</div>
              </div>
            }
          >
            {(() => {
              const rotated = (userRotation % 180) !== 0;
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
                        {userRotation === 0 ? (
                          <Page
                            key={`page-${pageNo}-${documentFileSource}`}
                            pageNumber={pageNo}
                            scale={1}
                            renderMode={renderMode}
                            renderTextLayer={shouldRenderTextLayer}
                            renderAnnotationLayer={shouldRenderAnnotations}
                            loading={null}
                            error={null}
                            width={w}
                            onLoadSuccess={handlePageLoadSuccess}
                            onLoadError={(error) => {
                              if (debug && error && !error.message?.includes('sendWithPromise')) {
                                logger.error('[TeamPDFCanvas] Page load error:', error);
                              }
                            }}
                            devicePixelRatio={dynamicDevicePixelRatio}
                          />
                        ) : (
                          <Page
                            key={`page-${pageNo}-${documentFileSource}`}
                            pageNumber={pageNo}
                            scale={1}
                            rotate={userRotation}
                            renderMode={renderMode}
                            renderTextLayer={shouldRenderTextLayer}
                            renderAnnotationLayer={shouldRenderAnnotations}
                            loading={null}
                            error={null}
                            width={w}
                            onLoadSuccess={handlePageLoadSuccess}
                            onLoadError={(error) => {
                              if (debug && error && !error.message?.includes('sendWithPromise')) {
                                logger.error('[TeamPDFCanvas] Page load error:', error);
                              }
                            }}
                            devicePixelRatio={dynamicDevicePixelRatio}
                          />
                        )}
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
  );
});

export default TeamPDFCanvas;
