import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import { useDrawingPage, useUpdateDrawingPage } from '@/lib/api/hooks/useDrawings';
import { handleArrowCounter, resetArrowCounterState, type ArrowCounterStats } from '@/utils/excalidraw-measurement-tools';
import { logger } from '@/utils/logger';

// Stable fallback values outside component to prevent re-renders
const EMPTY_ELEMENTS: any[] = [];
const EMPTY_FILES: Record<string, any> = {};

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
    elements: excalidrawData?.elements ?? EMPTY_ELEMENTS,
    appState: mergedAppState,
    files: excalidrawData?.files ?? EMPTY_FILES,
  }), [excalidrawData?.elements, excalidrawData?.files, mergedAppState]);
  
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
            // Get canvas metrics
            const canvas = document.querySelector('.excalidraw canvas') as HTMLCanvasElement;
            const canvasMetrics = canvas ? {
              canvasWidth: canvas.width,
              canvasHeight: canvas.height,
              styleWidth: canvas.style.width,
              styleHeight: canvas.style.height,
              computedWidth: canvas.getBoundingClientRect().width,
              computedHeight: canvas.getBoundingClientRect().height
            } : null;
            
            logger.log('📸 Image Imported - DETAILED METRICS', {
              imageId: id,
              imageNaturalWidth: img.width,
              imageNaturalHeight: img.height,
              devicePixelRatio: window.devicePixelRatio,
              viewportWidth: window.innerWidth,
              viewportHeight: window.innerHeight,
              canvas: canvasMetrics,
              expectedCanvasWidth: window.innerWidth * window.devicePixelRatio,
              expectedCanvasHeight: window.innerHeight * window.devicePixelRatio,
              imageScaleToViewport: {
                width: ((window.innerWidth / img.width) * 100).toFixed(1) + '%',
                height: ((window.innerHeight / img.height) * 100).toFixed(1) + '%'
              },
              pixelDensityMatch: canvas ? (canvas.width / canvas.getBoundingClientRect().width).toFixed(2) : 'N/A'
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
  }, [pageId, arrowCounterEnabled, inchesPerSceneUnit, onArrowStatsChange, updatePage]);
  
  // 🎨 DIAGNOSTIC: Handle Excalidraw API ready
  const handleExcalidrawAPI = useCallback((api: any) => {
    excaliRef.current = api;
    onApiReadyRef.current(api);
    
    logger.log('🎨 Excalidraw API Ready', {
      appState: api.getAppState(),
      zoom: api.getAppState()?.zoom,
      viewBackgroundColor: api.getAppState()?.viewBackgroundColor
    });
    
    // 📐 DIAGNOSTIC: Log canvas metrics immediately and after delays
    const logCanvasMetrics = (label: string, delay: number) => {
      setTimeout(() => {
        const canvas = document.querySelector('.excalidraw canvas') as HTMLCanvasElement;
        const container = document.querySelector('.excalidraw') as HTMLElement;
        
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const pixelRatio = canvas.width / rect.width;
          
          // 🔍 NEW: Traverse parent hierarchy
          const parents = [];
          let current = canvas.parentElement;
          let depth = 0;
          while (current && depth < 10) {
            const computedStyle = window.getComputedStyle(current);
            parents.push({
              depth,
              tagName: current.tagName,
              className: current.className,
              clientWidth: current.clientWidth,
              clientHeight: current.clientHeight,
              offsetWidth: current.offsetWidth,
              offsetHeight: current.offsetHeight,
              scrollWidth: current.scrollWidth,
              scrollHeight: current.scrollHeight,
              display: computedStyle.display,
              position: computedStyle.position,
              width: computedStyle.width,
              height: computedStyle.height,
              maxWidth: computedStyle.maxWidth,
              maxHeight: computedStyle.maxHeight,
              flex: computedStyle.flex,
              flexGrow: computedStyle.flexGrow,
              flexShrink: computedStyle.flexShrink,
              overflow: computedStyle.overflow,
            });
            current = current.parentElement;
            depth++;
          }
          
          // 🔍 NEW: Get canvas computed styles
          const canvasStyle = window.getComputedStyle(canvas);
          
          logger.log(`📐 ${label}`, {
            // Canvas element properties
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            canvasStyleWidth: canvas.style.width,
            canvasStyleHeight: canvas.style.height,
            
            // 🆕 Canvas computed styles
            canvasComputed: {
              width: canvasStyle.width,
              height: canvasStyle.height,
              maxWidth: canvasStyle.maxWidth,
              maxHeight: canvasStyle.maxHeight,
              display: canvasStyle.display,
              position: canvasStyle.position,
              transform: canvasStyle.transform,
            },
            
            // Computed/rendered dimensions
            computedWidth: rect.width,
            computedHeight: rect.height,
            
            // Container dimensions
            containerWidth: container?.clientWidth,
            containerHeight: container?.clientHeight,
            containerOffsetWidth: container?.offsetWidth,
            containerOffsetHeight: container?.offsetHeight,
            
            // 🆕 Container computed styles
            containerComputed: container ? {
              width: window.getComputedStyle(container).width,
              height: window.getComputedStyle(container).height,
              maxWidth: window.getComputedStyle(container).maxWidth,
              display: window.getComputedStyle(container).display,
              position: window.getComputedStyle(container).position,
            } : null,
            
            // Device & pixel ratio
            devicePixelRatio: window.devicePixelRatio,
            actualPixelRatio: pixelRatio.toFixed(2),
            pixelRatioMatch: Math.abs(pixelRatio - window.devicePixelRatio) < 0.1 ? '✅ MATCH' : '❌ MISMATCH',
            
            // Viewport
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            
            // Expected vs Actual
            expectedCanvasWidth: window.innerWidth * window.devicePixelRatio,
            expectedCanvasHeight: window.innerHeight * window.devicePixelRatio,
            widthDelta: canvas.width - (window.innerWidth * window.devicePixelRatio),
            heightDelta: canvas.height - (window.innerHeight * window.devicePixelRatio),
            
            // Zoom
            zoom: api.getAppState()?.zoom,
            
            // Quality indicator
            qualityIndicator: pixelRatio >= window.devicePixelRatio ? '✅ SHARP' : '⚠️ BLURRY',
            
            // 🆕 Parent hierarchy
            parentHierarchy: parents
          });
        } else {
          logger.log(`📐 ${label} - Canvas not found`);
        }
      }, delay);
    };
    
    logCanvasMetrics('Canvas @ API Ready (0ms)', 0);
    logCanvasMetrics('Canvas After 100ms', 100);
    logCanvasMetrics('Canvas After 500ms', 500);
    logCanvasMetrics('Canvas After 1000ms', 1000);
    
    // ⚡ DIAGNOSTIC: Force resize after 500ms
    setTimeout(() => {
      logger.log('⚡ Triggering forced resize...');
      window.dispatchEvent(new Event('resize'));
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
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 w-full relative">
        <div className="absolute inset-0">
          <Excalidraw
            excalidrawAPI={handleExcalidrawAPI}
            initialData={initialData}
            onChange={handleChange}
          />
        </div>
      </div>
    </div>
  );
}
