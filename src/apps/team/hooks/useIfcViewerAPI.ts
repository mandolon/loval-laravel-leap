import { useRef, useCallback } from 'react';
import { IfcViewerAPI } from 'web-ifc-viewer';
import { EdgesGeometry, LineBasicMaterial, LineSegments } from 'three';
import { logger } from '@/utils/logger';

// Based on web-ifc-viewer source: edges.create(name, modelID, lineMaterial, material?)
// edges.toggle(name, active?)

export function useIfcViewerAPI() {
  const edgesRef = useRef<LineSegments[]>([]);

  /**
   * Enable black edges by default on a loaded model
   * Uses the same approach as the working ifcviewer app: traverse model and add edges to scene
   */
  const enableEdges = useCallback(
    (viewer: IfcViewerAPI, color: number = 0x000000, modelID?: number, modelObject?: any) => {
    // First try using the official web-ifc-viewer edges API
    if (viewer?.edges) {
      try {
        // Get modelID if not provided - use the first loaded model
        // Note: modelID 0 is valid, so we check for undefined/null explicitly
        let targetModelID = modelID;
        if ((targetModelID === undefined || targetModelID === null) && viewer.context?.items?.ifcModels?.length > 0) {
          targetModelID = viewer.context.items.ifcModels[0].modelID;
          logger.log(`Using modelID: ${targetModelID} for edges`);
        }

        if (targetModelID === undefined || targetModelID === null) {
          logger.warn('No model ID available for creating edges');
          // Fall through to manual creation
        } else {
          // Create black line material
          const lineMaterial = new LineBasicMaterial({ color: color, depthTest: true, depthWrite: false });

          // Use the web-ifc-viewer edges API
          const edgeName = `default-edges-${targetModelID}`;
          
          // Remove existing edges with same name if they exist
          const existingEdges = viewer.edges.getAll();
          if (existingEdges.includes(edgeName)) {
            viewer.edges.toggle(edgeName, false);
          }

          // Create edges using the official API: create(name, modelID, lineMaterial, material?)
          viewer.edges.create(edgeName, targetModelID, lineMaterial);
          
          // Toggle edges on: toggle(name, active?)
          viewer.edges.toggle(edgeName, true);
          
          logger.log(`Created and enabled edges for model ${targetModelID} using web-ifc-viewer API`);
          return; // Success, exit early
        }
      } catch (err) {
        logger.warn('Error using web-ifc-viewer edges API, falling back to manual creation:', err);
        // Fall through to manual creation
      }
    }

    // Use the exact same approach as the working ifcviewer app
    // Traverse the model directly and add edges to scene
    if (!viewer?.context?.scene) {
      logger.warn('Viewer or scene not available');
      return;
    }

    const scene = viewer.context.scene;

    // Remove existing edges first to avoid duplicates
    edgesRef.current.forEach(edge => {
      if (edge.parent) {
        edge.parent.remove(edge);
      } else {
        scene.remove(edge);
      }
      edge.geometry.dispose();
      edge.material.dispose();
    });
    edgesRef.current = [];

    // Find the loaded model - prefer explicit modelObject, otherwise check ifcModels, then scene
    let modelToTraverse: any = modelObject ?? null;
    
    // If explicit model not provided, try to get the first IFC model from viewer context
    if (!modelToTraverse && viewer.context?.items?.ifcModels?.length > 0) {
      modelToTraverse = viewer.context.items.ifcModels[0];
      logger.log('Found model from viewer context, traversing model directly');
    }

    // Fallback: traverse the entire scene
    if (!modelToTraverse) {
      modelToTraverse = scene;
      logger.log('No explicit model found, traversing entire scene for meshes');
    }

    const edges: LineSegments[] = [];
    let meshCount = 0;

    // Traverse the model (same as working ifcviewer app)
    modelToTraverse.traverse((child: any) => {
      if (child.isMesh && child.geometry && child.visible) {
        meshCount++;
        
        // Skip if this mesh already has edges
        if (child.userData.hasEdges) {
          return;
        }

        try {
          // Check if geometry is valid
          if (!child.geometry.attributes || !child.geometry.attributes.position) {
            return;
          }

          // Exact same code as working ifcviewer app
          const edgesGeometry = new EdgesGeometry(child.geometry);
          const edgesMaterial = new LineBasicMaterial({ 
            color: color,  // Black: 0x000000
            linewidth: 1
          });
          const edgeLines = new LineSegments(edgesGeometry, edgesMaterial);
          edgeLines.userData.isEdge = true;
          edgeLines.userData.originalMesh = child;
          
          // Add directly to scene (matches working ifcviewer implementation)
          scene.add(edgeLines);
          edges.push(edgeLines);
          
          child.userData.hasEdges = true;
        } catch (err) {
          logger.warn('Could not create edges for mesh:', err);
        }
      }
    });

    edgesRef.current = edges;
    logger.log(`Created ${edges.length} black edge objects from ${meshCount} meshes (matching working ifcviewer approach)`);
    
    if (edges.length === 0 && meshCount > 0) {
      logger.warn('No edges created despite finding meshes. This may indicate a timing issue.');
    }
    
    // Force a render update
    try {
      const renderer = (viewer.context as any)?.renderer || (viewer as any).renderer;
      const sceneObj = viewer.context?.scene;
      const camera = (viewer.context as any)?.camera || (viewer as any).camera;
      
      if (renderer && sceneObj && camera) {
        renderer.render(sceneObj, camera);
        logger.log('Forced render after creating edges');
      }
    } catch (err) {
      logger.warn('Could not force render:', err);
    }
  }, []);

  /**
   * Remove all edges from the scene
   */
  const removeEdges = useCallback((viewer: IfcViewerAPI) => {
    if (!viewer?.context?.scene) return;

    const scene = viewer.context.scene;
    edgesRef.current.forEach(edge => {
      // Remove from parent (which is the mesh)
      if (edge.parent) {
        edge.parent.remove(edge);
        // Clear the hasEdges flag
        if (edge.parent.userData) {
          edge.parent.userData.hasEdges = false;
        }
      } else {
        scene.remove(edge);
      }
      edge.geometry.dispose();
      edge.material.dispose();
    });
    edgesRef.current = [];
    logger.log('All edges removed');
  }, []);

  /**
   * Update edge color
   */
  const updateEdgeColor = useCallback((viewer: IfcViewerAPI, color: number) => {
    edgesRef.current.forEach(edge => {
      if (edge.material) {
        edge.material.color.setHex(color);
      }
    });
    logger.log(`Edge color updated to ${color.toString(16)}`);
  }, []);

  /**
   * Toggle edges visibility
   */
  const toggleEdges = useCallback((viewer: IfcViewerAPI, visible: boolean) => {
    edgesRef.current.forEach(edge => {
      edge.visible = visible;
    });
    logger.log(`Edges visibility: ${visible}`);
  }, []);

  /**
   * Get element properties by expressID
   */
  const getElementProperties = useCallback(async (viewer: IfcViewerAPI, expressID: number) => {
    if (!viewer?.IFC?.loader?.ifcManager) {
      logger.warn('IFC manager not available');
      return null;
    }

    try {
      const modelID = viewer.IFC.loader.ifcManager.models[0];
      const props = await viewer.IFC.loader.ifcManager.getItemProperties(modelID, expressID);
      return props;
    } catch (err) {
      logger.error('Error getting element properties:', err);
      return null;
    }
  }, []);

  /**
   * Find all meshes by expressID
   */
  const findMeshesByExpressID = useCallback((viewer: IfcViewerAPI, expressID: number) => {
    if (!viewer?.context?.scene) return [];

    const meshes: any[] = [];
    const scene = viewer.context.scene;
    const loader = viewer.IFC?.loader;

    scene.traverse((child: any) => {
      if (child.isMesh && child.geometry) {
        let meshExpressID = child.userData?.expressID;
        
        if (!meshExpressID && loader?.ifcManager) {
          try {
            meshExpressID = loader.ifcManager.getExpressId(child.geometry, 0);
          } catch (err) {
            // Ignore
          }
        }
        
        if (meshExpressID === expressID) {
          meshes.push(child);
        }
      }
    });

    return meshes;
  }, []);

  return {
    edgesRef,
    enableEdges,
    removeEdges,
    updateEdgeColor,
    toggleEdges,
    getElementProperties,
    findMeshesByExpressID
  };
}

