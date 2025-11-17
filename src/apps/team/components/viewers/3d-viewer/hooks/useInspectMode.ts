import { useEffect, useState, useRef } from 'react';
import { IfcViewerAPI } from 'web-ifc-viewer';
import { logger } from '@/utils/logger';
import { extractStandardizedElementMetrics, StandardizedElementMetrics } from '../utils/ifcPropertyAdapter';

interface UseInspectModeProps {
  containerRef: React.RefObject<HTMLDivElement>;
  viewerRef: React.RefObject<IfcViewerAPI | null>;
  viewerReady: boolean;
  inspectMode: boolean;
  measurementMode: 'none' | 'distance' | 'area' | 'volume';
  clippingActive: boolean;
  annotationMode: boolean;
}

/**
 * Hook to manage inspect mode (hover to highlight IFC items and click to select)
 */
export const useInspectMode = ({
  containerRef,
  viewerRef,
  viewerReady,
  inspectMode,
  measurementMode,
  clippingActive,
  annotationMode,
}: UseInspectModeProps) => {
  const [selectedObjectName, setSelectedObjectName] = useState<string | null>(null);
  const [selectedObjectType, setSelectedObjectType] = useState<string | null>(null);
  const [selectedObjectDimensions, setSelectedObjectDimensions] = useState<any | null>(null);
  const [selectedElementMetrics, setSelectedElementMetrics] = useState<StandardizedElementMetrics | null>(null);
  
  // Performance optimization: Debounce rapid clicks on same object
  const lastClickRef = useRef<{ expressID: number; modelID: number; timestamp: number } | null>(null);
  const DEBOUNCE_MS = 100; // Skip if same object clicked within 100ms

  // Handle hover highlighting
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

  // Handle click to select object and get properties
  useEffect(() => {
    if (!containerRef.current || !viewerRef.current?.IFC?.selector || !viewerReady) return;
    if (!inspectMode) {
      // Clear selection when inspect mode is deactivated
      setSelectedObjectName(null);
      setSelectedObjectType(null);
      setSelectedObjectDimensions(null);
      // Restore normal view by clearing any selections/highlights
      if (viewerRef.current?.IFC?.selector) {
        viewerRef.current.IFC.selector.unpickIfcItems();
        viewerRef.current.IFC.selector.unPrepickIfcItems();
        viewerRef.current.IFC.selector.unHighlightIfcItems();
      }
      return;
    }
    if (measurementMode !== 'none' || clippingActive || annotationMode) return;
    
    const container = containerRef.current;
    const viewer = viewerRef.current;
    
    const handleClick = async (event: MouseEvent) => {
      // Only handle left mouse button
      if (event.button !== 0) return;
      
      // Don't select if clicking on UI elements
      const target = event.target as HTMLElement;
      if (target && (target.tagName === 'BUTTON' || target.closest('button') || target.closest('.annotation-input-container'))) {
        return;
      }

      try {
        // Use pickIfcItem instead of highlightIfcItem to avoid fading the model
        // highlightIfcItem calls fadeAwayModels() which creates a wireframe-like view
        const result = await viewer.IFC.selector.pickIfcItem(false);
        
        if (result && result.modelID !== null && result.id !== null) {
          // Performance optimization: Debounce rapid clicks on same object
          const now = Date.now();
          if (lastClickRef.current && 
              lastClickRef.current.expressID === result.id &&
              lastClickRef.current.modelID === result.modelID &&
              now - lastClickRef.current.timestamp < DEBOUNCE_MS) {
            if (process.env.NODE_ENV === 'development') {
              logger.log('[Performance] Skipping duplicate click on same object (debounced)');
            }
            return; // Skip if clicked same object within debounce window
          }
          
          lastClickRef.current = {
            expressID: result.id,
            modelID: result.modelID,
            timestamp: now,
          };
          // First get base properties to extract the type number (before indirect overwrites it)
          const baseProps = await viewer.IFC.getProperties(result.modelID, result.id, false, false);
          
          // Then get full properties with indirect=true to get property sets and quantity sets for dimensions
          const props = await viewer.IFC.getProperties(result.modelID, result.id, true, false);
          
          // Also check if quantity sets are in props.qsets (some IFC versions include them here)
          logger.log('Full props structure:', { 
            hasPset: !!props.psets, 
            hasQset: !!props.qsets,
            hasMats: !!props.mats,
            propsKeys: Object.keys(props || {})
          });
          
          if (props && baseProps) {
            // Extract the name from properties
            // Name can be in different formats depending on IFC version
            const name = props.Name?.value || props.Name || props.name || 'Unnamed';
            setSelectedObjectName(name);
            
            // Extract the type from base properties (before indirect overwrites it)
            // Type is stored as a number, we need to use GetNameFromTypeCode API
            let typeName: string | null = null;
            
            // Get type number from base properties (before indirect call overwrites it)
            let typeNumber: number | null = null;
            if (baseProps.type !== null && baseProps.type !== undefined) {
              if (typeof baseProps.type === 'number') {
                typeNumber = baseProps.type;
              } else if (baseProps.type?.value !== undefined) {
                typeNumber = typeof baseProps.type.value === 'number' ? baseProps.type.value : null;
              }
            }
            
            if (typeNumber !== null && typeNumber !== undefined) {
              // Try to get the type name using the IFC API
              try {
                const ifcManager = viewer.IFC.loader.ifcManager;
                // Try multiple API access paths
                let api: any = null;
                if (ifcManager?.state?.api) {
                  api = ifcManager.state.api;
                } else if (ifcManager?.ifcAPI) {
                  api = ifcManager.ifcAPI;
                }
                
                if (api && typeof api.GetNameFromTypeCode === 'function') {
                  // GetNameFromTypeCode might be async or sync depending on implementation
                  const result = api.GetNameFromTypeCode(typeNumber);
                  typeName = result instanceof Promise ? await result : result;
                  
                  // Check if the result is an error/unknown type string
                  if (typeName && typeof typeName === 'string') {
                    if (typeName.includes('unknown') || typeName.includes('Unknown') || typeName.startsWith('<')) {
                      // API returned unknown type, try fallback
                      typeName = null;
                    } else if (typeName.startsWith('IFC')) {
                      // Remove "IFC" prefix for cleaner display (e.g., "IFCWALL" -> "WALL")
                      typeName = typeName.substring(3);
                    }
                  }
                  
                  logger.log('Type lookup:', { typeNumber, typeName, apiPath: ifcManager?.state?.api ? 'state.api' : 'ifcAPI' });
                }
                
                // Fallback: try typesMap if API failed or is not available
                if (!typeName) {
                  const typesMap = (ifcManager as any)?.typesMap;
                  if (typesMap && typesMap[typeNumber]) {
                    typeName = typesMap[typeNumber];
                    if (typeName && typeof typeName === 'string' && typeName.startsWith('IFC')) {
                      typeName = typeName.substring(3);
                    }
                    logger.log('Type lookup (fallback typesMap):', { typeNumber, typeName });
                  } else {
                    // Last fallback: use the type number as string
                    typeName = `Type ${typeNumber}`;
                    logger.warn('Type lookup failed, using fallback:', { typeNumber });
                  }
                }
              } catch (err) {
                logger.warn('Error looking up type name:', err);
                typeName = typeNumber?.toString() || null;
              }
            }
            
            // Normalize type display: If type is SLAB but name indicates roof, display as ROOF
            let displayType = typeName;
            if (typeName && typeName.toUpperCase() === 'SLAB') {
              const nameLower = (name || '').toLowerCase();
              if (nameLower.includes('roof')) {
                displayType = 'ROOF';
                logger.log('Normalized SLAB type to ROOF based on name:', { originalType: typeName, name, displayType });
              }
            }
            
            setSelectedObjectType(displayType);
            
            // Extract dimensions for ROOF objects
            // Note: In IFC, roofs are sometimes stored as SLAB types, especially in Revit exports
            // Based on IFC standards:
            // - Slope/Pitch: Pset_SlabCommon.PitchAngle (property set)
            // - Thickness: Qto_SlabBaseQuantities.Width (quantity set)
            // - Area: Qto_SlabBaseQuantities.GrossArea or Qto_RoofBaseQuantities.GrossArea (quantity set)
            // Use the unified element metrics extractor (handles all element types)
            const elementMetrics = await extractStandardizedElementMetrics(
              viewer.IFC,
              viewer.IFC.loader.ifcManager,
              result.modelID,
              result.id
            );
            
            if (elementMetrics) {
              setSelectedElementMetrics(elementMetrics);
              
              // Also set dimensions for backwards compatibility (legacy format)
              // Filter out internal fields and empty values
              const filteredMetrics = Object.fromEntries(
                Object.entries(elementMetrics).filter(([key, value]) => 
                  !key.startsWith('_') && 
                  key !== 'ifcClass' && 
                  key !== 'expressID' && 
                  key !== 'globalId' &&
                  value !== undefined && 
                  value !== null && 
                  value !== ''
                )
              );
              
              setSelectedObjectDimensions(filteredMetrics);
              logger.log('Extracted standardized element metrics:', elementMetrics);
            } else {
              setSelectedElementMetrics(null);
              setSelectedObjectDimensions(null);
              logger.warn('No element metrics found for selected object');
            }
            
            logger.log('Object selected:', { expressID: result.id, name, typeNumber, typeName, metrics: elementMetrics });
          } else {
            setSelectedObjectName(null);
            setSelectedObjectType(null);
            setSelectedObjectDimensions(null);
            setSelectedElementMetrics(null);
            // Clear selection if no properties found
            viewer.IFC.selector.unpickIfcItems();
          }
        } else {
          // Clicked on empty space - clear selection
          setSelectedObjectName(null);
          setSelectedObjectType(null);
          setSelectedObjectDimensions(null);
          setSelectedElementMetrics(null);
          viewer.IFC.selector.unpickIfcItems();
        }
      } catch (err) {
        logger.error('Error selecting object:', err);
        setSelectedObjectName(null);
        setSelectedObjectType(null);
        setSelectedObjectDimensions(null);
        setSelectedElementMetrics(null);
        // Make sure to clear any selection on error
        if (viewer.IFC?.selector) {
          viewer.IFC.selector.unpickIfcItems();
        }
      }
    };
    
    container.addEventListener('click', handleClick);
    
    return () => {
      container.removeEventListener('click', handleClick);
    };
  }, [inspectMode, measurementMode, clippingActive, annotationMode, viewerReady]);

  return {
    selectedObjectName,
    selectedObjectType,
    selectedObjectDimensions,
    selectedElementMetrics,
  };
};

