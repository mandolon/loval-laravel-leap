import { useState, useEffect, useRef } from 'react';
import {
  RotateCw,
  Home,
  Eye,
  EyeOff,
  Ruler,
  Box,
  Cuboid,
  Scissors,
  X,
  MousePointer2
} from 'lucide-react';
import { IfcViewerAPI } from 'web-ifc-viewer';
import * as THREE from 'three';
import { Color } from 'three';
import { logger } from '@/utils/logger';
import { useIfcViewerAPI } from '../../hooks/useIfcViewerAPI';

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
  const [showGrid, setShowGrid] = useState(settings?.show_grid ?? false);
  const [showAxes, setShowAxes] = useState(settings?.show_axes ?? false);
  const [isolatedLayers, setIsolatedLayers] = useState<string[]>([]);
  const [viewerReady, setViewerReady] = useState(false);
  
  // Measurement and clipping state
  const [measurementMode, setMeasurementMode] = useState<'none' | 'distance' | 'area' | 'volume'>('none');
  const [clippingActive, setClippingActive] = useState(false);
  const [inspectMode, setInspectMode] = useState(false);

  // Custom IFC viewer API for edges and other operations
  const { enableEdges, removeEdges, updateEdgeColor } = useIfcViewerAPI();

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

        // Configure IFC.js to use local WASM files from public folder
        // This avoids CORS issues with CDN
        const wasmPath = '/wasm/';
        viewer.IFC.loader.ifcManager.state.api.wasmPath = wasmPath;
        viewer.IFC.loader.ifcManager.state.wasmPath = wasmPath;
        
        logger.log('WASM path set to:', wasmPath);
        logger.log('Loader WASM path:', viewer.IFC.loader.ifcManager.state.wasmPath);

        // Don't set up grid and axes - keep viewer clean
        // viewer.grid.setGrid();
        // viewer.axes.setAxes();

        viewerRef.current = viewer;
        
        // Object selection will be handled in a separate useEffect after state is available
        
        setViewerReady(true);

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
    logger.log('Model loading effect triggered', {
      hasViewer: !!viewerRef.current,
      viewerReady,
      hasModelFile: !!modelFile,
      modelFile
    });
    
    if (!viewerReady || !viewerRef.current || !modelFile) {
      if (!viewerReady) {
        logger.log('Waiting for viewer to be ready...');
      }
      setLoading(false);
      return;
    }

    const loadModel = async () => {
      try {
        setLoading(true);
        setError(null);

        // Remove any existing edges before loading new model
        if (viewerRef.current) {
          removeEdges(viewerRef.current);
        }

        logger.log('Loading model from:', modelFile.storage_path);

        // Fetch the file from the public URL
        const response = await fetch(modelFile.storage_path);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.arrayBuffer();
        logger.log('Model file fetched, size:', data.byteLength, 'bytes');
        
        const blob = new Blob([data]);
        const url = URL.createObjectURL(blob);

        // Load the IFC model
        if (viewerRef.current) {
          logger.log('Loading IFC file into viewer...');
          logger.log('Loader state:', {
            hasLoader: !!viewerRef.current.IFC.loader,
            hasIfcManager: !!viewerRef.current.IFC.loader?.ifcManager,
            wasmPath: viewerRef.current.IFC.loader?.ifcManager?.state?.wasmPath
          });
          
          try {
            logger.log('Starting loadIfcUrl...');
            
            // Add timeout to detect hanging
            const loadPromise = viewerRef.current.IFC.loadIfcUrl(url);
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('IFC loading timed out after 30 seconds')), 30000)
            );
            
            const model = await Promise.race([loadPromise, timeoutPromise]) as any;
            
            if (!model) {
              throw new Error('loadIfcUrl returned null - file may not be a valid IFC file or WASM failed to load');
            }
            
            // Get modelID from the loaded model
            const modelID = (model as any).modelID || (viewerRef.current.IFC.loader.ifcManager as any).models?.[0];
            
            logger.log('IFC model loaded, model object:', model);
            logger.log('Model type:', model.type);
            logger.log('Model ID:', modelID);
            logger.log('Model children:', model.children?.length);
            
            try {
              logger.log('Scene children count:', viewerRef.current.context?.scene?.children.length);
            } catch (sceneError) {
              logger.warn('Could not access scene:', sceneError);
            }
            
            // Ensure model is visible
            model.visible = true;
            logger.log('Model visibility set to true');
            
            // Add edges to the IFC model itself
            let edgeCount = 0;
            logger.log('Checking model for geometry...', {
              hasGeometry: !!(model as any).geometry,
              isMesh: (model as any).isMesh,
              type: (model as any).type,
              geometryType: (model as any).geometry?.type
            });
            
            try {
              // IFC models are often flat meshes, so add edges to the model directly
              if ((model as any).geometry) {
                logger.log('Adding edges to model geometry, vertices:', (model as any).geometry.attributes.position?.count);
                const edges = new THREE.EdgesGeometry((model as any).geometry, 30); // 30 degree threshold
                logger.log('Edges created, edge count:', edges.attributes.position.count / 2);
                
                const lineMaterial = new THREE.LineBasicMaterial({ 
                  color: 0x000000,
                  transparent: false,
                  opacity: 1,
                  depthTest: true,
                  depthWrite: true
                });
                const line = new THREE.LineSegments(edges, lineMaterial);
                line.renderOrder = 1; // Render edges after the mesh
                line.raycast = () => {}; // Make edges non-raycastable for better performance
                (line as any).isEdge = true; // Mark as edge for identification
                model.add(line);
                edgeCount++;
                logger.log('Edge LineSegments added to model');
              }
              
              // Also traverse children in case model has hierarchy
              model.traverse((child: any) => {
                if (child.isMesh && child.geometry && child !== model) {
                  try {
                    const edges = new THREE.EdgesGeometry(child.geometry, 30);
                    const lineMaterial = new THREE.LineBasicMaterial({ 
                      color: 0x000000,
                      transparent: false,
                      opacity: 1
                    });
                    const line = new THREE.LineSegments(edges, lineMaterial);
                    line.renderOrder = 1;
                    line.raycast = () => {}; // Make edges non-raycastable
                    (line as any).isEdge = true; // Mark as edge
                    child.add(line);
                    edgeCount++;
                  } catch (edgeError) {
                    logger.warn('Could not add edges to child mesh:', edgeError);
                  }
                }
              });
            } catch (edgeError) {
              logger.error('Could not add edges to model:', edgeError);
            }
            logger.log(`Black edges added to ${edgeCount} mesh(es)`);

            // Fit model to frame with more aggressive camera positioning
            if (viewerRef.current.context?.fitToFrame) {
              await viewerRef.current.context.fitToFrame();
              logger.log('Camera fitted to frame');
            }
            
            // Force a render
            if (viewerRef.current.context?.renderer) {
              viewerRef.current.context.renderer.render(
                viewerRef.current.context.scene,
                viewerRef.current.context.camera
              );
              logger.log('Forced render');
            }
            
            // Tools are initialized automatically by IfcViewerAPI
            logger.log('IFC model loaded, tools ready');

            // Enable black edges by default using custom API
            // Use the same approach as the working ifcviewer app - traverse model and add edges to scene
            if (viewerRef.current) {
              // Wait for next frame, then create edges (multiple attempts to catch async loading)
              requestAnimationFrame(() => {
                setTimeout(() => {
                  if (viewerRef.current) {
                    logger.log('Creating black edges - attempt 1');
                    // Try API first, then fallback to manual (which matches working ifcviewer approach)
                    enableEdges(viewerRef.current, 0x000000, modelID, model);
                    
                    // Second attempt after longer delay in case meshes load asynchronously
                    setTimeout(() => {
                      if (viewerRef.current) {
                        logger.log('Creating black edges - attempt 2');
                        enableEdges(viewerRef.current, 0x000000, modelID, model);
                      }
                    }, 500);
                    
                    // Third attempt for safety
                    setTimeout(() => {
                      if (viewerRef.current) {
                        logger.log('Creating black edges - attempt 3');
                        enableEdges(viewerRef.current, 0x000000, modelID, model);
                      }
                    }, 1000);
                  }
                }, 200);
              });
            }

            setLoading(false);
            logger.log('IFC model loaded successfully');
          } catch (ifcError) {
            logger.error('IFC loading error:', ifcError);
            throw ifcError;
          }
        }

        // Cleanup blob URL
        URL.revokeObjectURL(url);
      } catch (err) {
        logger.error('Failed to load IFC model:', err);
        setError(`Failed to load 3D model: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setLoading(false);
      }
    };

    loadModel();
  }, [modelFile, viewerReady]);

  // Apply layer visibility settings
  useEffect(() => {
    if (!viewerRef.current || !settings?.layers) return;

    // Layer filtering logic would go here
    // This requires IFC property filtering which is more complex
    // For now, we'll just log the layer settings
    logger.log('Layer settings:', settings.layers);
  }, [settings?.layers]);

  // Manage dimensions tool activation state (following AnweshGangula pattern)
  useEffect(() => {
    if (!viewerRef.current?.dimensions || !viewerRef.current?.IFC) return;
    
    const dimensions = viewerRef.current.dimensions;
    const selector = viewerRef.current.IFC.selector;
    
    if (measurementMode === 'distance') {
      if (!dimensions.active) {
        dimensions.active = true;
        dimensions.previewActive = true; // Enable preview as per working example
        selector.unPrepickIfcItems(); // Clear any pre-picked items
        logger.log('Dimensions tool activated - left-click on elements to start dimensioning, then press D to create');
      }
    } else {
      if (dimensions.active) {
        dimensions.active = false;
        dimensions.previewActive = false;
        dimensions.cancelDrawing();
        logger.log('Dimensions tool deactivated');
      }
    }
  }, [measurementMode]);

  // Enable object selection on hover (following AnweshGangula pattern)
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

  // Add keyboard shortcuts for tools
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      const target = event.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      // E key - toggle dimensions
      if (event.key === 'e' || event.key === 'E') {
        event.preventDefault();
        const newMode = measurementMode === 'distance' ? 'none' : 'distance';
        setMeasurementMode(newMode);
        // Deactivate other tools
        if (clippingActive && viewerRef.current?.clipper) {
          viewerRef.current.clipper.active = false;
          setClippingActive(false);
        }
        return;
      }

      // P key - create clipping plane (following AnweshGangula pattern)
      if (event.key === 'p' || event.key === 'P') {
        event.preventDefault();
        if (!viewerRef.current?.clipper) return;
        
        // Always create a new plane when P is pressed (as per working example)
        viewerRef.current.clipper.active = true;
        viewerRef.current.clipper.createPlane();
        setClippingActive(true);
        
        // Deactivate other tools
        if (measurementMode !== 'none' && viewerRef.current?.dimensions) {
          viewerRef.current.dimensions.active = false;
          viewerRef.current.dimensions.previewActive = false;
          viewerRef.current.dimensions.cancelDrawing();
          setMeasurementMode('none');
        }
        logger.log('Clipping plane created (press P to create another)');
        return;
      }

      // D key - create dimension (when dimensions are active)
      if ((event.key === 'd' || event.key === 'D') && measurementMode === 'distance' && viewerRef.current?.dimensions?.active) {
        event.preventDefault();
        if (viewerRef.current.dimensions) {
          viewerRef.current.dimensions.create();
          logger.log('Dimension creation started (press D to create)');
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [measurementMode, clippingActive]);


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

  const handleMeasureDistance = () => {
    // Deactivate other tools
    if (clippingActive && viewerRef.current?.clipper) {
      viewerRef.current.clipper.active = false;
      setClippingActive(false);
    }
    
    const newMode = measurementMode === 'distance' ? 'none' : 'distance';
    setMeasurementMode(newMode);
    // Activation is handled by the useEffect hook
  };

  const handleMeasureArea = () => {
    const newMode = measurementMode === 'area' ? 'none' : 'area';
    setMeasurementMode(newMode);
    // Deactivation of dimensions is handled by the useEffect hook
    logger.log('Area measurement tool toggled (not yet implemented)');
  };

  const handleMeasureVolume = () => {
    const newMode = measurementMode === 'volume' ? 'none' : 'volume';
    setMeasurementMode(newMode);
    // Deactivation of dimensions is handled by the useEffect hook
    logger.log('Volume measurement tool toggled (not yet implemented)');
  };

  const handleToggleClipping = () => {
    if (!viewerRef.current?.clipper) return;
    
    // Deactivate measurement tools
    if (measurementMode !== 'none' && viewerRef.current?.dimensions) {
      viewerRef.current.dimensions.active = false;
      viewerRef.current.dimensions.previewActive = false;
      viewerRef.current.dimensions.cancelDrawing();
      setMeasurementMode('none');
    }
    
    const newState = !clippingActive;
    setClippingActive(newState);
    
    if (newState) {
      // Create a clipping plane directly (following AnweshGangula pattern)
      viewerRef.current.clipper.active = true;
      viewerRef.current.clipper.createPlane();
      logger.log('Clipper tool activated - clipping plane created (press P to create another)');
    } else {
      viewerRef.current.clipper.active = false;
      // Optionally delete all planes when deactivating
      // viewerRef.current.clipper.deleteAllPlanes();
      logger.log('Clipper tool deactivated');
    }
  };

  const handleClearMeasurements = () => {
    if (viewerRef.current?.dimensions) {
      viewerRef.current.dimensions.deleteAll();
      logger.log('All measurements cleared');
    }
  };

  if (!modelFile) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="text-center text-muted-foreground">
          <div className="text-[10px] mb-2">ðŸ“¦</div>
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
          {/* Inspect Mode */}
          <button
            onClick={() => setInspectMode(!inspectMode)}
            className={`h-7 w-7 flex items-center justify-center rounded hover:bg-muted ${inspectMode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            title="Inspect Mode (Hover to Highlight)"
          >
            <MousePointer2 className="h-4 w-4" />
          </button>
          
          <div className="w-px h-5 bg-border mx-1" />
          
          {/* Measurement Tools */}
          <button
            onClick={handleMeasureDistance}
            className={`h-7 w-7 flex items-center justify-center rounded hover:bg-muted ${measurementMode === 'distance' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            title="Measure Distance"
          >
            <Ruler className="h-4 w-4" />
          </button>
          <button
            onClick={handleMeasureArea}
            className={`h-7 w-7 flex items-center justify-center rounded hover:bg-muted ${measurementMode === 'area' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            title="Measure Area"
          >
            <Box className="h-4 w-4" />
          </button>
          <button
            onClick={handleMeasureVolume}
            className={`h-7 w-7 flex items-center justify-center rounded hover:bg-muted ${measurementMode === 'volume' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            title="Measure Volume"
          >
            <Cuboid className="h-4 w-4" />
          </button>
          {measurementMode === 'distance' && viewerRef.current?.dimensions && (
            <button
              onClick={handleClearMeasurements}
              className="h-7 px-2 flex items-center justify-center rounded hover:bg-muted text-muted-foreground text-[10px]"
              title="Clear Measurements"
            >
              Clear
            </button>
          )}
          
          <div className="w-px h-5 bg-border mx-1" />
          
          {/* Clipping Plane */}
          <button
            onClick={handleToggleClipping}
            className={`h-7 w-7 flex items-center justify-center rounded hover:bg-muted ${clippingActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            title="Toggle Clipping Planes"
          >
            <Scissors className="h-4 w-4" />
          </button>
          
          <div className="w-px h-5 bg-border mx-1" />
          
          {/* View Controls */}
          <button
            onClick={handleResetView}
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
            title="Reset View"
          >
            <Home className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 3D Viewer Content */}
      <div className="flex-1 overflow-hidden relative bg-background">
        {/* Measurement Mode Indicator */}
        {measurementMode !== 'none' && (
          <div className="absolute top-2 left-2 z-20 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-[10px] font-medium shadow-lg">
            {measurementMode === 'distance' && '📏 Left-click on elements to start dimensioning, then press D to create dimension'}
            {measurementMode === 'area' && '⬜ Area measurement (not yet implemented)'}
            {measurementMode === 'volume' && '📦 Volume measurement (not yet implemented)'}
          </div>
        )}
        
        {/* Clipping Mode Indicator */}
        {clippingActive && (
          <div className="absolute top-2 left-2 z-20 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-[10px] font-medium shadow-lg">
            ✂️ Clipping plane active (Press P to create another plane)
          </div>
        )}
        
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
            <div className="text-[10px] mb-4">âš ï¸</div>
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
