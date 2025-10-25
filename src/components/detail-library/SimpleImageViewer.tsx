import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '@/utils/logger';

interface SimpleImageViewerProps {
  file: { url: string; name?: string };
  className?: string;
}

const SimpleImageViewer = ({ file, className = '' }: SimpleImageViewerProps) => {
  const [scale, setScale] = useState(1.0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [naturalDimensions, setNaturalDimensions] = useState({ width: 0, height: 0 });
  const [fitToScreen, setFitToScreen] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  // Calculate fit-to-screen scale
  const getFitScale = useCallback(() => {
    if (!containerRef.current || !naturalDimensions.width || !naturalDimensions.height) return 1.0;
    const rect = containerRef.current.getBoundingClientRect();
    const availableHeight = Math.max(rect.height - 32, 0);
    const availableWidth = Math.max(rect.width - 32, 0);
    const scaleX = availableWidth / naturalDimensions.width;
    const scaleY = availableHeight / naturalDimensions.height;
    return Math.min(scaleX, scaleY, 1.0);
  }, [naturalDimensions]);

  // Clamp position
  const clampPosition = useCallback((x: number, y: number, currentScale: number) => {
    if (!containerRef.current || !naturalDimensions.width || !naturalDimensions.height) {
      return { x: 0, y: 0 };
    }
    const rect = containerRef.current.getBoundingClientRect();
    const scaledWidth = naturalDimensions.width * currentScale;
    const scaledHeight = naturalDimensions.height * currentScale;
    
    const maxOffsetX = Math.max((scaledWidth - rect.width) / 2, 0);
    const maxOffsetY = Math.max((scaledHeight - rect.height) / 2, 0);
    
    return {
      x: Math.max(-maxOffsetX, Math.min(x, maxOffsetX)),
      y: Math.max(-maxOffsetY, Math.min(y, maxOffsetY)),
    };
  }, [naturalDimensions]);

  // Zoom at point
  const zoomAt = useCallback((direction: 'in' | 'out', clientX?: number, clientY?: number) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const vx = clientX != null ? (clientX - rect.left - rect.width / 2) : 0;
    const vy = clientY != null ? (clientY - rect.top - rect.height / 2) : 0;

    const factor = 1.2;
    const fit = getFitScale();
    const oldS = scale;
    const newS = Math.max(fit, Math.min(direction === 'in' ? oldS * factor : oldS / factor, 5.0));
    
    if (newS === oldS) return;

    const dx = vx * (1 / newS - 1 / oldS);
    const dy = vy * (1 / newS - 1 / oldS);

    setScale(newS);
    setPosition(prev => clampPosition(prev.x + dx, prev.y + dy, newS));
    setFitToScreen(false);
  }, [scale, getFitScale, clampPosition]);

  // Mouse wheel zoom (Shift + wheel)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.shiftKey) {
        e.preventDefault();
        const dir = e.deltaY < 0 ? 'in' : 'out';
        zoomAt(dir, e.clientX, e.clientY);
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [zoomAt]);

  // Mouse drag pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const fit = getFitScale();
    if (scale <= fit) return;
    
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  }, [scale, position, getFitScale]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const newPos = clampPosition(
      dragStartRef.current.posX + dx,
      dragStartRef.current.posY + dy,
      scale
    );
    setPosition(newPos);
  }, [isDragging, scale, clampPosition]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Reset to fit on load
  useEffect(() => {
    if (fitToScreen && naturalDimensions.width > 0) {
      const fitScale = getFitScale();
      setScale(fitScale);
      setPosition({ x: 0, y: 0 });
    }
  }, [fitToScreen, naturalDimensions, getFitScale]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    setLoading(false);
  };

  const handleImageError = () => {
    setError('Failed to load image');
    setLoading(false);
  };

  if (error) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden flex items-center justify-center ${className}`}
      onMouseDown={handleMouseDown}
      style={{ cursor: isDragging ? 'grabbing' : scale > getFitScale() ? 'grab' : 'default' }}
    >
      <img
        src={file.url}
        alt={file.name || 'Image'}
        onLoad={handleImageLoad}
        onError={handleImageError}
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: 'center center',
          maxWidth: 'none',
          maxHeight: 'none',
          userSelect: 'none',
        }}
        draggable={false}
      />
    </div>
  );
};

export default SimpleImageViewer;
