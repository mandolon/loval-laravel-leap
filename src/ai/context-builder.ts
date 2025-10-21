import { supabase } from "@/integrations/supabase/client";
import { loadMeta, ProjectMetadata } from "./indexer";

export interface AIContext {
  contextString: string;
  consultedSources: string[];
  tokenEstimate: number;
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

  // Get project details
  const { data: project } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .single();

  // Always load project metadata first
  const metadata = await loadMeta(workspaceId, projectId);
  if (metadata && project) {
    context += formatProjectMetadata(metadata, project.id, project.name);
    sources.push("project.meta.md");
  }

  // Analyze query to determine what additional data to fetch
  const needsTasks = /task|todo|deadline|assignee|status/i.test(userQuery);
  const needsNotes = /note|document|decision|discussion/i.test(userQuery);
  const needsFiles = /file|attachment|document|photo/i.test(userQuery);
  const needsTeam = /team|member|people|who/i.test(userQuery);

  // Fetch relevant data based on query intent
  if (needsTasks) {
    const tasks = await fetchRecentTasks(projectId);
    if (tasks) {
      context += `\n\n## Recent Tasks\n${tasks}`;
      sources.push("tasks");
    }
  }

  if (needsNotes) {
    const notes = await fetchRecentNotes(projectId);
    if (notes) {
      context += `\n\n## Recent Notes\n${notes}`;
      sources.push("notes");
    }
  }

  if (needsFiles) {
    const files = await fetchRecentFiles(projectId);
    if (files) {
      context += `\n\n## Recent Files\n${files}`;
      sources.push("files");
    }
  }

  if (needsTeam) {
    const team = await fetchProjectTeam(projectId);
    if (team) {
      context += `\n\n## Project Team\n${team}`;
      sources.push("team");
    }
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
  let context = `# Workspace Context\n\n`;

  // Fetch lightweight project summaries
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
