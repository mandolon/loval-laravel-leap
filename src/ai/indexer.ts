import { supabase } from "@/integrations/supabase/client";

export interface ProjectMetadata {
  summary: string;
  tags: string[];
  keyFiles: string[];
  constraints: string[];
  decisions: Array<{
    date: string;
    decision: string;
    rationale: string;
  }>;
  nextSteps: string[];
}

/**
 * Load project.meta.md from Supabase Storage
 */
export async function loadMeta(
  workspaceId: string,
  projectId: string
): Promise<ProjectMetadata | null> {
  try {
    const path = `${workspaceId}/${projectId}/project.meta.md`;
    
    const { data, error } = await supabase.storage
      .from("project-metadata")
      .download(path);

    if (error) {
      console.log("No metadata file found, will create on first save");
      return null;
    }

    const text = await data.text();
    return parseMetadata(text);
  } catch (error) {
    console.error("Error loading metadata:", error);
    return null;
  }
}

/**
 * Save project.meta.md to Supabase Storage
 */
export async function saveMeta(
  workspaceId: string,
  projectId: string,
  metadata: ProjectMetadata
): Promise<boolean> {
  try {
    const path = `${workspaceId}/${projectId}/project.meta.md`;
    const content = formatMetadata(metadata);
    
    const { error } = await supabase.storage
      .from("project-metadata")
      .upload(path, new Blob([content], { type: "text/markdown" }), {
        upsert: true,
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error saving metadata:", error);
    return false;
  }
}

/**
 * Parse markdown metadata into structured format
 */
function parseMetadata(text: string): ProjectMetadata {
  const metadata: ProjectMetadata = {
    summary: "",
    tags: [],
    keyFiles: [],
    constraints: [],
    decisions: [],
    nextSteps: [],
  };

  const sections = text.split(/^## /m);

  sections.forEach((section) => {
    if (section.startsWith("Summary")) {
      metadata.summary = section.split("\n").slice(1).join("\n").trim();
    } else if (section.startsWith("Tags")) {
      const tags = section.match(/`([^`]+)`/g);
      if (tags) metadata.tags = tags.map((t) => t.replace(/`/g, ""));
    } else if (section.startsWith("Key Files")) {
      const lines = section.split("\n").slice(1);
      metadata.keyFiles = lines
        .filter((l) => l.startsWith("- "))
        .map((l) => l.replace(/^- /, "").trim());
    } else if (section.startsWith("Constraints")) {
      const lines = section.split("\n").slice(1);
      metadata.constraints = lines
        .filter((l) => l.startsWith("- "))
        .map((l) => l.replace(/^- /, "").trim());
    } else if (section.startsWith("Decisions")) {
      const decisionBlocks = section.split(/^### /m).slice(1);
      decisionBlocks.forEach((block) => {
        const lines = block.split("\n");
        const dateMatch = lines[0].match(/\(([^)]+)\)/);
        const decision = lines[0].split("(")[0].trim();
        const rationale = lines.slice(1).join("\n").trim();
        
        if (dateMatch) {
          metadata.decisions.push({
            date: dateMatch[1],
            decision,
            rationale,
          });
        }
      });
    } else if (section.startsWith("Next Steps")) {
      const lines = section.split("\n").slice(1);
      metadata.nextSteps = lines
        .filter((l) => l.startsWith("- "))
        .map((l) => l.replace(/^- /, "").trim());
    }
  });

  return metadata;
}

/**
 * Format structured metadata into markdown
 */
function formatMetadata(metadata: ProjectMetadata): string {
  let md = `# Project Metadata\n\n`;

  md += `## Summary\n${metadata.summary}\n\n`;

  if (metadata.tags.length > 0) {
    md += `## Tags\n${metadata.tags.map((t) => `\`${t}\``).join(", ")}\n\n`;
  }

  if (metadata.keyFiles.length > 0) {
    md += `## Key Files\n${metadata.keyFiles.map((f) => `- ${f}`).join("\n")}\n\n`;
  }

  if (metadata.constraints.length > 0) {
    md += `## Constraints\n${metadata.constraints.map((c) => `- ${c}`).join("\n")}\n\n`;
  }

  if (metadata.decisions.length > 0) {
    md += `## Decisions\n`;
    metadata.decisions.forEach((d) => {
      md += `### ${d.decision} (${d.date})\n${d.rationale}\n\n`;
    });
  }

  if (metadata.nextSteps.length > 0) {
    md += `## Next Steps\n${metadata.nextSteps.map((s) => `- ${s}`).join("\n")}\n`;
  }

  return md;
}
