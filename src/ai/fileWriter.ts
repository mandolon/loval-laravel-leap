import { saveProjectFile, updateProjectFile } from "@/services/fileService";
import { readProjectFile } from "@/services/fileService";
import { supabase } from "@/integrations/supabase/client";

/**
 * Create a new note file in the Design folder
 */
export async function createProjectNote(
  projectId: string,
  title: string,
  content: string,
  userId: string
): Promise<{ success: boolean; fileId?: string; error?: string }> {
  // Generate filename from title
  const filename = `${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}.md`;

  // Format content as markdown
  const markdownContent = `# ${title}\n\n${content}\n\n---\n_Created: ${new Date().toISOString()}_`;

  return saveProjectFile(projectId, filename, markdownContent, "Design", userId);
}

/**
 * Update or create project metadata file
 */
export async function updateProjectMetadata(
  projectId: string,
  content: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if project.meta.md exists
    const { data: existing } = await supabase
      .from("files")
      .select("id")
      .eq("project_id", projectId)
      .eq("filename", "project.meta.md")
      .single();

    if (existing) {
      // Update existing
      const result = await updateProjectFile(existing.id, content, userId);
      return {
        success: result.success,
        error: result.error
      };
    } else {
      // Create new in Pre-Design folder
      const result = await saveProjectFile(
        projectId,
        "project.meta.md",
        content,
        "Pre-Design",
        userId
      );
      return {
        success: result.success,
        error: result.error
      };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Add decision to project metadata (appends to Decision Log section)
 */
export async function addDecisionToMetadata(
  projectId: string,
  date: string,
  title: string,
  note: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Read current metadata
    const contentResult = await readProjectFile(projectId, "Pre-Design/project.meta.md");
    if (!contentResult || typeof contentResult.content !== "string") {
      return { success: false, error: "Could not read project metadata" };
    }

    let content = contentResult.content;

    // Find Decision Log section and add new entry
    const decisionEntry = `### ${date}: ${title}\n"${note}"\n`;

    // If Decision Log section exists, append to it
    if (content.includes("## Decision Log")) {
      content = content.replace(
        "## Decision Log\n",
        `## Decision Log\n${decisionEntry}`
      );
    } else {
      // If not, add the section before Next Steps
      const nextStepsIndex = content.indexOf("## Next Steps");
      if (nextStepsIndex > 0) {
        content = content.substring(0, nextStepsIndex) +
          `## Decision Log\n${decisionEntry}\n\n` +
          content.substring(nextStepsIndex);
      }
    }

    return updateProjectMetadata(projectId, content, userId);
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
