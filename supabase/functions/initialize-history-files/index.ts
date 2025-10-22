import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { appendTaskHistory, appendChatHistory } from '../_shared/historyHelpers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[initialize-history-files] Starting initialization...');
    
    // Get all projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, workspace_id')
      .is('deleted_at', null);

    if (projectsError) throw projectsError;

    let initialized = 0;

    for (const project of projects || []) {
      console.log(`[initialize-history-files] Processing project: ${project.name}`);
      
      // Initialize task history with existing tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', project.id)
        .is('deleted_at', null)
        .order('created_at');

      if (tasks) {
        for (const task of tasks) {
          await appendTaskHistory(
            project.id,
            task,
            'CREATED',
            task.created_by,
            undefined
          );
        }
        console.log(`[initialize-history-files] Added ${tasks.length} tasks to history`);
      }

      // Initialize chat history with existing threads
      const { data: threads } = await supabase
        .from('ai_chat_threads')
        .select('*')
        .eq('workspace_id', project.workspace_id)
        .is('deleted_at', null)
        .order('created_at');

      if (threads) {
        for (const thread of threads) {
          await appendChatHistory(
            project.id,
            thread,
            'Historical import - chat thread created',
            [],
            []
          );
        }
        console.log(`[initialize-history-files] Added ${threads.length} chats to history`);
      }

      initialized++;
    }

    console.log(`[initialize-history-files] Initialization complete. Processed ${initialized} projects.`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Initialized history for ${initialized} projects`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[initialize-history-files] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
