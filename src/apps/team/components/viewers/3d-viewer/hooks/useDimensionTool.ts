import { useEffect } from 'react';
import { IfcViewerAPI } from 'web-ifc-viewer';
import { logger } from '@/utils/logger';

interface UseDimensionToolProps {
  viewerRef: React.RefObject<IfcViewerAPI | null>;
  measurementMode: 'none' | 'distance' | 'area' | 'volume';
}

/**
 * Hook to manage dimension tool activation state
 * Activates/deactivates the dimensions tool based on measurement mode
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
      if (dimensions.active) {
        dimensions.active = false;
        dimensions.previewActive = false;
        dimensions.cancelDrawing();
        logger.log('Dimensions tool deactivated');
      }
    }
  }, [measurementMode]);
};

