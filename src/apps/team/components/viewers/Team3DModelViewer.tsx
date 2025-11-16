import { useState, useRef, useCallback, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { restoreDimensionsVisibility } from './3d-viewer/utils/dimensionUtils';
import { ViewerToolbar } from './3d-viewer/ViewerToolbar';
import { useViewerInitialization } from './3d-viewer/hooks/useViewerInitialization';
import { useModelLoading } from './3d-viewer/hooks/useModelLoading';
import { useDimensionInteraction } from './3d-viewer/hooks/useDimensionInteraction';
import { useMeasurementHover } from './3d-viewer/hooks/useMeasurementHover';
import { useViewerKeyboard } from './3d-viewer/hooks/useViewerKeyboard';
import { useDimensionTool } from './3d-viewer/hooks/useDimensionTool';
import { useInspectMode } from './3d-viewer/hooks/useInspectMode';
import { useAnnotationTool } from './3d-viewer/hooks/useAnnotationTool';
import { useAnnotationInputPosition } from './3d-viewer/hooks/useAnnotationInputPosition';
import { AnnotationInput } from './3d-viewer/components/AnnotationInput';
import { useAnnotationInteraction } from './3d-viewer/hooks/useAnnotationInteraction';
import { useIfcViewerAPI } from '../../hooks/useIfcViewerAPI';

interface ModelSettings {
  background?: string;
  show_edges?: boolean;
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
  const { loading, error } = useModelLoading(viewerRef, viewerReady, modelFile, settings);
  
  // Edge toggle functionality
  const { toggleEdges } = useIfcViewerAPI();
  
  // Toggle edges visibility when settings change - real-time toggle
  useEffect(() => {
    if (!viewerRef.current || !viewerReady || loading) return;
    
    const showEdges = settings?.show_edges ?? true;
    try {
      toggleEdges(viewerRef.current, showEdges);
    } catch (error) {
      logger.warn('Error toggling edges:', error);
    }
  }, [settings?.show_edges, viewerReady, loading, toggleEdges]);
  
  // Tool state
  const [measurementMode, setMeasurementMode] = useState<'none' | 'distance' | 'area' | 'volume'>('none');
  const [clippingActive, setClippingActive] = useState(false);
  const [inspectMode, setInspectMode] = useState(false);
  const [annotationMode, setAnnotationMode] = useState(false);

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
    inspectMode,
    measurementMode,
    clippingActive,
  });

  // Create a ref to share hoveredAnnotationId between hooks
  const hoveredAnnotationIdRef = useRef<string | null>(null);
  
  // Annotation tool
  const {
    annotations,
    editingAnnotationId,
    setEditingAnnotationId,
    saveAnnotation,
    deleteAnnotation,
    annotationGroupsRef,
  } = useAnnotationTool({
    containerRef,
    viewerRef,
    viewerReady,
    annotationMode,
    clippingActive,
    hoveredAnnotationId: hoveredAnnotationIdRef.current,
  });

  // Annotation interaction (hover and selection)
  const { selectedAnnotationId, setSelectedAnnotationId, hoveredAnnotationId } = useAnnotationInteraction({
    containerRef,
    viewerRef,
    viewerReady,
    annotationMode,
    clippingActive,
    annotationGroupsRef,
    setEditingAnnotationId,
    setAnnotationMode,
  });
  
  // Update the ref so useAnnotationTool can access it
  hoveredAnnotationIdRef.current = hoveredAnnotationId;

  const editingAnnotation = annotations.find(ann => ann.id === editingAnnotationId) || null;
  const inputPosition = useAnnotationInputPosition({
    viewerRef,
    viewerReady,
    editingAnnotation,
    annotationGroupsRef,
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
    deleteAnnotation,
  });

  // Helper function to deactivate all tools
  const deactivateAllTools = useCallback(() => {
    // Deactivate clipping
    if (clippingActive && viewerRef.current?.clipper) {
      viewerRef.current.clipper.active = false;
      setClippingActive(false);
    }
    
    // Deactivate measurement
    if (measurementMode !== 'none' && viewerRef.current?.dimensions) {
      const dimensions = viewerRef.current.dimensions;
      dimensions.active = false;
      dimensions.previewActive = false;
      dimensions.cancelDrawing();
      // Restore visibility of all created dimensions
      const count = restoreDimensionsVisibility(dimensions);
      logger.log(`Measurement deactivated for clipping - ${count} dimensions remain visible`);
      setMeasurementMode('none');
    }
    
    // Deactivate annotation
    if (annotationMode) {
      setAnnotationMode(false);
      if (editingAnnotationId) {
        setEditingAnnotationId(null);
      }
    }
  }, [clippingActive, measurementMode, annotationMode, editingAnnotationId, setClippingActive, setMeasurementMode, setAnnotationMode, setEditingAnnotationId]);

  // Tool handlers
  const handleMeasureDistance = () => {
    const newMode = measurementMode === 'distance' ? 'none' : 'distance';
    
    if (newMode === 'distance') {
      // Activating measurement - deactivate all other tools
      deactivateAllTools();
      setMeasurementMode('distance');
    } else {
      // Deactivating measurement
      if (viewerRef.current?.dimensions) {
        const dimensions = viewerRef.current.dimensions;
        dimensions.active = false;
        dimensions.previewActive = false;
        dimensions.cancelDrawing();
        // Restore visibility of all created dimensions
        const count = restoreDimensionsVisibility(dimensions);
        logger.log(`Measurement deactivated - ${count} dimensions remain visible`);
      }
      setMeasurementMode('none');
    }
  };

  const handleMeasureArea = () => {
    const newMode = measurementMode === 'area' ? 'none' : 'area';
    
    if (newMode === 'area') {
      // Activating area measurement - deactivate all other tools
      deactivateAllTools();
      setMeasurementMode('area');
    } else {
      setMeasurementMode('none');
    }
    logger.log('Area measurement tool toggled (not yet implemented)');
  };

  const handleMeasureVolume = () => {
    const newMode = measurementMode === 'volume' ? 'none' : 'volume';
    
    if (newMode === 'volume') {
      // Activating volume measurement - deactivate all other tools
      deactivateAllTools();
      setMeasurementMode('volume');
    } else {
      setMeasurementMode('none');
    }
    logger.log('Volume measurement tool toggled (not yet implemented)');
  };

  const handleToggleClipping = () => {
    if (!viewerRef.current?.clipper) return;
    
    const newState = !clippingActive;
    
    if (newState) {
      // Activating clipping - deactivate all other tools
      deactivateAllTools();
      setClippingActive(true);
      
      // If there are no planes yet, create one
      if (viewerRef.current.clipper.planes.length === 0) {
        viewerRef.current.clipper.active = true;
        viewerRef.current.clipper.createPlane();
        logger.log('Clipper tool activated - clipping plane created (press P to create another)');
      } else {
        // Reactivating - show controls for existing planes
        viewerRef.current.clipper.active = true;
        // Make sure all planes are visible (controls/arrows) and reattach controls
        viewerRef.current.clipper.planes.forEach((plane: any) => {
          if (!plane.isPlan) {
            plane.visible = true;
            plane.active = true; // Keep clipping active
            // Reattach controls to enable interaction
            if (plane.controls && plane.controls.attach && plane.helper) {
              plane.controls.attach(plane.helper);
            }
          }
        });
        logger.log('Clipper tool reactivated - controls visible and enabled');
      }
    } else {
      // Deactivating clipping mode - hide controls but keep clipping active
      // Keep planes active so clipping continues, but hide the visual controls and disable interaction
      viewerRef.current.clipper.planes.forEach((plane: any) => {
        if (!plane.isPlan) {
          plane.visible = false; // Hide controls/arrows
          // Detach controls to disable interaction
          if (plane.controls && plane.controls.detach) {
            plane.controls.detach();
          }
          // Keep plane.active = true so clipping continues
        }
      });
      // Set clipper.enabled to false to prevent creating new planes
      // But we need to access the private enabled property, so we'll use a workaround
      // by setting active to false temporarily, then restoring plane.active
      const wasActive = viewerRef.current.clipper.active;
      if (wasActive) {
        // Manually set enabled to false without affecting plane.active
        (viewerRef.current.clipper as any).enabled = false;
      }
      setClippingActive(false);
      logger.log('Clipper tool deactivated - clipping remains active, controls hidden and disabled');
    }
  };

  const handleClearClipping = () => {
    if (!viewerRef.current?.clipper) return;
    
    if (viewerRef.current.clipper.deleteAllPlanes) {
      viewerRef.current.clipper.deleteAllPlanes();
      logger.log('All clipping planes cleared');
    }
  };

  const handleClearMeasurements = () => {
    if (viewerRef.current?.dimensions) {
      viewerRef.current.dimensions.deleteAll();
      logger.log('All measurements cleared');
    }
  };

  const handleToggleAnnotation = () => {
    const newMode = !annotationMode;
    
    if (newMode) {
      // Activating annotation - deactivate all other tools
      deactivateAllTools();
      setAnnotationMode(true);
    } else {
      // Deactivating annotation
      setAnnotationMode(false);
      if (editingAnnotationId) {
        setEditingAnnotationId(null);
      }
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
      {/* 3D Viewer Content */}
      <div className="flex-1 overflow-hidden relative bg-background">
        {/* Floating Toolbar */}
        <ViewerToolbar
          inspectMode={inspectMode}
          onToggleInspect={() => setInspectMode(!inspectMode)}
          measurementMode={measurementMode}
          onMeasureDistance={handleMeasureDistance}
          onMeasureArea={handleMeasureArea}
          onMeasureVolume={handleMeasureVolume}
          onClearMeasurements={handleClearMeasurements}
          clippingActive={clippingActive}
          onToggleClipping={handleToggleClipping}
          onClearClipping={handleClearClipping}
          annotationMode={annotationMode}
          onToggleAnnotation={handleToggleAnnotation}
          onResetView={handleResetView}
        />
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
        
        {/* Annotation Mode Indicator */}
        {annotationMode && (
          <div className="absolute top-2 left-2 z-20 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-[10px] font-medium shadow-lg">
            🏷️ Click on the model to place an annotation
          </div>
        )}
        
        {/* Annotation Input */}
        {editingAnnotation && inputPosition && (
          <AnnotationInput
            annotation={editingAnnotation}
            onSave={saveAnnotation}
            onDelete={deleteAnnotation}
            onClose={() => setEditingAnnotationId(null)}
            position={inputPosition}
          />
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
          className="w-full h-full absolute inset-0"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      </div>
    </div>
  );
};

export default Team3DModelViewer;
