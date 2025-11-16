import { useEffect, useRef, useState } from 'react';
import { IfcViewerAPI } from 'web-ifc-viewer';
import { Color } from 'three';
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
        viewer.IFC.loader.ifcManager.state.api.wasmPath = wasmPath;
        viewer.IFC.loader.ifcManager.state.wasmPath = wasmPath;
        
        logger.log('WASM path set to:', wasmPath);
        logger.log('Loader WASM path:', viewer.IFC.loader.ifcManager.state.wasmPath);

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
      viewerRef.current.context.scene.background = bgColor;
    }
  }, [settings?.background]);

  return { viewerRef, viewerReady };
};

