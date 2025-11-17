import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type TrashItemType = 'project' | 'ai_chat_thread' | 'task' | 'file' | 'folder' | 'note' | 'link' | 'drawing' | 'drawing_page' | 'model_version';

export type TrashItem = {
  id: string;
  short_id: string;
  name: string;
  type: TrashItemType;
  typeLabel: string;
  location: string;
  projectName: string;
  deleted_at: string;
  deleted_by_name: string;
  status?: string;
  project_id?: string;
};

const getTableName = (type: TrashItemType): string => {
  const tableMap: Record<TrashItemType, string> = {
    project: 'projects',
    ai_chat_thread: 'ai_chat_threads',
    task: 'tasks',
    file: 'files',
    folder: 'folders',
    note: 'notes',
    link: 'links',
    drawing: 'drawings',
    drawing_page: 'drawing_pages',
    model_version: 'model_versions',
  };
  return tableMap[type];
};

const getTypeLabel = (type: TrashItemType): string => {
  const labelMap: Record<TrashItemType, string> = {
    project: 'Project',
    ai_chat_thread: 'Chat',
    task: 'Task',
    file: 'File',
    folder: 'Folder',
    note: 'Note',
    link: 'Link',
    drawing: 'Drawing',
    drawing_page: 'Drawing Page',
    model_version: '3D Model',
  };
  return labelMap[type];
};

const getLocation = (type: TrashItemType): string => {
  const locationMap: Record<TrashItemType, string> = {
    project: 'Projects',
    ai_chat_thread: 'AI',
    task: 'Tasks',
    file: 'Projects',
    folder: 'Projects',
    note: 'Projects',
    link: 'Projects',
    drawing: 'Projects',
    drawing_page: 'Projects',
    model_version: 'Projects',
  };
  return locationMap[type];
};

export const useTrashItems = (workspaceId: string | undefined) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['trash-items', workspaceId],
    queryFn: async (): Promise<TrashItem[]> => {
      if (!workspaceId) return [];

      const items: TrashItem[] = [];
      const allDeletedByIds = new Set<string>();

      // Fetch ALL projects in workspace (both deleted and active) for filtering
      const { data: allProjects } = await supabase
        .from('projects')
        .select('id, short_id, name, status, deleted_at, deleted_by')
        .eq('workspace_id', workspaceId)
        .order('deleted_at', { ascending: false });

      // Separate deleted projects for display vs all project IDs for filtering
      const deletedProjects = allProjects?.filter(p => p.deleted_at !== null) || [];
      const workspaceProjectIds = allProjects?.map(p => p.id) || [];

      if (deletedProjects.length > 0) {
        deletedProjects.forEach(p => {
          if (p.deleted_by) allDeletedByIds.add(p.deleted_by);
          items.push({
            id: p.id,
            short_id: p.short_id,
            name: p.name,
            type: 'project' as const,
            typeLabel: getTypeLabel('project'),
            location: getLocation('project'),
            projectName: '—',
            deleted_at: p.deleted_at!,
            deleted_by_name: '', // Will be filled later
            status: p.status,
          });
        });
      }

      // Fetch deleted AI chat threads
      const { data: threads } = await supabase
        .from('ai_chat_threads')
        .select('id, short_id, title, deleted_at, deleted_by')
        .eq('workspace_id', workspaceId)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (threads) {
        threads.forEach(t => {
          if (t.deleted_by) allDeletedByIds.add(t.deleted_by);
          items.push({
            id: t.id,
            short_id: t.short_id,
            name: t.title,
            type: 'ai_chat_thread' as const,
            typeLabel: getTypeLabel('ai_chat_thread'),
            location: getLocation('ai_chat_thread'),
            projectName: '—',
            deleted_at: t.deleted_at!,
            deleted_by_name: '', // Will be filled later
          });
        });
      }

      // Fetch deleted tasks (with project names)
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, short_id, title, project_id, deleted_at, deleted_by, projects(name)')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (tasks) {
        const filteredTasks = tasks.filter(t => workspaceProjectIds.includes(t.project_id));
        filteredTasks.forEach(t => {
          if (t.deleted_by) allDeletedByIds.add(t.deleted_by);
          items.push({
            id: t.id,
            short_id: t.short_id,
            name: t.title,
            type: 'task' as const,
            typeLabel: getTypeLabel('task'),
            location: getLocation('task'),
            projectName: (t.projects as any)?.name || '—',
            deleted_at: t.deleted_at!,
            deleted_by_name: '', // Will be filled later
            project_id: t.project_id,
          });
        });
      }

      // Fetch deleted files
      const { data: files } = await supabase
        .from('files')
        .select('id, short_id, filename, project_id, deleted_at, deleted_by, projects(name)')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (files) {
        const filteredFiles = files.filter(f => workspaceProjectIds.includes(f.project_id));
        filteredFiles.forEach(f => {
          if (f.deleted_by) allDeletedByIds.add(f.deleted_by);
          items.push({
            id: f.id,
            short_id: f.short_id,
            name: f.filename,
            type: 'file' as const,
            typeLabel: getTypeLabel('file'),
            location: getLocation('file'),
            projectName: (f.projects as any)?.name || '—',
            deleted_at: f.deleted_at!,
            deleted_by_name: '', // Will be filled later
            project_id: f.project_id,
          });
        });
      }

      // Fetch deleted folders
      const { data: folders } = await supabase
        .from('folders')
        .select('id, short_id, name, project_id, deleted_at, deleted_by, projects(name)')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (folders) {
        const filteredFolders = folders.filter(f => workspaceProjectIds.includes(f.project_id));
        filteredFolders.forEach(f => {
          if (f.deleted_by) allDeletedByIds.add(f.deleted_by);
          items.push({
            id: f.id,
            short_id: f.short_id,
            name: f.name,
            type: 'folder' as const,
            typeLabel: getTypeLabel('folder'),
            location: getLocation('folder'),
            projectName: (f.projects as any)?.name || '—',
            deleted_at: f.deleted_at!,
            deleted_by_name: '', // Will be filled later
            project_id: f.project_id,
          });
        });
      }

      // Fetch deleted notes
      const { data: notes } = await supabase
        .from('notes')
        .select('id, short_id, title, project_id, deleted_at, deleted_by, projects(name)')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (notes) {
        const filteredNotes = notes.filter(n => workspaceProjectIds.includes(n.project_id));
        filteredNotes.forEach(n => {
          if (n.deleted_by) allDeletedByIds.add(n.deleted_by);
          items.push({
            id: n.id,
            short_id: n.short_id,
            name: n.title,
            type: 'note' as const,
            typeLabel: getTypeLabel('note'),
            location: getLocation('note'),
            projectName: (n.projects as any)?.name || '—',
            deleted_at: n.deleted_at!,
            deleted_by_name: '', // Will be filled later
            project_id: n.project_id,
          });
        });
      }

      // Fetch deleted links
      const { data: links } = await supabase
        .from('links')
        .select('id, short_id, title, project_id, deleted_at, deleted_by, projects(name)')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (links) {
        const filteredLinks = links.filter(l => workspaceProjectIds.includes(l.project_id));
        filteredLinks.forEach(l => {
          if (l.deleted_by) allDeletedByIds.add(l.deleted_by);
          items.push({
            id: l.id,
            short_id: l.short_id,
            name: l.title,
            type: 'link' as const,
            typeLabel: getTypeLabel('link'),
            location: getLocation('link'),
            projectName: (l.projects as any)?.name || '—',
            deleted_at: l.deleted_at!,
            deleted_by_name: '', // Will be filled later
            project_id: l.project_id,
          });
        });
      }

      // Fetch deleted drawings
      const { data: drawings } = await supabase
        .from('drawings')
        .select('id, short_id, name, project_id, deleted_at, deleted_by, projects(name)')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (drawings) {
        const filteredDrawings = drawings.filter(d => workspaceProjectIds.includes(d.project_id));
        filteredDrawings.forEach(d => {
          if (d.deleted_by) allDeletedByIds.add(d.deleted_by);
          items.push({
            id: d.id,
            short_id: d.short_id,
            name: d.name,
            type: 'drawing' as const,
            typeLabel: getTypeLabel('drawing'),
            location: getLocation('drawing'),
            projectName: (d.projects as any)?.name || '—',
            deleted_at: d.deleted_at!,
            deleted_by_name: '', // Will be filled later
            project_id: d.project_id,
          });
        });
      }

      // Fetch deleted drawing pages
      const { data: drawingPages } = await supabase
        .from('drawing_pages')
        .select('id, short_id, name, drawing_id, deleted_at, deleted_by, drawings(name, project_id, projects(name))')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (drawingPages) {
        const filteredPages = drawingPages.filter(dp => {
          const projectId = (dp.drawings as any)?.project_id;
          return projectId && workspaceProjectIds.includes(projectId);
        });
        filteredPages.forEach(dp => {
          if (dp.deleted_by) allDeletedByIds.add(dp.deleted_by);
          items.push({
            id: dp.id,
            short_id: dp.short_id,
            name: dp.name,
            type: 'drawing_page' as const,
            typeLabel: getTypeLabel('drawing_page'),
            location: getLocation('drawing_page'),
            projectName: (dp.drawings as any)?.projects?.name || '—',
            deleted_at: dp.deleted_at!,
            deleted_by_name: '', // Will be filled later
            project_id: (dp.drawings as any)?.project_id,
          });
        });
      }

      // Fetch deleted model versions
      const { data: modelVersions } = await supabase
        .from('model_versions')
        .select('id, short_id, version_number, project_id, deleted_at, deleted_by, projects(name)')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (modelVersions) {
        const filteredVersions = modelVersions.filter(mv => workspaceProjectIds.includes(mv.project_id));
        filteredVersions.forEach(mv => {
          if (mv.deleted_by) allDeletedByIds.add(mv.deleted_by);
          items.push({
            id: mv.id,
            short_id: mv.short_id,
            name: mv.version_number,
            type: 'model_version' as const,
            typeLabel: getTypeLabel('model_version'),
            location: getLocation('model_version'),
            projectName: (mv.projects as any)?.name || '—',
            deleted_at: mv.deleted_at!,
            deleted_by_name: '', // Will be filled later
            project_id: mv.project_id,
          });
        });
      }

      // Fetch all deleted_by users in one query
      const userNamesMap: Record<string, string> = {};
      if (allDeletedByIds.size > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, name')
          .in('id', Array.from(allDeletedByIds));

        if (users) {
          users.forEach(u => {
            if (u.id && u.name) {
              userNamesMap[u.id] = u.name;
            }
          });
        }
      }

      // Map user names to items
      items.forEach(item => {
        const projectData = deletedProjects.find(p => p.id === item.id);
        const threadData = threads?.find(t => t.id === item.id);
        const taskData = tasks?.find(t => t.id === item.id);
        const fileData = files?.find(f => f.id === item.id);
        const folderData = folders?.find(f => f.id === item.id);
        const noteData = notes?.find(n => n.id === item.id);
        const linkData = links?.find(l => l.id === item.id);
        const drawingData = drawings?.find(d => d.id === item.id);
        const pageData = drawingPages?.find(dp => dp.id === item.id);
        const versionData = modelVersions?.find(mv => mv.id === item.id);

        const deleted_by = 
          projectData?.deleted_by || 
          threadData?.deleted_by || 
          taskData?.deleted_by || 
          fileData?.deleted_by || 
          folderData?.deleted_by || 
          noteData?.deleted_by || 
          linkData?.deleted_by || 
          drawingData?.deleted_by || 
          pageData?.deleted_by || 
          versionData?.deleted_by;

        item.deleted_by_name = deleted_by ? (userNamesMap[deleted_by] || 'Unknown') : 'Unknown';
      });

      // Sort all items by deleted_at descending
      items.sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());

      return items;
    },
    enabled: !!workspaceId,
  });

  const restoreMutation = useMutation({
    mutationFn: async (item: TrashItem) => {
      const tableName = getTableName(item.type);
      const { error } = await supabase
        .from(tableName as any)
        .update({ deleted_at: null, deleted_by: null })
        .eq('id', item.id);

      if (error) throw error;
    },
    onSuccess: (_, item) => {
      queryClient.invalidateQueries({ queryKey: ['trash-items', workspaceId] });
      toast({
        title: 'Item restored',
        description: `"${item.name}" has been restored successfully.`,
      });
    },
    onError: (_, item) => {
      toast({
        title: 'Restore failed',
        description: `Failed to restore "${item.name}". Please try again.`,
        variant: 'destructive',
      });
    },
  });

  const deleteForeverMutation = useMutation({
    mutationFn: async (item: TrashItem) => {
      const tableName = getTableName(item.type);
      const { error } = await supabase
        .from(tableName as any)
        .delete()
        .eq('id', item.id);

      if (error) throw error;
    },
    onSuccess: (_, item) => {
      queryClient.invalidateQueries({ queryKey: ['trash-items', workspaceId] });
      toast({
        title: 'Item deleted permanently',
        description: `"${item.name}" has been permanently deleted.`,
      });
    },
    onError: (_, item) => {
      toast({
        title: 'Delete failed',
        description: `Failed to delete "${item.name}". Please try again.`,
        variant: 'destructive',
      });
    },
  });

  return {
    items: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    restore: restoreMutation.mutate,
    deleteForever: deleteForeverMutation.mutate,
    isRestoring: restoreMutation.isPending,
    isDeleting: deleteForeverMutation.isPending,
  };
};
