/**
 * REFACTORED VERSION - This demonstrates the new structure
 * 
 * This is a cleaner, more maintainable version of Team3DModelViewer
 * that uses extracted hooks and components.
 * 
 * To use this version, rename it to Team3DModelViewer.tsx
 * (after backing up the original)
 */

import { useState, useRef } from 'react';
import { logger } from '@/utils/logger';
import { ViewerToolbar } from './ViewerToolbar';
import { useViewerInitialization } from './hooks/useViewerInitialization';
import { useModelLoading } from './hooks/useModelLoading';
import { useDimensionInteraction } from './hooks/useDimensionInteraction';
import { useMeasurementHover } from './hooks/useMeasurementHover';
import { useViewerKeyboard } from './hooks/useViewerKeyboard';
import { useDimensionTool } from './hooks/useDimensionTool';
import { useInspectMode } from './hooks/useInspectMode';

interface ModelSettings {
  background?: string;
  show_grid?: boolean;
  show_axes?: boolean;
  layers?: {
    structure?: boolean;
    walls?: boolean;
    roof?: boolean;
    floor?: boolean;
    windows?: boolean;
  };
}

interface Team3DModelViewerProps {
  modelFile: {
    storage_path: string;
    filename: string;
  } | null;
  settings?: ModelSettings;
  versionNumber?: string;
}

const Team3DModelViewer = ({ modelFile, settings, versionNumber }: Team3DModelViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Initialize viewer
  const { viewerRef, viewerReady } = useViewerInitialization(containerRef, settings);
  
  // Load model
  const { loading, error } = useModelLoading(viewerRef, viewerReady, modelFile);
  
  // Tool state
  const [measurementMode, setMeasurementMode] = useState<'none' | 'distance' | 'area' | 'volume'>('none');
  const [clippingActive, setClippingActive] = useState(false);
  const [inspectMode, setInspectMode] = useState(false);
  const [annotationMode, setAnnotationMode] = useState(false);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);

  // Dimension interaction (selection and hover)
  const { selectedDimension, setSelectedDimension } = useDimensionInteraction({
    containerRef,
    viewerRef,
    viewerReady,
    measurementMode,
    clippingActive,
  });

  // Measurement hover sphere
  useMeasurementHover({
    containerRef,
    viewerRef,
    viewerReady,
    measurementMode,
    clippingActive,
  });

  // Dimension tool activation
  useDimensionTool({
    viewerRef,
    measurementMode,
  });

  // Inspect mode
  useInspectMode({
    containerRef,
    viewerRef,
    viewerReady,
    inspectMode,
    measurementMode,
    clippingActive,
    annotationMode,
  });

  // Keyboard shortcuts
  useViewerKeyboard({
    viewerRef,
    measurementMode,
    setMeasurementMode,
    clippingActive,
    setClippingActive,
    inspectMode,
    setInspectMode,
    annotationMode,
    setAnnotationMode,
    selectedDimension,
    setSelectedDimension,
    selectedAnnotationId,
    setSelectedAnnotationId,
    deleteAnnotation: (id: string) => {
      logger.log('Delete annotation:', id);
      // Implement annotation deletion logic here
    },
  });

  // Tool handlers
  const handleMeasureDistance = () => {
    if (clippingActive && viewerRef.current?.clipper) {
      viewerRef.current.clipper.active = false;
      setClippingActive(false);
    }
    const newMode = measurementMode === 'distance' ? 'none' : 'distance';
    setMeasurementMode(newMode);
  };

  const handleMeasureArea = () => {
    const newMode = measurementMode === 'area' ? 'none' : 'area';
    setMeasurementMode(newMode);
    logger.log('Area measurement tool toggled (not yet implemented)');
  };

  const handleMeasureVolume = () => {
    const newMode = measurementMode === 'volume' ? 'none' : 'volume';
    setMeasurementMode(newMode);
    logger.log('Volume measurement tool toggled (not yet implemented)');
  };

  const handleToggleClipping = () => {
    if (!viewerRef.current?.clipper) return;
    
    if (measurementMode !== 'none' && viewerRef.current?.dimensions) {
      viewerRef.current.dimensions.active = false;
      viewerRef.current.dimensions.previewActive = false;
      viewerRef.current.dimensions.cancelDrawing();
      setMeasurementMode('none');
    }
    
    const newState = !clippingActive;
    setClippingActive(newState);
    
    if (newState) {
      viewerRef.current.clipper.active = true;
      viewerRef.current.clipper.createPlane();
      logger.log('Clipper tool activated - clipping plane created (press P to create another)');
    } else {
      viewerRef.current.clipper.active = false;
      logger.log('Clipper tool deactivated');
    }
  };

  const handleClearClipping = () => {
    if (viewerRef.current?.clipper) {
      viewerRef.current.clipper.deleteAllPlanes();
      logger.log('All clipping planes cleared');
    }
  };

  const handleToggleInspect = () => {
    setInspectMode(!inspectMode);
  };

  const handleToggleAnnotation = () => {
    setAnnotationMode(!annotationMode);
  };

  const handleClearMeasurements = () => {
    if (viewerRef.current?.dimensions) {
      viewerRef.current.dimensions.deleteAll();
      logger.log('All measurements cleared');
    }
  };

  const handleResetView = () => {
    if (viewerRef.current?.context) {
      viewerRef.current.context.fitToFrame();
    }
  };

  if (!modelFile) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="text-center text-muted-foreground">
          <div className="text-[10px] mb-2">📦</div>
          <div className="text-[10px]">No 3D model selected</div>
          <div className="text-[9px] mt-1">Select a version from the right panel</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-background h-full">
      {/* Toolbar */}
      <ViewerToolbar
        inspectMode={inspectMode}
        onToggleInspect={handleToggleInspect}
        measurementMode={measurementMode}
        onMeasureDistance={handleMeasureDistance}
        onClearMeasurements={handleClearMeasurements}
        clippingActive={clippingActive}
        onToggleClipping={handleToggleClipping}
        onClearClipping={handleClearClipping}
        annotationMode={annotationMode}
        onToggleAnnotation={handleToggleAnnotation}
        onResetView={handleResetView}
      />

      {/* 3D Viewer Content */}
      <div className="flex-1 overflow-hidden relative bg-background">
        {/* Measurement Mode Indicator */}
        {measurementMode !== 'none' && (
          <div className="absolute top-2 left-2 z-20 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-[10px] font-medium shadow-lg">
            {measurementMode === 'distance' && '📏 Left-click on elements to start dimensioning, then press D to create dimension'}
            {measurementMode === 'area' && '⬜ Area measurement (not yet implemented)'}
            {measurementMode === 'volume' && '📦 Volume measurement (not yet implemented)'}
          </div>
        )}
        
        {/* Clipping Mode Indicator */}
        {clippingActive && (
          <div className="absolute top-2 left-2 z-20 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-[10px] font-medium shadow-lg">
            ✂️ Clipping plane active (Press P to create another plane)
          </div>
        )}
        
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="text-center">
              <div className="text-[10px] text-muted-foreground mb-2">Loading 3D model...</div>
              <div className="h-1 w-32 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center bg-background">
            <div className="text-[10px] mb-4">⚠️</div>
            <div className="text-[10px] font-medium mb-2 text-foreground">{error}</div>
            <div className="text-[9px] text-muted-foreground max-w-xs">
              Make sure the file is a valid IFC format (.ifc)
            </div>
          </div>
        )}

        <div
          ref={containerRef}
          className="w-full h-full"
          style={{ position: 'relative' }}
        />
      </div>
    </div>
  );
};

export default Team3DModelViewer;

