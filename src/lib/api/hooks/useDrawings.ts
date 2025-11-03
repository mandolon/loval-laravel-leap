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
  drawing_pages: DrawingPageMetadata[];
  created_at: string;
  updated_at: string;
}

export interface DrawingPageMetadata {
  id: string;
  short_id: string;
  name: string;
  page_number: number;
  thumbnail_storage_path?: string;
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

// 1. Fetch all drawing versions for a project (METADATA ONLY - no heavy JSONB data)
export function useDrawingVersions(projectId: string) {
  return useQuery({
    queryKey: drawingKeys.list(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drawings')
        .select(`
          id,
          short_id,
          version_number,
          name,
          created_at,
          updated_at,
          drawing_pages (
            id,
            short_id,
            name,
            page_number,
            thumbnail_storage_path,
            deleted_at
          )
        `)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('version_number', { ascending: false });
      
      if (error) throw error;
      
      // Sort pages client-side by page_number and filter out deleted pages
      const sortedData = (data || []).map(drawing => ({
        ...drawing,
        drawing_pages: (drawing.drawing_pages || [])
          .filter((page: any) => !page.deleted_at)
          .sort((a, b) => a.page_number - b.page_number)
      }));
      
      return sortedData as DrawingVersion[];
    },
    staleTime: 30000, // Cache for 30s since this is just metadata
  });
}

// 2. Fetch single page with full data (with retry logic)
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
        .is('deleted_at', null)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!pageId,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff: 1s, 2s, 4s (max 30s)
    staleTime: 5000,
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

// 6. Upload large image to storage (for 60MB architectural plans)
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

// 7. Create new page in a drawing
export function useCreateDrawingPage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      drawingId,
      projectId 
    }: { 
      drawingId: string;
      projectId: string;
    }) => {
      // Get max page number for this drawing
      const { data: existingPages } = await supabase
        .from('drawing_pages')
        .select('page_number')
        .eq('drawing_id', drawingId)
        .order('page_number', { ascending: false })
        .limit(1);
      
      const nextPageNumber = (existingPages && existingPages.length > 0) 
        ? existingPages[0].page_number + 1 
        : 1;
      
      const { data, error } = await supabase
        .from('drawing_pages')
        .insert({
          drawing_id: drawingId,
          page_number: nextPageNumber,
          name: `Page ${nextPageNumber}`,
          excalidraw_data: { elements: [], appState: {}, files: {} },
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: drawingKeys.list(variables.projectId) });
      toast.success('New page created');
    },
    onError: (error: any) => {
      toast.error(`Failed to create page: ${error.message}`);
    },
  });
}

// 8. Delete drawing version (soft delete)
export function useDeleteDrawingVersion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      drawingId,
      projectId 
    }: { 
      drawingId: string;
      projectId: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('drawings')
        .update({ 
          deleted_at: new Date().toISOString(),
          deleted_by: user.id 
        })
        .eq('id', drawingId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: drawingKeys.list(variables.projectId) });
      toast.success('Version moved to trash');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete version: ${error.message}`);
    },
  });
}

// 9. Delete drawing page (soft delete)
export function useDeleteDrawingPage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      pageId,
      projectId 
    }: { 
      pageId: string;
      projectId: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('drawing_pages')
        .update({ 
          deleted_at: new Date().toISOString(),
          deleted_by: user.id 
        })
        .eq('id', pageId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: drawingKeys.list(variables.projectId) });
      toast.success('Page moved to trash');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete page: ${error.message}`);
    },
  });
}
