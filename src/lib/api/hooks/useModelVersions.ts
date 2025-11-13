import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Placeholder hooks for 3D model versions - will be fully functional after types regenerate
// These will be fully implemented when integrating the 3D viewer

export function useModelVersions(projectId: string | undefined) {
  return useQuery({
    queryKey: ['model-versions', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('model_versions' as any)
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });
}

export function useModelSettings(versionId: string | undefined) {
  return useQuery({
    queryKey: ['model-settings', versionId],
    queryFn: async () => {
      if (!versionId) return null;
      
      const { data, error } = await supabase
        .from('model_settings' as any)
        .select('*')
        .eq('version_id', versionId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    },
    enabled: !!versionId,
  });
}

export function useUpdateModelSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      versionId, 
      settings 
    }: { 
      versionId: string; 
      settings: any 
    }) => {
      const { data, error } = await supabase
        .from('model_settings' as any)
        .upsert({
          version_id: versionId,
          ...settings,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['model-settings', variables.versionId] });
    },
  });
}

export function useCreateModelVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      versionNumber,
      isCurrent = false,
    }: {
      projectId: string;
      versionNumber: string;
      isCurrent?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('model_versions' as any)
        .insert({
          project_id: projectId,
          version_number: versionNumber,
          is_current: isCurrent,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['model-versions', variables.projectId] });
    },
  });
}

export function useDeleteModelVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (versionId: string) => {
      const { error } = await supabase
        .from('model_versions' as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', versionId);

      if (error) throw error;
    },
    onSuccess: (_, versionId) => {
      queryClient.invalidateQueries({ queryKey: ['model-versions'] });
      queryClient.invalidateQueries({ queryKey: ['model-settings', versionId] });
    },
  });
}
