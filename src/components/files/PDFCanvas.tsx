import { useRef, useEffect, forwardRef, useCallback, useState, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { logger } from '@/utils/logger';

interface PDFCanvasProps {
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
  annotationMode?: boolean;
  debug?: boolean;
}

const PDFCanvas = forwardRef<HTMLDivElement, PDFCanvasProps>(({
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
  annotationMode = false,
  debug = true,
}, ref) => {
  const centeredOnceRef = useRef(false);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [renderRange, setRenderRange] = useState({ start: 1, end: 1 });
  const initialContinuousPageMeasuredRef = useRef(false);
  const isMountedRef = useRef(true);
  
  // Performance optimization: use canvas mode for faster rendering
  const renderMode = 'canvas' as const;
  
  // Progressive loading: start with lower quality, then upgrade
  const [highQualityEnabled, setHighQualityEnabled] = useState(false);
  
  // Advanced performance: Dynamic quality based on scale
  const shouldRenderTextLayer = useMemo(() => {
    // Disable text layer during annotation mode (it blocks mouse events)
    if (annotationMode) return false;
    // Only render text layer at reasonable zoom levels for better performance
    if (!highQualityEnabled) return false;
    // Disable text layer at very high or very low zooms for performance
    return scale >= 0.5 && scale <= 3.0;
  }, [annotationMode, highQualityEnabled, scale]);
  
  const shouldRenderAnnotations = useMemo(() => {
    // Only render annotations at readable zoom levels
    if (!highQualityEnabled) return false;
    return scale >= 0.75 && scale <= 2.0;
  }, [highQualityEnabled, scale]);
  
  // Dynamic device pixel ratio based on scale
  const dynamicDevicePixelRatio = useMemo(() => {
    if (!highQualityEnabled) return 1;
    // Reduce pixel ratio at high zoom to maintain performance
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
    // Performance optimizations
    disableAutoFetch: false,
    disableStream: false,
    disableFontFace: false,
    // Additional performance tweaks
    isEvalSupported: false, // Disable eval for better performance
    maxImageSize: 16777216, // 16MP limit for images (4096x4096)
  }), []); // Empty deps - these values never change
  
  // Track component mount state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Enable high quality after initial render
  useEffect(() => {
    // Reset quality when document changes
    setHighQualityEnabled(false);
    const timer = setTimeout(() => {
      if (isMountedRef.current) {
        setHighQualityEnabled(true);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [documentFileSource]);

  const clamp = useCallback((value: number, min: number, max: number) => {
    return Math.min(Math.max(value, min), max);
  }, []);

  const getRenderBuffer = useCallback(() => {
    if (scrollMode !== 'continuous') return 0;
    // Reduce buffer at high scales to save memory and improve performance
    if (scale >= 2.5) return 0;
    if (scale >= 1.8) return 1;
    if (scale >= 1.1) return 1;
    return 2;
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
    const throttleDelay = 16; // ~60fps max update rate
    
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

  // Center the scroll container on initial load and when zoom changes (only in centered mode)
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

  // Debug: log sizing to verify zoom behavior vs actual canvas size
  useEffect(() => {
    const el = ref && 'current' in ref ? ref.current : null;
    const canvas = el ? el.querySelector('.react-pdf__Page__canvas') : null;
    const container = el;
    const info = {
      scale,
      pageSize,
      viewerSize,
      intendedWidth: pageSize.width ? Math.round(pageSize.width * scale) : null,
      canvasClientWidth: canvas ? (canvas as HTMLElement).clientWidth : null,
      canvasScrollWidth: canvas ? (canvas as HTMLElement).scrollWidth : null,
      containerClientWidth: container ? container.clientWidth : null,
      containerScrollWidth: container ? container.scrollWidth : null,
    };
    logger.log('[PDFCanvas][zoom-debug]', info);
  }, [scale, pageSize.width, pageSize.height, viewerSize.width, viewerSize.height, ref]);

  const handlePageLoadSuccess = useCallback((page: any) => {
    if (debug) {
      logger.log('[PDFCanvas] Page load', {
        pageNumber: page.pageNumber,
        intrinsicRotate: page.rotate,
        appliedUserRotation: userRotation,
        effectiveRotation: (page.rotate + userRotation) % 360,
        viewBox: page.view,
        width: page.view[2] - page.view[0],
        height: page.view[3] - page.view[1],
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
      className="flex-1 min-h-0 overflow-auto pdf-viewer p-0 bg-background dark:bg-slate-900/30"
      style={{
        contain: 'layout style paint',
        contentVisibility: 'auto',
      }}
    >
      {error && (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className={`text-destructive text-[10px] mb-2`}>⚠️</div>
          <div className={`text-destructive text-[10px] font-medium leading-normal tracking-normal`}>{error}</div>
          <div className={`text-muted-foreground text-[10px] mt-1`}>
            Please check if the PDF file is valid and accessible.
          </div>
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
              <div 
                className={`flex flex-col items-center justify-center h-64 text-muted-foreground text-[10px]`}
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
                <div className={`text-destructive text-[10px] mb-2`}>📄</div>
                <div className={`text-destructive text-[10px] font-medium leading-normal tracking-normal`}>Unable to load PDF</div>
                <div className={`text-muted-foreground text-[10px] mt-1`}>
                  This is a demo. If this is the sample file, an embedded fallback should appear; otherwise ensure the file exists in /public/sample-pdfs
                </div>
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
                          // GPU acceleration hints
                          willChange: scrollMode === 'continuous' ? 'transform' : undefined,
                          transform: 'translateZ(0)', // Force GPU layer
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
                              // Silently catch worker errors when switching files
                              if (debug && error && !error.message?.includes('sendWithPromise')) {
                                logger.error('[PDFCanvas] Page load error:', error);
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
                              // Silently catch worker errors when switching files
                              if (debug && error && !error.message?.includes('sendWithPromise')) {
                                logger.error('[PDFCanvas] Page load error:', error);
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

export default PDFCanvas;
