import { supabase } from "@/integrations/supabase/client";
import { loadMeta, ProjectMetadata } from "./indexer";
import type { ProjectAIIdentity } from "@/lib/api/types";

export interface AIContext {
  contextString: string;
  consultedSources: string[];
  tokenEstimate: number;
}

/**
 * Format project AI identity into readable context
 */
export function formatProjectAIIdentity(identity: ProjectAIIdentity): string {
  if (!identity || Object.keys(identity).length === 0) return '';

  let text = `## PROJECT CONTEXT\n`;
  text += `**Type**: ${identity.projectType || 'Not specified'}\n`;
  text += `**Jurisdiction**: ${identity.jurisdiction || 'Not specified'}\n`;
  text += `**Scope**: ${identity.projectScope || 'Not specified'}\n\n`;

  if (identity.zoning) {
    text += `### Zoning & Site\n`;
    text += `- Zoning: ${identity.zoning}\n`;
    if (identity.lotSize) text += `- Lot Size: ${identity.lotSize.toLocaleString()} SF\n`;
    if (identity.existingSqft || identity.proposedSqft) {
      text += `- Existing: ${identity.existingSqft?.toLocaleString() || 0} SF | Proposed: ${identity.proposedSqft?.toLocaleString() || 0} SF\n`;
    }
    if (identity.heightLimit) text += `- Height Limit: ${identity.heightLimit} ft\n`;
    if (identity.setbacks) {
      text += `- Setbacks: Front ${identity.setbacks.front}ft, Side ${identity.setbacks.side}ft, Rear ${identity.setbacks.rear}ft\n`;
    }
    text += '\n';
  }

  if (identity.requiredCompliance?.length > 0) {
    text += `### Compliance Requirements\n`;
    identity.requiredCompliance.forEach((c: string) => {
      text += `- ${c.replace(/_/g, ' ').toUpperCase()}\n`;
    });
    text += '\n';
  }

  if (identity.requiredConsultants?.length > 0) {
    text += `### Required Consultants\n`;
    identity.requiredConsultants.forEach((c: string) => {
      text += `- ${c.replace(/_/g, ' ')}\n`;
    });
    text += '\n';
  }

  if (identity.nextSteps?.length > 0) {
    text += `### Next Steps\n`;
    identity.nextSteps.forEach((step: string) => {
      text += `- ${step}\n`;
    });
    text += '\n';
  }

  if (identity.blockers?.length > 0) {
    text += `### Current Blockers\n`;
    identity.blockers.forEach((blocker: string) => {
      text += `- ${blocker}\n`;
    });
    text += '\n';
  }

  if (identity.openQuestions?.length > 0) {
    text += `### Open Questions\n`;
    identity.openQuestions.forEach((q: string) => {
      text += `- ${q}\n`;
    });
    text += '\n';
  }

  return text;
}

/**
 * Build lean AI context based on project and query intent
 */
export async function buildAIContext(
  workspaceId: string,
  projectId: string,
  userQuery: string
): Promise<AIContext> {
  const sources: string[] = [];
  let context = "";

  // 1. Fetch workspace AI instructions
  const { data: workspaceSettings } = await supabase
    .from('workspace_settings')
    .select('ai_instructions')
    .eq('workspace_id', workspaceId)
    .single();

  if (workspaceSettings?.ai_instructions) {
    context += `${workspaceSettings.ai_instructions}\n\n`;
    sources.push("workspace_ai_instructions");
  }

  // 2. Fetch and format project AI identity
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, ai_identity')
    .eq('id', projectId)
    .single();

  if (project?.ai_identity) {
    context += formatProjectAIIdentity(project.ai_identity as ProjectAIIdentity);
    sources.push("project_ai_identity");
  }

  // Helper to read file from storage
  const readFile = async (filename: string) => {
    const { data } = await supabase.storage
      .from('project-files')
      .download(`${projectId}/${filename}`);
    return data ? await data.text() : null;
  };

  // 3. Always load project metadata (complementary to AI identity)
  const metadata = await loadMeta(workspaceId, projectId);
  if (metadata && project) {
    context += formatProjectMetadata(metadata, project.id, project.name);
    sources.push("project.meta.md");
  }

  // 4. Always read current tasks file (pre-generated)
  const tasksContent = await readFile('project.tasks.md');
  if (tasksContent) {
    context += '\n\n' + tasksContent;
    sources.push("project.tasks.md");
  }

  // 5. Always read current chats file (pre-generated)
  const chatsContent = await readFile('project.chats.md');
  if (chatsContent) {
    context += '\n\n' + chatsContent;
    sources.push("project.chats.md");
  }

  // 6. Always read task history for deeper context
  const tasksHistory = await readFile('project.tasks.history.md');
  if (tasksHistory) {
    context += '\n\n' + tasksHistory;
    sources.push("project.tasks.history.md");
  }

  // 7. Always read chat history for deeper context
  const chatsHistory = await readFile('project.chats.history.md');
  if (chatsHistory) {
    context += '\n\n' + chatsHistory;
    sources.push("project.chats.history.md");
  }

  // 8. Conditionally read files inventory
  const needsFiles = /file|attachment|document|photo/i.test(userQuery);
  if (needsFiles) {
    const files = await fetchRecentFiles(projectId);
    if (files) {
      context += `\n\n## Recent Files\n${files}`;
      sources.push("files");
    }
  }

  // 9. Conditionally read team info
  const needsTeam = /team|member|people|who/i.test(userQuery);
  if (needsTeam) {
    const team = await fetchProjectTeam(projectId);
    if (team) {
      context += `\n\n## Project Team\n${team}`;
      sources.push("team");
    }
  }

  // Safety: truncate if context exceeds 50k characters (~12.5k tokens)
  if (context.length > 50000) {
    console.warn('AI context truncated - exceeded 50k chars');
    context = context.substring(0, 50000) + '\n\n[Context truncated for cost management]';
  }

  // Estimate tokens (rough: 1 token ≈ 4 characters)
  const tokenEstimate = Math.ceil(context.length / 4);

  return {
    contextString: context,
    consultedSources: sources,
    tokenEstimate,
  };
}

/**
 * Build aggregate context for "All Projects" mode
 */
export async function buildWorkspaceContext(
  workspaceId: string,
  userQuery: string
): Promise<AIContext> {
  const sources: string[] = [];
  let context = ``;

  // 1. Fetch workspace AI instructions first
  const { data: workspaceSettings } = await supabase
    .from('workspace_settings')
    .select('ai_instructions')
    .eq('workspace_id', workspaceId)
    .single();

  if (workspaceSettings?.ai_instructions) {
    context += `${workspaceSettings.ai_instructions}\n\n`;
    sources.push("workspace_ai_instructions");
  }

  context += `# Workspace Context\n\n`;

  // 2. Fetch lightweight project summaries
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, status, phase, progress, due_date, total_tasks, completed_tasks")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  if (projects && projects.length > 0) {
    context += `## Projects (${projects.length} total)\n`;
    projects.forEach((p) => {
      context += `- **${p.name}** [ID: ${p.id}] (${p.phase}): ${p.status}, ${p.completed_tasks}/${p.total_tasks} tasks completed`;
      if (p.due_date) context += `, due ${p.due_date}`;
      context += `\n`;
    });
    sources.push("projects");
  }

  const tokenEstimate = Math.ceil(context.length / 4);

  return {
    contextString: context,
    consultedSources: sources,
    tokenEstimate,
  };
}

// Helper functions to fetch specific data types

function formatProjectMetadata(metadata: ProjectMetadata, projectId: string, projectName: string): string {
  let text = `# Project Context\n\n`;
  text += `════════════════════════════════════════\n`;
  text += `⭐ IMPORTANT - Project ID (use this for all tool calls):\n`;
  text += `${projectId}\n`;
  text += `════════════════════════════════════════\n\n`;
  text += `**Project Name:** ${projectName}\n\n`;
  text += `## Summary\n${metadata.summary}\n\n`;
  
  if (metadata.tags.length > 0) {
    text += `## Tags\n${metadata.tags.join(", ")}\n\n`;
  }
  
  if (metadata.constraints.length > 0) {
    text += `## Constraints\n${metadata.constraints.map(c => `- ${c}`).join("\n")}\n\n`;
  }
  
  if (metadata.decisions.length > 0) {
    text += `## Key Decisions\n`;
    metadata.decisions.slice(-5).forEach(d => {
      text += `- ${d.decision} (${d.date}): ${d.rationale}\n`;
    });
    text += `\n`;
  }
  
  if (metadata.nextSteps.length > 0) {
    text += `## Next Steps\n${metadata.nextSteps.map(s => `- ${s}`).join("\n")}\n`;
  }
  
  return text;
}

async function fetchRecentTasks(projectId: string): Promise<string | null> {
  const { data: tasks } = await supabase
    .from("tasks")
    .select("title, status, priority, due_date")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(10);

  if (!tasks || tasks.length === 0) return null;

  return tasks
    .map((t) => `- [${t.status}] ${t.title} (${t.priority})${t.due_date ? ` due ${t.due_date}` : ""}`)
    .join("\n");
}

async function fetchRecentNotes(projectId: string): Promise<string | null> {
  const { data: notes } = await supabase
    .from("notes")
    .select("content, created_at")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(5);

  if (!notes || notes.length === 0) return null;

  return notes
    .map((n) => `- ${n.content.substring(0, 150)}${n.content.length > 150 ? "..." : ""}`)
    .join("\n");
}

async function fetchRecentFiles(projectId: string): Promise<string | null> {
  const { data: files } = await supabase
    .from("files")
    .select("filename, mimetype, filesize, created_at")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(10);

  if (!files || files.length === 0) return null;

  return files
    .map((f) => `- ${f.filename} (${f.mimetype}, ${(f.filesize || 0) / 1024}KB)`)
    .join("\n");
}

async function fetchProjectTeam(projectId: string): Promise<string | null> {
  const { data: members } = await supabase
    .from("project_members")
    .select("title, user_id, users(name, email)")
    .eq("project_id", projectId)
    .is("deleted_at", null);

  if (!members || members.length === 0) return null;

  return members
    .map((m: any) => `- ${m.users?.name || m.users?.email} ${m.title ? `(${m.title})` : ""}`)
    .join("\n");
}
