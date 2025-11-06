import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DetailLibraryCategory, DetailLibrarySubfolder, DetailLibraryFile, DetailLibraryItem, DetailColorTag } from '../types';
import { toast } from 'sonner';

// Query Keys
const detailLibraryKeys = {
  all: ['detail-library'] as const,
  categories: () => [...detailLibraryKeys.all, 'categories'] as const,
  subfolders: (categoryId?: string) => 
    [...detailLibraryKeys.all, 'subfolders', categoryId] as const,
  files: (categoryId?: string, subfolderId?: string) => 
    [...detailLibraryKeys.all, 'files', categoryId, subfolderId] as const,
  items: (parentFileId: string) => [...detailLibraryKeys.all, 'items', parentFileId] as const,
};

// Fetch categories
export function useDetailLibraryCategories() {
  return useQuery({
    queryKey: detailLibraryKeys.categories(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('detail_library_categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      
      return (data || []).map(cat => ({
        id: cat.id,
        shortId: cat.short_id,
        name: cat.name,
        slug: cat.slug,
        isSystemCategory: cat.is_system_category,
        sortOrder: cat.sort_order,
        createdAt: cat.created_at,
        updatedAt: cat.updated_at,
      })) as DetailLibraryCategory[];
    },
  });
}

// Fetch subfolders by category
export function useDetailLibrarySubfolders(categoryId?: string) {
  return useQuery({
    queryKey: detailLibraryKeys.subfolders(categoryId),
    queryFn: async () => {
      let query = supabase
        .from('detail_library_subfolders')
        .select('*');

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query.order('sort_order', { ascending: true });

      if (error) throw error;
      
      return (data || []).map(subfolder => ({
        id: subfolder.id,
        shortId: subfolder.short_id,
        categoryId: subfolder.category_id,
        name: subfolder.name,
        sortOrder: subfolder.sort_order,
        createdBy: subfolder.created_by,
        createdAt: subfolder.created_at,
        updatedAt: subfolder.updated_at,
      })) as DetailLibrarySubfolder[];
    },
  });
}

// Fetch files by category and/or subfolder
export function useDetailLibraryFiles(categoryId?: string, subfolderId?: string) {
  return useQuery({
    queryKey: detailLibraryKeys.files(categoryId, subfolderId),
    queryFn: async () => {
      let query = supabase
        .from('detail_library_files')
        .select('*')
        .is('deleted_at', null);

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      if (subfolderId) {
        query = query.eq('subfolder_id', subfolderId);
      } else if (subfolderId === null) {
        // Explicitly filter for root files (no subfolder)
        query = query.is('subfolder_id', null);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(file => ({
        id: file.id,
        shortId: file.short_id,
        categoryId: file.category_id,
        subfolderId: file.subfolder_id,
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
export function useUploadDetailFile(categoryId: string, subfolderId?: string) {
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
      const storagePath = `${category.slug}/${fileId}/${firstFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from('detail-library')
        .upload(storagePath, firstFile);

      if (uploadError) throw uploadError;

      // Create parent file record
      const { data: fileRecord, error: fileError } = await supabase
        .from('detail_library_files')
        .insert([{
          category_id: categoryId,
          subfolder_id: subfolderId || null,
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
          const itemStoragePath = `${category.slug}/${fileId}/${file.name}`;

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
      queryClient.invalidateQueries({ queryKey: detailLibraryKeys.all });
      toast.success('File(s) uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });
}

// Create detail card (placeholder file)
export function useCreateDetailCard(categoryId: string, subfolderId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      title,
      colorTag,
      description,
      authorName,
    }: {
      title: string;
      colorTag: DetailColorTag;
      description?: string;
      authorName?: string;
    }) => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('detail_library_files')
        .insert([{
          category_id: categoryId,
          subfolder_id: subfolderId || null,
          title,
          filename: `${title.toLowerCase().replace(/\s+/g, '-')}.placeholder`,
          filesize: 0,
          mimetype: 'application/octet-stream',
          storage_path: '',
          color_tag: colorTag,
          description,
          author_name: authorName,
          uploaded_by: user.id,
          short_id: '',
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: detailLibraryKeys.all });
      toast.success('Card created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create card: ${error.message}`);
    },
  });
}

// Upload detail item to existing card
export function useUploadDetailItem(parentFileId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      parentFileId: pid,
      file,
      title,
    }: {
      parentFileId: string;
      file: File;
      title: string;
    }) => {
      const actualParentId = pid || parentFileId;
      if (!actualParentId) throw new Error('Parent file ID required');

      const { data: parentFile } = await supabase
        .from('detail_library_files')
        .select('category_id')
        .eq('id', actualParentId)
        .single();

      if (!parentFile) throw new Error('Parent file not found');

      const { data: category } = await supabase
        .from('detail_library_categories')
        .select('slug')
        .eq('id', parentFile.category_id)
        .single();

      if (!category) throw new Error('Category not found');

      const storagePath = `${category.slug}/${actualParentId}/${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('detail-library')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      const { data: existingItems } = await supabase
        .from('detail_library_items')
        .select('sort_order')
        .eq('parent_file_id', actualParentId)
        .order('sort_order', { ascending: false })
        .limit(1);

      const nextSortOrder = (existingItems?.[0]?.sort_order || 0) + 1;

      const { data, error } = await supabase
        .from('detail_library_items')
        .insert([{
          parent_file_id: actualParentId,
          title,
          filename: file.name,
          filesize: file.size,
          mimetype: file.type,
          storage_path: storagePath,
          sort_order: nextSortOrder,
          short_id: '',
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: detailLibraryKeys.all });
      toast.success('Detail uploaded successfully');
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
      subfolderId,
    }: {
      fileId: string;
      title?: string;
      description?: string;
      authorName?: string;
      subfolderId?: string | null;
    }) => {
      const updates: any = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (authorName !== undefined) updates.author_name = authorName;
      if (subfolderId !== undefined) updates.subfolder_id = subfolderId;

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

// Hard delete file (permanently delete from storage and database)
export function useHardDeleteDetailFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fileId }: { fileId: string }) => {
      // First get the file to know its storage path
      const { data: file, error: fetchError } = await supabase
        .from('detail_library_files')
        .select('storage_path')
        .eq('id', fileId)
        .single();

      if (fetchError) throw fetchError;

      // Delete from storage if file exists
      if (file.storage_path && file.storage_path.trim() !== '') {
        const { error: storageError } = await supabase.storage
          .from('detail-library')
          .remove([file.storage_path]);

        if (storageError) throw storageError;
      }

      // Hard delete from database
      const { error: deleteError } = await supabase
        .from('detail_library_files')
        .delete()
        .eq('id', fileId);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: detailLibraryKeys.all });
      toast.success('File permanently deleted');
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

// Create subfolder
export function useCreateDetailLibrarySubfolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      categoryId,
      name,
    }: {
      categoryId: string;
      name: string;
    }) => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('detail_library_subfolders')
        .insert([{
          category_id: categoryId,
          name,
          created_by: user.id,
          short_id: '',
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: detailLibraryKeys.all });
      toast.success('Subfolder created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create subfolder: ${error.message}`);
    },
  });
}

// Update subfolder
export function useUpdateDetailLibrarySubfolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      subfolderId,
      name,
    }: {
      subfolderId: string;
      name: string;
    }) => {
      const { data, error } = await supabase
        .from('detail_library_subfolders')
        .update({ name })
        .eq('id', subfolderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: detailLibraryKeys.all });
      toast.success('Subfolder renamed successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to rename subfolder: ${error.message}`);
    },
  });
}

// Delete subfolder
export function useDeleteDetailLibrarySubfolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ subfolderId }: { subfolderId: string }) => {
      // Check if subfolder has files
      const { data: files } = await supabase
        .from('detail_library_files')
        .select('id')
        .eq('subfolder_id', subfolderId)
        .is('deleted_at', null);

      if (files && files.length > 0) {
        throw new Error('Cannot delete subfolder with files. Please move or delete files first.');
      }

      const { error } = await supabase
        .from('detail_library_subfolders')
        .delete()
        .eq('id', subfolderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: detailLibraryKeys.all });
      toast.success('Subfolder deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete subfolder: ${error.message}`);
    },
  });
}