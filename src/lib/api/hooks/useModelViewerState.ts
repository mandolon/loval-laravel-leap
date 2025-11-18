import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { ModelDimension, ModelAnnotation, ModelClippingPlane, ModelCameraView } from '@/lib/api/types';

// Query keys
export const viewerStateKeys = {
  all: ['model-viewer-state'] as const,
  dimensions: (versionId: string) => [...viewerStateKeys.all, 'dimensions', versionId] as const,
  annotations: (versionId: string) => [...viewerStateKeys.all, 'annotations', versionId] as const,
  clippingPlanes: (versionId: string) => [...viewerStateKeys.all, 'clipping-planes', versionId] as const,
  cameraViews: (versionId: string) => [...viewerStateKeys.all, 'camera-views', versionId] as const,
};

// ============= Dimensions =============

export function useModelDimensions(versionId: string | undefined) {
  return useQuery({
    queryKey: viewerStateKeys.dimensions(versionId || ''),
    queryFn: async (): Promise<ModelDimension[]> => {
      if (!versionId) return [];
      
      const { data, error } = await supabase
        .from('model_dimensions')
        .select('*')
        .eq('version_id', versionId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!versionId,
  });
}

export function useSaveModelDimension() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ versionId, dimensionData, label }: { 
      versionId: string; 
      dimensionData: any; 
      label?: string;
    }) => {
      const { data, error } = await supabase
        .from('model_dimensions')
        .insert({
          version_id: versionId,
          dimension_data: dimensionData,
          label,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: viewerStateKeys.dimensions(variables.versionId) });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to save dimension',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteModelDimension() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, versionId }: { id: string; versionId: string }) => {
      const { error } = await supabase
        .from('model_dimensions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { id, versionId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: viewerStateKeys.dimensions(data.versionId) });
    },
  });
}

// ============= Annotations =============

export function useModelAnnotations(versionId: string | undefined) {
  return useQuery({
    queryKey: viewerStateKeys.annotations(versionId || ''),
    queryFn: async (): Promise<ModelAnnotation[]> => {
      if (!versionId) return [];
      
      const { data, error } = await supabase
        .from('model_annotations')
        .select('*')
        .eq('version_id', versionId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return (data || []) as unknown as ModelAnnotation[];
    },
    enabled: !!versionId,
  });
}

export function useSaveModelAnnotation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ versionId, position, text }: { 
      versionId: string; 
      position: { x: number; y: number; z: number }; 
      text: string;
    }) => {
      const { data, error } = await supabase
        .from('model_annotations')
        .insert({
          version_id: versionId,
          position,
          text,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: viewerStateKeys.annotations(variables.versionId) });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to save annotation',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateModelAnnotation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, versionId, text }: { id: string; versionId: string; text: string }) => {
      const { data, error } = await supabase
        .from('model_annotations')
        .update({ text, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return { data, versionId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: viewerStateKeys.annotations(result.versionId) });
    },
  });
}

export function useDeleteModelAnnotation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, versionId }: { id: string; versionId: string }) => {
      const { error } = await supabase
        .from('model_annotations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { id, versionId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: viewerStateKeys.annotations(data.versionId) });
    },
  });
}

// ============= Clipping Planes =============

export function useModelClippingPlanes(versionId: string | undefined) {
  return useQuery({
    queryKey: viewerStateKeys.clippingPlanes(versionId || ''),
    queryFn: async (): Promise<ModelClippingPlane[]> => {
      if (!versionId) return [];
      
      const { data, error } = await supabase
        .from('model_clipping_planes')
        .select('*')
        .eq('version_id', versionId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return (data || []) as unknown as ModelClippingPlane[];
    },
    enabled: !!versionId,
  });
}

export function useSaveModelClippingPlane() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ versionId, planeData, name }: { 
      versionId: string; 
      planeData: any; 
      name?: string;
    }) => {
      const { data, error } = await supabase
        .from('model_clipping_planes')
        .insert({
          version_id: versionId,
          plane_data: planeData,
          name,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: viewerStateKeys.clippingPlanes(variables.versionId) });
    },
  });
}

export function useDeleteModelClippingPlane() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, versionId }: { id: string; versionId: string }) => {
      const { error } = await supabase
        .from('model_clipping_planes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { id, versionId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: viewerStateKeys.clippingPlanes(data.versionId) });
    },
  });
}

// ============= Camera Views =============

export function useModelCameraViews(versionId: string | undefined) {
  return useQuery({
    queryKey: viewerStateKeys.cameraViews(versionId || ''),
    queryFn: async (): Promise<ModelCameraView[]> => {
      if (!versionId) return [];
      
      const { data, error } = await supabase
        .from('model_camera_views')
        .select('*')
        .eq('version_id', versionId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return (data || []) as unknown as ModelCameraView[];
    },
    enabled: !!versionId,
  });
}

export function useSaveModelCameraView() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ versionId, name, position, target, zoom }: { 
      versionId: string; 
      name: string;
      position: { x: number; y: number; z: number };
      target: { x: number; y: number; z: number };
      zoom: number;
    }) => {
      const { data, error } = await supabase
        .from('model_camera_views')
        .insert({
          version_id: versionId,
          name,
          position,
          target,
          zoom,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: viewerStateKeys.cameraViews(variables.versionId) });
      toast({
        title: 'View saved',
        description: `Camera view "${variables.name}" saved successfully`,
      });
    },
  });
}

export function useDeleteModelCameraView() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, versionId }: { id: string; versionId: string }) => {
      const { error } = await supabase
        .from('model_camera_views')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { id, versionId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: viewerStateKeys.cameraViews(data.versionId) });
    },
  });
}
