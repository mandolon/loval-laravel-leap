import { useEffect, useState, useRef } from 'react';
import { IfcViewerAPI } from 'web-ifc-viewer';
import { Color } from 'three';
import { Mesh } from 'three';
import { logger } from '@/utils/logger';

interface UseAnnotationInteractionProps {
  containerRef: React.RefObject<HTMLDivElement>;
  viewerRef: React.RefObject<IfcViewerAPI | null>;
  viewerReady: boolean;
  annotationMode: boolean;
  clippingActive: boolean;
  annotationGroupsRef: React.MutableRefObject<Map<string, any>>;
  setEditingAnnotationId: (id: string | null) => void;
  setAnnotationMode?: (active: boolean) => void;
}

export const useAnnotationInteraction = ({
  containerRef,
  viewerRef,
  viewerReady,
  annotationMode,
  clippingActive,
  annotationGroupsRef,
  setEditingAnnotationId,
  setAnnotationMode,
}: UseAnnotationInteractionProps) => {
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(null);
  
  // Performance optimization: Cache clickable objects list to avoid rebuilding on every mousemove
  const clickableObjectsRef = useRef<Mesh[]>([]);
  const rafIdRef = useRef<number | null>(null);

  // Performance optimization: Rebuild clickable objects cache when annotations change
  // We track the size of the annotation groups map to detect changes
  const lastCacheSizeRef = useRef<number>(0);
  
  useEffect(() => {
    const currentSize = annotationGroupsRef.current.size;
    // Rebuild cache if the number of annotation groups changed
    if (currentSize !== lastCacheSizeRef.current) {
      const clickableObjects: Mesh[] = [];
      annotationGroupsRef.current.forEach((group) => {
        group.traverse((child: any) => {
          if (child.userData?.isAnnotationBoundingBox || 
              (child.type === 'Mesh' && child.userData?.annotationId && child.name !== 'annotation-hover-sphere')) {
            clickableObjects.push(child);
          }
        });
      });
      clickableObjectsRef.current = clickableObjects;
      lastCacheSizeRef.current = currentSize;
    }
  }); // Run on every render to check for changes (lightweight check)

  // Handle annotation selection on click
  useEffect(() => {
    if (!containerRef.current || !viewerRef.current?.context || !viewerReady) return;
    if (annotationMode) return; // Don't select when in annotation mode (clicking places new annotations)
    
    const container = containerRef.current;
    const context = viewerRef.current.context;
    
    const handleClick = (event: MouseEvent) => {
      // Don't select if clipping is active
      if (clippingActive) {
        return;
      }
      
      // Use cached clickable objects list
      const clickableObjects = clickableObjectsRef.current;

      if (clickableObjects.length === 0) {
        // Clear selection if clicking on empty space
        if (selectedAnnotationId) {
          setSelectedAnnotationId(null);
        }
        return;
      }

      // Cast ray to find clicked annotation
      const intersects = context.castRay(clickableObjects);
      
      if (intersects && intersects.length > 0) {
        const clickedObject = intersects[0].object as Mesh;
        let annotationId = clickedObject.userData?.annotationId;
        
        // If clicked on sphere or bounding box, get annotation ID from parent group
        if (!annotationId && clickedObject.parent) {
          annotationId = clickedObject.parent.userData?.annotationId;
        }
        
        if (annotationId) {
          // Clear hover state
          setHoveredAnnotationId(null);
          
          // Check if clicking on already selected annotation
          if (selectedAnnotationId === annotationId) {
            // Second click on same annotation - enter edit mode
            if (!annotationMode && setAnnotationMode) {
              setAnnotationMode(true);
            }
            setEditingAnnotationId(annotationId);
            logger.log('Annotation clicked again - entering edit mode:', annotationId);
          } else {
            // First click - just select/activate the annotation
            setSelectedAnnotationId(annotationId);
            // Don't enter edit mode yet
            setEditingAnnotationId(null);
            logger.log('Annotation selected (first click):', annotationId);
          }
        } else {
          // Clicked on empty space - clear selection
          setSelectedAnnotationId(null);
          setEditingAnnotationId(null);
        }
      } else {
        // Clicked on empty space - clear selection and editing
        setSelectedAnnotationId(null);
        setEditingAnnotationId(null);
      }
    };
    
    const handleDoubleClick = (event: MouseEvent) => {
      // Don't handle double-click if clipping is active
      if (clippingActive) {
        return;
      }
      
      // Use cached clickable objects list
      const clickableObjects = clickableObjectsRef.current;

      if (clickableObjects.length === 0) {
        return;
      }

      // Cast ray to find double-clicked annotation
      const intersects = context.castRay(clickableObjects);
      
      if (intersects && intersects.length > 0) {
        const clickedObject = intersects[0].object as Mesh;
        let annotationId = clickedObject.userData?.annotationId;
        
        // If clicked on sphere or bounding box, get annotation ID from parent group
        if (!annotationId && clickedObject.parent) {
          annotationId = clickedObject.parent.userData?.annotationId;
        }
        
        if (annotationId) {
          // Clear hover state
          setHoveredAnnotationId(null);
          
          // Set selection
          setSelectedAnnotationId(annotationId);
          
          // Open for editing on double-click
          setEditingAnnotationId(annotationId);
          
          logger.log('Annotation double-clicked and opened for editing:', annotationId);
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
        targetElement.addEventListener('dblclick', handleDoubleClick, true);
        logger.log('Annotation click and double-click handlers attached');
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
        targetElement.removeEventListener('dblclick', handleDoubleClick, true);
        targetElement = null;
      }
    };
  }, [annotationMode, clippingActive, viewerReady, selectedAnnotationId, annotationGroupsRef, setEditingAnnotationId, setAnnotationMode]);

  // Handle annotation hover effect and cursor changes
  useEffect(() => {
    if (!containerRef.current || !viewerRef.current?.context || !viewerReady) return;
    
    const container = containerRef.current;
    const context = viewerRef.current.context;
    
    // Performance optimization: Throttle raycasting using requestAnimationFrame
    const handleMouseMove = (event: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      
      // Skip if there's already a pending frame
      if (rafIdRef.current !== null) return;
      
      // Schedule raycast for next frame
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        
        // Get canvas element for cursor styling
        const canvas = container.querySelector('canvas') as HTMLCanvasElement;
        
        // Don't show hover if clipping is active
        if (clippingActive) {
          if (hoveredAnnotationId) {
            setHoveredAnnotationId(null);
          }
          if (canvas) {
            canvas.style.cursor = annotationMode ? 'crosshair' : 'default';
          }
          return;
        }
        
        // Use cached clickable objects list (performance optimization)
        const clickableObjects = clickableObjectsRef.current;
        
        // Early exit if no clickable objects (already implemented)
        if (clickableObjects.length === 0) {
          if (hoveredAnnotationId) {
            setHoveredAnnotationId(null);
          }
          if (canvas) {
            canvas.style.cursor = annotationMode ? 'crosshair' : 'default';
          }
          return;
        }
        
        // Cast ray to find hovered annotation - only use the FIRST/closest intersection
        const intersects = context.castRay(clickableObjects);
        
        if (intersects && intersects.length > 0) {
          const closestIntersect = intersects[0];
          let annotationId = closestIntersect.object.userData?.annotationId;
          
          // If clicked on sphere or bounding box, get annotation ID from parent group
          if (!annotationId && closestIntersect.object.parent) {
            annotationId = closestIntersect.object.parent.userData?.annotationId;
          }
          
          if (annotationId) {
            // Set cursor to pointer when hovering over annotation
            if (canvas) {
              canvas.style.cursor = 'pointer';
            }
            
            // Only show hover if not selected
            if (annotationId !== selectedAnnotationId) {
              setHoveredAnnotationId(annotationId);
            } else {
              // If hovering over selected annotation, clear hover state
              setHoveredAnnotationId(null);
            }
          } else {
            setHoveredAnnotationId(null);
            if (canvas) {
              canvas.style.cursor = annotationMode ? 'crosshair' : 'default';
            }
          }
        } else {
          // Not hovering over any annotation
          setHoveredAnnotationId(null);
          if (canvas) {
            canvas.style.cursor = annotationMode ? 'crosshair' : 'default';
          }
        }
      });
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
      // Cancel pending animation frame
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (targetElement) {
        targetElement.removeEventListener('mousemove', handleMouseMove);
        targetElement = null;
      }
    };
  }, [annotationMode, clippingActive, viewerReady, selectedAnnotationId, hoveredAnnotationId, containerRef]);

  // Apply hover and selection colors to annotations (both sphere and text label)
  useEffect(() => {
    if (!viewerRef.current?.context) return;
    
    annotationGroupsRef.current.forEach((group, annotationId) => {
      // Find the sphere in the group
      let sphere: any = null;
      let textLabel: any = null;
      
      group.traverse((child: any) => {
        if (child.type === 'Mesh' && child.geometry?.type === 'SphereGeometry' && child.name !== 'annotation-hover-sphere') {
          sphere = child;
        }
        // Find CSS2DObject (text label)
        if (child.type === 'CSS2DObject' || (child.element && child.element.tagName === 'DIV')) {
          textLabel = child;
        }
      });
      
      // Update sphere color
      if (sphere && sphere.material) {
        // Clone material if needed to avoid sharing
        if (!sphere.material.userData.isCloned) {
          sphere.material = sphere.material.clone();
          sphere.material.userData.isCloned = true;
        }
        
        // Apply colors based on state
        if (annotationId === selectedAnnotationId) {
          // Selected: blue
          sphere.material.color = new Color(0x0066ff);
        } else if (annotationId === hoveredAnnotationId) {
          // Hovered: darker orange (darker version of 0xff6600)
          sphere.material.color = new Color(0xcc5200); // ~20% darker
        } else {
          // Default: orange
          sphere.material.color = new Color(0xff6600);
        }
      }
      
      // Update text label background color
      if (textLabel && textLabel.element) {
        const textDiv = textLabel.element as HTMLElement;
        if (annotationId === selectedAnnotationId) {
          // Selected: blue background
          textDiv.style.background = 'rgba(0, 102, 255, 0.9)';
        } else if (annotationId === hoveredAnnotationId) {
          // Hovered: darker orange background
          textDiv.style.background = 'rgba(204, 82, 0, 0.9)'; // Darker orange
        } else {
          // Default: orange background
          textDiv.style.background = 'rgba(255, 102, 0, 0.9)';
        }
      }
    });
  }, [selectedAnnotationId, hoveredAnnotationId, annotationGroupsRef, viewerRef]);

  return {
    selectedAnnotationId,
    setSelectedAnnotationId,
    hoveredAnnotationId,
  };
};

