import React, { useCallback, useEffect, useRef } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import { useDrawingPage, useUpdateDrawingPage } from '@/lib/api/hooks/useDrawings';
import { handleArrowCounter, resetArrowCounterState, type ArrowCounterStats } from '@/utils/excalidraw-measurement-tools';

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
  
  const { data: pageData, isLoading } = useDrawingPage(pageId);
  const updatePage = useUpdateDrawingPage();
  
  // Reset arrow counter state when switching pages
  useEffect(() => {
    resetArrowCounterState();
  }, [pageId]);
  
  // Custom defaults (thin lines, sharp arrows, small text)
  const defaultAppState = {
    currentItemStrokeWidth: 0.5,
    currentItemArrowType: 'sharp',
    currentItemEndArrowhead: 'triangle',
    currentItemRoughness: 0,
    currentItemFontSize: 8,
    collaborators: new Map(),
  };
  
  const handleChange = useCallback((elements: any, appState: any, files: any) => {
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
  
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500">
        Loading drawing...
      </div>
    );
  }
  
  // Safely parse excalidraw data
  const excalidrawData = pageData?.excalidraw_data as any;
  
  // Ensure collaborators is always a Map
  const savedAppState = excalidrawData?.appState || {};
  const mergedAppState = {
    ...defaultAppState,
    ...savedAppState,
    collaborators: new Map(), // Always use a fresh Map
  };
  
  return (
    <div className="h-full">
      <Excalidraw
        excalidrawAPI={(api) => {
          excaliRef.current = api;
          onApiReady(api);
        }}
        initialData={{
          elements: excalidrawData?.elements || [],
          appState: mergedAppState,
          files: excalidrawData?.files || {},
        }}
        onChange={handleChange}
      />
    </div>
  );
}
