import React, { useState, useEffect, useRef } from 'react';
import { MoreVertical, RefreshCw, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useModelVersions, useModelSettings, useUpdateModelSettings, useDeleteModelVersion } from '@/lib/api/hooks/useModelVersions';
import { use3DModelsFolder, useUploadProjectFiles } from '@/lib/api/hooks/useProjectFiles';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useProject } from '@/lib/api/hooks/useProjects';
import { useToast } from '@/hooks/use-toast';

interface ProjectPanel3DModelsTabProps {
  projectId: string;
  onModelSelect?: (model: { versionId: string; versionNumber: string; modelFile: any; settings: any } | null) => void;
}

const HiddenScrollCSS = () => (
  <style>{`
    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .no-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `}</style>
);

export function ProjectPanel3DModelsTab({ projectId, onModelSelect }: ProjectPanel3DModelsTabProps) {
  // 3D Models tab state
  const [selectedModelVersion, setSelectedModelVersion] = useState("");
  const [modelBackground, setModelBackground] = useState<"light" | "dark">("light");
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [layers, setLayers] = useState({
    structure: true,
    walls: true,
    roof: true,
    floor: true,
    windows: true,
  });
  const [versionNotes, setVersionNotes] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [draftVersionNotes, setDraftVersionNotes] = useState("");
  const [isUploadingModel, setIsUploadingModel] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const modelFileInputRef = useRef<HTMLInputElement>(null);
  const { data: project } = useProject(projectId);
  
  // Refs to prevent rapid successive onModelSelect calls
  const prevModelVersionRef = useRef<string | null>(null);
  const prevSettingsRef = useRef<string>('');

  // Database queries for 3D Models tab
  const { data: modelsFolder } = use3DModelsFolder(projectId);
  const { data: modelVersions = [] } = useModelVersions(projectId);
  const { data: modelSettings } = useModelSettings(selectedModelVersion);
  const updateModelSettings = useUpdateModelSettings();
  const deleteModelVersion = useDeleteModelVersion();
  const uploadFiles = useUploadProjectFiles(projectId);

  // Query for model version files
  const { data: versionFiles = [] } = useQuery({
    queryKey: ['model-files', selectedModelVersion],
    queryFn: async () => {
      if (!selectedModelVersion) return [];
      
      const { data, error } = await supabase
        .from('model_files')
        .select('*')
        .eq('version_id', selectedModelVersion)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedModelVersion,
  });

  // Load settings when version changes
  useEffect(() => {
    if (modelSettings) {
      const settings = modelSettings as any;
      setModelBackground(settings.background || 'light');
      setShowGrid(settings.show_grid ?? true);
      setShowAxes(settings.show_axes ?? true);
      setLayers(settings.layers || {
        roof: true,
        floor: true,
        walls: true,
        windows: true,
        structure: true,
      });
      setVersionNotes(settings.notes || '');
      setDraftVersionNotes(settings.notes || '');
      setIsEditingNotes(false);
    } else if (selectedModelVersion) {
      // Reset to defaults if no settings found
      setModelBackground('light');
      setShowGrid(true);
      setShowAxes(true);
      setLayers({
        roof: true,
        floor: true,
        walls: true,
        windows: true,
        structure: true,
      });
      setVersionNotes('');
      setDraftVersionNotes('');
      setIsEditingNotes(false);
    }
  }, [modelSettings, selectedModelVersion]);

  // Call onModelSelect when version/files change
  // Use refs to prevent rapid successive calls
  useEffect(() => {
    if (!onModelSelect) return;
    
    // If no version selected, unmount the viewer (only if we HAD a selection before)
    if (!selectedModelVersion) {
      if (prevModelVersionRef.current) {
        onModelSelect(null);
        prevModelVersionRef.current = null;
        prevSettingsRef.current = '';
      }
      return;
    }
    
    const currentVersion = modelVersions.find((v: any) => v.id === selectedModelVersion) as any;
    if (!currentVersion) return;

    // Get the first model file for this version
    const firstModelFile = versionFiles[0];
    if (!firstModelFile) {
      if (prevModelVersionRef.current) {
        onModelSelect(null);
      }
      prevModelVersionRef.current = null;
      prevSettingsRef.current = '';
      return;
    }

    // Create settings object and stringify for comparison
    const settings = {
      background: modelBackground,
      show_grid: showGrid,
      show_axes: showAxes,
      layers,
    };
    const settingsKey = JSON.stringify(settings);
    
    // Only call onModelSelect if version changed OR settings changed
    const versionChanged = prevModelVersionRef.current !== selectedModelVersion;
    const settingsChanged = prevSettingsRef.current !== settingsKey;
    
    if (!versionChanged && !settingsChanged) {
      return; // No changes, skip
    }

    // Get public URL for the model file
    const { data: urlData } = supabase.storage
      .from('project-files')
      .getPublicUrl(firstModelFile.storage_path);

    prevModelVersionRef.current = selectedModelVersion;
    prevSettingsRef.current = settingsKey;
    
    onModelSelect({
      versionId: selectedModelVersion,
      versionNumber: currentVersion.version_number || 'Unknown',
      modelFile: {
        storage_path: urlData.publicUrl,
        filename: firstModelFile.filename,
      },
      settings,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModelVersion, versionFiles, modelVersions, modelBackground, showGrid, showAxes, layers, onModelSelect]);

  // ---- 3D Models: upload and save handlers ----
  const handleModelUploadClick = () => {
    if (!modelsFolder) {
      toast({
        title: 'Error',
        description: '3D Models folder not found. Please contact support.',
        variant: 'destructive',
      });
      return;
    }
    modelFileInputRef.current?.click();
  };

  const handleModelFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !modelsFolder || !project) return;

    setIsUploadingModel(true);
    try {
      // Step 1: Upload files to storage
      const uploadResult = await uploadFiles.mutateAsync({
        files: Array.from(files),
        folder_id: modelsFolder,
      });
      
      // Step 2: Get the latest version number
      const { data: existingVersions } = await supabase
        .from('model_versions')
        .select('version_number')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1);
      
      // Step 3: Generate new version number
      const latestVersion = existingVersions?.[0]?.version_number || 'v0.0';
      const versionMatch = latestVersion.match(/v(\d+)\.(\d+)/);
      const major = versionMatch ? parseInt(versionMatch[1]) : 0;
      const minor = versionMatch ? parseInt(versionMatch[2]) : 0;
      const newVersion = `v${major}.${minor + 1}`;
      
      // Step 4: Create new model version
      const { data: newModelVersion, error: versionError } = await supabase
        .from('model_versions')
        .insert({
          project_id: projectId,
          version_number: newVersion,
          is_current: true,
        })
        .select()
        .single();
      
      if (versionError) throw versionError;
      
      // Step 5: Set all other versions to not current
      await supabase
        .from('model_versions')
        .update({ is_current: false })
        .eq('project_id', projectId)
        .neq('id', newModelVersion.id);
      
      // Step 6: Link uploaded files to model version
      const { data: uploadedFiles } = await supabase
        .from('files')
        .select('id, filename, mimetype, filesize, storage_path')
        .eq('folder_id', modelsFolder)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(files.length);
      
      if (uploadedFiles) {
        const modelFilesInserts = uploadedFiles.map(file => ({
          version_id: newModelVersion.id,
          file_id: file.id,
          filename: file.filename,
          mimetype: file.mimetype,
          filesize: file.filesize,
          storage_path: file.storage_path,
        }));
        
        await supabase
          .from('model_files')
          .insert(modelFilesInserts);
      }
      
      // Step 7: Create default model settings
      await supabase
        .from('model_settings')
        .insert({
          version_id: newModelVersion.id,
          show_grid: true,
          show_axes: true,
          background: 'light',
          layers: {
            roof: true,
            floor: true,
            walls: true,
            windows: true,
            structure: true,
          },
          notes: '',
        });
      
      // Step 8: Set the new version as selected
      setSelectedModelVersion(newModelVersion.id);
      
      toast({
        title: 'Success',
        description: `Version ${newVersion} created with ${files.length} file(s)`,
      });
    } catch (error) {
      console.error('Model upload error:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload model files',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingModel(false);
      if (modelFileInputRef.current) {
        modelFileInputRef.current.value = '';
      }
    }
  };

  // Model version handlers
  const handleReloadModel = () => {
    queryClient.invalidateQueries({ queryKey: ['model-versions', projectId] });
    queryClient.invalidateQueries({ queryKey: ['model-settings', selectedModelVersion] });
    toast({
      title: 'Reloaded',
      description: 'Model data refreshed from server',
    });
  };

  const handleRenameVersion = async () => {
    if (!selectedModelVersion || !modelVersions) return;
    
    const currentVersion = modelVersions.find((v: any) => v.id === selectedModelVersion) as any;
    if (!currentVersion) return;
    
    const newName = prompt('Enter new version number:', currentVersion.version_number);
    if (!newName || newName === currentVersion.version_number) return;
    
    try {
      const { error } = await supabase
        .from('model_versions')
        .update({ version_number: newName })
        .eq('id', selectedModelVersion);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['model-versions', projectId] });
      toast({
        title: 'Success',
        description: 'Version renamed',
      });
    } catch (error) {
      console.error('Rename error:', error);
      toast({
        title: 'Error',
        description: 'Failed to rename version',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteVersion = async () => {
    if (!selectedModelVersion) return;
    
    const confirmDelete = window.confirm('Are you sure you want to delete this model version? This action cannot be undone.');
    if (!confirmDelete) return;
    
    try {
      await deleteModelVersion.mutateAsync(selectedModelVersion);
      setSelectedModelVersion("");
      toast({
        title: 'Success',
        description: 'Model version deleted',
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete version',
        variant: 'destructive',
      });
    }
  };

  const handleNotesEditToggle = async () => {
    if (isEditingNotes) {
      // Save notes
      try {
        await updateModelSettings.mutateAsync({
          versionId: selectedModelVersion,
          settings: {
            notes: draftVersionNotes,
            background: modelBackground,
            show_grid: showGrid,
            show_axes: showAxes,
            layers,
          },
        });
        setVersionNotes(draftVersionNotes);
        setIsEditingNotes(false);
        toast({
          title: 'Saved',
          description: 'Version notes updated',
        });
      } catch (error) {
        console.error('Save error:', error);
        toast({
          title: 'Error',
          description: 'Failed to save notes',
          variant: 'destructive',
        });
      }
    } else {
      // Start editing
      setDraftVersionNotes(versionNotes);
      setIsEditingNotes(true);
    }
  };

  const handleSaveSettings = async () => {
    if (!selectedModelVersion) return;
    
    try {
      await updateModelSettings.mutateAsync({
        versionId: selectedModelVersion,
        settings: {
          background: modelBackground,
          show_grid: showGrid,
          show_axes: showAxes,
          layers,
          notes: versionNotes,
        },
      });
      toast({
        title: 'Saved',
        description: 'Model settings updated',
      });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    }
  };

  // Note: Auto-save removed to prevent infinite loops
  // Settings are saved manually via handleSaveSettings or when notes are saved

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <HiddenScrollCSS />
      
      {/* Hidden model file input */}
      <input
        ref={modelFileInputRef}
        type="file"
        multiple
        accept=".ifc,.glb,.gltf,.obj,.fbx,.dae,.stl"
        onChange={handleModelFileInputChange}
        className="hidden"
        aria-label="Upload 3D model files"
      />
      
      {/* Version Selector - Sticky Top */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200/80 px-2.5 pt-2 pb-1.5">
        <div className="flex gap-1.5">
          <select
            value={selectedModelVersion}
            onChange={(e) => setSelectedModelVersion(e.target.value)}
            className="flex-1 h-7 rounded-[4px] border border-slate-300 bg-white px-2 text-[11px] text-slate-900 focus:outline-none focus:border-slate-500"
          >
            <option value="">Select Version</option>
            {modelVersions.length === 0 ? null : (
              modelVersions.map((version: any) => (
                <option key={version.id} value={version.id}>
                  {version.version_number}
                  {version.is_current ? ' (current)' : ''}
                </option>
              ))
            )}
          </select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="h-7 w-7 rounded-md border border-slate-300 bg-white hover:bg-slate-50 grid place-items-center text-slate-600"
                aria-label="Model version options"
              >
                <MoreVertical size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={handleReloadModel}>
                <RefreshCw size={14} className="mr-2" />
                Reload
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleRenameVersion}>
                <Edit size={14} className="mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDeleteVersion} className="text-red-600">
                <Trash2 size={14} className="mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Settings & Layers (scrollable) */}
      <div className="flex-1 overflow-auto px-2.5 py-2 space-y-4 no-scrollbar">
        
        {/* Model File Name */}
        {versionFiles && versionFiles.length > 0 && (
          <div className="mb-3">
            <div className="text-[11px] font-medium text-slate-900 truncate">
              {versionFiles[0].filename}
            </div>
          </div>
        )}
        
        {/* DISPLAY Section */}
        <div>
          <div className="text-[10px] font-semibold text-slate-500 tracking-[0.08em] mb-1">
            DISPLAY
          </div>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[11px] text-slate-700">Background</span>
            <div className="inline-flex rounded-md border border-slate-200 bg-white overflow-hidden text-[11px]">
              <button
                type="button"
                onClick={() => setModelBackground("light")}
                className={`px-2 h-6 flex items-center justify-center ${
                  modelBackground === "light" ? "bg-slate-900 text-white" : "text-slate-700"
                }`}
              >
                Light
              </button>
              <button
                type="button"
                onClick={() => setModelBackground("dark")}
                className={`px-2 h-6 flex items-center justify-center border-l border-slate-200 ${
                  modelBackground === "dark" ? "bg-slate-900 text-white" : "text-slate-700"
                }`}
              >
                Dark
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-[11px] text-slate-800">
              <input
                type="checkbox"
                className="h-3 w-3 rounded border-slate-300"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
              />
              <span>Grid</span>
            </label>
            <label className="flex items-center gap-2 text-[11px] text-slate-800">
              <input
                type="checkbox"
                className="h-3 w-3 rounded border-slate-300"
                checked={showAxes}
                onChange={(e) => setShowAxes(e.target.checked)}
              />
              <span>Axes</span>
            </label>
          </div>
        </div>

        {/* LAYERS Section */}
        <div>
          <div className="text-[10px] font-semibold text-slate-500 tracking-[0.08em] mb-1">
            LAYERS
          </div>
          <div className="space-y-1 max-h-32 overflow-auto pr-1">
            <label className="flex items-center gap-2 text-[11px] text-slate-800">
              <input
                type="checkbox"
                className="h-3 w-3 rounded border-slate-300"
                checked={layers.structure}
                onChange={(e) => setLayers({...layers, structure: e.target.checked})}
              />
              <span>Structure</span>
            </label>
            <label className="flex items-center gap-2 text-[11px] text-slate-800">
              <input
                type="checkbox"
                className="h-3 w-3 rounded border-slate-300"
                checked={layers.walls}
                onChange={(e) => setLayers({...layers, walls: e.target.checked})}
              />
              <span>Walls</span>
            </label>
            <label className="flex items-center gap-2 text-[11px] text-slate-800">
              <input
                type="checkbox"
                className="h-3 w-3 rounded border-slate-300"
                checked={layers.roof}
                onChange={(e) => setLayers({...layers, roof: e.target.checked})}
              />
              <span>Roof</span>
            </label>
            <label className="flex items-center gap-2 text-[11px] text-slate-800">
              <input
                type="checkbox"
                className="h-3 w-3 rounded border-slate-300"
                checked={layers.floor}
                onChange={(e) => setLayers({...layers, floor: e.target.checked})}
              />
              <span>Floor</span>
            </label>
            <label className="flex items-center gap-2 text-[11px] text-slate-800">
              <input
                type="checkbox"
                className="h-3 w-3 rounded border-slate-300"
                checked={layers.windows}
                onChange={(e) => setLayers({...layers, windows: e.target.checked})}
              />
              <span>Windows & Doors</span>
            </label>
          </div>
        </div>

        {/* VERSION NOTES Section */}
        <div>
          <div className="text-[10px] font-semibold text-slate-500 tracking-[0.08em] mb-1">
            VERSION NOTES
          </div>
          {isEditingNotes ? (
            <textarea
              value={draftVersionNotes}
              onChange={(e) => setDraftVersionNotes(e.target.value)}
              placeholder="Notes about this model version (scope, changes, assumptions)…"
              rows={5}
              className="w-full min-h-[140px] rounded-[4px] px-2 py-1.5 text-[11px] bg-slate-50 text-slate-900 resize-none focus:outline-none whitespace-pre-wrap"
            />
          ) : (
            <div className="w-full min-h-[140px] rounded-[4px] px-2 py-1.5 text-[11px] text-slate-900 whitespace-pre-wrap bg-slate-50">
              {versionNotes || (
                <span className="text-slate-400">No notes for this version</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer with New Version + Edit/Save buttons */}
      <div className="px-2.5 pb-2 pt-2 border-t border-slate-200/80">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={handleModelUploadClick}
            disabled={isUploadingModel}
            className="h-7 flex-[4] rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-[11px] text-slate-800 flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-[13px] leading-none">+</span>
            <span>{isUploadingModel ? 'Uploading...' : 'New version'}</span>
          </button>
          <button
            type="button"
            onClick={handleNotesEditToggle}
            disabled={updateModelSettings.isPending}
            className={`h-7 flex-[2] rounded-md border text-[11px] flex items-center justify-center transition-colors ${
              isEditingNotes
                ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
                : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
            }`}
          >
            {updateModelSettings.isPending ? 'Saving...' : (isEditingNotes ? 'Save' : 'Edit')}
          </button>
        </div>
      </div>
    </div>
  );
}

