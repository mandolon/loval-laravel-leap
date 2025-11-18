import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AIContextPanel } from './ProjectSettings/AIContextPanel';
import { useProject } from '@/lib/api/hooks/useProjects';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { FileText, Scale, Activity } from 'lucide-react';

interface ProjectAIContextViewProps {
  projectId: string;
  workspaceId: string;
}

export function ProjectAIContextView({ projectId, workspaceId }: ProjectAIContextViewProps) {
  const { data: project } = useProject(projectId);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('aiSection') || 'details';

  const handleTabChange = (tab: string) => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      params.set('aiSection', tab);
      return params;
    });
  };

  if (!project) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-white">
        <div className="text-sm text-gray-500">Loading project...</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-white">
      <div className="p-4 md:p-6 lg:p-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)] items-start">
            {/* Left column - Title and description */}
            <div>
              <h1 className="text-slate-900 text-xl font-medium mb-1">AI Project Context</h1>
              <p className="text-[13px] text-slate-600">
                Define your project comprehensively. The AI will use this to make intelligent suggestions about next steps, requirements, and consultants.
              </p>
            </div>
            
            {/* Right column - Form content */}
            <div>
              <AIContextPanel 
                project={project}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                onUpdate={async (aiIdentity) => {
                  const { error } = await supabase
                    .from('projects')
                    .update({ 
                      ai_identity: aiIdentity,
                      project_type: aiIdentity.projectType || null
                    } as any)
                    .eq('id', projectId);
                  
                  if (error) {
                    console.error('Failed to save AI context:', error);
                    toast({
                      title: 'Error',
                      description: error.message || 'Failed to save AI context',
                      variant: 'destructive',
                    });
                  } else {
                    toast({
                      title: 'Saved',
                      description: 'AI context updated successfully',
                    });
                    queryClient.invalidateQueries({ queryKey: ['project', projectId] });
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
