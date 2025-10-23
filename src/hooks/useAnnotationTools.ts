import { useRef, useCallback, useState, useMemo } from 'react';
import { fabric } from 'fabric';
import type { AnnotationTool, AnnotationData } from '@/types/annotations';

export const useAnnotationTools = () => {
  const [activeTool, setActiveTool] = useState<AnnotationTool>('pen');
  const [activeColor, setActiveColor] = useState('#ff0000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  
  const annotationsRef = useRef<AnnotationData[]>([]);
  const undoStackRef = useRef<AnnotationData[][]>([]);
  const redoStackRef = useRef<AnnotationData[][]>([]);
  
  const isDrawingRef = useRef(false);
  const currentPathRef = useRef<[number, number][]>([]);
  const startPointRef = useRef<[number, number] | null>(null);

  // THE CRITICAL FUNCTION - Use viewport conversions ONLY
  const convertScreenToPdf = useCallback((
    screenX: number,
    screenY: number,
    viewport: any
  ): [number, number] => {
    // THIS IS THE ENTIRE DIFFERENCE BETWEEN SUCCESS AND FAILURE
    const [pdfX, pdfY] = viewport.convertToPdfPoint(screenX, screenY);
    return [pdfX, pdfY];
  }, []);

  const convertPdfToScreen = useCallback((
    pdfX: number,
    pdfY: number,
    viewport: any
  ): [number, number] => {
    const [screenX, screenY] = viewport.convertToViewportPoint(pdfX, pdfY);
    return [screenX, screenY];
  }, []);

  const saveUndoState = useCallback(() => {
    undoStackRef.current.push([...annotationsRef.current]);
    redoStackRef.current = [];
  }, []);

  const addAnnotation = useCallback((annotation: AnnotationData) => {
    annotationsRef.current.push(annotation);
    saveUndoState();
  }, [saveUndoState]);

  const handleMouseDown = useCallback((
    e: React.MouseEvent<HTMLCanvasElement>,
    viewport: any,
    fabricCanvas: fabric.Canvas | null,
    snapToPdfGrid: (x: number, y: number) => [number, number]
  ) => {
    if (!fabricCanvas || !viewport) return;

    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // Convert to PDF space
    const [pdfX, pdfY] = convertScreenToPdf(screenX, screenY, viewport);

    // Apply grid snapping
    const [snappedX, snappedY] = snapToPdfGrid(pdfX, pdfY);

    if (activeTool === 'pen') {
      isDrawingRef.current = true;
      currentPathRef.current = [[snappedX, snappedY]];
    } else if (activeTool === 'line' || activeTool === 'rectangle' || activeTool === 'circle') {
      isDrawingRef.current = true;
      startPointRef.current = [snappedX, snappedY];
    } else if (activeTool === 'text') {
      // For text tool, immediately create a text annotation
      const annotation: AnnotationData = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'text',
        pdfCoordinates: [[snappedX, snappedY]],
        color: activeColor,
        strokeWidth,
        text: 'Text',
        timestamp: Date.now(),
        version: 1,
      };
      addAnnotation(annotation);
      renderAnnotationOnFabric(annotation, fabricCanvas, viewport);
    } else if (activeTool === 'eraser') {
      // Find and remove annotation at this point
      // For now, just log - full implementation would need click detection
      console.log('Eraser clicked at:', snappedX, snappedY);
    }
  }, [activeTool, activeColor, strokeWidth, convertScreenToPdf, addAnnotation]);

  const handleMouseMove = useCallback((
    e: React.MouseEvent<HTMLCanvasElement>,
    viewport: any,
    fabricCanvas: fabric.Canvas | null,
    snapToPdfGrid: (x: number, y: number) => [number, number]
  ) => {
    if (!isDrawingRef.current || !fabricCanvas || !viewport) return;

    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const [pdfX, pdfY] = convertScreenToPdf(screenX, screenY, viewport);
    const [snappedX, snappedY] = snapToPdfGrid(pdfX, pdfY);

    if (activeTool === 'pen') {
      currentPathRef.current.push([snappedX, snappedY]);
      
      // Render the current path in real-time
      fabricCanvas.clear();
      renderAllAnnotations(fabricCanvas, viewport);
      
      const screenPath = currentPathRef.current.map(([px, py]) => 
        convertPdfToScreen(px, py, viewport)
      );
      const pathString = screenPath.map((p, i) => 
        `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`
      ).join(' ');
      
      const path = new fabric.Path(pathString, {
        stroke: activeColor,
        strokeWidth,
        fill: undefined,
      });
      fabricCanvas.add(path);
      fabricCanvas.renderAll();
    }
  }, [activeTool, activeColor, strokeWidth, convertScreenToPdf, convertPdfToScreen]);

  const handleMouseUp = useCallback((
    e: React.MouseEvent<HTMLCanvasElement>,
    viewport: any,
    fabricCanvas: fabric.Canvas | null,
    snapToPdfGrid: (x: number, y: number) => [number, number]
  ) => {
    if (!isDrawingRef.current || !fabricCanvas || !viewport) return;

    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const [pdfX, pdfY] = convertScreenToPdf(screenX, screenY, viewport);
    const [snappedX, snappedY] = snapToPdfGrid(pdfX, pdfY);

    if (activeTool === 'pen' && currentPathRef.current.length > 0) {
      const annotation: AnnotationData = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'pen',
        pdfCoordinates: currentPathRef.current,
        color: activeColor,
        strokeWidth,
        timestamp: Date.now(),
        version: 1,
      };
      addAnnotation(annotation);
    } else if (activeTool === 'line' && startPointRef.current) {
      const annotation: AnnotationData = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'line',
        pdfCoordinates: [startPointRef.current, [snappedX, snappedY]],
        color: activeColor,
        strokeWidth,
        timestamp: Date.now(),
        version: 1,
      };
      addAnnotation(annotation);
    } else if (activeTool === 'rectangle' && startPointRef.current) {
      const annotation: AnnotationData = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'rectangle',
        pdfCoordinates: [startPointRef.current, [snappedX, snappedY]],
        color: activeColor,
        strokeWidth,
        timestamp: Date.now(),
        version: 1,
      };
      addAnnotation(annotation);
    } else if (activeTool === 'circle' && startPointRef.current) {
      const annotation: AnnotationData = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'circle',
        pdfCoordinates: [startPointRef.current, [snappedX, snappedY]],
        color: activeColor,
        strokeWidth,
        timestamp: Date.now(),
        version: 1,
      };
      addAnnotation(annotation);
    }

    isDrawingRef.current = false;
    currentPathRef.current = [];
    startPointRef.current = null;

    // Re-render all annotations
    fabricCanvas.clear();
    renderAllAnnotations(fabricCanvas, viewport);
  }, [activeTool, activeColor, strokeWidth, convertScreenToPdf, addAnnotation]);

  const renderAnnotationOnFabric = useCallback((
    annotation: AnnotationData,
    fabricCanvas: fabric.Canvas,
    viewport: any
  ) => {
    if (!viewport) return;

    const screenCoords = annotation.pdfCoordinates.map(([pdfX, pdfY]) =>
      convertPdfToScreen(pdfX, pdfY, viewport)
    );

    if (annotation.type === 'pen') {
      const pathString = screenCoords.map((p, i) =>
        `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`
      ).join(' ');
      const path = new fabric.Path(pathString, {
        stroke: annotation.color,
        strokeWidth: annotation.strokeWidth,
        fill: undefined,
        selectable: false,
      });
      fabricCanvas.add(path);
    } else if (annotation.type === 'line' && screenCoords.length >= 2) {
      const [x1, y1] = screenCoords[0];
      const [x2, y2] = screenCoords[1];
      const line = new fabric.Line([x1, y1, x2, y2], {
        stroke: annotation.color,
        strokeWidth: annotation.strokeWidth,
        selectable: false,
      });
      fabricCanvas.add(line);
    } else if (annotation.type === 'rectangle' && screenCoords.length >= 2) {
      const [x1, y1] = screenCoords[0];
      const [x2, y2] = screenCoords[1];
      const rect = new fabric.Rect({
        left: Math.min(x1, x2),
        top: Math.min(y1, y2),
        width: Math.abs(x2 - x1),
        height: Math.abs(y2 - y1),
        stroke: annotation.color,
        strokeWidth: annotation.strokeWidth,
        fill: undefined,
        selectable: false,
      });
      fabricCanvas.add(rect);
    } else if (annotation.type === 'circle' && screenCoords.length >= 2) {
      const [cx, cy] = screenCoords[0];
      const [ex, ey] = screenCoords[1];
      const radius = Math.sqrt((ex - cx) ** 2 + (ey - cy) ** 2);
      const circle = new fabric.Circle({
        left: cx - radius,
        top: cy - radius,
        radius,
        stroke: annotation.color,
        strokeWidth: annotation.strokeWidth,
        fill: undefined,
        selectable: false,
      });
      fabricCanvas.add(circle);
    } else if (annotation.type === 'text' && screenCoords.length >= 1) {
      const [x, y] = screenCoords[0];
      const text = new fabric.IText(annotation.text || 'Text', {
        left: x,
        top: y,
        fill: annotation.color,
        fontSize: 16,
        selectable: false,
      });
      fabricCanvas.add(text);
    }
  }, [convertPdfToScreen]);

  const renderAllAnnotations = useCallback((
    fabricCanvas: fabric.Canvas,
    viewport: any
  ) => {
    annotationsRef.current.forEach(annotation => {
      renderAnnotationOnFabric(annotation, fabricCanvas, viewport);
    });
    fabricCanvas.renderAll();
  }, [renderAnnotationOnFabric]);

  const undo = useCallback((fabricCanvas: fabric.Canvas | null, viewport: any) => {
    if (undoStackRef.current.length > 0 && fabricCanvas && viewport) {
      redoStackRef.current.push([...annotationsRef.current]);
      annotationsRef.current = undoStackRef.current.pop() || [];
      fabricCanvas.clear();
      renderAllAnnotations(fabricCanvas, viewport);
    }
  }, [renderAllAnnotations]);

  const redo = useCallback((fabricCanvas: fabric.Canvas | null, viewport: any) => {
    if (redoStackRef.current.length > 0 && fabricCanvas && viewport) {
      undoStackRef.current.push([...annotationsRef.current]);
      annotationsRef.current = redoStackRef.current.pop() || [];
      fabricCanvas.clear();
      renderAllAnnotations(fabricCanvas, viewport);
    }
  }, [renderAllAnnotations]);

  const clearAll = useCallback(() => {
    saveUndoState();
    annotationsRef.current = [];
  }, [saveUndoState]);

  return useMemo(() => ({
    activeTool,
    setActiveTool,
    activeColor,
    setActiveColor,
    strokeWidth,
    setStrokeWidth,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    undo,
    redo,
    clearAll,
    renderAllAnnotations,
    annotations: annotationsRef.current,
  }), [
    activeTool,
    activeColor,
    strokeWidth,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    undo,
    redo,
    clearAll,
    renderAllAnnotations,
  ]);
};
