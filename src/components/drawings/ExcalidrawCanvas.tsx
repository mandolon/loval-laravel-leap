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
