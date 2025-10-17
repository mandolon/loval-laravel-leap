import { useState, useEffect, useRef } from 'react';
import { Document, Page } from 'react-pdf';
import { Download, Share2, Maximize2 } from 'lucide-react';
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
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [pageWidth, setPageWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate container width on mount and resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        // Get container width minus padding (16px * 2 = 32px)
        const width = containerRef.current.clientWidth - 32;
        setPageWidth(width);
        console.log('📐 Container width updated:', width);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  if (!fileUrl) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No PDF selected
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-muted/30 overflow-hidden">
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

        <div className="flex-1" />

        {(onDownload || onShare || onMaximize) && (
          <>
            {onDownload && (
              <button
                onClick={onDownload}
                className="px-3 py-1 border rounded hover:bg-muted"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </button>
            )}
            {onShare && (
              <button
                onClick={onShare}
                className="px-3 py-1 border rounded hover:bg-muted"
                title="Share"
              >
                <Share2 className="h-4 w-4" />
              </button>
            )}
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

      <div 
        ref={containerRef}
        className="flex-1 overflow-auto flex items-center justify-center p-4"
        style={{ 
          maxWidth: '100%',
          overflowX: 'auto'
        }}
      >
        <Document
            file={fileUrl}
            onLoadSuccess={({ numPages }) => {
              setNumPages(numPages);
              console.log('✅ PDF loaded:', numPages, 'pages');
              console.log('📄 Scale:', scale, '| Container width:', pageWidth);
            }}
            onLoadError={(error) => {
              console.error('❌ PDF load error:', error);
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
              width={pageWidth > 0 ? pageWidth * scale : undefined}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              loading={<div className="text-muted-foreground">Loading page...</div>}
              className="shadow-lg"
              onLoadSuccess={() => {
                console.log('📄 Page', pageNumber, 'rendered | Width:', pageWidth * scale);
              }}
            />
          </Document>
      </div>
    </div>
  );
}
