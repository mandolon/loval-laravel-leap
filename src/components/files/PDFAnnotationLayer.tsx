import { useRef, useEffect, useState } from 'react';
import { fabric } from 'fabric';
import { useGridSnapping } from '@/hooks/useGridSnapping';
import { useAnnotationTools } from '@/hooks/useAnnotationTools';
import { GridOverlay } from './GridOverlay';
import type { GridSizeKey } from '@/types/annotations';

interface PDFAnnotationLayerProps {
  pageNumber: number;
  pdfPage: any;
  scale: number;
  rotation: number;
  visible: boolean;
  viewport: any;
}

export const PDFAnnotationLayer = ({
  pageNumber,
  pdfPage,
  scale,
  rotation,
  visible,
  viewport,
}: PDFAnnotationLayerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  
  const [gridSize, setGridSize] = useState<GridSizeKey>('12"');
  const [gridVisible, setGridVisible] = useState(true);
  
  const { snapToPdfGrid, gridPoints } = useGridSnapping(gridSize, gridVisible);
  const annotationTools = useAnnotationTools();

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current || !visible) return;

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      backgroundColor: undefined,
      enableRetinaScaling: true,
      selection: false,
    });

    fabricCanvasRef.current = fabricCanvas;

    return () => {
      fabricCanvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [visible]);

  // Update canvas dimensions when viewport changes
  useEffect(() => {
    if (!canvasRef.current || !gridCanvasRef.current || !viewport) return;

    const width = viewport.width;
    const height = viewport.height;

    // Set annotation canvas size
    canvasRef.current.width = width;
    canvasRef.current.height = height;
    canvasRef.current.style.width = `${width}px`;
    canvasRef.current.style.height = `${height}px`;

    // Set grid canvas size
    gridCanvasRef.current.width = width;
    gridCanvasRef.current.height = height;
    gridCanvasRef.current.style.width = `${width}px`;
    gridCanvasRef.current.style.height = `${height}px`;

    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.setDimensions({ width, height });
      fabricCanvasRef.current.renderAll();
    }
  }, [viewport, scale, rotation]);

  // Re-render annotations when scale/rotation changes
  useEffect(() => {
    if (!fabricCanvasRef.current || !viewport) return;
    
    fabricCanvasRef.current.clear();
    annotationTools.renderAllAnnotations(fabricCanvasRef.current, viewport);
  }, [scale, rotation, viewport, annotationTools]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    annotationTools.handleMouseDown(e, viewport, fabricCanvasRef.current, snapToPdfGrid);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    annotationTools.handleMouseMove(e, viewport, fabricCanvasRef.current, snapToPdfGrid);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    annotationTools.handleMouseUp(e, viewport, fabricCanvasRef.current, snapToPdfGrid);
  };

  const handleUndo = () => {
    annotationTools.undo(fabricCanvasRef.current, viewport);
  };

  const handleRedo = () => {
    annotationTools.redo(fabricCanvasRef.current, viewport);
  };

  const handleSave = () => {
    console.log('Saving annotations:', annotationTools.annotations);
    // TODO: Implement save to database
  };

  if (!visible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
      {/* Grid overlay canvas (below annotations) */}
      <canvas
        ref={gridCanvasRef}
        className="absolute inset-0"
        style={{
          pointerEvents: 'none',
        }}
      />
      
      {/* Annotation canvas (on top) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-auto cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />

      {/* Grid overlay renderer */}
      <GridOverlay
        canvasRef={gridCanvasRef.current}
        gridPoints={gridPoints}
        visible={gridVisible}
        width={viewport?.width || 0}
        height={viewport?.height || 0}
        scale={scale}
      />

      {/* Toolbar (moved outside canvas, fixed to viewport) */}
      <div className="fixed top-0 left-0 right-0 z-50 pointer-events-auto">
        {/* Toolbar will be imported and used here */}
      </div>
    </div>
  );
};

// Export toolbar controls for parent component
export const useAnnotationControls = () => {
  const annotationTools = useAnnotationTools();
  const [gridSize, setGridSize] = useState<GridSizeKey>('12"');
  const [gridVisible, setGridVisible] = useState(true);

  return {
    ...annotationTools,
    gridSize,
    setGridSize,
    gridVisible,
    setGridVisible,
  };
};
