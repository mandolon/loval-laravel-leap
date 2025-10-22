import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { appendTaskHistory } from '../_shared/historyHelpers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

function generateTasksMarkdown(project: any, tasks: any[]): string {
  const completed = tasks.filter(t => t.status === 'done_completed');
  const inProgress = tasks.filter(t => t.status === 'progress_update');
  const notStarted = tasks.filter(t => t.status === 'task_redline');
  
  let content = `# ${project.name} - Tasks

**Total: ${tasks.length} tasks** | **Completed: ${completed.length}** | **In Progress: ${inProgress.length}** | **Not Started: ${notStarted.length}**

`;

  if (completed.length > 0) {
    content += `## Completed Tasks (${completed.length})\n`;
    completed.forEach(task => {
      content += `### ✅ ${task.title}\n`;
      content += `- **ID:** ${task.short_id}\n`;
      content += `- **Priority:** ${task.priority}\n`;
      content += `- **Status:** ${task.status}\n`;
      if (task.description) content += `- **Description:** ${task.description}\n`;
      content += `\n`;
    });
  }

  if (inProgress.length > 0) {
    content += `## In Progress (${inProgress.length})\n`;
    inProgress.forEach(task => {
      content += `### 🔄 ${task.title}\n`;
      content += `- **ID:** ${task.short_id}\n`;
      content += `- **Priority:** ${task.priority}\n`;
      if (task.due_date) content += `- **Due:** ${task.due_date}\n`;
      if (task.description) content += `- **Description:** ${task.description}\n`;
      content += `\n`;
    });
  }

  if (notStarted.length > 0) {
    content += `## Not Started (${notStarted.length})\n`;
    notStarted.forEach(task => {
      content += `### ⏳ ${task.title}\n`;
      content += `- **ID:** ${task.short_id}\n`;
      content += `- **Priority:** ${task.priority}\n`;
      if (task.due_date) content += `- **Due:** ${task.due_date}\n`;
      if (task.description) content += `- **Description:** ${task.description}\n`;
      content += `\n`;
    });
  }

  content += `---\n\nLast Updated: ${new Date().toISOString()}\n`;
  
  return content;
}

async function regenerateTasksFile(projectId: string, userId?: string) {
  console.log('[sync-project-tasks] Regenerating tasks file for project:', projectId);
  
  // Get project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    throw new Error('Project not found');
  }

  // Get all tasks
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('status', { ascending: true })
    .order('created_at', { ascending: false });

  if (tasksError) throw tasksError;

  // Generate markdown
  const markdown = generateTasksMarkdown(project, tasks || []);

  // Upload to storage
  const storagePath = `${projectId}/project.tasks.md`;
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
      .eq('filename', 'project.tasks.md')
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
        filename: 'project.tasks.md',
        storage_path: storagePath,
        filesize: new Blob([markdown]).size,
        mimetype: 'text/markdown',
        uploaded_by: userId
      });
    }
  }

  console.log('[sync-project-tasks] Tasks file regenerated successfully');
  return { success: true };
}

async function logTaskChange(requestBody: any) {
  const { projectId, task, actionType, userId, changes } = requestBody;
  
  console.log('[sync-project-tasks] Logging task change:', { projectId, actionType, taskId: task.id });
  
  await appendTaskHistory(projectId, task, actionType, userId, changes);
  
  console.log('[sync-project-tasks] Task history logged successfully');
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
      result = await regenerateTasksFile(projectId, body.userId);
    } else if (action === 'log_change') {
      result = await logTaskChange(body);
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
    console.error('[sync-project-tasks] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
