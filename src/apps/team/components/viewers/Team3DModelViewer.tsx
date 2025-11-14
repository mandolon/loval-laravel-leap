import { useState, useEffect, useRef } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Home,
  Eye,
  EyeOff
} from 'lucide-react';
import { IfcViewerAPI } from 'web-ifc-viewer';
import { Color } from 'three';
import { logger } from '@/utils/logger';

interface ModelSettings {
  background?: string;
  show_grid?: boolean;
  show_axes?: boolean;
  layers?: {
    structure?: boolean;
    walls?: boolean;
    roof?: boolean;
    floor?: boolean;
    windows?: boolean;
  };
}

interface Team3DModelViewerProps {
  modelFile: {
    storage_path: string;
    filename: string;
  } | null;
  settings?: ModelSettings;
  versionNumber?: string;
}

const Team3DModelViewer = ({ modelFile, settings, versionNumber }: Team3DModelViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<IfcViewerAPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(settings?.show_grid ?? true);
  const [showAxes, setShowAxes] = useState(settings?.show_axes ?? true);
  const [isolatedLayers, setIsolatedLayers] = useState<string[]>([]);

  // Initialize IFC viewer
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

        // Set up the grid and axes
        viewer.grid.setGrid();
        viewer.axes.setAxes();

        // Configure grid visibility
        if (viewer.grid && viewer.grid.grid) {
          viewer.grid.grid.visible = showGrid;
        }

        // Configure axes visibility
        if (viewer.axes && viewer.axes.axes) {
          viewer.axes.axes.visible = showAxes;
        }

        viewerRef.current = viewer;

        logger.log('IFC Viewer initialized');
      } catch (err) {
        logger.error('Failed to initialize IFC viewer:', err);
        setError('Failed to initialize 3D viewer');
        setLoading(false);
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

  // Update grid visibility
  useEffect(() => {
    if (viewerRef.current?.grid?.grid) {
      viewerRef.current.grid.grid.visible = showGrid;
    }
  }, [showGrid]);

  // Update axes visibility
  useEffect(() => {
    if (viewerRef.current?.axes?.axes) {
      viewerRef.current.axes.axes.visible = showAxes;
    }
  }, [showAxes]);

  // Load IFC model
  useEffect(() => {
    if (!viewerRef.current || !modelFile) {
      setLoading(false);
      return;
    }

    const loadModel = async () => {
      try {
        setLoading(true);
        setError(null);

        // In production, fetch the file from Supabase storage
        // For now, we'll use a placeholder or local file
        const response = await fetch(modelFile.storage_path);
        const data = await response.arrayBuffer();
        const blob = new Blob([data]);
        const url = URL.createObjectURL(blob);

        // Load the IFC model
        if (viewerRef.current) {
          await viewerRef.current.IFC.loadIfcUrl(url);

          // Fit model to frame
          await viewerRef.current.context?.fitToFrame();

          setLoading(false);
          logger.log('IFC model loaded successfully');
        }

        // Cleanup blob URL
        URL.revokeObjectURL(url);
      } catch (err) {
        logger.error('Failed to load IFC model:', err);
        setError('Failed to load 3D model. Please check the file format.');
        setLoading(false);
      }
    };

    loadModel();
  }, [modelFile]);

  // Apply layer visibility settings
  useEffect(() => {
    if (!viewerRef.current || !settings?.layers) return;

    // Layer filtering logic would go here
    // This requires IFC property filtering which is more complex
    // For now, we'll just log the layer settings
    logger.log('Layer settings:', settings.layers);
  }, [settings?.layers]);

  const handleZoomIn = () => {
    if (viewerRef.current?.context?.camera) {
      const camera = viewerRef.current.context.camera;
      const position = camera.position;
      const target = viewerRef.current.context.ifcCamera.cameraControls.target;

      const direction = position.clone().sub(target).normalize();
      const distance = position.distanceTo(target);
      const newDistance = distance * 0.8; // Zoom in by 20%

      position.copy(target).add(direction.multiplyScalar(newDistance));
    }
  };

  const handleZoomOut = () => {
    if (viewerRef.current?.context?.camera) {
      const camera = viewerRef.current.context.camera;
      const position = camera.position;
      const target = viewerRef.current.context.ifcCamera.cameraControls.target;

      const direction = position.clone().sub(target).normalize();
      const distance = position.distanceTo(target);
      const newDistance = distance * 1.2; // Zoom out by 20%

      position.copy(target).add(direction.multiplyScalar(newDistance));
    }
  };

  const handleResetView = () => {
    if (viewerRef.current?.context) {
      viewerRef.current.context.fitToFrame();
    }
  };

  const handleToggleGrid = () => {
    setShowGrid(prev => !prev);
  };

  const handleToggleAxes = () => {
    setShowAxes(prev => !prev);
  };

  if (!modelFile) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="text-center text-muted-foreground">
          <div className="text-[10px] mb-2">📦</div>
          <div className="text-[10px]">No 3D model selected</div>
          <div className="text-[9px] mt-1">Select a version from the right panel</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-background h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 py-1.5 h-10 bg-card border-b border-border">
        <div className="flex items-center gap-1 min-w-0">
          <h3 className="text-[10px] font-medium text-card-foreground truncate max-w-[220px]">
            {modelFile.filename}
          </h3>
          {versionNumber && (
            <span className="text-[10px] text-muted-foreground ml-1">
              ({versionNumber})
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-foreground">
          <button
            onClick={handleZoomOut}
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={handleZoomIn}
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <div className="w-px h-5 bg-border mx-1" />
          <button
            onClick={handleResetView}
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
            title="Reset View"
          >
            <Home className="h-4 w-4" />
          </button>
          <div className="w-px h-5 bg-border mx-1" />
          <button
            onClick={handleToggleGrid}
            className={`h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground ${showGrid ? 'bg-accent' : ''}`}
            title="Toggle Grid"
          >
            {showGrid ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
          <button
            onClick={handleToggleAxes}
            className={`h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground ${showAxes ? 'bg-accent' : ''}`}
            title="Toggle Axes"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 3D Viewer Content */}
      <div className="flex-1 overflow-hidden relative bg-background">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="text-center">
              <div className="text-[10px] text-muted-foreground mb-2">Loading 3D model...</div>
              <div className="h-1 w-32 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center bg-background">
            <div className="text-[10px] mb-4">⚠️</div>
            <div className="text-[10px] font-medium mb-2 text-foreground">{error}</div>
            <div className="text-[9px] text-muted-foreground max-w-xs">
              Make sure the file is a valid IFC format (.ifc)
            </div>
          </div>
        )}

        <div
          ref={containerRef}
          className="w-full h-full"
          style={{ position: 'relative' }}
        />
      </div>
    </div>
  );
};

export default Team3DModelViewer;
