import { useEffect, useState } from 'react';
import { IfcViewerAPI } from 'web-ifc-viewer';
import { Vector3 } from 'three';
import { Annotation } from '../types/annotation';

interface UseAnnotationInputPositionProps {
  viewerRef: React.RefObject<IfcViewerAPI | null>;
  viewerReady: boolean;
  editingAnnotation: Annotation | null;
  annotationGroupsRef: React.MutableRefObject<Map<string, any>>;
}

export const useAnnotationInputPosition = ({
  viewerRef,
  viewerReady,
  editingAnnotation,
  annotationGroupsRef,
}: UseAnnotationInputPositionProps) => {
  const [inputPosition, setInputPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!editingAnnotation || !viewerRef.current?.context || !viewerReady) {
      setInputPosition(null);
      return;
    }

    const updatePosition = () => {
      const group = annotationGroupsRef.current.get(editingAnnotation.id);
      if (!group || !viewerRef.current?.context) {
        setInputPosition(null);
        return;
      }

      // Get the camera and renderer
      const camera = viewerRef.current.context.getCamera();
      const renderer = viewerRef.current.context.getRenderer();
      
      if (!camera || !renderer) {
        setInputPosition(null);
        return;
      }

      // Get the annotation position (sphere position)
      const annotationPosition = editingAnnotation.position.clone();
      // Offset upward to account for label position (label is at position.y + 0.1)
      annotationPosition.y += 0.1;
      
      // Project 3D position to screen coordinates
      const vector = annotationPosition.project(camera);
      
      // Get canvas element
      const canvas = renderer.domElement;
      const rect = canvas.getBoundingClientRect();
      
      // Convert normalized device coordinates to screen coordinates
      const x = (vector.x * 0.5 + 0.5) * rect.width + rect.left;
      const y = (-vector.y * 0.5 + 0.5) * rect.height + rect.top;
      
      setInputPosition({ x, y });
    };

    // Update position initially and on animation frame
    updatePosition();
    
    const intervalId = setInterval(updatePosition, 100); // Update every 100ms
    
    return () => {
      clearInterval(intervalId);
    };
  }, [editingAnnotation, viewerReady, annotationGroupsRef]);

  return inputPosition;
};

