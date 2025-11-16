import { Color } from 'three';

/**
 * Restore visibility of all created dimensions
 * Used when deactivating the measurement tool to keep dimensions visible (like annotations)
 */
export const restoreDimensionsVisibility = (dimensions: any, immediate: boolean = true) => {
  if (!dimensions) return 0;
  
  const restore = () => {
    // Get all existing dimensions
    const existingDimensions = (dimensions as any).dimensions || [];
    const dimensionLines = dimensions.getDimensionsLines || [];
    const allDimensions = existingDimensions.length > 0 ? existingDimensions : dimensionLines;
    
    // Restore visibility of all created dimensions
    allDimensions.forEach((dim: any) => {
      if (dim) {
        // Try the visibility setter first (preferred method)
        if (typeof dim.visibility !== 'undefined') {
          dim.visibility = true;
        }
        
        // Also set visibility directly on the root object (more reliable)
        if (dim.root) {
          dim.root.visible = true;
          // Make sure all children are visible too, but ALWAYS keep bounding boxes hidden
          dim.root.traverse((child: any) => {
            // Bounding boxes are BoxGeometry meshes that should always be invisible
            // They're used for click detection only - identify by geometry type
            if (child.geometry?.type === 'BoxGeometry' && child.type === 'Mesh') {
              // This is a bounding box - always keep it invisible
              child.visible = false;
              // Also ensure material is transparent/invisible if it has one
              if (child.material) {
                child.material.transparent = true;
                child.material.opacity = 0;
                child.material.visible = false;
              }
              return;
            }
            // For all other children (line, endpoints, text label), make visible
            child.visible = true;
          });
        }
        
        // Also explicitly hide the bounding box if it's accessible via the dimension object
        if (dim.boundingBox || dim.boundingMesh) {
          const boundingBox = dim.boundingBox || dim.boundingMesh;
          if (boundingBox) {
            boundingBox.visible = false;
            if (boundingBox.material) {
              boundingBox.material.transparent = true;
              boundingBox.material.opacity = 0;
              boundingBox.material.visible = false;
            }
          }
        }
        
        // Ensure text label is visible
        if (dim.textLabel) {
          dim.textLabel.visible = true;
        }
      }
    });
    
    return allDimensions.length;
  };
  
  if (immediate) {
    return restore();
  } else {
    // Use setTimeout to ensure restoration happens after library's setter completes
    setTimeout(restore, 0);
    // Also try immediately in case setTimeout isn't needed
    return restore();
  }
};

/**
 * Helper function to add dimensionColor setter/getter to dimension objects.
 * This clones materials to avoid affecting all dimensions (they share materials by default).
 */
export const addDimensionColorProperty = (dimObj: any, rootObj: any) => {
  if (dimObj.dimensionColor !== undefined) return; // Already has the property
  
  Object.defineProperty(dimObj, 'dimensionColor', {
    set: function(color: Color) {
      // For IfcDimensionLine objects, access line through root
      let line: any = null;
      let endpointMeshes: any[] = [];
      
      if (rootObj.type === 'Group') {
        // Scene traversal case - rootObj is the Group
        line = rootObj.children.find((child: any) => child.type === 'Line');
        endpointMeshes = rootObj.children.filter((child: any) => child.type === 'Mesh');
      } else if (rootObj.line) {
        // Direct IfcDimensionLine case - has line property
        line = rootObj.line;
        endpointMeshes = rootObj.endpointMeshes || [];
      }
      
      // Clone and set line material color
      if (line && line.material) {
        if (!line.material.userData.isCloned) {
          line.material = line.material.clone();
          line.material.userData.isCloned = true;
        }
        line.material.color = color;
      }
      
      // Clone and set endpoint mesh material colors
      endpointMeshes.forEach((mesh: any) => {
        if (mesh && mesh.material) {
          if (!mesh.material.userData.isCloned) {
            mesh.material = mesh.material.clone();
            mesh.material.userData.isCloned = true;
          }
          mesh.material.color = color;
        }
      });
    },
    get: function() {
      let line: any = null;
      if (rootObj.type === 'Group') {
        line = rootObj.children.find((child: any) => child.type === 'Line');
      } else if (rootObj.line) {
        line = rootObj.line;
      }
      return line && line.material ? line.material.color : new Color(0x000000);
    }
  });
};

