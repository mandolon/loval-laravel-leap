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
        if (measurementMode !== 'none' && viewerRef.current?.dimensions) {
          viewerRef.current.dimensions.active = false;
          viewerRef.current.dimensions.previewActive = false;
          viewerRef.current.dimensions.cancelDrawing();
          setMeasurementMode('none');
          logger.log('Measurement tool deactivated');
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
        setMeasurementMode(newMode);
        // Deactivate other tools
        if (clippingActive && viewerRef.current?.clipper) {
          viewerRef.current.clipper.active = false;
          setClippingActive(false);
        }
        // Clear dimension selection when entering measurement mode
        if (selectedDimension && newMode === 'distance') {
          selectedDimension.dimensionColor = new Color(0x000000);
          setSelectedDimension(null);
        }
        return;
      }

      // P key - create clipping plane
      if (event.key === 'p' || event.key === 'P') {
        event.preventDefault();
        if (!viewerRef.current?.clipper) return;
        
        // Always create a new plane when P is pressed
        viewerRef.current.clipper.active = true;
        viewerRef.current.clipper.createPlane();
        setClippingActive(true);
        
        // Deactivate other tools
        if (measurementMode !== 'none' && viewerRef.current?.dimensions) {
          viewerRef.current.dimensions.active = false;
          viewerRef.current.dimensions.previewActive = false;
          viewerRef.current.dimensions.cancelDrawing();
          setMeasurementMode('none');
        }
        // Clear dimension selection when entering clipping mode
        if (selectedDimension) {
          selectedDimension.dimensionColor = new Color(0x000000);
          setSelectedDimension(null);
        }
        logger.log('Clipping plane created (press P to create another)');
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

      // Backspace or Delete key - delete selected dimension
      if ((event.key === 'Backspace' || event.key === 'Delete') && selectedDimension && viewerRef.current?.dimensions) {
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [measurementMode, clippingActive, inspectMode, annotationMode, selectedDimension, setMeasurementMode, setClippingActive, setInspectMode, setAnnotationMode, setSelectedDimension]);
};

