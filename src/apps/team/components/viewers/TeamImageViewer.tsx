import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download, 
  Maximize2,
  Move,
  RotateCcw
} from 'lucide-react';
import { logger } from '@/utils/logger';
import { getOptimizedS3Url, getBestImageFormat } from '@/utils/imageUtils';

interface TeamImageViewerProps {
  file: any;
}

const TeamImageViewer = ({ file }: TeamImageViewerProps) => {
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [naturalDimensions, setNaturalDimensions] = useState({ width: 0, height: 0 });
  const [fitToScreen, setFitToScreen] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);

  const getFitScale = useCallback(() => {
    if (!containerRef.current || !naturalDimensions.width || !naturalDimensions.height) return 1.0;
    const rect = containerRef.current.getBoundingClientRect();
    const availableHeight = Math.max(rect.height - 32, 0);
    const rot = ((rotation % 360) + 360) % 360;
    const isRotated = rot === 90 || rot === 270;
    const effHeight = isRotated ? naturalDimensions.width : naturalDimensions.height;
    if (!effHeight) return 1.0;
    const scaleY = availableHeight / effHeight;
    return Math.min(scaleY, 1.0);
  }, [naturalDimensions, rotation]);

  const clampY = useCallback((y: number, currentScale: number) => {
    if (!containerRef.current || !naturalDimensions.width || !naturalDimensions.height) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const availableHeight = Math.max(rect.height - 32, 0);
    const rot = ((rotation % 360) + 360) % 360;
    const isRotated = rot === 90 || rot === 270;
    const effHeight = isRotated ? naturalDimensions.width : naturalDimensions.height;
    const s = currentScale || 1.0;
    const scaledHeight = effHeight * s;
    const maxOffsetScreen = Math.max((scaledHeight - availableHeight) / 2, 0);
    if (maxOffsetScreen === 0) return 0;
    const maxOffsetPreScale = maxOffsetScreen / s;
    return Math.max(-maxOffsetPreScale, Math.min(y, maxOffsetPreScale));
  }, [naturalDimensions, rotation]);

  const clampX = useCallback((x: number, currentScale: number) => {
    if (!containerRef.current || !naturalDimensions.width || !naturalDimensions.height) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const availableWidth = Math.max(rect.width - 0, 0);
    const rot = ((rotation % 360) + 360) % 360;
    const isRotated = rot === 90 || rot === 270;
    const effWidth = isRotated ? naturalDimensions.height : naturalDimensions.width;
    const s = currentScale || 1.0;
    const scaledWidth = effWidth * s;
    const maxOffsetScreen = Math.max((scaledWidth - availableWidth) / 2, 0);
    if (maxOffsetScreen === 0) return 0;
    const maxOffsetPreScale = maxOffsetScreen / s;
    return Math.max(-maxOffsetPreScale, Math.min(x, maxOffsetPreScale));
  }, [naturalDimensions, rotation]);

  const fallbackChain = useMemo(() => {
    if (!file) return [];
    const urls = [];
    if (file.url) {
      const optimized = getOptimizedS3Url(file.url, {
        format: getBestImageFormat(),
        quality: 85,
        width: 1920,
      })
      urls.push(optimized)
      urls.push(file.url)
    }
    urls.push(
      'https://placehold.co/1200x800.png',
      'https://picsum.photos/seed/fallback/1200/800'
    );
    return Array.from(new Set(urls));
  }, [file]);

  const [fallbackIndex, setFallbackIndex] = useState(0);
  useEffect(() => { setFallbackIndex(0); }, [file]);

  const imageUrl = fallbackChain[fallbackIndex] || (file?.name ? `/sample-images/${file.name}` : null);

  const resetView = useCallback(() => {
    setScale(1.0);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setFitToScreen(true);
  }, []);

  const fitImageToScreen = useCallback(() => {
    if (!containerRef.current || !naturalDimensions.width || !naturalDimensions.height) return;

    const container = containerRef.current.getBoundingClientRect();
    const containerHeight = Math.max(container.height - 32, 0);

    const rot = ((rotation % 360) + 360) % 360;
    const isRotated = rot === 90 || rot === 270;
    const effectiveHeight = isRotated ? naturalDimensions.width : naturalDimensions.height;

    const scaleY = containerHeight / effectiveHeight;
    const newScale = Math.min(scaleY, 1.0);

    setScale(isFinite(newScale) && newScale > 0 ? newScale : 1.0);
    setPosition({ x: 0, y: 0 });
    setFitToScreen(true);
  }, [naturalDimensions, rotation]);

  useEffect(() => {
    if (fitToScreen) {
      fitImageToScreen();
    }
  }, [fitToScreen, fitImageToScreen, naturalDimensions]);

  const zoomAt = useCallback((direction: 'in' | 'out', clientX?: number, clientY?: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const vx = clientX != null ? (clientX - rect.left - rect.width / 2) : 0;
    const vy = clientY != null ? (clientY - rect.top - rect.height / 2) : 0;

    const theta = ((rotation % 360) + 360) % 360 * Math.PI / 180;
    const cosT = Math.cos(-theta);
    const sinT = Math.sin(-theta);
    const cxLocal = vx * cosT - vy * sinT;
    const cyLocal = vx * sinT + vy * cosT;

    const oldS = scale;
    const factor = 1.2;
    const fit = getFitScale();
    let proposed = direction === 'in' ? oldS * factor : oldS / factor;
    const newS = Math.max(fit, Math.min(proposed, 5.0));
    if (newS === oldS) return;

    const dx = cxLocal * (1 / newS - 1 / oldS);
    const dy = cyLocal * (1 / newS - 1 / oldS);

    setScale(newS);
    setPosition(prev => {
      const next = { x: prev.x + dx, y: prev.y + dy };
      return { x: clampX(next.x, newS), y: clampY(next.y, newS) };
    });
    setFitToScreen(false);
  }, [scale, rotation, getFitScale, clampX, clampY]);

  const handleZoomIn = useCallback(() => {
    zoomAt('in');
  }, [zoomAt]);

  const handleZoomOut = useCallback(() => {
    zoomAt('out');
  }, [zoomAt]);

  const handleRotateClockwise = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  const handleRotateCounterClockwise = useCallback(() => {
    setRotation(prev => (prev - 90 + 360) % 360);
  }, []);

  const handleDownload = useCallback(() => {
    logger.log('Download image:', file?.name);
  }, [file]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.shiftKey) {
        e.preventDefault();
        const dir = e.deltaY < 0 ? 'in' : 'out';
        zoomAt(dir, e.clientX, e.clientY);
        return;
      }
      const fitScale = getFitScale();
      if (scale > fitScale) {
        e.preventDefault();
        setPosition(prev => {
          const nextY = prev.y - (e.deltaY / scale);
          return { x: clampX(prev.x, scale), y: clampY(nextY, scale) };
        });
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [containerRef, zoomAt, scale, getFitScale, clampX, clampY]);

  useEffect(() => {
    const fitScale = getFitScale();
    if (scale <= fitScale) {
      if (position.y !== 0) setPosition({ x: 0, y: 0 });
      return;
    }
    const clampedX = clampX(position.x, scale);
    const clampedY = clampY(position.y, scale);
    if (clampedX !== position.x || clampedY !== position.y) setPosition({ x: clampedX, y: clampedY });
  }, [scale, rotation, naturalDimensions, getFitScale, clampX, clampY, position.x, position.y]);

  useEffect(() => {
    const min = getFitScale();
    if (scale < min) setScale(min);
  }, [scale, getFitScale]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    const nat = { width: img.naturalWidth, height: img.naturalHeight };
    setNaturalDimensions(nat);
    
    if (containerRef.current && nat.width && nat.height) {
      const container = containerRef.current.getBoundingClientRect();
      const containerHeight = Math.max(container.height - 32, 0);
      const scaleY = containerHeight / nat.height;
      const newScale = Math.min(scaleY, 1.0);
      setScale(isFinite(newScale) && newScale > 0 ? newScale : 1.0);
      setPosition({ x: 0, y: 0 });
    }
    setError(null);
    setLoading(false);
    setFitToScreen(true);
  };

  const handleImageError = () => {
    if (fallbackIndex < fallbackChain.length - 1) {
      setFallbackIndex(i => i + 1);
      return;
    }
    setError('Failed to load image');
    setLoading(false);
  };

  if (!file) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="text-muted-foreground text-[10px]">No image selected</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-background h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 py-1.5 h-10 bg-card border-b border-border">
        <div className="flex items-center gap-1 min-w-0">
          <h3 className="text-[10px] font-medium text-card-foreground truncate max-w-[220px]">
            {file.name}
          </h3>
          {naturalDimensions.width > 0 && (
            <span className="text-[10px] text-muted-foreground ml-1">
              {naturalDimensions.width} × {naturalDimensions.height}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-foreground">
          <button
            onClick={handleZoomOut}
            disabled={scale <= (getFitScale() + 0.0001)}
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed text-muted-foreground"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="px-1 text-[10px] text-muted-foreground">{Math.round(scale * 100)}%</span>
          <button
            onClick={handleZoomIn}
            disabled={scale >= 5.0}
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed text-muted-foreground"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <div className="w-px h-5 bg-border mx-1" />
          <button
            onClick={() => setFitToScreen(true)}
            className={`h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground ${fitToScreen ? 'bg-accent' : ''}`}
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            onClick={resetView}
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
          >
            <Move className="h-4 w-4" />
          </button>
          <div className="w-px h-5 bg-border mx-1" />
          <button
            onClick={handleRotateCounterClockwise}
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={handleRotateClockwise}
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
          >
            <RotateCw className="h-4 w-4" />
          </button>
          <div className="w-px h-5 bg-border mx-1" />
          <button
            onClick={handleDownload}
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Image Content */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-hidden flex items-center justify-center py-4 bg-background"
      >
        {loading && (
          <div className="absolute inset-0" aria-hidden="true" />
        )}

        {error && (
          <div className="flex flex-col items-center justify-center text-center text-foreground">
            <div className="text-[10px] mb-4">🖼️</div>
            <div className="text-[10px] font-medium mb-2">{error}</div>
          </div>
        )}

        {!error && imageUrl && (
          <div className="image-container">
            <img
              src={imageUrl}
              alt={file.name}
              loading="lazy"
              decoding="async"
              crossOrigin={file?.url ? 'anonymous' : undefined}
              onLoad={handleImageLoad}
              onError={handleImageError}
              className="max-w-none"
              style={{
                transform: `translate(0px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
                userSelect: 'none',
                pointerEvents: 'none',
                filter: loading ? 'blur(8px)' : 'none',
                transition: loading ? 'filter 0.25s ease' : 'none'
              }}
              draggable={false}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamImageViewer;
