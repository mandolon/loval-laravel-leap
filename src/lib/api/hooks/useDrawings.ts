import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Query keys
export const drawingKeys = {
  all: ['drawings'] as const,
  lists: () => [...drawingKeys.all, 'list'] as const,
  list: (projectId: string) => [...drawingKeys.lists(), { projectId }] as const,
  details: () => [...drawingKeys.all, 'detail'] as const,
  detail: (drawingId: string) => [...drawingKeys.details(), drawingId] as const,
  page: (pageId: string) => [...drawingKeys.all, 'page', pageId] as const,
};

// Interfaces
export interface DrawingVersion {
  id: string;
  short_id: string;
  version_number: string;
  name: string;
  drawing_pages: DrawingPage[];
  created_at: string;
  updated_at: string;
}

export interface DrawingPage {
  id: string;
  short_id: string;
  name: string;
  page_number: number;
  excalidraw_data: any;
  thumbnail_storage_path?: string;
  background_image_path?: string;
  drawing_scales?: DrawingScale[];
}

export interface DrawingScale {
  id: string;
  scale_name: string;
  inches_per_scene_unit: number;
  is_active: boolean;
}

// 1. Fetch all drawing versions for a project
export function useDrawingVersions(projectId: string) {
  return useQuery({
    queryKey: drawingKeys.list(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drawings')
        .select(`
          *,
          drawing_pages (
            *,
            drawing_scales (*)
          )
        `)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('version_number', { ascending: false });
      
      if (error) throw error;
      return (data || []) as DrawingVersion[];
    },
  });
}

// 2. Fetch single page with full data
export function useDrawingPage(pageId: string) {
  return useQuery({
    queryKey: drawingKeys.page(pageId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drawing_pages')
        .select(`
          *,
          drawing_scales (*),
          drawings (*)
        `)
        .eq('id', pageId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!pageId,
  });
}

// 3. Create new drawing version (with first blank page)
export function useCreateDrawingVersion(projectId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      versionNumber, 
      workspaceId 
    }: { 
      versionNumber: string; 
      workspaceId: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      // Create drawing version
      const { data: drawing, error: drawingError } = await supabase
        .from('drawings')
        .insert({
          project_id: projectId,
          workspace_id: workspaceId,
          name: `Drawing ${versionNumber}`,
          version_number: versionNumber,
          created_by: user.id,
        })
        .select()
        .single();
      
      if (drawingError) throw drawingError;
      
      // Create first page
      const { error: pageError } = await supabase
        .from('drawing_pages')
        .insert({
          drawing_id: drawing.id,
          page_number: 1,
          name: 'Page 1',
          excalidraw_data: { elements: [], appState: {}, files: {} },
        });
      
      if (pageError) throw pageError;
      
      return drawing;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: drawingKeys.list(projectId) });
      toast.success('Version created');
    },
    onError: (error: any) => {
      toast.error(`Failed to create version: ${error.message}`);
    },
  });
}

// 4. Update drawing page data (auto-save)
export function useUpdateDrawingPage() {
  return useMutation({
    mutationFn: async ({ 
      pageId, 
      excalidrawData 
    }: { 
      pageId: string; 
      excalidrawData: any;
    }) => {
      // Validate size (max 10MB for JSONB)
      const dataSize = JSON.stringify(excalidrawData).length;
      if (dataSize > 10_000_000) {
        throw new Error('Drawing data too large. Consider extracting images to storage.');
      }
      
      const { error } = await supabase
        .from('drawing_pages')
        .update({ 
          excalidraw_data: excalidrawData,
          updated_at: new Date().toISOString()
        })
        .eq('id', pageId);
      
      if (error) throw error;
    },
    // Silent auto-save (no toast on success)
    onError: (error: any) => {
      console.error('Auto-save failed:', error);
      toast.error(`Failed to save: ${error.message}`);
    },
  });
}

// 5. Update scale for a page
export function useUpdateDrawingScale() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      pageId, 
      scaleName, 
      inchesPerSceneUnit 
    }: { 
      pageId: string; 
      scaleName: string;
      inchesPerSceneUnit: number;
    }) => {
      // Deactivate all existing scales
      await supabase
        .from('drawing_scales')
        .update({ is_active: false })
        .eq('drawing_page_id', pageId);
      
      // Create new active scale
      const { error } = await supabase
        .from('drawing_scales')
        .insert({
          drawing_page_id: pageId,
          scale_name: scaleName,
          inches_per_scene_unit: inchesPerSceneUnit,
          is_active: true,
        });
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: drawingKeys.page(variables.pageId) });
      toast.success('Scale updated');
    },
  });
}

// 6. Upload image to storage for Excalidraw (prevents compression)
export async function uploadDrawingImage(
  file: File, 
  projectId: string, 
  drawingId: string
): Promise<string> {
  // Validate file is an image
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  // Limit to reasonable size (20MB)
  const MAX_SIZE = 20 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error('Image must be less than 20MB');
  }

  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `${projectId}/${drawingId}/${timestamp}_${sanitizedName}`;
  
  const { error } = await supabase.storage
    .from('drawing-images')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type
    });

  if (error) {
    console.error('Image upload error:', error);
    throw new Error('Failed to upload image');
  }

  // Get signed URL valid for 1 year
  const { data: urlData } = await supabase.storage
    .from('drawing-images')
    .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

  if (!urlData) {
    throw new Error('Failed to get image URL');
  }

  return urlData.signedUrl;
}

// 7. Upload large background image (for 60MB architectural plans)
export async function uploadLargeImage(
  file: File, 
  projectId: string, 
  drawingId: string
): Promise<string> {
  const MAX_SIZE = 60 * 1024 * 1024; // 60MB
  
  if (file.size > MAX_SIZE) {
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
    throw new Error(`File too large. Maximum: 60MB, Your file: ${fileSizeMB}MB`);
  }
  
  const path = `${projectId}/drawings/${drawingId}/images/${Date.now()}-${file.name}`;
  
  const { error: uploadError } = await supabase.storage
    .from('drawing-images')
    .upload(path, file);
  
  if (uploadError) throw uploadError;
  
  // Get signed URL (24 hours)
  const { data: urlData, error: urlError } = await supabase.storage
    .from('drawing-images')
    .createSignedUrl(path, 86400);
  
  if (urlError) throw urlError;
  
  return urlData.signedUrl;
}
