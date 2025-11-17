import { useEffect, useRef, useState } from 'react';
import { IfcViewerAPI } from 'web-ifc-viewer';
import { Color } from 'three';
import CameraControls from 'camera-controls';
import { logger } from '@/utils/logger';

interface ModelSettings {
  background?: string;
  show_grid?: boolean;
  show_axes?: boolean;
}

export const useViewerInitialization = (
  containerRef: React.RefObject<HTMLDivElement>,
  settings?: ModelSettings
) => {
  const viewerRef = useRef<IfcViewerAPI | null>(null);
  const [viewerReady, setViewerReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const initViewer = async () => {
      try {
        const container = containerRef.current!;

        // Create viewer
        const viewer = new IfcViewerAPI({
          container,
          backgroundColor: new Color(
            settings?.background === 'dark' ? 0x1a1a1a : 0xf5f5f5
          ),
        });

        // Configure IFC.js to use local WASM files from public folder
        // This avoids CORS issues with CDN
        const wasmPath = '/wasm/';
        viewer.IFC.loader.ifcManager.state.api.SetWasmPath(wasmPath);
        viewer.IFC.loader.ifcManager.state.wasmPath = wasmPath;
        
        logger.log('WASM path set to:', wasmPath);
        logger.log('Loader WASM path:', viewer.IFC.loader.ifcManager.state.wasmPath);

        // Configure mouse button actions
        if (viewer.context?.ifcCamera?.cameraControls) {
          const controls = viewer.context.ifcCamera.cameraControls;
          const domElement = viewer.context.getDomElement();
          
          // Middle mouse button for panning
          controls.mouseButtons.middle = CameraControls.ACTION.TRUCK;
          
          // Custom handler for Shift + middle mouse button to orbit
          let isMiddleMouseDown = false;
          let shiftPressed = false;
          
          // Track Shift key state
          const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Shift' || event.keyCode === 16) {
              shiftPressed = true;
              // If middle mouse is already down, update action immediately
              if (isMiddleMouseDown) {
                controls.mouseButtons.middle = CameraControls.ACTION.ROTATE;
              }
            }
          };
          
          const handleKeyUp = (event: KeyboardEvent) => {
            if (event.key === 'Shift' || event.keyCode === 16) {
              shiftPressed = false;
              // If middle mouse is still down, restore to TRUCK
              if (isMiddleMouseDown) {
                controls.mouseButtons.middle = CameraControls.ACTION.TRUCK;
              }
            }
          };
          
          const handleMouseDown = (event: MouseEvent) => {
            if (event.button === 1) { // Middle mouse button (button 1)
              isMiddleMouseDown = true;
              // Check both event.shiftKey and our tracked state
              const shiftIsPressed = event.shiftKey || shiftPressed;
              
              // Set action immediately - we're in capture phase so this should happen before CameraControls
              if (shiftIsPressed) {
                controls.mouseButtons.middle = CameraControls.ACTION.ROTATE;
                logger.log('Shift + Middle mouse: ROTATE mode');
              } else {
                controls.mouseButtons.middle = CameraControls.ACTION.TRUCK;
                logger.log('Middle mouse: TRUCK mode');
              }
            }
          };
          
          const handleMouseMove = (event: MouseEvent) => {
            // Update action dynamically if middle mouse is held down
            if (isMiddleMouseDown && event.buttons === 4) { // Middle mouse button pressed
              const shiftIsPressed = event.shiftKey || shiftPressed;
              if (shiftIsPressed) {
                controls.mouseButtons.middle = CameraControls.ACTION.ROTATE;
              } else {
                controls.mouseButtons.middle = CameraControls.ACTION.TRUCK;
              }
            }
          };
          
          const handleMouseUp = (event: MouseEvent) => {
            if (event.button === 1) {
              isMiddleMouseDown = false;
              // Restore middle button to TRUCK (default)
              controls.mouseButtons.middle = CameraControls.ACTION.TRUCK;
            }
          };
          
          // Add listeners with capture phase to ensure we set action before CameraControls processes it
          domElement.addEventListener('mousedown', handleMouseDown, true);
          domElement.addEventListener('mousemove', handleMouseMove, true);
          domElement.addEventListener('mouseup', handleMouseUp, true);
          window.addEventListener('keydown', handleKeyDown, true);
          window.addEventListener('keyup', handleKeyUp, true);
          
          // Store cleanup function
          (viewer as any)._shiftMiddleMouseCleanup = () => {
            domElement.removeEventListener('mousedown', handleMouseDown, true);
            domElement.removeEventListener('mousemove', handleMouseMove, true);
            domElement.removeEventListener('mouseup', handleMouseUp, true);
            window.removeEventListener('keydown', handleKeyDown, true);
            window.removeEventListener('keyup', handleKeyUp, true);
          };
          
          logger.log('Middle mouse button configured for panning');
          logger.log('Shift + middle mouse button configured for orbit');
        }

        viewerRef.current = viewer;
        setViewerReady(true);

        logger.log('IFC Viewer initialized');
      } catch (err) {
        logger.error('Failed to initialize IFC viewer:', err);
      }
    };

    initViewer();

    // Cleanup
    return () => {
      if (viewerRef.current) {
        // Cleanup custom event handlers
        if ((viewerRef.current as any)._shiftMiddleMouseCleanup) {
          (viewerRef.current as any)._shiftMiddleMouseCleanup();
        }
        viewerRef.current.dispose();
        viewerRef.current = null;
      }
    };
  }, []);

  // Update background color when settings change
  useEffect(() => {
    if (viewerRef.current && viewerRef.current.context?.scene) {
      const bgColor = new Color(
        settings?.background === 'dark' ? 0x1a1a1a : 0xf5f5f5
      );
      (viewerRef.current.context.scene as any).background = bgColor;
    }
  }, [settings?.background]);

  return { viewerRef, viewerReady };
};

