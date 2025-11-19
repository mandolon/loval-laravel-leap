import { useState, useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { logger } from '@/utils/logger';
import { restoreDimensionsVisibility } from './3d-viewer/utils/dimensionUtils';
import { toggleHiddenLineMode } from './3d-viewer/utils/hiddenLineMode';
import { ViewerToolbar } from './3d-viewer/ViewerToolbar';
import { useViewerInitialization } from './3d-viewer/hooks/useViewerInitialization';
import { useModelLoading } from './3d-viewer/hooks/useModelLoading';
import { useDimensionInteraction } from './3d-viewer/hooks/useDimensionInteraction';
import { useMeasurementHover } from './3d-viewer/hooks/useMeasurementHover';
import { useViewerKeyboard } from './3d-viewer/hooks/useViewerKeyboard';
import { useDimensionTool } from './3d-viewer/hooks/useDimensionTool';
import { useInspectMode } from './3d-viewer/hooks/useInspectMode';
import { useAnnotationTool } from './3d-viewer/hooks/useAnnotationTool';
import { useAnnotationInputPosition } from './3d-viewer/hooks/useAnnotationInputPosition';
import { AnnotationInput } from './3d-viewer/components/AnnotationInput';
import { useAnnotationInteraction } from './3d-viewer/hooks/useAnnotationInteraction';
import { Annotation } from './3d-viewer/types/annotation';
import { useIfcViewerAPI } from '../../hooks/useIfcViewerAPI';
import { PropertiesPanel } from './3d-viewer/components/PropertiesPanel';
import {
  useModelDimensions,
  useSaveModelDimension,
  useModelAnnotations,
  useSaveModelAnnotation,
  useUpdateModelAnnotation,
  useDeleteModelAnnotation,
  useModelClippingPlanes,
  useSaveModelClippingPlane,
  useSaveModelCameraView,
  useModelCameraViews,
} from '@/lib/api/hooks/useModelViewerState';
import type { ModelCameraView } from '@/lib/api/types';

interface ModelSettings {
  background?: string;
  show_edges?: boolean;
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
  versionId?: string;
}

const Team3DModelViewer = ({ modelFile, settings, versionNumber, versionId }: Team3DModelViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Initialize viewer
  const { viewerRef, viewerReady } = useViewerInitialization(containerRef, settings);
  
  // Load model
  const { loading, error } = useModelLoading(viewerRef, viewerReady, modelFile, settings);
  
  // Load persisted viewer state
  const { data: savedDimensions = [] } = useModelDimensions(versionId);
  const { data: savedAnnotations = [] } = useModelAnnotations(versionId);
  const { data: savedClippingPlanes = [] } = useModelClippingPlanes(versionId);
  const { data: savedCameraViews = [] } = useModelCameraViews(versionId);
  
  // Mutations for saving state
  const saveDimensionMutation = useSaveModelDimension();
  const saveAnnotationMutation = useSaveModelAnnotation();
  const updateAnnotationMutation = useUpdateModelAnnotation();
  const deleteAnnotationMutation = useDeleteModelAnnotation();
  const saveClippingPlaneMutation = useSaveModelClippingPlane();
  const { mutate: saveCameraView } = useSaveModelCameraView();
  
  // Edge toggle functionality
  const { toggleEdges } = useIfcViewerAPI();
  
  // Toggle edges visibility when settings change - real-time toggle
  useEffect(() => {
    if (!viewerRef.current || !viewerReady || loading) return;
    
    const showEdges = settings?.show_edges ?? true;
    try {
      toggleEdges(viewerRef.current, showEdges);
    } catch (error) {
      logger.warn('Error toggling edges:', error);
    }
  }, [settings?.show_edges, viewerReady, loading, toggleEdges]);
  
  // Handle hidden line mode toggle
  useEffect(() => {
    if (!viewerRef.current || !viewerReady || loading) return;
    
    const hiddenLineMode = settings?.hidden_line_mode ?? false;
    console.log('[Team3DModelViewer] Hidden line mode setting changed:', hiddenLineMode);
    
    try {
      const modelID = 0; // Assuming first model
      toggleHiddenLineMode(viewerRef.current, modelID, hiddenLineMode);
    } catch (error) {
      console.error('[Team3DModelViewer] Error toggling hidden line mode:', error);
    }
  }, [settings?.hidden_line_mode, viewerReady, loading]);
  
  // Tool state
  const [measurementMode, setMeasurementMode] = useState<'none' | 'distance' | 'area' | 'volume'>('none');
  const [clippingActive, setClippingActive] = useState(false);
  const [inspectMode, setInspectMode] = useState(false);
  const [annotationMode, setAnnotationMode] = useState(false);

  // Dimension interaction (selection and hover)
  const { selectedDimension, setSelectedDimension } = useDimensionInteraction({
    containerRef,
    viewerRef,
    viewerReady,
    measurementMode,
    clippingActive,
  });

  // Measurement hover sphere
  useMeasurementHover({
    containerRef,
    viewerRef,
    viewerReady,
    measurementMode,
    clippingActive,
  });

  // Dimension tool activation
  useDimensionTool({
    viewerRef,
    measurementMode,
  });

  // Inspect mode
  const {
    selectedObjectName,
    selectedObjectType,
    selectedObjectDimensions,
    selectedElementMetrics,
  } = useInspectMode({
    containerRef,
    viewerRef,
    viewerReady,
    inspectMode,
    measurementMode,
    clippingActive,
    annotationMode,
  });

  // Create a ref to share hoveredAnnotationId between hooks
  const hoveredAnnotationIdRef = useRef<string | null>(null);
  
  // Track which annotations have been restored to avoid duplicates
  const restoredAnnotationIdsRef = useRef<Set<string>>(new Set());
  
  // Track pending save to map local ID to database ID
  const pendingSaveLocalIdRef = useRef<string | null>(null);
  
  // Map local annotation IDs to database IDs for replacement
  const localToDbIdMapRef = useRef<Map<string, string>>(new Map());
  
  // Wrap save mutation to track local annotation ID
  const handleSaveAnnotation = useCallback((data: { versionId: string; position: { x: number; y: number; z: number }; text: string; localId?: string }) => {
    if (data.localId) {
      pendingSaveLocalIdRef.current = data.localId;
    }
    // Remove localId before sending to mutation (database doesn't need it)
    const { localId, ...mutationData } = data;
    saveAnnotationMutation.mutate(mutationData);
  }, [saveAnnotationMutation]);
  
  // Annotation tool
  const {
    annotations,
    setAnnotations,
    editingAnnotationId,
    setEditingAnnotationId,
    saveAnnotation,
    deleteAnnotation: deleteAnnotationInternal,
    annotationGroupsRef,
    addAnnotationToScene,
    removeAnnotationFromScene,
  } = useAnnotationTool({
    containerRef,
    viewerRef,
    viewerReady,
    annotationMode,
    clippingActive,
    hoveredAnnotationId: hoveredAnnotationIdRef.current,
    versionId,
    onSaveAnnotation: handleSaveAnnotation,
    onUpdateAnnotation: updateAnnotationMutation.mutate,
    onDeleteAnnotation: deleteAnnotationMutation.mutate,
  });

  // Wrap deleteAnnotation to also remove from restored IDs
  const deleteAnnotation = useCallback((id: string) => {
    deleteAnnotationInternal(id);
    restoredAnnotationIdsRef.current.delete(id);
  }, [deleteAnnotationInternal]);
  
  // Handle successful annotation save - map local ID to database ID for replacement
  useEffect(() => {
    if (saveAnnotationMutation.isSuccess && saveAnnotationMutation.data && pendingSaveLocalIdRef.current) {
      const dbAnnotation = saveAnnotationMutation.data as any;
      const dbId = dbAnnotation.id;
      const localId = pendingSaveLocalIdRef.current;
      
      logger.log('Mapping local annotation to database ID:', {
        localId,
        dbId,
      });
      
      // Store the mapping - restoration logic will use this to replace local annotation
      localToDbIdMapRef.current.set(localId, dbId);
      
      // Mark database ID as restored so restoration logic knows to replace local one
      restoredAnnotationIdsRef.current.add(dbId);
      
      // Clear pending save
      pendingSaveLocalIdRef.current = null;
    }
  }, [saveAnnotationMutation.isSuccess, saveAnnotationMutation.data]);

  // Annotation interaction (hover and selection)
  const { selectedAnnotationId, setSelectedAnnotationId, hoveredAnnotationId } = useAnnotationInteraction({
    containerRef,
    viewerRef,
    viewerReady,
    annotationMode,
    clippingActive,
    annotationGroupsRef,
    setEditingAnnotationId,
    setAnnotationMode,
  });
  
  // Update the ref so useAnnotationTool can access it
  hoveredAnnotationIdRef.current = hoveredAnnotationId;

  const editingAnnotation = annotations.find(ann => ann.id === editingAnnotationId) || null;
  const inputPosition = useAnnotationInputPosition({
    viewerRef,
    viewerReady,
    editingAnnotation,
    annotationGroupsRef,
  });

  // Keyboard shortcuts
  useViewerKeyboard({
    viewerRef,
    measurementMode,
    setMeasurementMode,
    clippingActive,
    setClippingActive,
    inspectMode,
    setInspectMode,
    annotationMode,
    setAnnotationMode,
    selectedDimension,
    setSelectedDimension,
    selectedAnnotationId,
    setSelectedAnnotationId,
    deleteAnnotation,
  });

  // Helper function to deactivate all tools
  const deactivateAllTools = useCallback(() => {
    // Deactivate clipping
    if (clippingActive && viewerRef.current?.clipper) {
      viewerRef.current.clipper.active = false;
      setClippingActive(false);
    }
    
    // Deactivate measurement
    if (measurementMode !== 'none' && viewerRef.current?.dimensions) {
      const dimensions = viewerRef.current.dimensions;
      dimensions.active = false;
      dimensions.previewActive = false;
      dimensions.cancelDrawing();
      // Restore visibility of all created dimensions
      const count = restoreDimensionsVisibility(dimensions);
      logger.log(`Measurement deactivated - ${count} dimensions remain visible`);
      setMeasurementMode('none');
    }
    
    // Deactivate annotation
    if (annotationMode) {
      setAnnotationMode(false);
      if (editingAnnotationId) {
        setEditingAnnotationId(null);
      }
    }
    
    // Deactivate inspect mode
    if (inspectMode) {
      setInspectMode(false);
    }
  }, [clippingActive, measurementMode, annotationMode, inspectMode, editingAnnotationId, setClippingActive, setMeasurementMode, setAnnotationMode, setInspectMode, setEditingAnnotationId]);

  // Tool handlers
  const handleMeasureDistance = () => {
    const newMode = measurementMode === 'distance' ? 'none' : 'distance';
    
    if (newMode === 'distance') {
      // Activating measurement - deactivate all other tools
      deactivateAllTools();
      setMeasurementMode('distance');
    } else {
      // Deactivating measurement
      if (viewerRef.current?.dimensions) {
        const dimensions = viewerRef.current.dimensions;
        dimensions.active = false;
        dimensions.previewActive = false;
        dimensions.cancelDrawing();
        // Restore visibility of all created dimensions
        const count = restoreDimensionsVisibility(dimensions);
        logger.log(`Measurement deactivated - ${count} dimensions remain visible`);
      }
      setMeasurementMode('none');
    }
  };


  const handleToggleClipping = () => {
    if (!viewerRef.current?.clipper) return;
    
    const newState = !clippingActive;
    
    if (newState) {
      // Activating clipping - deactivate all other tools
      deactivateAllTools();
      setClippingActive(true);
      
      // If there are no planes yet, create one
      if (viewerRef.current.clipper.planes.length === 0) {
        viewerRef.current.clipper.active = true;
        viewerRef.current.clipper.createPlane();
        
        // Save clipping plane to database (access last created plane)
        if (versionId && viewerRef.current.clipper.planes.length > 0) {
          const plane = viewerRef.current.clipper.planes[viewerRef.current.clipper.planes.length - 1];
          saveClippingPlaneMutation.mutate({
            versionId,
            planeData: {
              normal: {
                x: (plane as any).normal?.x || 0,
                y: (plane as any).normal?.y || 1,
                z: (plane as any).normal?.z || 0
              },
              origin: {
                x: (plane as any).constant || 0,
                y: 0,
                z: 0
              }
            },
            name: `Section Cut ${new Date().toLocaleTimeString()}`
          });
        }
        
        logger.log('Clipper tool activated - clipping plane created (press P to create another)');
      } else {
        // Reactivating - show controls for existing planes
        // First, ensure enabled is set to true (this is critical for deleteAllPlanes to work)
        (viewerRef.current.clipper as any).enabled = true;
        // Then set clipper active which will make planes visible
        viewerRef.current.clipper.active = true;
        
        // Then ensure all planes have their controls visible and attached
        viewerRef.current.clipper.planes.forEach((plane: any) => {
          if (!plane.isPlan) {
            // Ensure plane is visible (controls/arrows)
            plane.visible = true;
            plane.active = true; // Keep clipping active
            
            // Make sure controls are visible
            if (plane.controls) {
              plane.controls.visible = true;
              // Reattach controls to enable interaction
              if (plane.controls.attach && plane.helper) {
                plane.controls.attach(plane.helper);
              }
            }
            
            // Make sure helper is visible
            if (plane.helper) {
              plane.helper.visible = true;
            }
          }
        });
        logger.log(`Clipper tool reactivated - ${viewerRef.current.clipper.planes.length} plane(s) with controls visible and enabled`);
      }
    } else {
      // Deactivating clipping mode - hide controls but keep clipping active
      // Keep planes active so clipping continues, but hide the visual controls and disable interaction
      viewerRef.current.clipper.planes.forEach((plane: any) => {
        if (!plane.isPlan) {
          plane.visible = false; // Hide controls/arrows
          // Detach controls to disable interaction
          if (plane.controls && plane.controls.detach) {
            plane.controls.detach();
          }
          // Keep plane.active = true so clipping continues
        }
      });
      // Set clipper.enabled to false to prevent creating new planes
      // But we need to access the private enabled property, so we'll use a workaround
      // by setting active to false temporarily, then restoring plane.active
      const wasActive = viewerRef.current.clipper.active;
      if (wasActive) {
        // Manually set enabled to false without affecting plane.active
        (viewerRef.current.clipper as any).enabled = false;
      }
      setClippingActive(false);
      logger.log('Clipper tool deactivated - clipping remains active, controls hidden and disabled');
    }
  };

  const handleClearClipping = () => {
    if (!viewerRef.current?.clipper || !viewerRef.current?.context) return;
    
    const clipper = viewerRef.current.clipper;
    const context = viewerRef.current.context;
    
    // CRITICAL: Always ensure enabled is true before deleting planes
    // This is the key issue - when toggled off/on, enabled might not be properly restored
    (clipper as any).enabled = true;
    clipper.active = true;
    
    // Delete all planes - this removes them from scene, context, and materials
    // deleteAllPlanes calls deletePlane which passes planes directly, so it should work
    // but we ensure enabled is true just in case
    if (clipper.deleteAllPlanes) {
      clipper.deleteAllPlanes();
    }
    
    // Double-check: manually clear any remaining planes
    // This ensures a complete reset even if deleteAllPlanes missed something
    if (clipper.planes && clipper.planes.length > 0) {
      logger.warn(`deleteAllPlanes left ${clipper.planes.length} planes, manually removing...`);
      // Force remove any remaining planes
      const planesCopy = [...clipper.planes];
      planesCopy.forEach((plane: any) => {
        try {
          if (plane.removeFromScene) {
            plane.removeFromScene();
          }
          if (plane.dispose) {
            plane.dispose();
          }
          // Remove from context clipping planes
          if (plane.plane) {
            context.removeClippingPlane(plane.plane);
          }
        } catch (e) {
          logger.warn('Error removing plane:', e);
        }
      });
      clipper.planes.length = 0;
    }
    
    // CRITICAL: Clear the context's clipping planes array completely
    // This ensures no clipping planes remain in the context
    const clippingPlanes = context.getClippingPlanes();
    if (clippingPlanes && clippingPlanes.length > 0) {
      logger.warn(`Context still has ${clippingPlanes.length} clipping planes, clearing...`);
      // Clear the array by removing all planes
      while (clippingPlanes.length > 0) {
        clippingPlanes.pop();
      }
    }
    
    // Update all materials to remove clipping planes
    // This is critical to remove the visual clipping effect
    if (context.items && context.items.ifcModels) {
      context.items.ifcModels.forEach((model: any) => {
        if (Array.isArray(model.material)) {
          model.material.forEach((mat: any) => {
            if (mat) {
              mat.clippingPlanes = [];
            }
          });
        } else if (model.material) {
          model.material.clippingPlanes = [];
        }
      });
    }
    
    // Also update subsets
    if (viewerRef.current?.IFC?.loader?.ifcManager?.subsets) {
      const subsets = viewerRef.current.IFC.loader.ifcManager.subsets.getAllSubsets();
      Object.values(subsets).forEach((subset: any) => {
        const mesh = subset.mesh;
        if (mesh) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat: any) => {
              if (mat) {
                mat.clippingPlanes = [];
              }
            });
          } else if (mesh.material) {
            mesh.material.clippingPlanes = [];
          }
          // Also handle wireframe if it exists
          if (mesh.userData?.wireframe) {
            const wireframe = mesh.userData.wireframe;
            if (Array.isArray(wireframe.material)) {
              wireframe.material.forEach((mat: any) => {
                if (mat) {
                  mat.clippingPlanes = [];
                }
              });
            } else if (wireframe.material) {
              wireframe.material.clippingPlanes = [];
            }
          }
        }
      });
    }
    
    // Update materials using clipper's updateMaterials if available
    if ((clipper as any).updateMaterials) {
      (clipper as any).updateMaterials();
    }
    
    // Update post production
    if (context.renderer?.postProduction) {
      context.renderer.postProduction.update();
    }
    
    // Deactivate the clipper completely after clearing
    clipper.active = false;
    (clipper as any).enabled = false;
    
    // Update clippingActive state to reflect that no planes exist
    setClippingActive(false);
    
    logger.log('All clipping planes cleared - complete reset (planes, context, and materials)');
  };

  const handleClearMeasurements = () => {
    if (viewerRef.current?.dimensions) {
      viewerRef.current.dimensions.deleteAll();
      logger.log('All measurements cleared');
    }
  };

  const handleToggleAnnotation = () => {
    const newMode = !annotationMode;
    
    if (newMode) {
      // Activating annotation - deactivate all other tools
      deactivateAllTools();
      setAnnotationMode(true);
    } else {
      // Deactivating annotation
      setAnnotationMode(false);
      if (editingAnnotationId) {
        setEditingAnnotationId(null);
      }
    }
  };

  const handleToggleInspect = () => {
    const newMode = !inspectMode;
    
    if (newMode) {
      // Activating inspect mode - deactivate all other tools
      deactivateAllTools();
      setInspectMode(true);
    } else {
      // Deactivating inspect mode
      setInspectMode(false);
    }
  };

  const handleResetView = () => {
    if (viewerRef.current?.context) {
      viewerRef.current.context.fitToFrame();
      logger.log('View reset to fit frame');
    }
  };

  const handleSaveCameraView = useCallback(() => {
    if (!viewerRef.current || !versionId) {
      logger.warn('Cannot save camera view: viewer or versionId missing');
      return;
    }
    
    const viewer = viewerRef.current;
    const camera = viewer.context.getCamera();
    const controls = viewer.context.ifcCamera.cameraControls as any;
    
    const name = prompt('Enter a name for this camera view:');
    if (!name) return;
    
    saveCameraView({
      versionId,
      name,
      position: {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z
      },
      target: {
        x: controls.target?.x || 0,
        y: controls.target?.y || 0,
        z: controls.target?.z || 0
      },
      zoom: camera.zoom
    });
    
    logger.log(`Saved camera view: ${name}`);
  }, [versionId, saveCameraView]);

  const handleLoadCameraView = useCallback((view: ModelCameraView) => {
    if (!viewerRef.current) return;

    const viewer = viewerRef.current;
    const camera = viewer.context.getCamera();
    const controls = viewer.context.ifcCamera.cameraControls as any;

    camera.position.set(view.position.x, view.position.y, view.position.z);
    controls.setTarget?.(view.target.x, view.target.y, view.target.z);
    camera.zoom = view.zoom;
    camera.updateProjectionMatrix();

    logger.log(`Loaded camera view: ${view.name}`);
  }, []);

  // Restore saved dimensions on load
  useEffect(() => {
    if (!viewerRef.current || !viewerReady || loading || savedDimensions.length === 0) return;

    logger.log(`Restoring ${savedDimensions.length} saved dimensions`);
    // Note: Dimension restoration requires IFC.js dimension API
    // This is a placeholder - actual implementation depends on web-ifc-viewer's dimension API
  }, [viewerReady, loading, savedDimensions]);

  // Clear restored IDs when version changes
  useEffect(() => {
    restoredAnnotationIdsRef.current.clear();
  }, [versionId]);

  // Restore saved annotations on load (only restore new ones, replace local with DB versions)
  useEffect(() => {
    if (!viewerRef.current || !viewerReady || loading || savedAnnotations.length === 0) return;

    // Filter out annotations that have already been restored (but not those being replaced)
    const newAnnotations = savedAnnotations.filter(
      savedAnn => !restoredAnnotationIdsRef.current.has(savedAnn.id) || 
                   Array.from(localToDbIdMapRef.current.values()).includes(savedAnn.id)
    );

    if (newAnnotations.length === 0) return;

    logger.log(`Restoring ${newAnnotations.length} saved annotations`);
    
    // Convert saved annotations to local annotation format and add to scene
    newAnnotations.forEach(savedAnn => {
      // Check if this database annotation is replacing a local one
      const localIdToReplace = Array.from(localToDbIdMapRef.current.entries())
        .find(([_, dbId]) => dbId === savedAnn.id)?.[0];
      
      if (localIdToReplace) {
        logger.log('Replacing local annotation with database version:', {
          localId: localIdToReplace,
          dbId: savedAnn.id,
        });
        
        // CRITICAL: Update the userData.annotationId on the group BEFORE removing
        // so that any pending click handlers use the new ID
        const oldGroup = annotationGroupsRef.current.get(localIdToReplace);
        if (oldGroup) {
          oldGroup.userData.annotationId = savedAnn.id;
          // Also update children userData
          oldGroup.traverse((child: any) => {
            if (child.userData && child.userData.annotationId === localIdToReplace) {
              child.userData.annotationId = savedAnn.id;
            }
          });
          // Update the map to use the new ID
          annotationGroupsRef.current.delete(localIdToReplace);
          annotationGroupsRef.current.set(savedAnn.id, oldGroup);
          
          logger.log('Updated group userData to new ID:', savedAnn.id);
        } else {
          // If group doesn't exist, remove from scene normally
          removeAnnotationFromScene(localIdToReplace);
        }
        
        // Remove from local state
        setAnnotations(prev => prev.filter(ann => ann.id !== localIdToReplace));
        
        // Update selectedAnnotationId if it matches the old local ID
        if (selectedAnnotationId === localIdToReplace) {
          setSelectedAnnotationId(savedAnn.id);
        }
        
        // Update editingAnnotationId if it matches the old local ID
        if (editingAnnotationId === localIdToReplace) {
          setEditingAnnotationId(savedAnn.id);
        }
        
        // Remove from mapping
        localToDbIdMapRef.current.delete(localIdToReplace);
        
        // Don't add to scene since we just updated the existing group
        return;
      }
      
      const annotation: Annotation = {
        id: savedAnn.id,
        position: new THREE.Vector3(
          savedAnn.position.x,
          savedAnn.position.y,
          savedAnn.position.z
        ),
        text: savedAnn.text,
        createdAt: new Date(savedAnn.created_at),
        updatedAt: new Date(savedAnn.updated_at),
        isNew: false,
        dbId: savedAnn.id, // Track the database ID
      };
      
      // Add to scene visually
      addAnnotationToScene(annotation);
      
      // Mark as restored
      restoredAnnotationIdsRef.current.add(savedAnn.id);
    });
    
    // Update local state with restored annotations (append to existing)
    setAnnotations(prev => {
      const existingIds = new Set(prev.map(a => a.id));
      const newAnns = newAnnotations
        .filter(savedAnn => !existingIds.has(savedAnn.id))
        .map(savedAnn => ({
          id: savedAnn.id,
          position: new THREE.Vector3(
            savedAnn.position.x,
            savedAnn.position.y,
            savedAnn.position.z
          ),
          text: savedAnn.text,
          createdAt: new Date(savedAnn.created_at),
          updatedAt: new Date(savedAnn.updated_at),
          isNew: false,
          dbId: savedAnn.id,
        }));
      return [...prev, ...newAnns];
    });
  }, [viewerReady, loading, savedAnnotations, addAnnotationToScene, setAnnotations, removeAnnotationFromScene]);

  // Restore saved clipping planes on load
  useEffect(() => {
    if (!viewerRef.current || !viewerReady || loading || savedClippingPlanes.length === 0) return;

    const viewer = viewerRef.current;
    logger.log(`Restoring ${savedClippingPlanes.length} saved clipping planes`);

    savedClippingPlanes.forEach(clippingPlane => {
      try {
        viewer.clipper.createPlane();
        const lastPlane = viewer.clipper.planes[viewer.clipper.planes.length - 1];
        
        if (lastPlane && lastPlane.plane) {
          lastPlane.plane.normal.set(
            clippingPlane.plane_data.normal.x,
            clippingPlane.plane_data.normal.y,
            clippingPlane.plane_data.normal.z
          );
          lastPlane.plane.constant = clippingPlane.plane_data.origin.x;
        }
      } catch (error) {
        logger.error('Failed to restore clipping plane:', error);
      }
    });
  }, [viewerReady, loading, savedClippingPlanes]);

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
    <div className="flex flex-col bg-background h-full rounded-b-xl overflow-hidden">
      {/* 3D Viewer Content */}
      <div className="flex-1 overflow-hidden relative bg-background">
        {/* Floating Toolbar */}
        <ViewerToolbar
          inspectMode={inspectMode}
          onToggleInspect={handleToggleInspect}
          measurementMode={measurementMode}
          onMeasureDistance={handleMeasureDistance}
          onClearMeasurements={handleClearMeasurements}
          clippingActive={clippingActive}
          onToggleClipping={handleToggleClipping}
          onClearClipping={handleClearClipping}
          annotationMode={annotationMode}
          onToggleAnnotation={handleToggleAnnotation}
          onResetView={handleResetView}
          versionId={versionId}
          onSaveCameraView={handleSaveCameraView}
          onLoadCameraView={handleLoadCameraView}
          savedCameraViews={savedCameraViews}
        />
        
        {/* Properties Panel */}
        <PropertiesPanel
          objectName={selectedObjectName || undefined}
          objectType={selectedObjectType || undefined}
          objectDimensions={selectedObjectDimensions || undefined}
          elementMetrics={selectedElementMetrics || undefined}
        />
        
        {/* Annotation Input */}
        {editingAnnotation && inputPosition && (
          <AnnotationInput
            annotation={editingAnnotation}
            onSave={saveAnnotation}
            onDelete={deleteAnnotation}
            onClose={() => setEditingAnnotationId(null)}
            position={inputPosition}
          />
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
            <div className="text-[10px] mb-4">⚠️</div>
            <div className="text-[10px] font-medium mb-2 text-foreground">{error}</div>
            <div className="text-[9px] text-muted-foreground max-w-xs">
              Make sure the file is a valid IFC format (.ifc)
            </div>
          </div>
        )}

        <div
          ref={containerRef}
          className="w-full h-full absolute inset-0"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      </div>
    </div>
  );
};

export default Team3DModelViewer;
