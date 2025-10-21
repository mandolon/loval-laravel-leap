import { readProjectFile, listFolderFiles } from "@/services/fileService";

/**
 * Get files from a specific project folder for AI context
 */
export async function getProjectFolderForAI(
  projectId: string,
  folder: "Pre-Design" | "Design" | "Permit" | "Build"
): Promise<string> {
  const files = await listFolderFiles(projectId, folder);

  if (files.length === 0) {
    return `No files in ${folder} folder`;
  }

  let summary = `\n## Files in ${folder} Folder\n`;
  summary += `Total files: ${files.length}\n\n`;

  for (const file of files) {
    summary += `### ${file.filename}\n`;
    summary += `- Version: ${file.version}\n`;
    summary += `- Size: ${(file.size / 1024).toFixed(2)} KB\n`;
    summary += `- Modified: ${new Date(file.lastModified).toLocaleDateString()}\n`;

    // For markdown and text files, include preview
    if (["text/markdown", "text/plain"].includes(file.mimetype)) {
      try {
        const content = await readProjectFile(projectId, file.path);
        if (content && typeof content.content === "string") {
          const preview = content.content.substring(0, 300);
          summary += `- Content preview:\n\`\`\`\n${preview}...\n\`\`\`\n`;
        }
      } catch (error) {
        console.error(`Failed to read ${file.filename}:`, error);
      }
    }

    summary += "\n";
  }

  return summary;
}

/**
 * Read project metadata file
 */
export async function readProjectMetadataForAI(
  projectId: string
): Promise<string | null> {
  try {
    const content = await readProjectFile(projectId, "Pre-Design/project.meta.md");

    if (content && typeof content.content === "string") {
      return content.content;
    }
  } catch (error) {
    console.error("Failed to read project metadata:", error);
  }

  return null;
}

/**
 * Get all project folders and file summary for AI
 */
export async function getProjectFilesSummaryForAI(projectId: string): Promise<string> {
  const folders = ["Pre-Design", "Design", "Permit", "Build"] as const;
  let summary = "## Project Files Summary\n\n";

  for (const folder of folders) {
    const folderContent = await getProjectFolderForAI(projectId, folder);
    summary += folderContent + "\n";
  }

  return summary;
}
