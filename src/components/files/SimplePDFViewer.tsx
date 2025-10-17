import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Maximize2 } from 'lucide-react';
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
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [viewerSize, setViewerSize] = useState({ width: 0, height: 0 });
  const [error, setError] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const centeredOnceRef = useRef(false);
  const isMountedRef = useRef(true);
  
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

  // Center the scroll container on initial load and when zoom changes
  useEffect(() => {
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
  }, [scale, pageSize.width, pageSize.height]);

  // Debug: log sizing to verify zoom behavior
  useEffect(() => {
    const el = containerRef.current;
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
  }, [scale, pageSize.width, pageSize.height, viewerSize.width, viewerSize.height]);

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

    if (page.pageNumber === pageNumber) {
      setPageSize({
        width: page.view[2] - page.view[0],
        height: page.view[3] - page.view[1]
      });
    }
  }, [debug, pageNumber]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setError(null);
    logger.log('✅ PDF loaded:', numPages, 'pages');
  }, []);

  const onDocumentLoadError = useCallback((error: any) => {
    logger.error('❌ PDF load error:', error);
    setError('Unable to load PDF');
  }, []);

  if (!fileUrl) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        No PDF selected
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-muted/30 overflow-hidden">
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
          onClick={() => setPageNumber(p => Math.min(numPages || 1, p + 1))}
          disabled={pageNumber >= (numPages || 1)}
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

        {(onDownload || onShare || onMaximize) && (
          <>
            <div className="flex-1" />
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
                const hasPageSize = Boolean(pageSize.width && pageSize.height);
                const fallbackBaseW = Math.max(viewerSize.width || 800, 200);
                const fallbackBaseH = Math.max(viewerSize.height || 600, 200);
                const baseW = hasPageSize ? pageSize.width : fallbackBaseW;
                const baseH = hasPageSize ? pageSize.height : fallbackBaseH;
                const w = baseW * scale;
                const h = baseH * scale;
                const wrapperStyle = { 
                  width: '100%', 
                  textAlign: 'center' as const, 
                  lineHeight: 0, 
                  fontSize: 0 
                };

                return (
                  <div style={wrapperStyle}>
                    <div
                      data-page-number={pageNumber}
                      className="pdf-page-frame"
                      style={{
                        display: 'inline-block',
                        verticalAlign: 'top',
                        width: hasPageSize ? `${w}px` : undefined,
                        background: '#fff',
                        borderRadius: 4,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        margin: 0,
                        transform: 'translateZ(0)',
                        backfaceVisibility: 'hidden' as const,
                      }}
                    >
                      <Page
                        key={`page-${pageNumber}-${fileUrl}`}
                        pageNumber={pageNumber}
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
                            logger.error('[PDFCanvas] Page load error:', error);
                          }
                        }}
                        devicePixelRatio={dynamicDevicePixelRatio}
                      />
                    </div>
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
