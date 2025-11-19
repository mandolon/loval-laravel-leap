import * as THREE from 'three';

/**
 * Toggle hidden line mode for IFC models
 * Hidden line mode renders the model in black and white (grayscale) by
 * replacing all material colors with white and setting them to basic materials
 */

interface MaterialBackup {
  uuid: string;
  originalMaterial: THREE.Material | THREE.Material[];
}

const materialBackups = new Map<number, MaterialBackup[]>();

/**
 * Enable hidden line mode for a model
 * Stores original materials and replaces them with white basic materials
 */
export function enableHiddenLineMode(viewer: any, modelID: number): void {
  console.log('[HiddenLine] Enabling hidden line mode for model:', modelID);
  
  if (!viewer || !viewer.context || !viewer.context.items || !viewer.context.items.ifcModels) {
    console.warn('[HiddenLine] Viewer or IFC models not available', { viewer: !!viewer, context: !!viewer?.context });
    return;
  }

  const models = viewer.context.items.ifcModels;
  console.log('[HiddenLine] Available models:', models.length);
  
  const model = models.find((m: any) => m.modelID === modelID);
  
  if (!model) {
    console.warn(`[HiddenLine] Model ${modelID} not found. Available model IDs:`, models.map((m: any) => m.modelID));
    return;
  }

  console.log('[HiddenLine] Found model:', { modelID, uuid: model.uuid, type: model.type });

  // Store backups if not already stored
  if (!materialBackups.has(modelID)) {
    const backups: MaterialBackup[] = [];
    
    model.traverse((child: any) => {
      if (child.isMesh && child.material) {
        backups.push({
          uuid: child.uuid,
          originalMaterial: Array.isArray(child.material) 
            ? child.material.map((m: THREE.Material) => m.clone())
            : child.material.clone()
        });
      }
    });
    
    console.log('[HiddenLine] Backed up materials for', backups.length, 'meshes');
    materialBackups.set(modelID, backups);
  }

  // Apply white basic material to all meshes
  let meshCount = 0;
  model.traverse((child: any) => {
    if (child.isMesh && child.material) {
      const whiteMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
      });

      // Store old material(s) for disposal
      const oldMaterial = child.material;
      
      // Apply new white material
      if (Array.isArray(child.material)) {
        child.material = child.material.map(() => whiteMaterial.clone());
      } else {
        child.material = whiteMaterial;
      }
      
      meshCount++;

      // Don't dispose original materials as we have backups
    }
  });

  console.log(`[HiddenLine] Hidden line mode enabled for model ${modelID}, converted ${meshCount} meshes to white`);
}

/**
 * Disable hidden line mode for a model
 * Restores original materials from backup
 */
export function disableHiddenLineMode(viewer: any, modelID: number): void {
  console.log('[HiddenLine] Disabling hidden line mode for model:', modelID);
  
  if (!viewer || !viewer.context || !viewer.context.items || !viewer.context.items.ifcModels) {
    console.warn('[HiddenLine] Viewer or IFC models not available');
    return;
  }

  const models = viewer.context.items.ifcModels;
  const model = models.find((m: any) => m.modelID === modelID);
  
  if (!model) {
    console.warn(`[HiddenLine] Model ${modelID} not found`);
    return;
  }

  const backups = materialBackups.get(modelID);
  if (!backups) {
    console.warn(`[HiddenLine] No material backups found for model ${modelID}`);
    return;
  }

  // Restore original materials
  let restoredCount = 0;
  model.traverse((child: any) => {
    if (child.isMesh && child.material) {
      const backup = backups.find(b => b.uuid === child.uuid);
      if (backup) {
        // Dispose current white material
        if (Array.isArray(child.material)) {
          child.material.forEach((m: THREE.Material) => m.dispose());
        } else {
          child.material.dispose();
        }

        // Restore original material
        child.material = backup.originalMaterial;
        restoredCount++;
      }
    }
  });

  console.log(`[HiddenLine] Hidden line mode disabled for model ${modelID}, restored ${restoredCount} meshes`);
}

/**
 * Toggle hidden line mode for a model
 */
export function toggleHiddenLineMode(viewer: any, modelID: number, enable: boolean): void {
  console.log('[HiddenLine] Toggling hidden line mode:', { modelID, enable });
  if (enable) {
    enableHiddenLineMode(viewer, modelID);
  } else {
    disableHiddenLineMode(viewer, modelID);
  }
}
