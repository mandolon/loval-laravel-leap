import { useEffect } from 'react';
import { IfcViewerAPI } from 'web-ifc-viewer';

interface UseInspectModeProps {
  containerRef: React.RefObject<HTMLDivElement>;
  viewerRef: React.RefObject<IfcViewerAPI | null>;
  inspectMode: boolean;
  measurementMode: 'none' | 'distance' | 'area' | 'volume';
  clippingActive: boolean;
}

/**
 * Hook to manage inspect mode (hover to highlight IFC items)
 */
export const useInspectMode = ({
  containerRef,
  viewerRef,
  inspectMode,
  measurementMode,
  clippingActive,
}: UseInspectModeProps) => {
  useEffect(() => {
    if (!containerRef.current || !viewerRef.current?.IFC?.selector) return;
    
    const container = containerRef.current;
    const selector = viewerRef.current.IFC.selector;
    
    const handleMouseMove = () => {
      // Only pre-pick when inspect mode is active and no tools are active
      if (inspectMode && measurementMode === 'none' && !clippingActive) {
        selector.prePickIfcItem();
      }
    };
    
    container.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
    };
  }, [inspectMode, measurementMode, clippingActive]);
};

