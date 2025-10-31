import React, { useCallback, useEffect, useLayoutEffect, useRef, useState, useMemo } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import { useDrawingPage, useUpdateDrawingPage } from '@/lib/api/hooks/useDrawings';
import { handleArrowCounter, resetArrowCounterState, type ArrowCounterStats } from '@/utils/excalidraw-measurement-tools';
import { logger } from '@/utils/logger';

interface Props {
  pageId: string;
  projectId: string;
  onApiReady: (api: any) => void;
  arrowCounterEnabled: boolean;
  inchesPerSceneUnit: number | null;
  onArrowStatsChange: (stats: ArrowCounterStats) => void;
}

export default function ExcalidrawCanvas({
  pageId,
  projectId,
  onApiReady,
  arrowCounterEnabled,
  inchesPerSceneUnit,
  onArrowStatsChange
}: Props) {
  const excaliRef = useRef<any>(null);
  const persistRef = useRef<any>(null);
  const changeCountRef = useRef(0);
  const onApiReadyRef = useRef(onApiReady);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  const { data: pageData, isLoading } = useDrawingPage(pageId);
  const updatePage = useUpdateDrawingPage();
  
  // Keep ref updated
  useEffect(() => {
    onApiReadyRef.current = onApiReady;
  }, [onApiReady]);
  
  // 🔍 DIAGNOSTIC: Log initial environment
  useEffect(() => {
    logger.log('🔍 ExcalidrawCanvas - Initial Environment', {
      devicePixelRatio: window.devicePixelRatio,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      pageId,
      projectId,
      timestamp: new Date().toISOString()
    });
  }, [pageId, projectId]);
  
  // Measure container dimensions and update on resize
  useLayoutEffect(() => {
    if (!wrapperRef.current) return;
    
    const updateDimensions = () => {
      const rect = wrapperRef.current!.getBoundingClientRect();
      setDimensions({ 
        width: Math.floor(rect.width), 
        height: Math.floor(rect.height) 
      });
      
      logger.log('📐 Container Dimensions Updated', {
        width: Math.floor(rect.width),
        height: Math.floor(rect.height),
        devicePixelRatio: window.devicePixelRatio
      });
    };
    
    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(wrapperRef.current);
    
    return () => observer.disconnect();
  }, []);
  
  // Reset arrow counter state when switching pages
  useEffect(() => {
    resetArrowCounterState();
    changeCountRef.current = 0;
  }, [pageId]);
  
  // Custom defaults (thin lines, sharp arrows, small text) - memoized to prevent infinite re-renders
  const defaultAppState = useMemo(() => ({
    currentItemStrokeWidth: 0.5,
    currentItemArrowType: 'sharp',
    currentItemEndArrowhead: 'triangle',
    currentItemRoughness: 0,
    currentItemFontSize: 8,
    collaborators: new Map(),
  }), []);
  
  // Safely parse excalidraw data - memoized to prevent infinite re-renders
  const excalidrawData = useMemo(() => pageData?.excalidraw_data as any, [pageData]);
  
  // Ensure collaborators is always a Map - memoized to prevent infinite re-renders
  const mergedAppState = useMemo(() => {
    const savedAppState = excalidrawData?.appState || {};
    return {
      ...defaultAppState,
      ...savedAppState,
      collaborators: new Map(), // Always use a fresh Map
    };
  }, [excalidrawData, defaultAppState]);
  
  // Memoize initialData to prevent new object references on every render
  const initialData = useMemo(() => ({
    elements: excalidrawData?.elements || [],
    appState: mergedAppState,
    files: excalidrawData?.files || {},
  }), [excalidrawData, mergedAppState]);
  
  const handleChange = useCallback((elements: any, appState: any, files: any) => {
    changeCountRef.current++;
    
    // 🔄 DIAGNOSTIC: Log first 3 changes
    if (changeCountRef.current <= 3) {
      logger.log(`🔄 Change #${changeCountRef.current}`, {
        zoom: appState?.zoom,
        scrollX: appState?.scrollX,
        scrollY: appState?.scrollY,
        elementsCount: elements?.length,
        filesCount: Object.keys(files || {}).length
      });
    }
    
    // 📸 DIAGNOSTIC: Log image imports
    if (files && Object.keys(files).length > 0) {
      Object.entries(files).forEach(([id, file]: [string, any]) => {
        if (file.dataURL) {
          const img = new Image();
          img.onload = () => {
            logger.log('📸 Image Imported', {
              imageId: id,
              imageWidth: img.width,
              imageHeight: img.height,
              canvasWidth: dimensions.width,
              canvasHeight: dimensions.height,
              scaleFactorWidth: (dimensions.width / img.width * 100).toFixed(1) + '%',
              scaleFactorHeight: (dimensions.height / img.height * 100).toFixed(1) + '%'
            });
          };
          img.src = file.dataURL;
        }
      });
    }
    
    // Ensure collaborators is always a Map
    const sanitizedAppState = {
      ...appState,
      collaborators: new Map(),
    };
    
    // Apply arrow counter if enabled
    if (arrowCounterEnabled && excaliRef.current && inchesPerSceneUnit) {
      handleArrowCounter(
        elements, 
        excaliRef.current, 
        inchesPerSceneUnit,
        onArrowStatsChange
      );
    } else if (!arrowCounterEnabled) {
      // Clear stats when disabled
      onArrowStatsChange({ count: 0, values: [] });
    }
    
    // Auto-save after 3 seconds (without collaborators field)
    if (persistRef.current) clearTimeout(persistRef.current);
    persistRef.current = setTimeout(() => {
      const { collaborators, ...appStateToSave } = sanitizedAppState;
      updatePage.mutate({
        pageId,
        excalidrawData: { elements, appState: appStateToSave, files }
      });
    }, 3000);
  }, [pageId, arrowCounterEnabled, inchesPerSceneUnit, onArrowStatsChange, updatePage, dimensions]);
  
  // 🎨 DIAGNOSTIC: Handle Excalidraw API ready
  const handleExcalidrawAPI = useCallback((api: any) => {
    excaliRef.current = api;
    onApiReadyRef.current(api);
    
    logger.log('🎨 Excalidraw API Ready', {
      appState: api.getAppState(),
      zoom: api.getAppState()?.zoom,
      viewBackgroundColor: api.getAppState()?.viewBackgroundColor
    });
    
    // 📐 DIAGNOSTIC: Log canvas metrics after API ready
    setTimeout(() => {
      const canvas = document.querySelector('.excalidraw canvas') as HTMLCanvasElement;
      if (canvas) {
        logger.log('📐 Canvas Element Metrics (100ms after API ready)', {
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          styleWidth: canvas.style.width,
          styleHeight: canvas.style.height,
          computedWidth: canvas.getBoundingClientRect().width,
          computedHeight: canvas.getBoundingClientRect().height,
          expectedWidth: window.innerWidth * window.devicePixelRatio,
          expectedHeight: window.innerHeight * window.devicePixelRatio
        });
      }
    }, 100);
    
    // ⚡ DIAGNOSTIC: Force resize after 500ms
    setTimeout(() => {
      const canvas = document.querySelector('.excalidraw canvas') as HTMLCanvasElement;
      const beforeMetrics = canvas ? {
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        zoom: api.getAppState()?.zoom
      } : null;
      
      logger.log('⚡ Triggering forced resize...', beforeMetrics);
      window.dispatchEvent(new Event('resize'));
      
      // Log after forced resize
      setTimeout(() => {
        if (canvas) {
          logger.log('📐 Canvas Metrics After Forced Resize', {
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            zoom: api.getAppState()?.zoom,
            changed: beforeMetrics && (
              canvas.width !== beforeMetrics.canvasWidth ||
              canvas.height !== beforeMetrics.canvasHeight
            )
          });
        }
      }, 100);
    }, 500);
  }, []);
  
  // 📏 DIAGNOSTIC: Monitor window resize events (only set up once)
  useEffect(() => {
    const handleResize = () => {
      if (excaliRef.current) {
        logger.log('📏 Window resized', {
          devicePixelRatio: window.devicePixelRatio,
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          zoom: excaliRef.current.getAppState()?.zoom
        });
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500">
        Loading drawing...
      </div>
    );
  }
  
  return (
    <div ref={wrapperRef} className="h-full w-full">
      {dimensions.width > 0 && (
        <div style={{ width: dimensions.width, height: dimensions.height }}>
          <Excalidraw
            excalidrawAPI={handleExcalidrawAPI}
            initialData={initialData}
            onChange={handleChange}
          />
        </div>
      )}
    </div>
  );
}
