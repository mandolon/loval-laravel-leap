import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { logger } from '@/utils/logger';
import { getOptimizedS3Url, getBestImageFormat } from '@/utils/imageUtils';
import { supabase } from '@/integrations/supabase/client';

interface SimpleImageViewerProps {
  file: any;
  className?: string;
}

const SimpleImageViewer = ({ file, className = '' }: SimpleImageViewerProps) => {
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0); // Locked to 0°
  // Position used for vertical wheel scrolling when zoomed in
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [naturalDimensions, setNaturalDimensions] = useState({ width: 0, height: 0 });
  const [fitToScreen, setFitToScreen] = useState(true);
  const [signedUrl, setSignedUrl] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch signed URL for storage files
  useEffect(() => {
    async function getUrl() {
      if (file && 'storagePath' in file && file.storagePath) {
        const { data } = await supabase.storage
          .from('detail-library')
          .createSignedUrl(file.storagePath, 3600);
        
        if (data?.signedUrl) {
          setSignedUrl(data.signedUrl);
        }
      }
    }
    getUrl();
  }, [file]);

  // Helpers: compute rotation-aware fit-to-height scale and max vertical offset
  const getFitScale = useCallback(() => {
    if (!containerRef.current || !naturalDimensions.width || !naturalDimensions.height) return 1.0;
    const rect = containerRef.current.getBoundingClientRect();
    const availableHeight = Math.max(rect.height - 32, 0); // py-4 => 32px vertical padding
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
    const maxOffsetPreScale = maxOffsetScreen / s; // translate() happens before scale()
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

  // Derive image URL: prefer signed URL, then explicit remote url, otherwise fall back to local sample directory
  // Optimize S3 URLs with WebP and proper sizing
  const fallbackChain = useMemo(() => {
    if (!file) return [];
    const urls = [];
    
    // Prefer signed URL from storage
    if (signedUrl) urls.push(signedUrl);
    
    if (file.url) {
      // Optimize S3 URLs with WebP format and quality settings
      const optimized = getOptimizedS3Url(file.url, {
        format: getBestImageFormat(),
        quality: 85,
        width: 1920, // Max width for viewer
      })
      urls.push(optimized)
      // Add original as fallback
      urls.push(file.url)
    }
    // Provide generic fallbacks for remote failures
    urls.push(
      'https://placehold.co/1200x800.png',
      'https://picsum.photos/seed/fallback/1200/800'
    );
    return Array.from(new Set(urls));
  }, [file, signedUrl]);

  const [fallbackIndex, setFallbackIndex] = useState(0);
  useEffect(() => { setFallbackIndex(0); }, [file]);

  const imageUrl = fallbackChain[fallbackIndex] || (file?.name ? `/sample-images/${file.name}` : null);

  const fitImageToScreen = useCallback(() => {
    if (!containerRef.current || !naturalDimensions.width || !naturalDimensions.height) return;

    const container = containerRef.current.getBoundingClientRect();
    // Tailwind py-4 -> 16px top + 16px bottom = 32
    const containerHeight = Math.max(container.height - 32, 0);

    // If rotated 90/270, the effective height equals the natural width
    const rot = ((rotation % 360) + 360) % 360;
    const isRotated = rot === 90 || rot === 270;
    const effectiveHeight = isRotated ? naturalDimensions.width : naturalDimensions.height;

    const scaleY = containerHeight / effectiveHeight;
    const newScale = Math.min(scaleY, 1.0); // Do not scale up beyond 100%

    setScale(isFinite(newScale) && newScale > 0 ? newScale : 1.0);
    setPosition({ x: 0, y: 0 });
    setFitToScreen(true);
  }, [naturalDimensions, rotation]);

  useEffect(() => {
    if (fitToScreen) {
      fitImageToScreen();
    }
  }, [fitToScreen, fitImageToScreen, naturalDimensions]);

  // Anchor-preserving zoom to center or cursor
  const zoomAt = useCallback((direction: 'in' | 'out', clientX?: number, clientY?: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const vx = clientX != null ? (clientX - rect.left - rect.width / 2) : 0;
    const vy = clientY != null ? (clientY - rect.top - rect.height / 2) : 0;

    // Convert screen vector to local (pre-rotation) axes
    const theta = ((rotation % 360) + 360) % 360 * Math.PI / 180;
    const cosT = Math.cos(-theta);
    const sinT = Math.sin(-theta);
    const cxLocal = vx * cosT - vy * sinT;
    const cyLocal = vx * sinT + vy * cosT;

    const oldS = scale;
    const factor = 1.2;
    const fit = getFitScale();
    let proposed = direction === 'in' ? oldS * factor : oldS / factor;
    // Clamp min to fit and max to 5.0
    const newS = Math.max(fit, Math.min(proposed, 5.0));
    if (newS === oldS) return;

    // p' = p + c_local * (1/s' - 1/s)
    const dx = cxLocal * (1 / newS - 1 / oldS);
    const dy = cyLocal * (1 / newS - 1 / oldS);

    setScale(newS);
    setPosition(prev => {
      const next = { x: prev.x + dx, y: prev.y + dy };
      // Clamp both axes in pre-scale space
      return { x: clampX(next.x, newS), y: clampY(next.y, newS) };
    });
    setFitToScreen(false);
  }, [scale, rotation, getFitScale, clampX, clampY]);

  // Mouse drag handlers for panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const fitScale = getFitScale();
    if (scale > fitScale) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [scale, getFitScale]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragStart) return;
    
    const dx = (e.clientX - dragStart.x) / scale;
    const dy = (e.clientY - dragStart.y) / scale;
    
    setPosition(prev => ({
      x: clampX(prev.x + dx, scale),
      y: clampY(prev.y + dy, scale)
    }));
    
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, dragStart, scale, clampX, clampY]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

  // Mouse: Shift + wheel => zoom-at-cursor; plain wheel => vertical pan when zoomed in
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
      // When zoomed in beyond fit, pan vertically with wheel
      const fitScale = getFitScale();
      if (scale > fitScale) {
        e.preventDefault();
        setPosition(prev => {
          const nextY = prev.y - (e.deltaY / scale); // pre-scale units
          return { x: clampX(prev.x, scale), y: clampY(nextY, scale) };
        });
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [containerRef, zoomAt, scale, getFitScale, clampX, clampY]);

  // Clamp position when scale/rotation/container changes to prevent over-scroll
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

  // Ensure we never remain below the fit scale (e.g., after container/rotation changes)
  useEffect(() => {
    const min = getFitScale();
    if (scale < min) setScale(min);
  }, [scale, getFitScale]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    const nat = { width: img.naturalWidth, height: img.naturalHeight };
    setNaturalDimensions(nat);
    // Pre-compute fit scale BEFORE we reveal (removes visible zoom jump)
    if (containerRef.current && nat.width && nat.height) {
      const container = containerRef.current.getBoundingClientRect();
      const containerHeight = Math.max(container.height - 32, 0);
      const scaleY = containerHeight / nat.height;
      const newScale = Math.min(scaleY, 1.0);
      setScale(isFinite(newScale) && newScale > 0 ? newScale : 1.0);
      setPosition({ x: 0, y: 0 });
    }
    setError(null);
    // Small timeout not required; show immediately after state sync
    setLoading(false);
    setFitToScreen(true);
  };

  const handleImageError = () => {
    if (fallbackIndex < fallbackChain.length - 1) {
      // Try next fallback silently
      setFallbackIndex(i => i + 1);
      return;
    }
    setError('Failed to load image');
    setLoading(false);
  };

  if (!file) {
    return (
      <div className="image-viewer flex items-center justify-center h-full bg-background dark:bg-slate-900/30">
        <div className="text-muted-foreground text-[10px]">No image selected</div>
      </div>
    );
  }

  return (
    <div 
      className={`image-viewer flex flex-col bg-background dark:bg-slate-900/30 ${className}`}
    >
      {/* Image Content */}
      <div 
        ref={containerRef}
        className={`flex-1 overflow-hidden flex items-center justify-center py-4 bg-background dark:bg-slate-900/30 ${
          scale > getFitScale() ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {loading && (
          <div className="absolute inset-0" aria-hidden="true" />
        )}

        {error && (
          <div className="flex flex-col items-center justify-center text-center text-foreground">
            <div className="text-[10px] mb-4">🖼️</div>
            <div className="text-[10px] font-medium leading-normal tracking-normal mb-2">{error}</div>
            <div className="text-muted-foreground text-[10px]">
              This is a demo - images would be loaded from your server
            </div>
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
                // Vertical translate for wheel scroll (clamped), then scale and rotate
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
        {!error && !imageUrl && (
          <div className="text-muted-foreground text-[10px]">No image source</div>
        )}
      </div>
    </div>
  );
};

export default SimpleImageViewer;