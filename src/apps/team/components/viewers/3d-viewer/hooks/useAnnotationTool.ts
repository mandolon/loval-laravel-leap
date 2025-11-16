import { useEffect, useState, useRef, useCallback } from 'react';
import { IfcViewerAPI } from 'web-ifc-viewer';
import * as THREE from 'three';
import { Group, Mesh, SphereGeometry, MeshBasicMaterial, BoxGeometry } from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';
import { logger } from '@/utils/logger';
import { Annotation } from '../types/annotation';

interface UseAnnotationToolProps {
  containerRef: React.RefObject<HTMLDivElement>;
  viewerRef: React.RefObject<IfcViewerAPI | null>;
  viewerReady: boolean;
  annotationMode: boolean;
  clippingActive: boolean;
}

export const useAnnotationTool = ({
  containerRef,
  viewerRef,
  viewerReady,
  annotationMode,
  clippingActive,
}: UseAnnotationToolProps) => {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  const [hoverSphereRef, setHoverSphereRef] = useState<THREE.Mesh | null>(null);
  const annotationGroupsRef = useRef<Map<string, Group>>(new Map());
  const annotationInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const isPlacingAnnotationRef = useRef<boolean>(false);
  const mouseDownPositionRef = useRef<{ x: number; y: number } | null>(null);
  const dragThreshold = 5; // pixels - if mouse moves more than this, it's a drag

  // Create hover sphere for annotation placement
  useEffect(() => {
    if (!viewerRef.current?.context || !viewerReady) return;
    
    const context = viewerRef.current.context;
    const scene = context.getScene();
    
    // Remove any existing hover sphere first
    const existingSphere = scene.getObjectByName('annotation-hover-sphere');
    if (existingSphere) {
      scene.remove(existingSphere);
      if ((existingSphere as any).geometry) (existingSphere as any).geometry.dispose();
      if ((existingSphere as any).material) (existingSphere as any).material.dispose();
    }
    
    // Create sphere geometry and material
    const sphereGeometry = new SphereGeometry(0.05, 16, 16);
    const sphereMaterial = new MeshBasicMaterial({ 
      color: 0xff6600, // Orange color for annotations
      transparent: true,
      opacity: 0.8
    });
    const sphere = new Mesh(sphereGeometry, sphereMaterial);
    sphere.visible = false;
    sphere.name = 'annotation-hover-sphere';
    sphere.raycast = () => {}; // Make sphere non-raycastable
    scene.add(sphere);
    setHoverSphereRef(sphere);
    
    return () => {
      if (sphere && scene) {
        scene.remove(sphere);
        sphere.geometry.dispose();
        (sphere.material as THREE.Material).dispose();
      }
    };
  }, [viewerReady]);

  // Reset placement flag when editing state changes
  useEffect(() => {
    // If we're not editing, reset the flag to allow new placements
    if (!editingAnnotationId) {
      isPlacingAnnotationRef.current = false;
    }
  }, [editingAnnotationId]);

  // Hide hover sphere and close editing when annotation mode is off
  useEffect(() => {
    if (!hoverSphereRef) return;
    
    if (!annotationMode) {
      hoverSphereRef.visible = false;
      // Close any open editing when annotation mode is turned off
      if (editingAnnotationId) {
        setEditingAnnotationId(null);
      }
      // Reset placement flag
      isPlacingAnnotationRef.current = false;
    }
  }, [annotationMode, hoverSphereRef, editingAnnotationId]);

  // Handle hover sphere positioning in annotation mode
  useEffect(() => {
    if (!containerRef.current || !viewerRef.current?.context || !viewerReady || !hoverSphereRef) return;
    
    const container = containerRef.current;
    const context = viewerRef.current.context;
    const sphere = hoverSphereRef;
    
    const handleMouseMove = (event: MouseEvent) => {
      // Only show sphere in annotation mode
      if (!annotationMode) {
        sphere.visible = false;
        return;
      }

      // Don't show sphere if clipping is active
      if (clippingActive) {
        sphere.visible = false;
        return;
      }

      // Don't show if editing an annotation
      if (editingAnnotationId) {
        sphere.visible = false;
        return;
      }

      // Cast ray to IFC model to find intersection point
      try {
        const raycaster = (context as any).ifcCaster;
        let intersection = null;
        
        if (raycaster && typeof raycaster.castRayIfc === 'function') {
          intersection = raycaster.castRayIfc();
        } else {
          const pickableModels = (context as any).items?.pickableIfcModels || [];
          if (pickableModels.length > 0) {
            const intersects = context.castRay(pickableModels);
            intersection = intersects && intersects.length > 0 ? intersects[0] : null;
          }
        }
        
        if (intersection && intersection.point) {
          sphere.position.copy(intersection.point);
          sphere.visible = true;
        } else {
          sphere.visible = false;
        }
      } catch (error) {
        sphere.visible = false;
      }
    };
    
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
      if (sphere) {
        sphere.visible = false;
      }
    };
  }, [annotationMode, clippingActive, viewerReady, editingAnnotationId, hoverSphereRef]);

  // Create annotation marker in scene
  const createAnnotationMarker = useCallback((annotation: Annotation): Group => {
    const group = new Group();
    group.name = `annotation-${annotation.id}`;
    group.userData.annotationId = annotation.id;

    // Create sphere marker
    const sphereGeometry = new SphereGeometry(0.05, 16, 16);
    const sphereMaterial = new MeshBasicMaterial({ 
      color: 0xff6600, // Orange
      transparent: true,
      opacity: 0.9
    });
    const sphere = new Mesh(sphereGeometry, sphereMaterial);
    sphere.position.copy(annotation.position);
    group.add(sphere);

    // Create bounding box for click detection (larger area for easier clicking)
    const boxGeometry = new BoxGeometry(0.2, 0.2, 0.2);
    const boxMaterial = new MeshBasicMaterial({ 
      transparent: true,
      opacity: 0,
      visible: false
    });
    const boundingBox = new Mesh(boxGeometry, boxMaterial);
    boundingBox.position.copy(annotation.position);
    boundingBox.userData.isAnnotationBoundingBox = true;
    boundingBox.userData.annotationId = annotation.id;
    group.userData.annotationId = annotation.id;
    group.add(boundingBox);
    
    // Make sphere clickable too
    sphere.userData.annotationId = annotation.id;

    // Create text label using CSS2DObject
    const textDiv = document.createElement('div');
    textDiv.className = 'annotation-label';
    textDiv.style.cssText = `
      background: rgba(255, 102, 0, 0.9);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-family: system-ui, -apple-system, sans-serif;
      white-space: nowrap;
      pointer-events: none;
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      display: block;
    `;
    const hasText = annotation.text && annotation.text.trim();
    textDiv.textContent = hasText ? annotation.text : 'New note';
    
    const textLabel = new CSS2DObject(textDiv);
    textLabel.position.set(
      annotation.position.x,
      annotation.position.y + 0.1,
      annotation.position.z
    );
    // Always visible - we'll update text content when it changes
    textLabel.visible = true;
    textLabel.layers.set(0); // Ensure it's on the default layer
    group.add(textLabel);
    
    logger.log('Created annotation label:', {
      id: annotation.id,
      hasText,
      text: annotation.text,
      visible: textLabel.visible,
      position: textLabel.position
    });

    return group;
  }, []);

  // Add annotation to scene
  const addAnnotationToScene = useCallback((annotation: Annotation) => {
    if (!viewerRef.current?.context) return;
    
    const scene = viewerRef.current.context.getScene();
    const group = createAnnotationMarker(annotation);
    
    // Ensure group and all children are visible
    group.visible = true;
    group.traverse((child: any) => {
      child.visible = true;
    });
    
    scene.add(group);
    annotationGroupsRef.current.set(annotation.id, group);
    
    logger.log('Added annotation to scene:', {
      id: annotation.id,
      groupVisible: group.visible,
      children: group.children.length,
      scene: scene.uuid
    });
  }, [createAnnotationMarker]);

  // Remove annotation from scene
  const removeAnnotationFromScene = useCallback((annotationId: string) => {
    const group = annotationGroupsRef.current.get(annotationId);
    if (group && viewerRef.current?.context) {
      const scene = viewerRef.current.context.getScene();
      scene.remove(group);
      
      // Dispose of geometries and materials
      group.traverse((child: any) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      
      annotationGroupsRef.current.delete(annotationId);
    }
  }, []);

  // Update annotation in scene
  const updateAnnotationInScene = useCallback((annotation: Annotation) => {
    const group = annotationGroupsRef.current.get(annotation.id);
    if (group) {
      // Update text label if it exists
      let found = false;
      group.traverse((child: any) => {
        // Check for CSS2DObject - it might be stored as type or we can check for element property
        if ((child.type === 'CSS2DObject' || child.element) && child.element) {
          found = true;
          const hasText = annotation.text && annotation.text.trim();
          const newText = hasText ? annotation.text : 'New note';
          const currentText = child.element.textContent || '';
          
          // Always update text content to ensure it's current
          child.element.textContent = newText;
          child.visible = true;
          
          logger.log('Updated annotation label text:', {
            id: annotation.id,
            oldText: currentText,
            newText: newText,
            hasText,
            childType: child.type,
            elementExists: !!child.element
          });
        }
      });
      
      if (!found) {
        logger.log('CSS2DObject not found in group for annotation:', annotation.id);
      }
    } else {
      logger.log('Group not found for annotation:', annotation.id);
      // If group doesn't exist, create it
      addAnnotationToScene(annotation);
    }
  }, [addAnnotationToScene]);

  // Handle click to place annotation (only on click, not drag)
  useEffect(() => {
    if (!containerRef.current || !viewerRef.current?.context || !viewerReady || !annotationMode) return;
    if (editingAnnotationId) return; // Don't place new annotation while editing
    
    const container = containerRef.current;
    const context = viewerRef.current.context;
    
    const handleMouseDown = (event: MouseEvent) => {
      // Only track left mouse button
      if (event.button !== 0) return;
      
      // Store mouse down position
      mouseDownPositionRef.current = {
        x: event.clientX,
        y: event.clientY
      };
    };
    
    const handleMouseUp = (event: MouseEvent) => {
      // Only handle left mouse button
      if (event.button !== 0) return;
      
      // Check if this was a drag (mouse moved significantly)
      if (mouseDownPositionRef.current) {
        const dx = event.clientX - mouseDownPositionRef.current.x;
        const dy = event.clientY - mouseDownPositionRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If mouse moved more than threshold, it's a drag - don't place annotation
        if (distance > dragThreshold) {
          mouseDownPositionRef.current = null;
          return;
        }
      }
      
      // Prevent multiple annotations from a single click
      if (isPlacingAnnotationRef.current) {
        event.preventDefault();
        event.stopPropagation();
        mouseDownPositionRef.current = null;
        return;
      }
      
      if (clippingActive) {
        mouseDownPositionRef.current = null;
        return;
      }
      if (editingAnnotationId) {
        mouseDownPositionRef.current = null;
        return; // Don't place while editing
      }

      // Prevent default and stop propagation to avoid multiple triggers
      event.preventDefault();
      event.stopPropagation();

      // Set flag to prevent duplicate placements
      isPlacingAnnotationRef.current = true;
      
      // Clear mouse down position
      mouseDownPositionRef.current = null;

      // First check if we clicked on an existing annotation - if so, don't place a new one
      const clickableObjects: Mesh[] = [];
      annotationGroupsRef.current.forEach((group) => {
        group.traverse((child: any) => {
          if (child.userData?.isAnnotationBoundingBox || 
              (child.type === 'Mesh' && child.name !== 'annotation-hover-sphere')) {
            clickableObjects.push(child);
          }
        });
      });

      if (clickableObjects.length > 0) {
        const intersects = context.castRay(clickableObjects);
        if (intersects && intersects.length > 0) {
          // Clicked on an existing annotation, don't place a new one
          isPlacingAnnotationRef.current = false;
          return;
        }
      }

      // Cast ray to find intersection point on model
      try {
        const raycaster = (context as any).ifcCaster;
        let intersection = null;
        
        if (raycaster && typeof raycaster.castRayIfc === 'function') {
          intersection = raycaster.castRayIfc();
        } else {
          const pickableModels = (context as any).items?.pickableIfcModels || [];
          if (pickableModels.length > 0) {
            const intersects = context.castRay(pickableModels);
            intersection = intersects && intersects.length > 0 ? intersects[0] : null;
          }
        }
        
        if (intersection && intersection.point) {
          // Create new annotation (but don't add to scene yet - wait until text is entered)
          const newAnnotation: Annotation = {
            id: `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            position: intersection.point.clone(),
            text: '',
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          // Add to state but don't render to scene yet
          setAnnotations(prev => [...prev, newAnnotation]);
          // Don't call addAnnotationToScene here - wait until text is saved
          setEditingAnnotationId(newAnnotation.id);
          
          logger.log('Annotation placed at:', intersection.point);
          
          // Reset flag after annotation is created and editing starts
          // The flag will prevent new placements until editing is done
          // It gets reset when editingAnnotationId changes or annotation mode is turned off
        } else {
          isPlacingAnnotationRef.current = false;
        }
      } catch (error) {
        logger.error('Error placing annotation:', error);
        isPlacingAnnotationRef.current = false;
      }
    };
    
    let targetElement: HTMLElement | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    
    const attachHandler = () => {
      if (targetElement) return;
      
      const canvas = container.querySelector('canvas');
      targetElement = (canvas || container) as HTMLElement;
      if (targetElement) {
        targetElement.addEventListener('mousedown', handleMouseDown);
        targetElement.addEventListener('mouseup', handleMouseUp);
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
        targetElement.removeEventListener('mousedown', handleMouseDown);
        targetElement.removeEventListener('mouseup', handleMouseUp);
        targetElement = null;
      }
      mouseDownPositionRef.current = null;
    };
  }, [annotationMode, viewerReady, clippingActive, editingAnnotationId, addAnnotationToScene]);

  // Handle clicking on existing annotations to edit
  useEffect(() => {
    if (!containerRef.current || !viewerRef.current?.context || !viewerReady) return;
    if (annotationMode) return; // In annotation mode, clicks place new annotations
    
    const container = containerRef.current;
    const context = viewerRef.current.context;
    
    const handleClick = (event: MouseEvent) => {
      if (clippingActive) return;
      if (editingAnnotationId) return; // Don't allow clicking other annotations while editing

      // Get all annotation bounding boxes and spheres
      const clickableObjects: Mesh[] = [];
      annotationGroupsRef.current.forEach((group) => {
        group.traverse((child: any) => {
          if (child.userData?.isAnnotationBoundingBox || 
              (child.type === 'Mesh' && child.name !== 'annotation-hover-sphere')) {
            clickableObjects.push(child);
          }
        });
      });

      if (clickableObjects.length === 0) return;

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
          event.stopPropagation(); // Prevent event from bubbling to placement handler
          setEditingAnnotationId(annotationId);
          logger.log('Annotation clicked for editing:', annotationId);
          return; // Exit early to prevent any other handlers
        }
      }
    };
    
    let targetElement: HTMLElement | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    
    const attachHandler = () => {
      if (targetElement) return;
      
      const canvas = container.querySelector('canvas');
      targetElement = (canvas || container) as HTMLElement;
      if (targetElement) {
        targetElement.addEventListener('click', handleClick);
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
        targetElement.removeEventListener('click', handleClick);
        targetElement = null;
      }
    };
  }, [viewerReady, annotationMode, clippingActive, editingAnnotationId]);

  // Render all annotations to scene (only when annotations change)
  useEffect(() => {
    if (!viewerRef.current?.context || !viewerReady) return;
    
    const scene = viewerRef.current.context.getScene();
    const currentIds = new Set(annotationGroupsRef.current.keys());
    const annotationIds = new Set(annotations.map(a => a.id));
    
    // Remove annotations that no longer exist
    currentIds.forEach(id => {
      if (!annotationIds.has(id)) {
        const group = annotationGroupsRef.current.get(id);
        if (group) {
          scene.remove(group);
          group.traverse((child: any) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
          });
          annotationGroupsRef.current.delete(id);
        }
      }
    });
    
    // Add new annotations only if they have text (empty annotations should not be rendered)
    annotations.forEach(annotation => {
      // Only add to scene if annotation has text and is not already in scene
      if (!annotationGroupsRef.current.has(annotation.id) && annotation.text && annotation.text.trim()) {
        // New annotation with text - add it
        addAnnotationToScene(annotation);
      }
      // Note: We don't update existing annotations here to avoid rerenders
      // Updates are handled via updateAnnotationInScene when text changes
    });
  }, [annotations, viewerReady, addAnnotationToScene]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      annotationGroupsRef.current.forEach((group) => {
        if (viewerRef.current?.context) {
          viewerRef.current.context.getScene().remove(group);
        }
        group.traverse((child: any) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        });
      });
      annotationGroupsRef.current.clear();
    };
  }, []);

  const saveAnnotation = useCallback((id: string, text: string) => {
    // Don't save if text is empty - should be deleted instead
    if (!text || !text.trim()) {
      // Delete the annotation if text is empty
      removeAnnotationFromScene(id);
      setAnnotations(prev => prev.filter(ann => ann.id !== id));
      if (editingAnnotationId === id) {
        setEditingAnnotationId(null);
      }
      isPlacingAnnotationRef.current = false;
      return;
    }
    
    // Find the current annotation to update
    setAnnotations(prev => {
      const updated = prev.map(ann => {
        if (ann.id === id) {
          const updatedAnn = { ...ann, text, updatedAt: new Date() };
          
          // Check if annotation is already in scene
          const existingGroup = annotationGroupsRef.current.get(id);
          if (existingGroup) {
            // Update existing annotation in scene
            updateAnnotationInScene(updatedAnn);
          } else {
            // First time saving - add to scene now that we have text
            addAnnotationToScene(updatedAnn);
          }
          
          return updatedAnn;
        }
        return ann;
      });
      return updated;
    });
    
    setEditingAnnotationId(null);
    // Reset placement flag when saving (editing is done)
    isPlacingAnnotationRef.current = false;
  }, [updateAnnotationInScene, removeAnnotationFromScene, addAnnotationToScene, editingAnnotationId]);

  const deleteAnnotation = useCallback((id: string) => {
    removeAnnotationFromScene(id);
    setAnnotations(prev => prev.filter(ann => ann.id !== id));
    if (editingAnnotationId === id) {
      setEditingAnnotationId(null);
    }
    // Reset placement flag when deleting
    isPlacingAnnotationRef.current = false;
  }, [removeAnnotationFromScene, editingAnnotationId]);

  return {
    annotations,
    editingAnnotationId,
    setEditingAnnotationId,
    saveAnnotation,
    deleteAnnotation,
    annotationGroupsRef,
  };
};

