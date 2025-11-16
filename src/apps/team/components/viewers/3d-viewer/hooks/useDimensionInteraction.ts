import { useEffect, useState, useRef } from 'react';
import { IfcViewerAPI } from 'web-ifc-viewer';
import { Color } from 'three';
import { logger } from '@/utils/logger';
import { addDimensionColorProperty } from '../utils/dimensionUtils';

interface UseDimensionInteractionProps {
  containerRef: React.RefObject<HTMLDivElement>;
  viewerRef: React.RefObject<IfcViewerAPI | null>;
  viewerReady: boolean;
  measurementMode: 'none' | 'distance' | 'area' | 'volume';
  clippingActive: boolean;
}

export const useDimensionInteraction = ({
  containerRef,
  viewerRef,
  viewerReady,
  measurementMode,
  clippingActive,
}: UseDimensionInteractionProps) => {
  const [selectedDimension, setSelectedDimension] = useState<any>(null);
  const [hoveredDimension, setHoveredDimension] = useState<any>(null);

  // Handle dimension selection on click
  useEffect(() => {
    if (!containerRef.current || !viewerRef.current?.dimensions || !viewerRef.current?.context || !viewerReady) return;
    
    const container = containerRef.current;
    const dimensions = viewerRef.current.dimensions;
    const context = viewerRef.current.context;
    
    const handleClick = (event: MouseEvent) => {
      // Don't select if user is actively dragging/drawing a new dimension
      const isDragging = (dimensions as any).dragging || false;
      if (measurementMode === 'distance' && isDragging) {
        logger.log('Skipping - actively dragging/drawing dimension');
        return;
      }
      
      // Don't select if clipping is active
      if (clippingActive) {
        logger.log('Skipping selection - clipping active');
        return;
      }
      
      // Get all dimension lines
      let dimensionLines = (dimensions as any).dimensions || [];
      
      // Also try the getter method as fallback
      if (dimensionLines.length === 0 && dimensions.getDimensionsLines) {
        const getterLines = dimensions.getDimensionsLines || [];
        if (getterLines.length > 0) {
          dimensionLines = getterLines;
        }
      }
      
      // Add dimensionColor property to all dimensions from array
      dimensionLines.forEach((dim: any) => {
        if (dim && !dim.dimensionColor) {
          addDimensionColorProperty(dim, dim);
        }
      });
      
      // If still no dimensions, try to find them in the scene
      if (dimensionLines.length === 0) {
        const scene = context.getScene();
        const foundDimensions: any[] = [];
        
        scene.traverse((obj: any) => {
          if (obj.type === 'Group') {
            if (obj.children && obj.children.length > 0) {
              const hasLine = obj.children.some((child: any) => child.type === 'Line');
              const endpointMeshes = obj.children.filter((child: any) => child.type === 'Mesh');
              
              // Dimensions are Groups with a Line and multiple Meshes (endpoints)
              if (hasLine && endpointMeshes.length >= 2) {
                // Try to find or create a bounding box
                let boundingBox = obj.children.find((child: any) => child.type === 'Mesh' && child.geometry?.type === 'BoxGeometry');
                
                // If no bounding box exists, use the line itself for raycasting
                if (!boundingBox) {
                  const line = obj.children.find((child: any) => child.type === 'Line');
                  if (line) {
                    boundingBox = line;
                  }
                }
                
                if (boundingBox) {
                  const dimObj: any = {
                    root: obj,
                    boundingBox: boundingBox
                  };
                  
                  // Add dimensionColor property using helper function
                  addDimensionColorProperty(dimObj, obj);
                  
                  foundDimensions.push(dimObj);
                }
              }
            }
          }
        });
        
        if (foundDimensions.length > 0) {
          dimensionLines = foundDimensions;
        }
      }
      
      if (!dimensionLines || dimensionLines.length === 0) {
        // Clear selection if clicking on empty space
        if (selectedDimension) {
          selectedDimension.dimensionColor = new Color(0x000000);
          setSelectedDimension(null);
        }
        return;
      }
      
      // Get bounding boxes for raycasting
      const boundingBoxes = dimensionLines
        .map((dim: any) => dim.boundingBox)
        .filter((box: any) => box !== undefined && box !== null);
      
      if (boundingBoxes.length === 0) {
        // Clear selection if clicking on empty space
        if (selectedDimension) {
          selectedDimension.dimensionColor = new Color(0x000000);
          setSelectedDimension(null);
        }
        return;
      }
      
      // Cast ray to find clicked dimension
      const intersects = context.castRay(boundingBoxes);
      
      if (intersects && intersects.length > 0) {
        const clickedDimension = dimensionLines.find((dim: any) => dim.boundingBox === intersects[0].object);
        
        if (clickedDimension) {
          // Clear previous selection
          if (selectedDimension && selectedDimension !== clickedDimension) {
            selectedDimension.dimensionColor = new Color(0x000000);
          }
          
          // Clear hover state
          if (hoveredDimension) {
            if (hoveredDimension !== clickedDimension) {
              hoveredDimension.dimensionColor = new Color(0x000000);
            }
            setHoveredDimension(null);
          }
          
          // Set selection state and apply color immediately
          setSelectedDimension(clickedDimension);
          clickedDimension.dimensionColor = new Color(0x0066ff);
        } else {
          // Clicked on empty space - clear selection
          if (selectedDimension) {
            selectedDimension.dimensionColor = new Color(0x000000);
            setSelectedDimension(null);
          }
        }
      } else {
        // Clicked on empty space - clear selection
        if (selectedDimension) {
          selectedDimension.dimensionColor = new Color(0x000000);
          setSelectedDimension(null);
        }
      }
    };
    
    // Attach to the canvas element if available, otherwise use container
    let targetElement: HTMLElement | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    
    const attachHandler = () => {
      if (targetElement) return;
      
      const canvas = container.querySelector('canvas');
      targetElement = (canvas || container) as HTMLElement;
      if (targetElement) {
        targetElement.addEventListener('click', handleClick, true);
        logger.log('Click handler attached to:', targetElement.tagName);
      }
    };
    
    attachHandler();
    if (!container.querySelector('canvas')) {
      timeoutId = setTimeout(attachHandler, 300);
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (targetElement) {
        targetElement.removeEventListener('click', handleClick, true);
        targetElement = null;
      }
    };
  }, [measurementMode, clippingActive, viewerReady, selectedDimension, hoveredDimension]);

  // Handle dimension hover effect
  useEffect(() => {
    if (!containerRef.current || !viewerRef.current?.dimensions || !viewerRef.current?.context || !viewerReady) return;
    
    const container = containerRef.current;
    const dimensions = viewerRef.current.dimensions;
    const context = viewerRef.current.context;
    
    const handleMouseMove = (event: MouseEvent) => {
      // Don't show hover if actively drawing a dimension
      const isDragging = (dimensions as any).dragging || false;
      if (measurementMode === 'distance' && isDragging) {
        if (hoveredDimension) {
          hoveredDimension.dimensionColor = new Color(0x000000);
          setHoveredDimension(null);
        }
        return;
      }
      
      // Don't show hover if clipping is active
      if (clippingActive) {
        if (hoveredDimension) {
          hoveredDimension.dimensionColor = new Color(0x000000);
          setHoveredDimension(null);
        }
        return;
      }
      
      // Get all dimension lines
      let dimensionLines = (dimensions as any).dimensions || [];
      if (dimensionLines.length === 0 && dimensions.getDimensionsLines) {
        const getterLines = dimensions.getDimensionsLines || [];
        if (getterLines.length > 0) {
          dimensionLines = getterLines;
        }
      }
      
      // Add dimensionColor property to all dimensions from array
      dimensionLines.forEach((dim: any) => {
        if (dim && !dim.dimensionColor) {
          addDimensionColorProperty(dim, dim);
        }
      });
      
      if (dimensionLines.length === 0) {
        if (hoveredDimension) {
          hoveredDimension.dimensionColor = new Color(0x000000);
          setHoveredDimension(null);
        }
        return;
      }
      
      // Get bounding boxes for raycasting
      const boundingBoxes = dimensionLines
        .map((dim: any) => dim.boundingBox)
        .filter((box: any) => box !== undefined && box !== null);
      
      if (boundingBoxes.length === 0) {
        if (hoveredDimension) {
          hoveredDimension.dimensionColor = new Color(0x000000);
          setHoveredDimension(null);
        }
        return;
      }
      
      // Cast ray to find hovered dimension - only use the FIRST/closest intersection
      const intersects = context.castRay(boundingBoxes);
      
      if (intersects && intersects.length > 0) {
        const closestIntersect = intersects[0];
        const hoveredDim = dimensionLines.find((dim: any) => dim.boundingBox === closestIntersect.object);
        
        if (hoveredDim) {
          // Only show hover if not selected
          if (hoveredDim !== selectedDimension) {
            // IMPORTANT: Clear hover from ALL dimensions first (except selected)
            dimensionLines.forEach((dim: any) => {
              if (dim !== selectedDimension) {
                // Only reset if it's not the one we're about to hover
                if (dim !== hoveredDim) {
                  dim.dimensionColor = new Color(0x000000);
                }
              }
            });
            
            // Apply hover effect ONLY to the hovered dimension
            hoveredDim.dimensionColor = new Color(0x3399ff); // Light blue for hover
            setHoveredDimension(hoveredDim);
          } else {
            // If hovering over selected dimension, clear hover state but keep selection color
            if (hoveredDimension && hoveredDimension !== selectedDimension) {
              hoveredDimension.dimensionColor = new Color(0x000000);
            }
            setHoveredDimension(null);
            // Ensure selected dimension stays selected color
            if (selectedDimension) {
              selectedDimension.dimensionColor = new Color(0x0066ff);
            }
          }
        } else {
          // Not hovering over any dimension - clear all hovers (except selected)
          dimensionLines.forEach((dim: any) => {
            if (dim !== selectedDimension) {
              dim.dimensionColor = new Color(0x000000);
            }
          });
          setHoveredDimension(null);
        }
      } else {
        // Not hovering over any dimension - clear all hovers (except selected)
        dimensionLines.forEach((dim: any) => {
          if (dim !== selectedDimension) {
            dim.dimensionColor = new Color(0x000000);
          }
        });
        setHoveredDimension(null);
      }
    };
    
    // Attach to the canvas element if available, otherwise use container
    let targetElement: HTMLElement | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    
    const attachHandler = () => {
      if (targetElement) return;
      
      const canvas = container.querySelector('canvas');
      targetElement = (canvas || container) as HTMLElement;
      if (targetElement) {
        targetElement.addEventListener('mousemove', handleMouseMove);
      }
    };
    
    attachHandler();
    if (!container.querySelector('canvas')) {
      timeoutId = setTimeout(attachHandler, 300);
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (targetElement) {
        targetElement.removeEventListener('mousemove', handleMouseMove);
        targetElement = null;
      }
      // Clean up hover state
      if (hoveredDimension && hoveredDimension !== selectedDimension) {
        hoveredDimension.dimensionColor = new Color(0x000000);
      }
    };
  }, [measurementMode, clippingActive, viewerReady, selectedDimension, hoveredDimension]);

  return {
    selectedDimension,
    setSelectedDimension,
    hoveredDimension,
  };
};

