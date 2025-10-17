import { supabase } from "@/integrations/supabase/client";

export interface ConversationSummary {
  title: string;
  summary: string;
  key_points: string[];
  pending_items: string[];
  action_items: Array<{
    task: string;
    assignee?: string;
    due_date?: string;
  }>;
  tags: string[];
}

/**
 * Summarize AI chat conversation using Lovable AI
 */
export async function summarizeAIChat(
  threadId: string,
  messages: Array<{ role: string; content: string }>
): Promise<ConversationSummary | null> {
  try {
    // Call edge function to summarize using Lovable AI
    const { data, error } = await supabase.functions.invoke("summarize-conversation", {
      body: { threadId, messages },
    });

    if (error) throw error;
    return data as ConversationSummary;
  } catch (error) {
    console.error("Error summarizing conversation:", error);
    return null;
  }
}

/**
 * Save summary as official ledger entry
 */
export async function saveSummaryToLedger(
  workspaceId: string,
  projectId: string,
  threadId: string,
  summary: ConversationSummary,
  entryType: string,
  visibility: string,
  userId: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("ledger_entries" as any)
      .insert({
        workspace_id: workspaceId,
        project_id: projectId,
        title: summary.title,
        entry_type: entryType,
        summary: summary.summary,
        source_type: "ai_chat",
        source_thread_id: threadId,
        details: {
          key_points: summary.key_points,
          pending_items: summary.pending_items,
          action_items: summary.action_items,
        },
        tags: summary.tags,
        visibility,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, id: (data as any)?.id };
  } catch (error: any) {
    console.error("Error saving to ledger:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Save summary as informal note
 */
export async function saveSummaryAsNote(
  projectId: string,
  threadId: string,
  summary: ConversationSummary,
  userId: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // Format as markdown
    let content = `# ${summary.title}\n\n`;
    content += `${summary.summary}\n\n`;
    
    if (summary.key_points.length > 0) {
      content += `## Key Points\n${summary.key_points.map(p => `- ${p}`).join("\n")}\n\n`;
    }
    
    if (summary.pending_items.length > 0) {
      content += `## Pending Items\n${summary.pending_items.map(i => `- [ ] ${i}`).join("\n")}\n\n`;
    }
    
    if (summary.action_items.length > 0) {
      content += `## Action Items\n`;
      summary.action_items.forEach(a => {
        content += `- [ ] ${a.task}`;
        if (a.assignee) content += ` (@${a.assignee})`;
        if (a.due_date) content += ` - Due: ${a.due_date}`;
        content += `\n`;
      });
    }

    const { data, error } = await supabase
      .from("notes" as any)
      .insert({
        project_id: projectId,
        content,
        source_type: "ai_chat",
        source_thread_id: threadId,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, id: (data as any)?.id };
  } catch (error: any) {
    console.error("Error saving as note:", error);
    return { success: false, error: error.message };
  }
}
