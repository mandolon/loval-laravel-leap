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
  const mountIdRef = useRef(Math.random().toString(36).slice(2, 8)); // Unique ID for this mount
  const renderCountRef = useRef(0);
  
  const [gridSize, setGridSize] = useState<GridSizeKey>('12"');
  const [gridVisible, setGridVisible] = useState(true);
  
  const { snapToPdfGrid, gridPoints } = useGridSnapping(gridSize, gridVisible);
  const annotationTools = useAnnotationTools();

  const MOUNT_ID = mountIdRef.current;

  // ===== COMPREHENSIVE LIFECYCLE TRACKING =====
  
  // Track every single render
  renderCountRef.current++;
  console.log(`[PDFAnnotationLayer:${MOUNT_ID}] 🔄 RENDER #${renderCountRef.current}`, {
    scale,
    rotation,
    pageNumber,
    visible,
    hasViewport: !!viewport,
    viewportSize: viewport ? `${viewport.width}x${viewport.height}` : 'null',
    timestamp: new Date().toISOString(),
  });

  // Track mount/unmount with stack trace
  useEffect(() => {
    console.log(`[PDFAnnotationLayer:${MOUNT_ID}] ✅ MOUNTED`);
    return () => {
      console.log(`[PDFAnnotationLayer:${MOUNT_ID}] ❌ UNMOUNTING - Canvas will be destroyed!`);
      console.trace(`[PDFAnnotationLayer:${MOUNT_ID}] UNMOUNT Stack trace:`);
    };
  }, [MOUNT_ID]);

  // Track canvas ref existence
  useEffect(() => {
    if (canvasRef.current) {
      console.log(`[PDFAnnotationLayer:${MOUNT_ID}] ✅ Canvas DOM element exists`, {
        width: canvasRef.current.width,
        height: canvasRef.current.height,
        inDocument: document.body.contains(canvasRef.current),
      });
    } else {
      console.log(`[PDFAnnotationLayer:${MOUNT_ID}] ❌ Canvas DOM element is NULL`);
    }
  }, [canvasRef.current, MOUNT_ID]);

  // Initialize Fabric.js canvas
  useEffect(() => {
    console.log(`[PDFAnnotationLayer:${MOUNT_ID}] 🔨 Init effect triggered`, { 
      hasCanvasRef: !!canvasRef.current, 
      visible 
    });
    
    if (!canvasRef.current || !visible) {
      console.log(`[PDFAnnotationLayer:${MOUNT_ID}] ⚠️  Cannot create fabric - ${!canvasRef.current ? 'no canvas ref' : 'not visible'}`);
      return;
    }

    console.log(`[PDFAnnotationLayer:${MOUNT_ID}] 🎨 Creating Fabric.js canvas...`);
    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      backgroundColor: undefined,
      enableRetinaScaling: true,
      selection: false,
    });

    console.log(`[PDFAnnotationLayer:${MOUNT_ID}] ✅ Fabric canvas created successfully`, {
      width: fabricCanvas.width,
      height: fabricCanvas.height,
      hasLowerCanvas: !!fabricCanvas.lowerCanvasEl,
      canvasElement: canvasRef.current
    });

    fabricCanvasRef.current = fabricCanvas;

    return () => {
      console.log(`[PDFAnnotationLayer:${MOUNT_ID}] 🗑️  DISPOSING fabric canvas on cleanup`);
      if (fabricCanvasRef.current) {
        fabricCanvas.dispose();
        console.log(`[PDFAnnotationLayer:${MOUNT_ID}] ✅ Fabric canvas disposed`);
      }
      fabricCanvasRef.current = null;
    };
  }, [visible, MOUNT_ID]);

  // Update canvas dimensions when viewport changes
  useEffect(() => {
    console.log(`[PDFAnnotationLayer:${MOUNT_ID}] 📏 Dimensions effect triggered`, {
      hasCanvasRef: !!canvasRef.current,
      hasGridCanvasRef: !!gridCanvasRef.current,
      viewport: viewport ? `${viewport.width}x${viewport.height}` : 'null',
      scale,
      rotation
    });
    
    if (!canvasRef.current || !gridCanvasRef.current || !viewport) {
      console.log(`[PDFAnnotationLayer:${MOUNT_ID}] ⚠️  Cannot update dimensions - missing refs or viewport`);
      return;
    }

    const width = viewport.width;
    const height = viewport.height;

    console.log(`[PDFAnnotationLayer:${MOUNT_ID}] ✅ Setting canvas dimensions to ${width}x${height}`);

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
      console.log(`[PDFAnnotationLayer:${MOUNT_ID}] ✅ Fabric dimensions updated`, {
        fabricWidth: fabricCanvasRef.current.width,
        fabricHeight: fabricCanvasRef.current.height
      });
      fabricCanvasRef.current.renderAll();
    } else {
      console.log(`[PDFAnnotationLayer:${MOUNT_ID}] ⚠️  Cannot update fabric dimensions - fabricCanvas is null`);
    }
  }, [viewport, scale, rotation, MOUNT_ID]);

  // Track viewport changes specifically
  useEffect(() => {
    console.log(`[PDFAnnotationLayer:${MOUNT_ID}] 🔄 Viewport updated`, {
      width: viewport?.width,
      height: viewport?.height,
    });
  }, [viewport, MOUNT_ID]);

  // Re-render annotations when scale/rotation changes
  useEffect(() => {
    console.log(`[PDFAnnotationLayer:${MOUNT_ID}] 🎨 Re-render annotations effect triggered`, {
      hasFabricCanvas: !!fabricCanvasRef.current,
      hasViewport: !!viewport,
      scale,
      rotation,
    });
    
    if (!fabricCanvasRef.current || !viewport) {
      console.log(`[PDFAnnotationLayer:${MOUNT_ID}] ⚠️  Cannot re-render - missing fabric or viewport`);
      return;
    }
    
    console.log(`[PDFAnnotationLayer:${MOUNT_ID}] 🧹 Clearing canvas and re-rendering annotations`);
    fabricCanvasRef.current.clear();
    annotationTools.renderAllAnnotations(fabricCanvasRef.current, viewport);
  }, [scale, rotation, viewport, annotationTools, MOUNT_ID]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    console.log('[PDFAnnotationLayer] MOUSEDOWN', {
      tool: annotationTools.activeTool,
      clientX: e.clientX,
      clientY: e.clientY,
      viewport,
      hasFabricCanvas: !!fabricCanvasRef.current
    });
    annotationTools.handleMouseDown(e, viewport, fabricCanvasRef.current, snapToPdfGrid);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    console.log('[PDFAnnotationLayer] MOUSEMOVE', {
      tool: annotationTools.activeTool,
      isDrawing: annotationTools.annotations.length
    });
    annotationTools.handleMouseMove(e, viewport, fabricCanvasRef.current, snapToPdfGrid);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    console.log('[PDFAnnotationLayer] MOUSEUP', {
      tool: annotationTools.activeTool,
      annotationsCount: annotationTools.annotations.length
    });
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
    <div className="absolute inset-0" style={{ zIndex: 5 }}>
      {/* Grid overlay canvas (below annotations) */}
      <canvas
        ref={gridCanvasRef}
        className="absolute inset-0 pointer-events-none"
      />
      
      {/* Annotation canvas (on top) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair"
        style={{ pointerEvents: 'auto' }}
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
