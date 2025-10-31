import React, { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import { useDrawingPage, useUpdateDrawingPage } from '@/lib/api/hooks/useDrawings';
import { handleArrowCounter, resetArrowCounterState, lengthOfArrow, type ArrowCounterStats } from '@/utils/excalidraw-measurement-tools';
import { logger } from '@/utils/logger';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import * as DialogPrimitive from '@radix-ui/react-dialog';

// Stable fallback values outside component to prevent re-renders
const EMPTY_ELEMENTS: any[] = [];
const EMPTY_FILES: Record<string, any> = {};

interface Props {
  pageId: string;
  projectId: string;
  onApiReady: (api: any) => void;
  inchesPerSceneUnit: number | null;
  onArrowStatsChange: (stats: ArrowCounterStats) => void;
  onCalibrationChange?: (pxPerStep: number) => void;
}

export default function ExcalidrawCanvas({
  pageId,
  projectId,
  onApiReady,
  inchesPerSceneUnit,
  onArrowStatsChange,
  onCalibrationChange
}: Props) {
  const excaliRef = useRef<any>(null);
  const persistRef = useRef<any>(null);
  const changeCountRef = useRef(0);
  const onApiReadyRef = useRef(onApiReady);
  const loggedImageIdsRef = useRef<Set<string>>(new Set());
  
  // Popup state (styled like existing page UI)
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [calibrateOpen, setCalibrateOpen] = useState(false);
  const [calibrateInput, setCalibrateInput] = useState('');
  const [calibrateError, setCalibrateError] = useState<string | null>(null);
  const pendingArrowLengthPxRef = useRef<number | null>(null);
  
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
      timestamp: new Date().toISOString(),
      customMaxImageSize: 10000 // 🔥 TODO: Modify in fork source
    });
    
    // 🔥 DISABLED: Runtime patch - causes React rendering errors with fork
    // patchExcalidrawImageResize();
  }, [pageId, projectId]);
  
  // Reset arrow counter state when switching pages
  useEffect(() => {
    resetArrowCounterState();
    changeCountRef.current = 0;
    loggedImageIdsRef.current.clear(); // Reset logged image IDs when switching pages
  }, [pageId]);
  
  // Always run arrow counter when inchesPerSceneUnit is available
  // Only run when pageId is actually set (page is loaded)
  useEffect(() => {
    if (!pageId || !excaliRef.current || !inchesPerSceneUnit) return;
    
    try {
      const elements = excaliRef.current.getSceneElements();
      if (elements && elements.length > 0) {
        handleArrowCounter(
          elements,
          excaliRef.current,
          inchesPerSceneUnit,
          onArrowStatsChange
        );
      }
    } catch (error) {
      console.error('Error in arrow counter useEffect:', error);
      // Don't throw - just log and continue
    }
  }, [inchesPerSceneUnit, pageId, onArrowStatsChange]);
  
  // Handle calibration event from ProjectPanel
  useEffect(() => {
    const handleCalibrationTrigger = () => {
      if (!excaliRef.current) {
        setAlertMessage('Excalidraw not ready');
        setAlertOpen(true);
        return;
      }

      // Get current scene elements
      const elements = excaliRef.current.getSceneElements();
      const appState = excaliRef.current.getAppState();

      // Find selected arrow element
      const selectedIds = appState.selectedElementIds || {};
      const selectedElements = elements.filter((el: any) => selectedIds[el.id]);
      const arrowElements = selectedElements.filter((el: any) => 
        el.type === 'arrow' && !el.isDeleted
      );

      if (arrowElements.length === 0 || arrowElements.length > 1) {
        setAlertMessage('Please select an arrow to calibrate the scale');
        setAlertOpen(true);
        return;
      }

      // Calculate arrow length in pixels - USE CORRECT FUNCTION
      const arrow = arrowElements[0];
      const lengthPx = lengthOfArrow(arrow);  // ✅ Uses proper multi-segment calculation

      // Open styled Calibration dialog
      pendingArrowLengthPxRef.current = lengthPx;
      setCalibrateInput('');
      setCalibrateError(null);
      setCalibrateOpen(true);
    };

      window.addEventListener('trigger-calibration', handleCalibrationTrigger);
      return () => window.removeEventListener('trigger-calibration', handleCalibrationTrigger);
    }, [onCalibrationChange]);

  // Submit handler for calibration dialog
  const handleCalibrateSubmit = useCallback(() => {
    const lengthPx = pendingArrowLengthPxRef.current;
    if (!lengthPx) {
      setCalibrateOpen(false);
      return;
    }
    const inches = parseFloat(calibrateInput);
    if (isNaN(inches) || inches <= 0) {
      setCalibrateError('Please enter a valid positive number');
      return;
    }
    const newInchesPerSceneUnit = inches / lengthPx;
    onCalibrationChange?.(newInchesPerSceneUnit);
    logger.log('🎯 Calibration Complete', {
      arrowLengthPx: lengthPx,
      realWorldInches: inches,
      newInchesPerSceneUnit,
      pxPerInch: 1 / newInchesPerSceneUnit,
    });
    setCalibrateOpen(false);
  }, [calibrateInput, onCalibrationChange]);

  
  // Custom defaults (thin lines, sharp arrows, small text) - memoized to prevent infinite re-renders
  const defaultAppState = useMemo(() => ({
    currentItemStrokeWidth: 0.5,
    currentItemArrowType: 'sharp',
    currentItemEndArrowhead: 'triangle',
    currentItemRoughness: 0,
    currentItemFontSize: 8,
    collaborators: new Map(),
    // 🔥 CRITICAL: Use higher devicePixelRatio for sharper rendering at zoom
    devicePixelRatio: Math.max(2, window.devicePixelRatio),
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
    
    // 📸 ULTRA-DIAGNOSTIC: Log EVERYTHING about image imports
    if (files && Object.keys(files).length > 0) {
      Object.entries(files).forEach(([id, file]: [string, any]) => {
        // Skip if this image has already been logged to prevent infinite loops
        if (loggedImageIdsRef.current.has(id)) {
          return;
        }
        
        if (file.dataURL) {
          // Mark this image as logged before processing
          loggedImageIdsRef.current.add(id);
          
          const img = new Image();
          img.onload = () => {
            // Get ALL canvas elements and contexts
            const canvases = Array.from(document.querySelectorAll('.excalidraw canvas')) as HTMLCanvasElement[];
            const canvas = canvases[0];
            const canvasContext = canvas?.getContext('2d');
            const canvasContext2 = canvas?.getContext('2d', { alpha: true, desynchronized: false });
            
            // 🔥 NEW: Get ALL canvas attributes
            const allCanvasAttributes: any = {};
            if (canvas) {
              for (let i = 0; i < canvas.attributes.length; i++) {
                const attr = canvas.attributes[i];
                allCanvasAttributes[attr.name] = attr.value;
              }
            }
            
            // Parse dataURL
            const dataURLParts = file.dataURL.split(',');
            const header = dataURLParts[0];
            const base64Data = dataURLParts[1];
            const format = header.match(/image\/(\w+)/)?.[1] || 'unknown';
            const isBase64 = header.includes('base64');
            const dataSize = base64Data ? base64Data.length : 0;
            const estimatedBytes = isBase64 ? (dataSize * 3) / 4 : dataSize;
            
            // 🔥 NEW: Find ALL image-related elements in DOM
            const allImgElements = Array.from(document.querySelectorAll('.excalidraw *')).filter((el: any) => {
              const tag = el.tagName?.toLowerCase();
              return tag === 'img' || tag === 'image' || tag === 'svg' || el.style?.backgroundImage;
            });
            
            // 🔥 NEW: Get parent container hierarchy
            let parentChain: any[] = [];
            let current = canvas?.parentElement;
            let depth = 0;
            while (current && depth < 15) {
              const rect = current.getBoundingClientRect();
              const computedStyle = window.getComputedStyle(current);
              parentChain.push({
                depth,
                tagName: current.tagName,
                className: current.className,
                id: current.id,
                width: rect.width,
                height: rect.height,
                position: computedStyle.position,
                display: computedStyle.display,
                overflow: computedStyle.overflow,
                transform: computedStyle.transform,
                willChange: computedStyle.willChange,
              });
              current = current.parentElement;
              depth++;
            }
            
            // Find the Excalidraw image element data
            const imageElement = elements?.find((el: any) => el.type === 'image' && el.fileId === id);
            
            // 🔥 NEW: Get ALL canvas context properties
            const contextProps = canvasContext ? {
              // Drawing state
              fillStyle: canvasContext.fillStyle,
              strokeStyle: canvasContext.strokeStyle,
              globalAlpha: canvasContext.globalAlpha,
              globalCompositeOperation: canvasContext.globalCompositeOperation,
              
              // Line styles
              lineWidth: canvasContext.lineWidth,
              lineCap: canvasContext.lineCap,
              lineJoin: canvasContext.lineJoin,
              miterLimit: canvasContext.miterLimit,
              lineDashOffset: canvasContext.lineDashOffset,
              
              // Text
              font: canvasContext.font,
              textAlign: canvasContext.textAlign,
              textBaseline: canvasContext.textBaseline,
              direction: canvasContext.direction,
              
              // Image smoothing (CRITICAL)
              imageSmoothingEnabled: canvasContext.imageSmoothingEnabled,
              imageSmoothingQuality: canvasContext.imageSmoothingQuality,
              
              // Shadows
              shadowBlur: canvasContext.shadowBlur,
              shadowColor: canvasContext.shadowColor,
              shadowOffsetX: canvasContext.shadowOffsetX,
              shadowOffsetY: canvasContext.shadowOffsetY,
              
              // Transforms
              currentTransform: canvasContext.getTransform ? {
                a: canvasContext.getTransform().a,
                b: canvasContext.getTransform().b,
                c: canvasContext.getTransform().c,
                d: canvasContext.getTransform().d,
                e: canvasContext.getTransform().e,
                f: canvasContext.getTransform().f,
              } : 'Not available',
            } : null;
            
            // 🔥 NEW: Check image decode status
            const imageDecodeInfo: any = {
              complete: img.complete,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight,
              width: img.width,
              height: img.height,
              decoding: (img as any).decoding || 'unknown',
            };
            
            // 🔥 NEW: Get browser rendering hints
            const renderingHints = {
              hardwareConcurrency: navigator.hardwareConcurrency,
              deviceMemory: (navigator as any).deviceMemory || 'unknown',
              maxTouchPoints: navigator.maxTouchPoints,
              userAgent: navigator.userAgent.substring(0, 100),
            };
            
            // 🔥 NEW: Check all CSS properties affecting rendering
            const canvasComputedStyle = canvas ? window.getComputedStyle(canvas) : null;
            const canvasRenderingCSS = canvasComputedStyle ? {
              imageRendering: canvasComputedStyle.imageRendering,
              transform: canvasComputedStyle.transform,
              transformOrigin: canvasComputedStyle.transformOrigin,
              transformStyle: canvasComputedStyle.transformStyle,
              backfaceVisibility: canvasComputedStyle.backfaceVisibility,
              perspective: canvasComputedStyle.perspective,
              willChange: canvasComputedStyle.willChange,
              filter: canvasComputedStyle.filter,
              opacity: canvasComputedStyle.opacity,
              mixBlendMode: canvasComputedStyle.mixBlendMode,
              isolation: canvasComputedStyle.isolation,
            } : null;
            
            logger.log('🔥 ULTRA-DIAGNOSTIC: Image Import', {
              // Basic
              imageId: id,
              imageNaturalWidth: img.width,
              imageNaturalHeight: img.height,
              
              // Image data
              imageData: {
                format,
                isBase64,
                dataURLLength: file.dataURL.length,
                base64Length: dataSize,
                estimatedBytes,
                estimatedKB: (estimatedBytes / 1024).toFixed(2),
                estimatedMB: (estimatedBytes / 1024 / 1024).toFixed(3),
                compressionRatio: img.width && img.height ? 
                  ((estimatedBytes / (img.width * img.height * 4)) * 100).toFixed(1) + '%' : 'N/A'
              },
              
              // 🔥 NEW: Image decode info
              imageDecodeInfo,
              
              // Excalidraw element
              excalidrawElement: imageElement || 'Not found',
              
              // Render scale
              renderScale: imageElement ? {
                scaleX: imageElement.width / img.width,
                scaleY: imageElement.height / img.height,
                isDownscaled: imageElement.width < img.width || imageElement.height < img.height,
                isUpscaled: imageElement.width > img.width || imageElement.height > img.height,
                scaleFactor: ((imageElement.width / img.width) * 100).toFixed(1) + '%',
                actualDisplayWidth: imageElement.width,
                actualDisplayHeight: imageElement.height,
                pixelLoss: img.width > 0 ? ((1 - imageElement.width / img.width) * 100).toFixed(1) + '%' : 'N/A'
              } : null,
              
              // Canvas info
              canvas: canvas ? {
                width: canvas.width,
                height: canvas.height,
                clientWidth: canvas.clientWidth,
                clientHeight: canvas.clientHeight,
                offsetWidth: canvas.offsetWidth,
                offsetHeight: canvas.offsetHeight,
                scrollWidth: canvas.scrollWidth,
                scrollHeight: canvas.scrollHeight,
                styleWidth: canvas.style.width,
                styleHeight: canvas.style.height,
                boundingRect: canvas.getBoundingClientRect(),
              } : null,
              
              // 🔥 NEW: All canvas attributes
              canvasAttributes: allCanvasAttributes,
              
              // 🔥 NEW: Canvas rendering CSS
              canvasRenderingCSS,
              
              // 🔥 NEW: ALL context properties
              canvasContextProperties: contextProps,
              
              // 🔥 NEW: Parent container chain
              parentChain,
              
              // 🔥 NEW: All image elements found
              allImageElementsFound: allImgElements.length,
              
              // Device
              devicePixelRatio: window.devicePixelRatio,
              viewportWidth: window.innerWidth,
              viewportHeight: window.innerHeight,
              
              // 🔥 NEW: Browser hints
              renderingHints,
              
              // Zoom
              currentZoom: appState?.zoom?.value || appState?.zoom || 1,
              
              // Quality
              pixelDensityMatch: canvas ? (canvas.width / canvas.getBoundingClientRect().width).toFixed(2) : 'N/A',
              
              // Blur risks
              blurRiskFactors: {
                lowResolutionSource: img.width < 1920 || img.height < 1080,
                heavyCompression: estimatedBytes < (img.width * img.height * 0.5),
                upscaling: imageElement && (imageElement.width > img.width || imageElement.height > img.height),
                downscaling: imageElement && (imageElement.width < img.width || imageElement.height < img.height),
                zoomLevel: (appState?.zoom?.value || appState?.zoom || 1) > 1,
                devicePixelRatio: window.devicePixelRatio > 1,
                lowQualitySmoothing: canvasContext?.imageSmoothingQuality === 'low' || canvasContext?.imageSmoothingQuality === 'medium',
                imageRenderingCSS: canvasComputedStyle?.imageRendering,
              }
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
    
    // Always apply arrow counter if inchesPerSceneUnit is available
    if (excaliRef.current && inchesPerSceneUnit) {
      handleArrowCounter(
        elements, 
        excaliRef.current, 
        inchesPerSceneUnit,
        onArrowStatsChange
      );
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
  }, [pageId, inchesPerSceneUnit, onArrowStatsChange, updatePage]);
  
  // 🎨 DIAGNOSTIC: Handle Excalidraw API ready
  const handleExcalidrawAPI = useCallback((api: any) => {
    excaliRef.current = api;
    onApiReadyRef.current(api);
    
    logger.log('🎨 Excalidraw API Ready', {
      appState: api.getAppState(),
      zoom: api.getAppState()?.zoom,
      viewBackgroundColor: api.getAppState()?.viewBackgroundColor
    });
    
    // 🔥 NEW: Monitor drawImage calls
    setTimeout(() => {
      const canvas = document.querySelector('.excalidraw canvas') as HTMLCanvasElement;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const originalDrawImage = ctx.drawImage.bind(ctx);
          let drawImageCallCount = 0;
          
          (ctx as any).drawImage = function(...args: any[]) {
            drawImageCallCount++;
            
            // Log first 5 drawImage calls for images
            if (drawImageCallCount <= 5 && args[0] instanceof HTMLImageElement) {
              logger.log('🖼️ drawImage called', {
                callNumber: drawImageCallCount,
                imageSrc: args[0].src?.substring(0, 100),
                imageNaturalWidth: args[0].naturalWidth,
                imageNaturalHeight: args[0].naturalHeight,
                args: args.slice(1), // dx, dy, dw, dh, sx, sy, sw, sh
                currentSmoothingEnabled: ctx.imageSmoothingEnabled,
                currentSmoothingQuality: ctx.imageSmoothingQuality,
                currentImageRendering: canvas.style.imageRendering,
                canvasTransform: ctx.getTransform ? {
                  a: ctx.getTransform().a,
                  d: ctx.getTransform().d,
                } : null
              });
            }
            
            // ALWAYS ensure high quality before drawing
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            return originalDrawImage.apply(this, args);
          };
          
          logger.log('✅ drawImage interceptor installed');
        }
      }
    }, 100);
    
    // 🔥 NEW: Monitor canvas property changes
    setTimeout(() => {
      const canvas = document.querySelector('.excalidraw canvas') as HTMLCanvasElement;
      if (canvas) {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'attributes') {
              logger.log('⚠️ Canvas attribute changed', {
                attribute: mutation.attributeName,
                oldValue: mutation.oldValue,
                newValue: canvas.getAttribute(mutation.attributeName || ''),
                imageRendering: canvas.style.imageRendering,
                timestamp: Date.now()
              });
            }
          });
        });
        
        observer.observe(canvas, {
          attributes: true,
          attributeOldValue: true,
          attributeFilter: ['style', 'class', 'width', 'height']
        });
        
        logger.log('✅ Canvas mutation observer installed');
      }
    }, 100);
    
    // 🔥 NEW: Check for multiple canvases
    setTimeout(() => {
      const allCanvases = document.querySelectorAll('.excalidraw canvas');
      logger.log('🔍 All Excalidraw canvases found', {
        count: allCanvases.length,
        canvases: Array.from(allCanvases).map((c, i) => {
          const canvas = c as HTMLCanvasElement;
          const ctx = canvas.getContext('2d');
          return {
            index: i,
            className: canvas.className,
            width: canvas.width,
            height: canvas.height,
            imageRendering: window.getComputedStyle(canvas).imageRendering,
            imageSmoothingEnabled: ctx?.imageSmoothingEnabled,
            imageSmoothingQuality: ctx?.imageSmoothingQuality,
          };
        })
      });
    }, 200);
    
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
              imageRendering: canvasStyle.imageRendering,
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
    
    // 🎯 FIX: Force high-quality image rendering
    const forceHighQualityRendering = () => {
      const canvas = document.querySelector('.excalidraw canvas') as HTMLCanvasElement;
      if (canvas) {
        // Fix CSS image-rendering (CRITICAL - was "pixelated")
        canvas.style.imageRendering = 'auto';
        canvas.style.setProperty('image-rendering', 'auto', 'important');
        
        // Fix canvas context smoothing quality
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const wasLowQuality = ctx.imageSmoothingQuality === 'low';
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          logger.log('🎯 Canvas Rendering Quality Fixed', {
            cssImageRendering: canvas.style.imageRendering,
            contextSmoothingQuality: ctx.imageSmoothingQuality,
            contextSmoothingEnabled: ctx.imageSmoothingEnabled,
            wasLowQuality
          });
          
          // Force a re-render
          if (wasLowQuality) {
            api.refresh();
            logger.log('🔄 Forced canvas refresh after quality fix');
          }
        }
      }
    };
    
    // Apply immediately and after delays
    setTimeout(forceHighQualityRendering, 0);
    setTimeout(forceHighQualityRendering, 100);
    setTimeout(forceHighQualityRendering, 500);
    setTimeout(forceHighQualityRendering, 1000);
    
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

      {/* Alert for selection/enable issues */}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Calibration</AlertDialogTitle>
            <AlertDialogDescription>
              {alertMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction asChild>
              <Button onClick={() => setAlertOpen(false)}>OK</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Calibration dialog with lighter overlay (match Help style) */}
      <DialogPrimitive.Root open={calibrateOpen} onOpenChange={setCalibrateOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-4 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg"
          >
            <div className="flex flex-col space-y-1.5 text-center sm:text-left">
              <h2 className="text-lg font-semibold leading-none tracking-tight">Calibrate arrow</h2>
              <p className="text-base text-muted-foreground">What is this arrow’s length per plan?</p>
            </div>
            <div className="grid gap-3 py-2">
              <Input
                placeholder="Enter arrow length in inches."
                value={calibrateInput}
                onChange={(e) => {
                  setCalibrateInput(e.target.value);
                  if (calibrateError) setCalibrateError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCalibrateSubmit();
                  }
                }}
                inputMode="decimal"
              />
              {calibrateError && (
                <p className="text-xs text-red-600">{calibrateError}</p>
              )}
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
              <Button variant="outline" onClick={() => setCalibrateOpen(false)}>Cancel</Button>
              <Button onClick={handleCalibrateSubmit}>Set</Button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
