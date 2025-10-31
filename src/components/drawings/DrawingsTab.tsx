import { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import ExcalidrawCanvas from './ExcalidrawCanvas';
import { useDrawingVersions, useCreateDrawingVersion, useCreateDrawingPage, type DrawingVersion, drawingKeys } from '@/lib/api/hooks/useDrawings';
import { SCALE_PRESETS, getInchesPerSceneUnit, type ScalePreset, type ArrowCounterStats } from '@/utils/excalidraw-measurement-tools';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

interface DrawingsTabProps {
  projectId: string;
  workspaceId: string;
}

export function DrawingsTab({ projectId, workspaceId }: DrawingsTabProps) {
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
  const [excalidrawApi, setExcalidrawApi] = useState<any>(null);
  const [arrowCounterEnabled, setArrowCounterEnabled] = useState(false);
  const [selectedScale, setSelectedScale] = useState<ScalePreset>('1/4" = 1\'');
  const [arrowStats, setArrowStats] = useState<ArrowCounterStats>({ count: 0, values: [] });
  const [contextVersion, setContextVersion] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { data: versions = [], isLoading } = useDrawingVersions(projectId);
  const createVersionMutation = useCreateDrawingVersion(projectId);
  const createPageMutation = useCreateDrawingPage();

  // Real-time subscriptions for drawings
  useEffect(() => {
    if (!projectId) return;

    // Subscribe to drawings changes
    const drawingsChannel = supabase
      .channel(`drawings-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'drawings',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: drawingKeys.list(projectId) });
        }
      )
      .subscribe();

    // Subscribe to drawing_pages changes
    const pagesChannel = supabase
      .channel(`drawing-pages-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'drawing_pages',
        },
        (payload) => {
          // Invalidate specific page if updated
          if (payload.eventType === 'UPDATE' && payload.new.id) {
            queryClient.invalidateQueries({ queryKey: drawingKeys.page(payload.new.id) });
          }
          // Refresh list to show new/deleted pages
          queryClient.invalidateQueries({ queryKey: drawingKeys.list(projectId) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(drawingsChannel);
      supabase.removeChannel(pagesChannel);
    };
  }, [projectId, queryClient]);

  const inchesPerSceneUnit = useMemo(() => {
    if (!arrowCounterEnabled) return null;
    return getInchesPerSceneUnit(SCALE_PRESETS[selectedScale]);
  }, [arrowCounterEnabled, selectedScale]);

  const handleCreateVersion = useCallback(() => {
    console.log('[DrawingsTab] handleCreateVersion called');
    const versionNumber = `v${versions.length + 1}.0`;
    createVersionMutation.mutate(
      { versionNumber, workspaceId },
      {
        onSuccess: (data: any) => {
          console.log('[DrawingsTab] Version created successfully:', data);
          toast.success('New drawing version created');
          // Refresh to get the new version with pages
          // The query will automatically refetch
        },
      }
    );
  }, [versions.length, workspaceId, createVersionMutation]);

  const toggleVersion = useCallback((versionId: string) => {
    setExpandedVersions((prev) => {
      const next = new Set(prev);
      if (next.has(versionId)) {
        next.delete(versionId);
      } else {
        next.add(versionId);
      }
      return next;
    });
  }, []);

  const handleCreatePage = useCallback((versionId: string) => {
    console.log('[DrawingsTab] handleCreatePage called with versionId:', versionId);
    const version = versions.find(v => v.id === versionId);
    const pages = (version as any)?.drawing_pages || [];
    const pageName = `Page ${pages.length + 1}`;
    
    console.log('[DrawingsTab] Creating page:', { versionId, pageName, version });
    
    createPageMutation.mutate({ 
      drawingId: versionId,
      pageName 
    }, {
      onSuccess: () => {
        console.log('[DrawingsTab] Page created successfully');
        // Expand the version to show the new page
        setExpandedVersions(prev => new Set(prev).add(versionId));
      }
    });
  }, [versions, createPageMutation]);

  const selectedPage = useMemo(() => {
    if (!selectedPageId) return null;
    for (const version of versions) {
      const pages = (version as any).drawing_pages;
      if (!pages) continue;
      const page = pages.find((p: any) => p.id === selectedPageId);
      if (page) return { page, version };
    }
    return null;
  }, [selectedPageId, versions]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 dark:text-neutral-400">
        Loading drawings...
      </div>
    );
  }

  console.log('[DrawingsTab] Render:', { 
    versionsCount: versions.length, 
    selectedPageId, 
    contextVersion,
    expandedVersions: Array.from(expandedVersions)
  });

  return (
    <div className="h-full flex">
      {/* Sidebar: Version/Page List */}
      <ContextMenu onOpenChange={(open) => console.log('[DrawingsTab] Context menu open state:', open)}>
        <ContextMenuTrigger 
          asChild
          onContextMenu={(e) => {
            console.log('[DrawingsTab] Context menu triggered on sidebar');
          }}
        >
          <div 
            className="w-64 border-r border-slate-200 dark:border-[#1a2030]/60 flex flex-col bg-white dark:bg-[#0E1118] cursor-context-menu"
            onContextMenu={(e) => {
              console.log('[DrawingsTab] Right-click on sidebar div', e);
            }}
          >
            <div className="p-3 border-b border-slate-200 dark:border-[#1a2030]/60">
              <span className="text-sm font-semibold text-slate-700 dark:text-neutral-300">Whiteboards</span>
            </div>

            <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {versions.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500 dark:text-neutral-400">
                No drawings yet. Create your first drawing to get started.
              </div>
            ) : (
              versions.map((version) => {
                const isExpanded = expandedVersions.has(version.id);
                const pages = (version as any).drawing_pages || [];
                return (
                  <div key={version.id} className="space-y-1">
                    {/* Version Header */}
                    <button
                      onClick={() => toggleVersion(version.id)}
                      onMouseEnter={() => setContextVersion(version.id)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-[#141C28] transition-colors text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-500 dark:text-neutral-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-500 dark:text-neutral-400" />
                      )}
                      <FileText className="h-4 w-4 text-slate-500 dark:text-neutral-400" />
                      <span className="flex-1 text-sm font-medium text-slate-700 dark:text-neutral-300 truncate">
                        {version.name}
                      </span>
                    </button>

                    {/* Pages */}
                    {isExpanded && (
                      <div className="ml-6 space-y-0.5">
                        {pages.length > 0 ? (
                          pages.map((page: any) => (
                            <button
                              key={page.id}
                              onClick={() => setSelectedPageId(page.id)}
                              className={`w-full px-2 py-1.5 rounded-md text-left transition-colors ${
                                selectedPageId === page.id
                                  ? 'bg-[#00639b]/10 dark:bg-[#3b82f6]/20 text-[#00639b] dark:text-blue-300'
                                  : 'hover:bg-slate-100 dark:hover:bg-[#141C28] text-slate-600 dark:text-neutral-400'
                              }`}
                            >
                              <span className="text-sm">{page.name}</span>
                            </button>
                          ))
                        ) : (
                          <div className="px-2 py-1.5 text-xs text-slate-500 dark:text-neutral-500">
                            No pages
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent onInteractOutside={() => console.log('[DrawingsTab] Context menu closed')}>
          <ContextMenuItem 
            onClick={() => {
              console.log('[DrawingsTab] New Drawing Version clicked');
              handleCreateVersion();
            }} 
            disabled={createVersionMutation.isPending}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Drawing Version
          </ContextMenuItem>
          {versions.length > 0 && (
            <ContextMenuItem 
              onClick={() => {
                const targetVersion = contextVersion || versions[0].id;
                console.log('[DrawingsTab] New Page clicked, target version:', targetVersion);
                handleCreatePage(targetVersion);
              }} 
              disabled={createPageMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Page {contextVersion && versions.find(v => v.id === contextVersion) && `(in ${versions.find(v => v.id === contextVersion)?.name})`}
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedPage ? (
          <>
            {/* Toolbar */}
            <div className="h-12 border-b border-slate-200 dark:border-[#1a2030]/60 flex items-center justify-between px-4 bg-white dark:bg-[#0E1118]">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700 dark:text-neutral-300">
                  {selectedPage.version.name} › {selectedPage.page.name}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Arrow Counter Toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={arrowCounterEnabled}
                    onChange={(e) => setArrowCounterEnabled(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-xs text-slate-600 dark:text-neutral-400">
                    Measure Arrows
                  </span>
                </label>

                {/* Scale Selector */}
                {arrowCounterEnabled && (
                  <select
                    value={selectedScale}
                    onChange={(e) => setSelectedScale(e.target.value as ScalePreset)}
                    className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-[#1a2030] bg-white dark:bg-[#141C28] text-slate-700 dark:text-neutral-300"
                  >
                    {Object.keys(SCALE_PRESETS).map((scale) => (
                      <option key={scale} value={scale}>
                        {scale}
                      </option>
                    ))}
                  </select>
                )}

                {/* Stats Display */}
                {arrowCounterEnabled && arrowStats.count > 0 && (
                  <div className="text-xs text-slate-600 dark:text-neutral-400 bg-slate-100 dark:bg-[#141C28] px-3 py-1 rounded">
                    {arrowStats.count} arrow{arrowStats.count !== 1 ? 's' : ''} measured
                  </div>
                )}
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 min-h-0">
              <ExcalidrawCanvas
                key={selectedPage.page.id} // Force remount on page change to prevent stale state
                pageId={selectedPage.page.id}
                projectId={projectId}
                onApiReady={setExcalidrawApi}
                arrowCounterEnabled={arrowCounterEnabled}
                inchesPerSceneUnit={inchesPerSceneUnit}
                onArrowStatsChange={setArrowStats}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-[#0E1118]">
            <Card className="max-w-md">
              <CardContent className="py-12 text-center space-y-4">
                <FileText className="h-12 w-12 mx-auto text-slate-400 dark:text-neutral-500" />
                <div>
                  <p className="text-slate-700 dark:text-neutral-300 font-medium">
                    No drawing selected
                  </p>
                  <p className="text-sm text-slate-500 dark:text-neutral-400 mt-1">
                    {versions.length === 0
                      ? 'Create a new drawing to get started'
                      : 'Select a page from the sidebar to view'}
                  </p>
                </div>
                {versions.length === 0 && (
                  <Button onClick={handleCreateVersion} disabled={createVersionMutation.isPending}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Drawing
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
