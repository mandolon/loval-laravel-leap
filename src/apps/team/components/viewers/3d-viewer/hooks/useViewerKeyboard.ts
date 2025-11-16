import { useEffect } from 'react';
import { IfcViewerAPI } from 'web-ifc-viewer';
import { Color } from 'three';
import { logger } from '@/utils/logger';

interface UseViewerKeyboardProps {
  viewerRef: React.RefObject<IfcViewerAPI | null>;
  measurementMode: 'none' | 'distance' | 'area' | 'volume';
  setMeasurementMode: (mode: 'none' | 'distance' | 'area' | 'volume') => void;
  clippingActive: boolean;
  setClippingActive: (active: boolean) => void;
  inspectMode: boolean;
  setInspectMode: (active: boolean) => void;
  annotationMode: boolean;
  setAnnotationMode: (active: boolean) => void;
  selectedDimension: any;
  setSelectedDimension: (dim: any) => void;
  selectedAnnotationId: string | null;
  setSelectedAnnotationId: (id: string | null) => void;
  deleteAnnotation: (id: string) => void;
}

export const useViewerKeyboard = ({
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
}: UseViewerKeyboardProps) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      const target = event.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      // Escape key - exit current active tool
      if (event.key === 'Escape') {
        event.preventDefault();
        
        // Exit measurement mode if active
        if (measurementMode !== 'none') {
          // First update the state to exit measurement mode
          // This will trigger useDimensionTool to deactivate properly
          setMeasurementMode('none');
          
          // Then deactivate dimensions tool and restore visibility
          if (viewerRef.current?.dimensions) {
            const dimensions = viewerRef.current.dimensions;
            
            // Get all dimensions before deactivating
            const existingDimensions = (dimensions as any).dimensions || [];
            const dimensionLines = dimensions.getDimensionsLines || [];
            const allDimensions = existingDimensions.length > 0 ? existingDimensions : dimensionLines;
            
            // Deactivate the tool
            dimensions.active = false;
            dimensions.previewActive = false;
            dimensions.cancelDrawing();
            
            // Restore visibility immediately and also after delays
            restoreDimensionsVisibility(dimensions, true);
            setTimeout(() => {
              restoreDimensionsVisibility(dimensions, true);
            }, 10);
            setTimeout(() => {
              restoreDimensionsVisibility(dimensions, true);
            }, 50);
            
            logger.log(`Measurement tool deactivated via Escape - ${allDimensions.length} dimensions remain visible`);
          }
          return;
        }
        
        // Exit clipping if active
        if (clippingActive && viewerRef.current?.clipper) {
          viewerRef.current.clipper.active = false;
          setClippingActive(false);
          logger.log('Clipping tool deactivated');
          return;
        }
        
        // Exit inspect mode if active
        if (inspectMode) {
          setInspectMode(false);
          logger.log('Inspect mode deactivated');
          return;
        }
        
        // Exit annotation mode if active
        if (annotationMode) {
          setAnnotationMode(false);
          logger.log('Annotation mode deactivated');
          return;
        }
        
        return;
      }

      // E key - toggle dimensions
      if (event.key === 'e' || event.key === 'E') {
        event.preventDefault();
        const newMode = measurementMode === 'distance' ? 'none' : 'distance';
        
        if (newMode === 'distance') {
          // Activating measurement - deactivate all other tools
          if (clippingActive && viewerRef.current?.clipper) {
            viewerRef.current.clipper.active = false;
            setClippingActive(false);
          }
          if (annotationMode) {
            setAnnotationMode(false);
          }
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
        
        // Clear dimension selection when toggling measurement mode
        if (selectedDimension) {
          selectedDimension.dimensionColor = new Color(0x000000);
          setSelectedDimension(null);
        }
        return;
      }

      // P key - create clipping plane (only works when clipping mode is already active)
      if (event.key === 'p' || event.key === 'P') {
        event.preventDefault();
        if (!viewerRef.current?.clipper) return;
        
        // Only allow P key when clipping is already active
        if (!clippingActive) {
          // Clipping is not active, so P key does nothing
          return;
        }
        
        // Ensure clipper is enabled before creating plane
        if (!viewerRef.current.clipper.active) {
          viewerRef.current.clipper.active = true;
        }
        
        // Clipping is active - create a new clipping plane
        if (viewerRef.current.clipper.createPlane) {
          viewerRef.current.clipper.createPlane();
          logger.log('New clipping plane created (press P to create another)');
        }
        return;
      }

      // D key - create dimension (when dimensions are active)
      if ((event.key === 'd' || event.key === 'D') && measurementMode === 'distance' && viewerRef.current?.dimensions?.active) {
        event.preventDefault();
        if (viewerRef.current.dimensions) {
          const dimCountBefore = (viewerRef.current.dimensions as any).dimensions?.length || 0;
          logger.log('Creating dimension, count before:', dimCountBefore);
          viewerRef.current.dimensions.create();
          logger.log('Dimension creation started (press D to create)');
          
          // Check if dimension was created after a short delay
          setTimeout(() => {
            const dimCountAfter = (viewerRef.current.dimensions as any).dimensions?.length || 0;
            const getterCount = viewerRef.current.dimensions.getDimensionsLines?.length || 0;
            logger.log('Dimension created, count after:', dimCountAfter, 'getter count:', getterCount);
          }, 100);
        }
        return;
      }

      // Backspace or Delete key - delete selected dimension or annotation
      if (event.key === 'Backspace' || event.key === 'Delete') {
        // Delete selected annotation if one is selected
        if (selectedAnnotationId) {
          event.preventDefault();
          deleteAnnotation(selectedAnnotationId);
          setSelectedAnnotationId(null);
          logger.log('Annotation deleted');
          return;
        }
        
        // Delete selected dimension if one is selected
        if (selectedDimension && viewerRef.current?.dimensions) {
          event.preventDefault();
          const dimensions = viewerRef.current.dimensions;
          const dimensionLines = dimensions.getDimensionsLines || [];
          const index = dimensionLines.indexOf(selectedDimension);
          
          if (index !== -1) {
            // Remove dimension from scene
            selectedDimension.removeFromScene();
            
            // Remove from dimensions array
            (dimensions as any).dimensions.splice(index, 1);
            
            logger.log('Dimension deleted');
            setSelectedDimension(null);
          }
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [measurementMode, clippingActive, inspectMode, annotationMode, selectedDimension, selectedAnnotationId, viewerRef, setMeasurementMode, setClippingActive, setInspectMode, setAnnotationMode, setSelectedDimension, setSelectedAnnotationId, deleteAnnotation]);
};

