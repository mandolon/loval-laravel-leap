import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { appendChatHistory } from '../_shared/historyHelpers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

function generateChatsMarkdown(project: any, threads: any[]): string {
  let content = `# ${project.name} - Chat Summaries

## Key Discussions & Decisions

`;

  if (threads.length === 0) {
    content += `No conversations yet.\n`;
  } else {
    threads.forEach(thread => {
      content += `### Chat: "${thread.title}"\n`;
      content += `- **Date:** ${new Date(thread.created_at).toLocaleDateString()}\n`;
      content += `- **Last Updated:** ${new Date(thread.updated_at).toLocaleDateString()}\n`;
      content += `\n`;
    });
  }

  content += `\n---\n\nLast Updated: ${new Date().toISOString()}\n`;
  
  return content;
}

async function regenerateChatsFile(projectId: string, userId?: string) {
  console.log('[sync-project-chats] Regenerating chats file for project:', projectId);
  
  // Get project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    throw new Error('Project not found');
  }

  // Get all chat threads for the workspace
  const { data: threads, error: threadsError } = await supabase
    .from('ai_chat_threads')
    .select('*')
    .eq('workspace_id', project.workspace_id)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (threadsError) throw threadsError;

  // Generate markdown
  const markdown = generateChatsMarkdown(project, threads || []);

  // Upload to storage
  const storagePath = `${projectId}/project.chats.md`;
  const { error: uploadError } = await supabase.storage
    .from('project-files')
    .upload(storagePath, markdown, {
      contentType: 'text/markdown',
      upsert: true
    });

  if (uploadError) throw uploadError;

  // Update file record
  const { data: folder } = await supabase
    .from('folders')
    .select('id')
    .eq('project_id', projectId)
    .eq('name', 'Pre-Design')
    .maybeSingle();

  if (folder) {
    const { data: existingFile } = await supabase
      .from('files')
      .select('id')
      .eq('project_id', projectId)
      .eq('filename', 'project.chats.md')
      .maybeSingle();

    if (existingFile) {
      await supabase
        .from('files')
        .update({ 
          filesize: new Blob([markdown]).size,
          updated_at: new Date().toISOString() 
        })
        .eq('id', existingFile.id);
    } else {
      await supabase.from('files').insert({
        project_id: projectId,
        folder_id: folder.id,
        filename: 'project.chats.md',
        storage_path: storagePath,
        filesize: new Blob([markdown]).size,
        mimetype: 'text/markdown',
        uploaded_by: userId
      });
    }
  }

  console.log('[sync-project-chats] Chats file regenerated successfully');
  return { success: true };
}

async function logChatCompletion(requestBody: any) {
  const { projectId, chatThread, summary, keyDecisions, actionItems } = requestBody;
  
  console.log('[sync-project-chats] Logging chat completion:', { projectId, threadId: chatThread.id });
  
  await appendChatHistory(projectId, chatThread, summary, keyDecisions, actionItems);
  
  console.log('[sync-project-chats] Chat history logged successfully');
  return { success: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, projectId } = body;

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'Missing projectId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;
    if (action === 'regenerate') {
      result = await regenerateChatsFile(projectId, body.userId);
    } else if (action === 'log_completion') {
      result = await logChatCompletion(body);
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[sync-project-chats] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
