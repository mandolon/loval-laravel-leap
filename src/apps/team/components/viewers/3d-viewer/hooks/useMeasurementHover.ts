import { useEffect, useRef } from 'react';
import { IfcViewerAPI } from 'web-ifc-viewer';
import * as THREE from 'three';
import { logger } from '@/utils/logger';

interface UseMeasurementHoverProps {
  containerRef: React.RefObject<HTMLDivElement>;
  viewerRef: React.RefObject<IfcViewerAPI | null>;
  viewerReady: boolean;
  measurementMode: 'none' | 'distance' | 'area' | 'volume';
  clippingActive: boolean;
}

export const useMeasurementHover = ({
  containerRef,
  viewerRef,
  viewerReady,
  measurementMode,
  clippingActive,
}: UseMeasurementHoverProps) => {
  const hoverSphereRef = useRef<THREE.Mesh | null>(null);

  // Create and manage hover sphere for first measurement point
  useEffect(() => {
    if (!viewerRef.current?.context || !viewerReady) return;
    
    const context = viewerRef.current.context;
    const scene = context.getScene();
    
    // Create sphere geometry and material
    const sphereGeometry = new THREE.SphereGeometry(0.05, 16, 16); // Small sphere, radius 0.05
    const sphereMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x0066ff, // Blue color to match selection
      transparent: true,
      opacity: 0.8
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.visible = false;
    sphere.name = 'measurement-hover-sphere';
    sphere.raycast = () => {}; // Make sphere non-raycastable so it doesn't interfere with dimension tool
    scene.add(sphere);
    hoverSphereRef.current = sphere;
    
    return () => {
      if (hoverSphereRef.current) {
        scene.remove(hoverSphereRef.current);
        hoverSphereRef.current.geometry.dispose();
        (hoverSphereRef.current.material as THREE.Material).dispose();
        hoverSphereRef.current = null;
      }
    };
  }, [viewerReady]);

  // Handle hover sphere positioning in measurement mode
  useEffect(() => {
    if (!containerRef.current || !viewerRef.current?.context || !viewerRef.current?.dimensions || !viewerReady || !hoverSphereRef.current) return;
    
    const container = containerRef.current;
    const context = viewerRef.current.context;
    const dimensions = viewerRef.current.dimensions;
    const sphere = hoverSphereRef.current;
    
    const handleMouseMove = (event: MouseEvent) => {
      // Only show sphere in distance measurement mode
      if (measurementMode !== 'distance') {
        sphere.visible = false;
        return;
      }

      // Check if actively drawing a dimension (after first point clicked)
      const isDragging = (dimensions as any).dragging || false;
      if (isDragging) {
        sphere.visible = false;
        return;
      }

      // Don't show sphere if clipping is active
      if (clippingActive) {
        sphere.visible = false;
        return;
      }

      // Cast ray to IFC model to find intersection point
      try {
        // Try to use castRayIfc if available (through raycaster)
        const raycaster = (context as any).ifcCaster;
        let intersection = null;
        
        if (raycaster && typeof raycaster.castRayIfc === 'function') {
          intersection = raycaster.castRayIfc();
        } else {
          // Fallback: use castRay with pickable IFC models
          const pickableModels = (context as any).items?.pickableIfcModels || [];
          if (pickableModels.length > 0) {
            const intersects = context.castRay(pickableModels);
            intersection = intersects && intersects.length > 0 ? intersects[0] : null;
          }
        }
        
        if (intersection && intersection.point) {
          // Position sphere at intersection point
          sphere.position.copy(intersection.point);
          sphere.visible = true;
        } else {
          sphere.visible = false;
        }
      } catch (error) {
        // Silently hide sphere on error
        sphere.visible = false;
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
      if (sphere) {
        sphere.visible = false;
      }
    };
  }, [measurementMode, clippingActive, viewerReady]);
};

