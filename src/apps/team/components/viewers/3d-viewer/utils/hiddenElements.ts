import { IfcViewerAPI } from 'web-ifc-viewer';
import { logger } from '@/utils/logger';
import * as THREE from 'three';

/**
 * Utility for hiding and unhiding IFC elements
 * Uses the subset system to filter out hidden elements
 */

// Track hidden elements globally
const hiddenElementsMap = new Map<number, Set<number>>(); // modelID -> Set of expressIDs
const ORIGINAL_MODELS = new Map<number, THREE.Mesh>(); // Store original models
const HIDDEN_SUBSET_MATERIAL_ID = 'rehome-hidden-filter';

/**
 * Hide a single element in the IFC model
 */
export const hideElement = async (viewer: IfcViewerAPI | null, modelID: number, expressID: number): Promise<boolean> => {
  if (!viewer?.IFC?.loader?.ifcManager) {
    logger.error('[HideElement] Viewer or IFC manager not available');
    return false;
  }

  try {
    // Track this element as hidden
    if (!hiddenElementsMap.has(modelID)) {
      hiddenElementsMap.set(modelID, new Set());
    }
    hiddenElementsMap.get(modelID)!.add(expressID);

    const hiddenCount = hiddenElementsMap.get(modelID)!.size;
    logger.log(`[HideElement] Hiding element ${expressID} in model ${modelID}. Total hidden: ${hiddenCount}`);

    const scene = viewer.context.getScene();
    
    // Hide the original model if this is the first hidden element
    if (hiddenCount === 1) {
      const originalModel = scene.children.find((child: any) => child.modelID === modelID);
      if (originalModel) {
        ORIGINAL_MODELS.set(modelID, originalModel as THREE.Mesh);
        originalModel.visible = false;
        logger.log(`[HideElement] Original model hidden, will show filtered subset`);
      }
    }

    // Get ALL elements in the model
    const model = viewer.IFC.loader.ifcManager.state.models[modelID];
    if (!model) {
      logger.error('[HideElement] Model not found');
      return false;
    }

    // Get all express IDs from the geometry
    const allIDsSet = new Set<number>();
    const originalModelMesh = scene.children.find((child: any) => child.modelID === modelID);
    
    if (originalModelMesh && (originalModelMesh as any).geometry) {
      const geometry = (originalModelMesh as any).geometry;
      const expressIDAttr = geometry.attributes.expressID;
      
      if (expressIDAttr && expressIDAttr.array) {
        // Collect all unique express IDs
        for (let i = 0; i < expressIDAttr.array.length; i++) {
          allIDsSet.add(expressIDAttr.array[i]);
        }
      }
    }
    
    const allIDs = Array.from(allIDsSet);
    const hiddenIDs = hiddenElementsMap.get(modelID)!;
    
    // Create a subset with all elements EXCEPT the hidden ones
    const visibleIDs = allIDs.filter((id: number) => !hiddenIDs.has(id));
    
    logger.log(`[HideElement] Creating filtered subset: ${visibleIDs.length} visible, ${hiddenIDs.size} hidden (total: ${allIDs.length})`);

    // Remove previous filtered subset
    viewer.IFC.loader.ifcManager.removeSubset(modelID, undefined, HIDDEN_SUBSET_MATERIAL_ID);

    // Create new filtered subset
    const subset = viewer.IFC.loader.ifcManager.createSubset({
      modelID,
      ids: visibleIDs,
      scene,
      removePrevious: false,
      customID: HIDDEN_SUBSET_MATERIAL_ID,
    });

    if (subset) {
      // Copy transform from original model
      const originalModel = ORIGINAL_MODELS.get(modelID);
      const subsetMesh = subset as unknown as THREE.Mesh;
      if (originalModel) {
        subsetMesh.position.copy(originalModel.position);
        subsetMesh.rotation.copy(originalModel.rotation);
        subsetMesh.scale.copy(originalModel.scale);
      }
      subsetMesh.visible = true;
      logger.log(`[HideElement] Filtered subset created and visible`);
    }

    return true;
  } catch (error) {
    logger.error('[HideElement] Error hiding element:', error);
    return false;
  }
};

/**
 * Unhide a single element in the IFC model
 */
export const unhideElement = async (viewer: IfcViewerAPI | null, modelID: number, expressID: number): Promise<boolean> => {
  if (!viewer?.IFC?.loader?.ifcManager) {
    logger.error('[UnhideElement] Viewer or IFC manager not available');
    return false;
  }

  try {
    const hiddenSet = hiddenElementsMap.get(modelID);
    if (!hiddenSet || !hiddenSet.has(expressID)) {
      logger.warn(`[UnhideElement] Element ${expressID} is not hidden`);
      return false;
    }

    // Remove from hidden set
    hiddenSet.delete(expressID);

    logger.log(`[UnhideElement] Unhiding element ${expressID} in model ${modelID}. Remaining hidden: ${hiddenSet.size}`);

    // If no more hidden elements, show original model
    if (hiddenSet.size === 0) {
      const scene = viewer.context.getScene();
      const originalModel = ORIGINAL_MODELS.get(modelID);
      if (originalModel) {
        originalModel.visible = true;
      }
      // Remove the filtered subset
      viewer.IFC.loader.ifcManager.removeSubset(modelID, undefined, HIDDEN_SUBSET_MATERIAL_ID);
      hiddenElementsMap.delete(modelID);
      ORIGINAL_MODELS.delete(modelID);
      logger.log(`[UnhideElement] All elements visible, original model restored`);
    } else {
      // Recreate filtered subset without this element
      
      // Get all express IDs from the geometry
      const allIDsSet = new Set<number>();
      const scene = viewer.context.getScene();
      const originalModelMesh = scene.children.find((child: any) => child.modelID === modelID);
      
      if (originalModelMesh && (originalModelMesh as any).geometry) {
        const geometry = (originalModelMesh as any).geometry;
        const expressIDAttr = geometry.attributes.expressID;
        
        if (expressIDAttr && expressIDAttr.array) {
          // Collect all unique express IDs
          for (let i = 0; i < expressIDAttr.array.length; i++) {
            allIDsSet.add(expressIDAttr.array[i]);
          }
        }
      }
      
      const allIDs = Array.from(allIDsSet);
      const visibleIDs = allIDs.filter((id: number) => !hiddenSet.has(id));
      
      // Remove previous filtered subset
      viewer.IFC.loader.ifcManager.removeSubset(modelID, undefined, HIDDEN_SUBSET_MATERIAL_ID);
      
      // Create new filtered subset
      const subset = viewer.IFC.loader.ifcManager.createSubset({
        modelID,
        ids: visibleIDs,
        scene,
        removePrevious: false,
        customID: HIDDEN_SUBSET_MATERIAL_ID,
      });

      if (subset) {
        const originalModel = ORIGINAL_MODELS.get(modelID);
        const subsetMesh = subset as unknown as THREE.Mesh;
        if (originalModel) {
          subsetMesh.position.copy(originalModel.position);
          subsetMesh.rotation.copy(originalModel.rotation);
          subsetMesh.scale.copy(originalModel.scale);
        }
        subsetMesh.visible = true;
      }
      
      logger.log(`[UnhideElement] Filtered subset updated: ${visibleIDs.length} visible`);
    }

    return true;
  } catch (error) {
    logger.error('[UnhideElement] Error unhiding element:', error);
    return false;
  }
};

/**
 * Unhide all elements in a specific model
 */
export const unhideAllElements = (viewer: IfcViewerAPI | null, modelID: number): boolean => {
  if (!viewer?.IFC?.loader?.ifcManager) {
    logger.error('[UnhideAllElements] Viewer or IFC manager not available');
    return false;
  }

  try {
    const hiddenSet = hiddenElementsMap.get(modelID);
    if (!hiddenSet || hiddenSet.size === 0) {
      logger.log(`[UnhideAllElements] No hidden elements in model ${modelID}`);
      return false;
    }

    const count = hiddenSet.size;
    logger.log(`[UnhideAllElements] Unhiding ${count} elements in model ${modelID}`);

    // Show original model
    const originalModel = ORIGINAL_MODELS.get(modelID);
    if (originalModel) {
      originalModel.visible = true;
    }
    
    // Remove the filtered subset
    viewer.IFC.loader.ifcManager.removeSubset(modelID, undefined, HIDDEN_SUBSET_MATERIAL_ID);
    
    // Clear tracking
    hiddenElementsMap.delete(modelID);
    ORIGINAL_MODELS.delete(modelID);

    logger.log(`[UnhideAllElements] All elements visible, original model restored`);
    return true;
  } catch (error) {
    logger.error('[UnhideAllElements] Error unhiding all elements:', error);
    return false;
  }
};

/**
 * Get count of hidden elements for a model
 */
export const getHiddenElementCount = (modelID: number): number => {
  return hiddenElementsMap.get(modelID)?.size || 0;
};

/**
 * Check if an element is hidden
 */
export const isElementHidden = (modelID: number, expressID: number): boolean => {
  return hiddenElementsMap.get(modelID)?.has(expressID) || false;
};

/**
 * Get all hidden element IDs for a model
 */
export const getHiddenElements = (modelID: number): number[] => {
  return Array.from(hiddenElementsMap.get(modelID) || []);
};

/**
 * Clear all hidden elements (for cleanup on model unload)
 */
export const clearAllHiddenElements = (viewer: IfcViewerAPI | null): void => {
  if (!viewer?.IFC?.loader?.ifcManager) return;

  try {
    // Restore all original models and remove filtered subsets
    for (const modelID of hiddenElementsMap.keys()) {
      const originalModel = ORIGINAL_MODELS.get(modelID);
      if (originalModel) {
        originalModel.visible = true;
      }
      viewer.IFC.loader.ifcManager.removeSubset(modelID, undefined, HIDDEN_SUBSET_MATERIAL_ID);
    }
    
    // Clear tracking
    hiddenElementsMap.clear();
    ORIGINAL_MODELS.clear();
    
    logger.log('[ClearAllHiddenElements] All hidden elements cleared');
  } catch (error) {
    logger.error('[ClearAllHiddenElements] Error clearing hidden elements:', error);
  }
};
