import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

/**
 * Generic append function for history files
 */
export async function appendToHistory(
  projectId: string,
  filename: string,
  entry: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Try to read existing file
    const { data: existingFile, error: readError } = await supabase.storage
      .from('project-files')
      .download(`${projectId}/${filename}`);
    
    let content = '';
    
    if (existingFile) {
      // File exists, read current content
      content = await existingFile.text();
    } else {
      // File doesn't exist, create with header
      const projectName = await getProjectName(projectId);
      content = createHistoryHeader(filename, projectName);
    }
    
    // 2. Append new entry
    content += '\n\n' + entry;
    
    // 3. Upload back to storage
    const blob = new Blob([content], { type: 'text/markdown' });
    const { error: uploadError } = await supabase.storage
      .from('project-files')
      .upload(`${projectId}/${filename}`, blob, {
        upsert: true,
        contentType: 'text/markdown'
      });
    
    if (uploadError) throw uploadError;
    
    // 4. Update or create file record
    await upsertFileRecord(projectId, filename, content.length);
    
    return { success: true };
  } catch (error: any) {
    console.error('appendToHistory error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create header for new history file
 */
function createHistoryHeader(filename: string, projectName: string): string {
  const type = filename.includes('tasks') ? 'Task' : 'Chat';
  
  return `# ${projectName} - ${type} History

**Complete timeline of how ${type.toLowerCase()}s evolved.**
**New entries appended at bottom as ${type.toLowerCase()}s change.**

---

## ${type} Timeline`;
}

/**
 * Append task change to history
 */
export async function appendTaskHistory(
  projectId: string,
  task: any,
  action: 'CREATED' | 'UPDATED' | 'COMPLETED' | 'DELETED',
  userId: string,
  changes?: { field: string; oldValue: any; newValue: any }[]
): Promise<void> {
  const user = await getUserById(userId);
  const timestamp = new Date().toISOString();
  
  let entry = `### [${timestamp}] ${action}: ${task.short_id} "${task.title}"`;
  
  if (action === 'CREATED') {
    entry += `\n- Created by: ${user.name}`;
    entry += `\n- Assigned to: ${task.assignees?.length > 0 ? 'Assigned' : 'Unassigned'}`;
    entry += `\n- Priority: ${task.priority}`;
    entry += `\n- Due: ${task.due_date || 'Not set'}`;
    entry += `\n- Status: ${task.status}`;
  } else if (action === 'UPDATED' && changes && changes.length > 0) {
    entry += `\n- Changed by: ${user.name}`;
    changes.forEach(change => {
      entry += `\n- ${change.field}: ${change.oldValue} → ${change.newValue}`;
    });
  } else if (action === 'COMPLETED') {
    entry += `\n- Completed by: ${user.name}`;
    const duration = calculateDuration(task.created_at, timestamp);
    entry += `\n- Duration: ${duration}`;
    entry += `\n- Status: completed`;
  } else if (action === 'DELETED') {
    entry += `\n- Deleted by: ${user.name}`;
  }
  
  await appendToHistory(projectId, 'project.tasks.history.md', entry);
}

/**
 * Append chat completion to history
 */
export async function appendChatHistory(
  projectId: string,
  chatThread: any,
  summary: string,
  keyDecisions: string[],
  actionItems: string[]
): Promise<void> {
  const timestamp = new Date().toISOString();
  const user = await getUserById(chatThread.user_id);
  
  let entry = `### [${timestamp}] CHAT SESSION: "${chatThread.title}"`;
  entry += `\n- Participant: ${user.name}`;
  
  if (summary) {
    entry += `\n\n**Summary:**\n${summary}`;
  }
  
  if (keyDecisions && keyDecisions.length > 0) {
    entry += `\n\n**Decisions Made:**`;
    keyDecisions.forEach(decision => {
      entry += `\n- ${decision}`;
    });
  }
  
  if (actionItems && actionItems.length > 0) {
    entry += `\n\n**Action Items:**`;
    actionItems.forEach(item => {
      entry += `\n- [ ] ${item}`;
    });
  }
  
  await appendToHistory(projectId, 'project.chats.history.md', entry);
}

// Helper functions

async function getUserById(userId: string) {
  const { data } = await supabase
    .from('users')
    .select('name, id')
    .eq('id', userId)
    .single();
  return data || { name: 'Unknown User', id: userId };
}

async function getProjectName(projectId: string) {
  const { data } = await supabase
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .single();
  return data?.name || 'Unknown Project';
}

function calculateDuration(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return `${days} days`;
}

async function upsertFileRecord(projectId: string, filename: string, size: number) {
  // Find existing file record
  const { data: existing } = await supabase
    .from('files')
    .select('id')
    .eq('project_id', projectId)
    .eq('filename', filename)
    .maybeSingle();
  
  if (existing) {
    await supabase
      .from('files')
      .update({ 
        filesize: size, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', existing.id);
  } else {
    // Create new file record in Pre-Design folder
    const { data: folder } = await supabase
      .from('folders')
      .select('id')
      .eq('project_id', projectId)
      .eq('name', 'Pre-Design')
      .maybeSingle();
    
    if (folder) {
      // Get system user for uploaded_by
      const { data: systemUser } = await supabase
        .from('users')
        .select('id')
        .limit(1)
        .single();
      
      await supabase.from('files').insert({
        project_id: projectId,
        folder_id: folder.id,
        filename: filename,
        storage_path: `${projectId}/${filename}`,
        filesize: size,
        mimetype: 'text/markdown',
        uploaded_by: systemUser?.id
      });
    }
  }
}
