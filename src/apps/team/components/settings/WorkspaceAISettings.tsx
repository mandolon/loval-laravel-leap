import { useState, useEffect } from 'react';
import { useWorkspaceSettings } from '@/lib/api/hooks/useWorkspaceSettings';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SETTINGS_CONSTANTS } from '../../lib/settings-constants';

const DEFAULT_RESIDENTIAL_INSTRUCTIONS = `You are an AI assistant for a residential architecture firm specializing in preconstruction work through permit-ready documentation.

CORE FOCUS:
- Site analysis and feasibility studies
- Title 24 energy compliance (Part 6 for residential)
- California Building Code and local ordinances
- Permit-ready construction documents
- Cost estimation (per square foot, typical for residential)
- Zoning and setback compliance
- ADU, remodel, and addition expertise

WORKFLOW UNDERSTANDING:
- Pre-Design: Site measurements, feasibility, preliminary costs
- Design: Floor plans, elevations, sections, specifications
- Permit: Code compliance verification, permit set preparation
- Build: Construction administration and RFI coordination

TERMINOLOGY:
Use architectural and construction terminology. Reference code sections specifically. Include typical timelines and consultant requirements. Always mention cost implications and Title 24 considerations.`;

export function WorkspaceAISettings() {
  const { currentWorkspaceId } = useWorkspaces();
  const { data: workspaceSettings, isLoading } = useWorkspaceSettings(currentWorkspaceId || '');
  const [instructions, setInstructions] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (workspaceSettings?.ai_instructions) {
      setInstructions(workspaceSettings.ai_instructions);
    } else if (workspaceSettings && !workspaceSettings.ai_instructions) {
      // First time loading - set default
      setInstructions(DEFAULT_RESIDENTIAL_INSTRUCTIONS);
    }
  }, [workspaceSettings]);

  const handleSave = async () => {
    if (!currentWorkspaceId) return;
    
    setIsSaving(true);
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { error } = await supabase
        .from('workspace_settings')
        .update({ ai_instructions: instructions })
        .eq('workspace_id', currentWorkspaceId);

      if (error) throw error;

      toast({
        title: 'AI Configuration Saved',
        description: 'Your AI assistant instructions have been updated.',
      });
    } catch (error: any) {
      console.error('Error saving AI instructions:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save AI configuration',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setInstructions(DEFAULT_RESIDENTIAL_INSTRUCTIONS);
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 text-[var(--muted)]" data-testid="workspace-ai-settings">
      <h1 className="text-[var(--text)] text-xl font-medium mb-4">AI Assistant Configuration</h1>

      <div
        className="grid gap-8"
        style={{ gridTemplateColumns: SETTINGS_CONSTANTS.CONTENT_COLS }}
        data-testid="ai-settings-2col"
      >
        {/* Left - Description */}
        <div>
          <h2 className="text-[var(--text)] text-base font-medium mb-1">
            Workspace AI Identity
          </h2>
          <p className="text-sm leading-5">
            Define how the AI understands your residential architecture practice. These instructions
            appear in every conversation and help the AI provide relevant, industry-specific guidance.
          </p>
        </div>

        {/* Right - Form */}
        <div className="space-y-4">
          {/* Preset Info Card */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-blue-100 p-2">
                <Sparkles className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-blue-900 mb-1">
                  Residential Architecture Preconstruction
                </h3>
                <p className="text-xs text-blue-800 leading-relaxed">
                  Optimized for site analysis, feasibility studies, Title 24 compliance, 
                  California Building Code, and permit preparation workflow.
                </p>
              </div>
            </div>
          </div>

          {/* Instructions Textarea */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                Custom Instructions
              </label>
              <p className="text-xs text-[var(--muted)] mb-3">
                These instructions define your firm's focus, workflow, and terminology. 
                The AI will use this context in every conversation.
              </p>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={12}
                className="w-full border border-slate-300 rounded-md px-3 py-2 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Enter custom AI instructions..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <button
                onClick={handleReset}
                className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              >
                Reset to Default
              </button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-[#4C75D1] hover:bg-[#4C75D1]/90"
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Instructions
              </Button>
            </div>
          </div>

          {/* Info Note */}
          <div className="text-xs text-[var(--muted)] bg-slate-50 p-3 rounded border border-slate-200">
            <p className="mb-1">
              <strong>💡 Tip:</strong> Be specific about your workflow, typical project types, and local requirements.
            </p>
            <p>
              The AI will use these instructions alongside project-specific context to provide tailored guidance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
