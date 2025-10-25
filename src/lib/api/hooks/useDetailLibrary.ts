import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DetailLibraryCategory, DetailLibraryFile, DetailLibraryItem, DetailColorTag } from '../types';
import { toast } from 'sonner';

// Query Keys
const detailLibraryKeys = {
  all: ['detail-library'] as const,
  categories: (workspaceId: string) => [...detailLibraryKeys.all, 'categories', workspaceId] as const,
  files: (workspaceId: string, categoryId?: string) => 
    [...detailLibraryKeys.all, 'files', workspaceId, categoryId] as const,
  items: (parentFileId: string) => [...detailLibraryKeys.all, 'items', parentFileId] as const,
};

// Fetch categories
export function useDetailLibraryCategories(workspaceId: string) {
  return useQuery({
    queryKey: detailLibraryKeys.categories(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('detail_library_categories')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      
      return (data || []).map(cat => ({
        id: cat.id,
        shortId: cat.short_id,
        workspaceId: cat.workspace_id,
        name: cat.name,
        slug: cat.slug,
        isSystemCategory: cat.is_system_category,
        sortOrder: cat.sort_order,
        createdAt: cat.created_at,
        updatedAt: cat.updated_at,
      })) as DetailLibraryCategory[];
    },
    enabled: !!workspaceId,
  });
}

// Fetch files by category
export function useDetailLibraryFiles(workspaceId: string, categoryId?: string) {
  return useQuery({
    queryKey: detailLibraryKeys.files(workspaceId, categoryId),
    queryFn: async () => {
      let query = supabase
        .from('detail_library_files')
        .select('*')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null);

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(file => ({
        id: file.id,
        shortId: file.short_id,
        workspaceId: file.workspace_id,
        categoryId: file.category_id,
        title: file.title,
        filename: file.filename,
        filesize: file.filesize,
        mimetype: file.mimetype,
        storagePath: file.storage_path,
        colorTag: file.color_tag as DetailColorTag,
        description: file.description,
        authorName: file.author_name,
        uploadedBy: file.uploaded_by,
        createdAt: file.created_at,
        updatedAt: file.updated_at,
        deletedAt: file.deleted_at,
      })) as DetailLibraryFile[];
    },
    enabled: !!workspaceId,
  });
}

// Fetch items for a parent file
export function useDetailLibraryItems(parentFileId?: string) {
  return useQuery({
    queryKey: detailLibraryKeys.items(parentFileId || ''),
    queryFn: async () => {
      if (!parentFileId) return [];

      const { data, error } = await supabase
        .from('detail_library_items')
        .select('*')
        .eq('parent_file_id', parentFileId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      
      return (data || []).map(item => ({
        id: item.id,
        shortId: item.short_id,
        parentFileId: item.parent_file_id,
        title: item.title,
        filename: item.filename,
        filesize: item.filesize,
        mimetype: item.mimetype,
        storagePath: item.storage_path,
        sortOrder: item.sort_order,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      })) as DetailLibraryItem[];
    },
    enabled: !!parentFileId,
  });
}

// Upload detail file
export function useUploadDetailFile(workspaceId: string, categoryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      files,
      title,
      colorTag,
      description,
      authorName,
    }: {
      files: File[];
      title: string;
      colorTag: DetailColorTag;
      description?: string;
      authorName?: string;
    }) => {
      if (files.length === 0) throw new Error('No files provided');

      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      // Get category slug for storage path
      const { data: category } = await supabase
        .from('detail_library_categories')
        .select('slug')
        .eq('id', categoryId)
        .single();
      
      if (!category) throw new Error('Category not found');

      // Upload first file and create parent record
      const firstFile = files[0];
      const fileId = crypto.randomUUID();
      const storagePath = `${workspaceId}/${category.slug}/${fileId}/${firstFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from('detail-library')
        .upload(storagePath, firstFile);

      if (uploadError) throw uploadError;

      // Create parent file record
      const { data: fileRecord, error: fileError } = await supabase
        .from('detail_library_files')
        .insert([{
          workspace_id: workspaceId,
          category_id: categoryId,
          title,
          filename: firstFile.name,
          filesize: firstFile.size,
          mimetype: firstFile.type,
          storage_path: storagePath,
          color_tag: colorTag,
          description,
          author_name: authorName,
          uploaded_by: user.id,
          short_id: '',
        }])
        .select()
        .single();

      if (fileError) throw fileError;

      // Upload additional files as items
      if (files.length > 1) {
        const itemPromises = files.slice(1).map(async (file, index) => {
          const itemStoragePath = `${workspaceId}/${category.slug}/${fileId}/${file.name}`;

          const { error: itemUploadError } = await supabase.storage
            .from('detail-library')
            .upload(itemStoragePath, file);

          if (itemUploadError) throw itemUploadError;

          return supabase
            .from('detail_library_items')
            .insert([{
              parent_file_id: fileId,
              title: `Detail ${(index + 2).toString().padStart(2, '0')}`,
              filename: file.name,
              filesize: file.size,
              mimetype: file.type,
              storage_path: itemStoragePath,
              sort_order: index + 1,
              short_id: '',
            }]);
        });

        await Promise.all(itemPromises);
      }

      return fileRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: detailLibraryKeys.files(workspaceId, categoryId) });
      toast.success('File(s) uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });
}

// Update file metadata
export function useUpdateDetailFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fileId,
      title,
      description,
      authorName,
    }: {
      fileId: string;
      title?: string;
      description?: string;
      authorName?: string;
    }) => {
      const updates: any = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (authorName !== undefined) updates.author_name = authorName;

      const { data, error } = await supabase
        .from('detail_library_files')
        .update(updates)
        .eq('id', fileId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: detailLibraryKeys.all });
      toast.success('File updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });
}

// Update file color
export function useUpdateDetailFileColor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fileId, colorTag }: { fileId: string; colorTag: DetailColorTag }) => {
      const { data, error } = await supabase
        .from('detail_library_files')
        .update({ color_tag: colorTag })
        .eq('id', fileId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: detailLibraryKeys.all });
    },
    onError: (error: Error) => {
      toast.error(`Color update failed: ${error.message}`);
    },
  });
}

// Delete detail item
export function useDeleteDetailItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId }: { itemId: string }) => {
      // First get the item to know its storage path and parent
      const { data: item, error: fetchError } = await supabase
        .from('detail_library_items')
        .select('*')
        .eq('id', itemId)
        .single();

      if (fetchError) throw fetchError;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('detail-library')
        .remove([item.storage_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: deleteError } = await supabase
        .from('detail_library_items')
        .delete()
        .eq('id', itemId);

      if (deleteError) throw deleteError;

      return item.parent_file_id;
    },
    onSuccess: (parentFileId) => {
      queryClient.invalidateQueries({ queryKey: detailLibraryKeys.items(parentFileId) });
      toast.success('Detail deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });
}

// Soft delete file
export function useDeleteDetailFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fileId }: { fileId: string }) => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('detail_library_files')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user.id,
        })
        .eq('id', fileId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: detailLibraryKeys.all });
      toast.success('File deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });
}
