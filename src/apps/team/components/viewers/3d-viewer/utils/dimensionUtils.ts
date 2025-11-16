import { Color } from 'three';

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

