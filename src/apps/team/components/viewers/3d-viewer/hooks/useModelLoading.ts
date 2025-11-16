import { useEffect, useState } from 'react';
import { IfcViewerAPI } from 'web-ifc-viewer';
import * as THREE from 'three';
import { logger } from '@/utils/logger';
import { useIfcViewerAPI } from '../../../../hooks/useIfcViewerAPI';

interface ModelFile {
  storage_path: string;
  filename: string;
}

export const useModelLoading = (
  viewerRef: React.RefObject<IfcViewerAPI | null>,
  viewerReady: boolean,
  modelFile: ModelFile | null
) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { enableEdges, removeEdges } = useIfcViewerAPI();

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
            
            // Get modelID from the loaded model - try multiple methods
            let modelID: number | undefined;
            // Method 1: From the model object itself
            if ((model as any).modelID !== undefined) {
              modelID = (model as any).modelID;
            }
            // Method 2: From context.items.ifcModels
            if (!modelID && viewerRef.current.context?.items?.ifcModels?.[0]?.modelID !== undefined) {
              modelID = viewerRef.current.context.items.ifcModels[0].modelID;
            }
            // Method 3: From ifcManager.models array (first model ID)
            if (!modelID && viewerRef.current.IFC.loader.ifcManager?.models?.[0] !== undefined) {
              modelID = viewerRef.current.IFC.loader.ifcManager.models[0];
            }
            
            logger.log('IFC model loaded, model object:', model);
            logger.log('Model type:', model.type);
            logger.log('Model ID:', modelID);
            logger.log('Model children:', model.children?.length);
            
            try {
              const scene = viewerRef.current.context?.scene;
              if (scene && Array.isArray(scene.children)) {
                logger.log('Scene children count:', scene.children.length);
              }
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
            
            // Don't force render - the viewer handles rendering automatically
            // Forcing render can cause errors if the scene isn't fully initialized
            // The viewer's animation loop will handle rendering
            
            // Tools are initialized automatically by IfcViewerAPI
            logger.log('IFC model loaded, tools ready');

            // Enable black edges by default using custom API
            // Edges are already added directly to the model geometry above (lines 107-160)
            // The enableEdges function is a fallback that uses the web-ifc-viewer API
            // We only need one attempt since edges are already created directly
            if (viewerRef.current) {
              // Helper function to get modelID with retry
              const getModelIDWithRetry = (): number | undefined => {
                if (!viewerRef.current) return undefined;
                // Try multiple methods to get modelID
                if (viewerRef.current.context?.items?.ifcModels?.[0]?.modelID !== undefined) {
                  return viewerRef.current.context.items.ifcModels[0].modelID;
                }
                if (viewerRef.current.IFC.loader.ifcManager?.models?.[0] !== undefined) {
                  return viewerRef.current.IFC.loader.ifcManager.models[0];
                }
                return modelID; // Fallback to original (0 is valid)
              };
              
              // Single attempt after a short delay to ensure everything is initialized
              // The direct edge creation above is the primary method, this is just a backup
              setTimeout(() => {
                if (viewerRef.current) {
                  const retryModelID = getModelIDWithRetry();
                  // Only log if modelID is actually available (0 is valid)
                  if (retryModelID !== undefined && retryModelID !== null) {
                    logger.log('Creating black edges via API (backup method)', { modelID: retryModelID });
                    enableEdges(viewerRef.current, 0x000000, retryModelID, model);
                  }
                }
              }, 300);
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
  }, [modelFile, viewerReady, enableEdges, removeEdges]);

  return { loading, error };
};

