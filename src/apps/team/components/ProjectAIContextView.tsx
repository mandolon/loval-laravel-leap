import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { AIContextPanel } from './ProjectSettings/AIContextPanel';
import { useProject } from '@/lib/api/hooks/useProjects';
import { projectKeys } from '@/lib/api/hooks/useProjects';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface ProjectAIContextViewProps {
  projectId: string;
  workspaceId: string;
}

// TwoCol Layout - matching ProjectInfoContent style
function TwoCol({ 
  title, 
  desc, 
  children 
}: { 
  title: string; 
  desc: string; 
  children: React.ReactNode;
}) {
  return (
    <div className="p-4 md:p-6 lg:p-8 text-slate-600">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)] items-start">
          <div>
            <h1 className="text-slate-900 text-xl font-medium mb-1">{title}</h1>
            <p className="text-[13px]">{desc}</p>
          </div>
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}

export function ProjectAIContextView({ projectId, workspaceId }: ProjectAIContextViewProps) {
  const { data: project } = useProject(projectId);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('aiSection') || 'details';

  if (!project) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-white">
        <div className="text-sm text-gray-500">Loading project...</div>
      </div>
    );
  }

  // Determine title and description based on active tab
  const getTabInfo = () => {
    switch (activeTab) {
      case 'regulatory':
        return {
          title: 'Regulatory & compliance',
          desc: 'Zoning requirements, setbacks, height limits, and required compliance standards for this project.'
        };
      case 'status':
        return {
          title: 'Current status',
          desc: 'Track next steps, blockers, and open questions to keep the project moving forward.'
        };
      default:
        return {
          title: 'AI Project Context',
          desc: 'Define your project comprehensively. The AI will use this to make intelligent suggestions about next steps, requirements, and consultants.'
        };
    }
  };

  const tabInfo = getTabInfo();

  return (
    <div className="h-full overflow-auto bg-white">
      <TwoCol title={tabInfo.title} desc={tabInfo.desc}>
        <AIContextPanel 
          project={project}
          activeTab={activeTab}
          onUpdate={async (aiIdentity) => {
            try {
              const { error } = await supabase
                .from('projects')
                .update({ 
                  ai_identity: aiIdentity,
                  project_type: aiIdentity.projectType || null
                } as any)
                .eq('id', projectId);
              
              if (error) throw error;

              // Invalidate the query to refetch the data with correct query key
              await queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });

              toast({
                title: 'Saved',
                description: 'AI context updated successfully',
              });
            } catch (error: any) {
              console.error('Failed to save AI context:', error);
              toast({
                title: 'Error',
                description: error.message || 'Failed to save AI context',
                variant: 'destructive',
              });
            }
          }}
        />
      </TwoCol>
    </div>
  );
}
