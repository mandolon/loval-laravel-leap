import React, { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import { useDrawingPage, useUpdateDrawingPage } from '@/lib/api/hooks/useDrawings';
import { handleArrowCounter, resetArrowCounterState, lengthOfArrow, type ArrowCounterStats } from '@/utils/excalidraw-measurement-tools';
import { logger } from '@/utils/logger';
import { DrawingLoadingSkeleton } from './DrawingLoadingSkeleton';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
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
  const onArrowStatsChangeRef = useRef(onArrowStatsChange);
  const loggedImageIdsRef = useRef<Set<string>>(new Set());
  
  // Popup state (styled like existing page UI)
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [calibrateOpen, setCalibrateOpen] = useState(false);
  const [calibrateInput, setCalibrateInput] = useState('');
  const [calibrateError, setCalibrateError] = useState<string | null>(null);
  const pendingArrowLengthPxRef = useRef<number | null>(null);
  
  // Loading state management
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showTimeout, setShowTimeout] = useState(false);
  const loadStartTimeRef = useRef<number>(Date.now());
  const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const { data: pageData, isLoading, error, refetch } = useDrawingPage(pageId);
  const updatePage = useUpdateDrawingPage();
  const { toast } = useToast();
  
  // Keep refs updated
  useEffect(() => {
    onApiReadyRef.current = onApiReady;
    onArrowStatsChangeRef.current = onArrowStatsChange;
  }, [onApiReady, onArrowStatsChange]);
  
  // Loading progress simulation and timeout tracking
  useEffect(() => {
    if (isLoading) {
      loadStartTimeRef.current = Date.now();
      setLoadingProgress(0);
      setShowTimeout(false);
      
      // Simulate progress (faster early, slower later)
      const interval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 90) return prev; // Stop at 90% until actually loaded
          const increment = prev < 30 ? 15 : prev < 60 ? 10 : 5;
          return Math.min(prev + increment, 90);
        });
      }, 300);
      
      // Set timeout warning after 10 seconds
      timeoutTimerRef.current = setTimeout(() => {
        if (isLoading) {
          setShowTimeout(true);
          toast({
            title: "Loading taking longer than expected",
            description: "Large drawings may take a while to load. Please wait...",
            variant: "default",
          });
        }
      }, 10000);
      
      return () => {
        clearInterval(interval);
        if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
      };
    } else if (pageData) {
      // Complete progress when loaded
      setLoadingProgress(100);
      setShowTimeout(false);
      
      const loadTime = Date.now() - loadStartTimeRef.current;
      const dataSizeKB = JSON.stringify(pageData.excalidraw_data).length / 1024;
      
      if (dataSizeKB > 2048) {
        console.log(`Large drawing loaded: ${dataSizeKB.toFixed(0)}KB in ${loadTime}ms`);
      }
    }
  }, [isLoading, pageData, toast]);
  
  // Handle errors
  useEffect(() => {
    if (error) {
      toast({
        title: "Failed to load drawing",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
        action: (
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        ),
      });
    }
  }, [error, toast, refetch]);
  
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
          onArrowStatsChangeRef.current
        );
      }
    } catch (error) {
      console.error('Error in arrow counter useEffect:', error);
      // Don't throw - just log and continue
    }
  }, [inchesPerSceneUnit, pageId]);
  
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
  const excalidrawData = useMemo(() => {
    const data = pageData?.excalidraw_data as any;
    console.log('📂 Loading excalidraw data:', {
      hasPageData: !!pageData,
      hasExcalidrawData: !!data,
      elementsCount: data?.elements?.length || 0,
      filesCount: data?.files ? Object.keys(data.files).length : 0
    });
    return data;
  }, [pageData]);
  
  // Ensure collaborators is always a Map - memoized to prevent infinite re-renders
  const mergedAppState = useMemo(() => {
    const savedAppState = excalidrawData?.appState || {};
    const sanitizedAppState = {
      ...defaultAppState,
      ...savedAppState,
      collaborators: new Map(), // Always use a fresh Map
    };
    
    // Sanitize searchMatches: ensure it's either null or has a valid matches array
    if (sanitizedAppState.searchMatches && 
        (!sanitizedAppState.searchMatches.matches || !Array.isArray(sanitizedAppState.searchMatches.matches))) {
      sanitizedAppState.searchMatches = null;
    }
    
    return sanitizedAppState;
  }, [excalidrawData, defaultAppState]);
  
  // Memoize initialData to prevent new object references on every render
  const initialData = useMemo(() => ({
    elements: excalidrawData?.elements ?? EMPTY_ELEMENTS,
    appState: mergedAppState,
    files: excalidrawData?.files ?? EMPTY_FILES,
  }), [excalidrawData?.elements, excalidrawData?.files, mergedAppState]);
  
  const handleChange = useCallback((elements: any, appState: any, files: any) => {
    changeCountRef.current++;
    
    console.log('✏️ handleChange received:', {
      elementsCount: elements?.length || 0,
      filesCount: files ? Object.keys(files).length : 0,
      filesKeys: files ? Object.keys(files) : []
    });
    
    // Ensure collaborators is always a Map
    const sanitizedAppState = {
      ...appState,
      collaborators: new Map(),
    };
    
    // Only apply arrow counter if there are actual arrow elements
    // This prevents infinite loops from updateScene triggering onChange
    if (excaliRef.current && inchesPerSceneUnit && elements?.some((el: any) => el.type === 'arrow')) {
      handleArrowCounter(
        elements, 
        excaliRef.current, 
        inchesPerSceneUnit,
        onArrowStatsChangeRef.current
      );
    }
    
    // Auto-save after 3 seconds (without collaborators field)
    if (persistRef.current) clearTimeout(persistRef.current);
    persistRef.current = setTimeout(() => {
      const { collaborators, ...appStateToSave } = sanitizedAppState;
      
      const dataToSave = { elements, appState: appStateToSave, files };
      const sizeKB = (JSON.stringify(dataToSave).length / 1024).toFixed(2);
      
      console.log('💾 Saving:', { 
        elements: elements.length, 
        files: files ? Object.keys(files).length : 0,
        sizeKB: `${sizeKB} KB`
      });
      
      updatePage.mutate({
        pageId,
        excalidrawData: dataToSave
      });
    }, 3000);
  }, [pageId, inchesPerSceneUnit, updatePage]);
  
  // Handle Excalidraw API ready
  const handleExcalidrawAPI = useCallback((api: any) => {
    excaliRef.current = api;
    onApiReadyRef.current(api);
    
    // Force high-quality image rendering
    const forceHighQualityRendering = () => {
      const canvas = document.querySelector('.excalidraw canvas') as HTMLCanvasElement;
      if (canvas) {
        // Fix CSS image-rendering (CRITICAL - was "pixelated")
        canvas.style.imageRendering = 'auto';
        canvas.style.setProperty('image-rendering', 'auto', 'important');
        
        // Fix canvas context smoothing quality
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
        }
      }
    };
    
    // Apply immediately and after delays
    setTimeout(forceHighQualityRendering, 0);
    setTimeout(forceHighQualityRendering, 100);
    setTimeout(forceHighQualityRendering, 500);
  }, []);
  
  // Loading state with progress indicator
  if (isLoading) {
    return (
      <div className="h-full w-full relative">
        <DrawingLoadingSkeleton />
        
        {/* Progress overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-background/95 backdrop-blur-sm border rounded-lg p-6 shadow-lg max-w-md w-full mx-4 pointer-events-auto">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="flex-1">
                <h3 className="font-semibold">Loading drawing...</h3>
              </div>
            </div>
            
            <Progress value={loadingProgress} className="mb-2" />
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{loadingProgress.toFixed(0)}%</span>
              {showTimeout && (
                <span className="flex items-center gap-1 text-amber-600">
                  <AlertCircle className="h-3 w-3" />
                  Taking longer than usual
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Error state with retry button
  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-muted/20">
        <div className="text-center space-y-4 max-w-md mx-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <div>
            <h3 className="font-semibold text-lg mb-2">Failed to load drawing</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {error instanceof Error ? error.message : "An unknown error occurred"}
            </p>
          </div>
          <Button onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry Loading
          </Button>
        </div>
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
