import { useEffect } from 'react';
import { IfcViewerAPI } from 'web-ifc-viewer';
import { logger } from '@/utils/logger';
import { restoreDimensionsVisibility } from '../utils/dimensionUtils';

interface UseDimensionToolProps {
  viewerRef: React.RefObject<IfcViewerAPI | null>;
  measurementMode: 'none' | 'distance' | 'area' | 'volume';
}

/**
 * Hook to manage dimension tool activation state
 * Activates/deactivates the dimensions tool based on measurement mode
 * Note: Created dimensions remain visible even when tool is deactivated (like annotations)
 */
export const useDimensionTool = ({
  viewerRef,
  measurementMode,
}: UseDimensionToolProps) => {
  useEffect(() => {
    if (!viewerRef.current?.dimensions || !viewerRef.current?.IFC) return;
    
    const dimensions = viewerRef.current.dimensions;
    const selector = viewerRef.current.IFC.selector;
    
    if (measurementMode === 'distance') {
      if (!dimensions.active) {
        dimensions.active = true;
        dimensions.previewActive = true; // Enable preview
        selector.unPrepickIfcItems(); // Clear any pre-picked items
        logger.log('Dimensions tool activated - left-click on elements to start dimensioning, then press D to create');
      }
    } else {
      // Deactivate tool but keep existing dimensions visible
      if (dimensions.active) {
        // Get all dimensions before deactivating
        const existingDimensions = (dimensions as any).dimensions || [];
        const dimensionLines = dimensions.getDimensionsLines || [];
        const allDimensions = existingDimensions.length > 0 ? existingDimensions : dimensionLines;
        
        // Deactivate the tool (this will hide dimensions by default)
        dimensions.active = false;
        dimensions.previewActive = false;
        dimensions.cancelDrawing();
        
        // Restore visibility immediately and also after delays to ensure it sticks
        // The library's setter might try to hide them, so we restore multiple times
        restoreDimensionsVisibility(dimensions, true);
        setTimeout(() => {
          restoreDimensionsVisibility(dimensions, true);
        }, 10);
        setTimeout(() => {
          restoreDimensionsVisibility(dimensions, true);
        }, 50);
        
        logger.log(`Dimensions tool deactivated - ${allDimensions.length} existing dimensions remain visible`);
      } else {
        // Tool is already inactive, but make sure dimensions are visible
        // This handles the case where Escape was pressed and dimensions were hidden
        restoreDimensionsVisibility(dimensions, true);
        setTimeout(() => {
          restoreDimensionsVisibility(dimensions, true);
        }, 10);
      }
    }
  }, [measurementMode]);
  
  // Continuously ensure bounding boxes stay hidden (they should never be visible)
  useEffect(() => {
    if (!viewerRef.current?.dimensions) return;
    
    const dimensions = viewerRef.current.dimensions;
    const existingDimensions = (dimensions as any).dimensions || [];
    const dimensionLines = dimensions.getDimensionsLines || [];
    const allDimensions = existingDimensions.length > 0 ? existingDimensions : dimensionLines;
    
    // Ensure all bounding boxes are hidden (run continuously to catch any that become visible)
    const hideBoundingBoxes = () => {
      allDimensions.forEach((dim: any) => {
        if (dim && dim.root) {
          dim.root.traverse((child: any) => {
            // Always hide bounding boxes (BoxGeometry meshes)
            if (child.geometry?.type === 'BoxGeometry' && child.type === 'Mesh') {
              child.visible = false;
              if (child.material) {
                child.material.transparent = true;
                child.material.opacity = 0;
                child.material.visible = false;
              }
            }
          });
        }
        // Also hide via direct access
        if (dim?.boundingBox) {
          dim.boundingBox.visible = false;
          if (dim.boundingBox.material) {
            dim.boundingBox.material.transparent = true;
            dim.boundingBox.material.opacity = 0;
            dim.boundingBox.material.visible = false;
          }
        }
        if (dim?.boundingMesh) {
          dim.boundingMesh.visible = false;
          if (dim.boundingMesh.material) {
            dim.boundingMesh.material.transparent = true;
            dim.boundingMesh.material.opacity = 0;
            dim.boundingMesh.material.visible = false;
          }
        }
      });
    };
    
    // Run immediately and also set up an interval to continuously check
    hideBoundingBoxes();
    const interval = setInterval(hideBoundingBoxes, 100);
    
    return () => clearInterval(interval);
  }, [measurementMode, viewerRef]);
};

