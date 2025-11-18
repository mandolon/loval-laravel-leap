import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tool definitions for the AI
const tools = [
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a new task in a project. Use this when the user asks to add, create, or assign a task.",
      parameters: {
        type: "object",
        properties: {
          project_id: {
            type: "string",
            description: "The ID of the project to add the task to"
          },
          title: {
            type: "string",
            description: "The title or name of the task"
          },
          description: {
            type: "string",
            description: "Optional description or details about the task"
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "Priority level of the task"
          },
          assignee_id: {
            type: "string",
            description: "Optional user ID to assign the task to"
          }
        },
        required: ["project_id", "title", "priority"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_task_status",
      description: "Update the status of an existing task. Use this when the user wants to mark a task as complete, in progress, etc.",
      parameters: {
        type: "object",
        properties: {
          task_id: {
            type: "string",
            description: "The ID of the task to update"
          },
          status: {
            type: "string",
            enum: ["task_redline", "in_progress", "done_completed"],
            description: "The new status for the task"
          }
        },
        required: ["task_id", "status"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_project_status",
      description: "Update the status of a project. Use this when the user wants to change project status or phase.",
      parameters: {
        type: "object",
        properties: {
          project_id: {
            type: "string",
            description: "The ID of the project to update"
          },
          status: {
            type: "string",
            enum: ["active", "pending", "completed", "archived"],
            description: "The new status for the project"
          },
          phase: {
            type: "string",
            enum: ["Pre-Design", "Design", "Permit", "Build"],
            description: "Optional: The new phase for the project"
          }
        },
        required: ["project_id", "status"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "read_folder",
      description: "Read and list files in a project folder. Use this when the user asks about files in a specific phase folder.",
      parameters: {
        type: "object",
        properties: {
          project_id: {
            type: "string",
            description: "UUID of the project"
          },
          folder: {
            type: "string",
            enum: ["Pre-Design", "Design", "Permit", "Build"],
            description: "Which project folder to read"
          }
        },
        required: ["project_id", "folder"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_note",
      description: "Create a note file in the project Design folder. Use this when the user wants to document decisions or findings.",
      parameters: {
        type: "object",
        properties: {
          project_id: {
            type: "string",
            description: "UUID of the project"
          },
          title: {
            type: "string",
            description: "Title of the note"
          },
          content: {
            type: "string",
            description: "Markdown content of the note"
          }
        },
        required: ["project_id", "title", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_metadata",
      description: "Update the project.meta.md file with new decisions or information.",
      parameters: {
        type: "object",
        properties: {
          project_id: {
            type: "string",
            description: "UUID of the project"
          },
          content: {
            type: "string",
            description: "Full markdown content for project.meta.md"
          }
        },
        required: ["project_id", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_recent_activity",
      description: "Get recent activity across workspace or specific project. Shows task updates, status changes, notes created, etc.",
      parameters: {
        type: "object",
        properties: {
          workspace_id: {
            type: "string",
            description: "Workspace UUID to get activity from"
          },
          project_id: {
            type: "string",
            description: "Optional: Filter to specific project UUID"
          },
          limit: {
            type: "number",
            description: "Number of activities to return (default 20, max 100)"
          },
          resource_type: {
            type: "string",
            description: "Optional: Filter by resource type (task, project, file, note)"
          }
        },
        required: ["workspace_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "summarize_tasks",
      description: "Get summary of all tasks across workspace or project with their current status",
      parameters: {
        type: "object",
        properties: {
          workspace_id: {
            type: "string",
            description: "Workspace UUID"
          },
          project_id: {
            type: "string",
            description: "Optional: Filter to specific project UUID"
          },
          status_filter: {
            type: "string",
            description: "Optional: Filter by status (task_redline, in_progress, done_completed, etc.)"
          }
        },
        required: ["workspace_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_project_timeline",
      description: "Get chronological timeline of all events for a specific project",
      parameters: {
        type: "object",
        properties: {
          project_id: {
            type: "string",
            description: "Project UUID"
          },
          days: {
            type: "number",
            description: "Number of days to look back (default 30)"
          }
        },
        required: ["project_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_knowledge_base",
      description: "Search through uploaded documents and files in the knowledge base to find relevant information. Use this when users ask questions that might be answered by uploaded building codes, documents, or reference materials.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query to find relevant information"
          },
          workspace_id: {
            type: "string",
            description: "Workspace UUID to search within"
          },
          limit: {
            type: "number",
            description: "Maximum number of results to return (default 5)"
          }
        },
        required: ["query", "workspace_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_project_files",
      description: "Search through project-specific AI context files and documents in the 'MyHome AI Project Assets' folder. Use this when the user asks questions about a specific project's details, history, decisions, or uploaded documents.",
      parameters: {
        type: "object",
        properties: {
          project_id: {
            type: "string",
            description: "UUID of the project to search within"
          },
          query: {
            type: "string",
            description: "Search query or question to find relevant information in project files"
          }
        },
        required: ["project_id", "query"]
      }
    }
  }
];

// UUID validation helper
function validateUUID(value: string): { valid: boolean; error?: string } {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!value) {
    return { valid: false, error: "Project ID is required" };
  }
  
  if (value.includes(" ")) {
    return { 
      valid: false, 
      error: `Invalid project_id: "${value}" looks like a project name (contains spaces). You must use the UUID from "⭐ IMPORTANT - Project ID" in the context.` 
    };
  }
  
  if (value.length < 32) {
    return { 
      valid: false, 
      error: `Invalid project_id: "${value}" is too short. You must use the full UUID (36 characters with hyphens) from the Project Context.` 
    };
  }
  
  if (!uuidRegex.test(value)) {
    return { 
      valid: false, 
      error: `Invalid project_id format: "${value}". Must be a UUID like "a1b2c3d4-e5f6-7890-abcd-ef1234567890". Check the "⭐ IMPORTANT - Project ID" line in the context.` 
    };
  }
  
  return { valid: true };
}

// Verify project exists
async function verifyProjectExists(projectId: string, supabase: any): Promise<{ exists: boolean; error?: string }> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .maybeSingle();
  
  if (error) {
    return { exists: false, error: `Database error: ${error.message}` };
  }
  
  if (!data) {
    return { 
      exists: false, 
      error: `Project with ID "${projectId}" not found. Please use the exact UUID from the Project Context.` 
    };
  }
  
  return { exists: true };
}

// Activity logger helper
async function logActivity(
  supabase: any,
  workspaceId: string,
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  changeSummary: string,
  projectId?: string,
  oldValue?: any,
  newValue?: any
) {
  try {
    await supabase.from('activity_log').insert({
      workspace_id: workspaceId,
      project_id: projectId,
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      change_summary: changeSummary,
      old_value: oldValue,
      new_value: newValue
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

// Generate system prompt with clear UUID instructions
function generateSystemPrompt(projectId?: string, projectName?: string, projectContext?: string): string {
  let prompt = `You are a helpful AI assistant for a project management workspace.

════════════════════════════════════════
⭐ ACTIVE PROJECT CONTEXT
════════════════════════════════════════`;

  if (projectId && projectName) {
    prompt += `
Project UUID: ${projectId}
Project Name: ${projectName}
**COPY THIS UUID FOR ALL TOOL CALLS**`;
  } else {
    prompt += `
No specific project selected (viewing all projects)`;
  }

  prompt += `
════════════════════════════════════════

CRITICAL RULES FOR TOOL USAGE:
1. Find the line "⭐ IMPORTANT - Project ID" in the context below
2. Copy the UUID EXACTLY (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
3. Use that UUID for project_id parameters - NEVER use project names

EXAMPLES OF CORRECT ✅ vs WRONG ❌ USAGE:

create_task:
✅ CORRECT: { "project_id": "a7f3e2c1-9b4d-4e8a-b2f1-3c5d6e7f8a9b", "title": "Design review" }
❌ WRONG: { "project_id": "1638 D Street", "title": "Design review" }
❌ WRONG: { "project_id": "redline", "title": "Design review" }

update_project_status:
✅ CORRECT: { "project_id": "a7f3e2c1-9b4d-4e8a-b2f1-3c5d6e7f8a9b", "status": "active" }
❌ WRONG: { "project_id": "Smith Project", "status": "active" }

AFTER CALLING A TOOL:
- Confirm the action naturally: "I've created the task..."
- Do NOT repeat the UUID to the user
- Focus on what was accomplished

YOUR CAPABILITIES:
- create_task: Create new tasks in projects
- update_task_status: Update task status
- update_project_status: Update project status or phase
- read_folder: Read and list files in a project folder (Pre-Design, Design, Permit, Build)
- create_note: Create a note file in the Design folder
- update_metadata: Update the project.meta.md file with decisions
- get_recent_activity: View recent activity across workspace or project
- summarize_tasks: Get task summary with status breakdown
- get_project_timeline: Show chronological project history

EXAMPLE TOOL CALLS:

Example 4 - Read project files:
User: "What files do we have in the Design folder?"
You call: read_folder(project_id="${projectId || 'PROJECT_UUID_HERE'}", folder="Design")

Example 5 - Create a note:
User: "Create a note about the zoning constraints we discussed"
You call: create_note(
  project_id="${projectId || 'PROJECT_UUID_HERE'}",
  title="Zoning Constraints",
  content="## Key Constraints\\n- 15' front setback\\n- 8' side setback\\n- FAR 3.5 maximum"
)

Example 6 - Get recent activity:
User: "What's been happening recently?"
You call: get_recent_activity(workspace_id="WORKSPACE_UUID", limit=20)

Example 7 - Summarize tasks:
User: "Give me a summary of all tasks"
You call: summarize_tasks(workspace_id="WORKSPACE_UUID")

Keep responses clear, concise, and actionable.`;

  if (projectContext) {
    prompt += `\n\n${projectContext}`;
  }

  return prompt;
}

// Execute tool calls
async function executeTool(toolName: string, args: any, supabase: any, userId: string) {
  console.log(`Executing tool: ${toolName}`, args);

  switch (toolName) {
    case "create_task": {
      const { project_id, title, description, priority, assignee_id } = args;
      
      // Validate UUID format
      const validation = validateUUID(project_id);
      if (!validation.valid) {
        console.error("UUID validation failed:", validation.error);
        return { success: false, error: validation.error };
      }
      
      // Verify project exists
      const projectCheck = await verifyProjectExists(project_id, supabase);
      if (!projectCheck.exists) {
        console.error("Project verification failed:", projectCheck.error);
        return { success: false, error: projectCheck.error };
      }
      
      const taskData: any = {
        project_id,
        title,
        description: description || "",
        priority: priority || "medium",
        status: "task_redline",
        created_by: userId,
        assignees: assignee_id ? [assignee_id] : []
      };

      const { data, error } = await supabase
        .from("tasks")
        .insert(taskData)
        .select()
        .single();

      if (error) {
        console.error("Error creating task:", error);
        return { 
          success: false, 
          error: `Failed to create task: ${error.message}`
        };
      }

      // Get workspace_id for activity logging
      const { data: project } = await supabase
        .from("projects")
        .select("workspace_id")
        .eq("id", project_id)
        .single();

      if (project) {
        await logActivity(
          supabase,
          project.workspace_id,
          userId,
          'created',
          'task',
          data.id,
          `Created task: ${title}`,
          project_id,
          null,
          { title, status: 'task_redline', priority }
        );
      }

      return { 
        success: true, 
        task: data,
        message: `Task "${title}" has been created successfully with ${priority} priority.`
      };
    }

    case "update_task_status": {
      const { task_id, status } = args;

      // Get old task data first (for change tracking)
      const { data: oldTask } = await supabase
        .from("tasks")
        .select("status, title, project_id")
        .eq("id", task_id)
        .single();

      // Update task
      const { data, error } = await supabase
        .from("tasks")
        .update({ status, updated_by: userId })
        .eq("id", task_id)
        .select()
        .single();

      if (error) {
        console.error("Error updating task:", error);
        return { success: false, error: error.message };
      }

      // Get workspace_id and log activity
      const { data: project } = await supabase
        .from("projects")
        .select("workspace_id")
        .eq("id", data.project_id)
        .single();

      if (project && oldTask) {
        await logActivity(
          supabase,
          project.workspace_id,
          userId,
          'updated',
          'task',
          task_id,
          `Changed status from ${oldTask.status} to ${status}`,
          data.project_id,
          { status: oldTask.status },
          { status: status }
        );
      }

      return { 
        success: true, 
        task: data,
        message: `Task status has been updated to ${status}.`
      };
    }

    case "update_project_status": {
      const { project_id, status, phase } = args;
      
      // Validate UUID format
      const validation = validateUUID(project_id);
      if (!validation.valid) {
        console.error("UUID validation failed:", validation.error);
        return { success: false, error: validation.error };
      }
      
      // Validate phase if provided
      const validPhases = ["Pre-Design", "Design", "Permit", "Build"];
      if (phase && !validPhases.includes(phase)) {
        return { 
          success: false, 
          error: `Invalid phase: "${phase}". Must be one of: ${validPhases.join(", ")}` 
        };
      }
      
      // Validate status
      const validStatuses = ["active", "pending", "completed", "archived"];
      if (!validStatuses.includes(status)) {
        return { 
          success: false, 
          error: `Invalid status: "${status}". Must be one of: ${validStatuses.join(", ")}` 
        };
      }
      
      // Verify project exists and get old values before update
      const { data: oldProject, error: fetchError } = await supabase
        .from("projects")
        .select("id, name, phase, status, workspace_id")
        .eq("id", project_id)
        .single();

      if (fetchError || !oldProject) {
        console.error("Project verification failed:", fetchError?.message);
        return { success: false, error: `Project with ID "${project_id}" not found. Please use the exact UUID from the Project Context.` };
      }

      const updateData: any = { status, updated_by: userId };
      if (phase) updateData.phase = phase;

      const { data, error } = await supabase
        .from("projects")
        .update(updateData)
        .eq("id", project_id)
        .select()
        .single();

      if (error) {
        console.error("Error updating project:", error);
        return { success: false, error: `Failed to update project: ${error.message}` };
      }

      // Log activity with old and new values
      await logActivity(
        supabase,
        oldProject.workspace_id,
        userId,
        'updated',
        'project',
        project_id,
        `Changed ${phase ? 'phase to ' + phase : 'status to ' + status}`,
        project_id,
        { phase: oldProject.phase, status: oldProject.status },
        { phase: phase || oldProject.phase, status: status || oldProject.status }
      );

      return { 
        success: true, 
        project: data,
        message: `Project has been updated to ${status}${phase ? ` in ${phase} phase` : ""}.`
      };
    }

    case "read_folder": {
      const { project_id, folder } = args;

      // Validate UUID
      const uuidValidation = validateUUID(project_id);
      if (!uuidValidation.valid) {
        return {
          success: false,
          error: `❌ ${uuidValidation.error}`
        };
      }

      // Verify project exists
      const projectCheck = await verifyProjectExists(project_id, supabase);
      if (!projectCheck.exists) {
        return { success: false, error: projectCheck.error };
      }

      try {
        // Query files in folder
        const { data: folderRecord } = await supabase
          .from("folders")
          .select("id")
          .eq("project_id", project_id)
          .eq("name", folder)
          .single();

        if (!folderRecord) {
          return {
            success: true,
            data: {
              message: `No files in ${folder} folder`,
              content: `No files in ${folder} folder`
            }
          };
        }

        const { data: files } = await supabase
          .from("files")
          .select("*")
          .eq("folder_id", folderRecord.id)
          .is("deleted_at", null)
          .order("created_at");

        if (!files || files.length === 0) {
          return {
            success: true,
            data: {
              message: `No files in ${folder} folder`,
              content: `No files in ${folder} folder`
            }
          };
        }

        let summary = `\n## Files in ${folder} Folder\n`;
        summary += `Total files: ${files.length}\n\n`;

        for (const file of files) {
          summary += `### ${file.filename}\n`;
          summary += `- Version: ${file.version_number || 1}\n`;
          summary += `- Size: ${((file.filesize || 0) / 1024).toFixed(2)} KB\n`;
          summary += `- Modified: ${new Date(file.updated_at).toLocaleDateString()}\n\n`;
        }

        // Log activity for folder access
        const { data: project } = await supabase
          .from("projects")
          .select("workspace_id")
          .eq("id", project_id)
          .single();

        if (project) {
          await logActivity(
            supabase,
            project.workspace_id,
            userId,
            'read',
            'folder',
            project_id, // Using project_id as resource_id for folder access
            `Viewed ${folder} folder (${files.length} files)`,
            project_id,
            null,
            { folder, file_count: files.length }
          );
        }

        return {
          success: true,
          data: {
            message: `✅ Retrieved ${files.length} file(s) from ${folder}`,
            content: summary
          }
        };
      } catch (error: any) {
        return {
          success: false,
          error: `Failed to read folder: ${error.message}`
        };
      }
    }

    case "create_note": {
      const { project_id, title, content } = args;

      // Validate UUID
      const uuidValidation = validateUUID(project_id);
      if (!uuidValidation.valid) {
        return {
          success: false,
          error: `❌ ${uuidValidation.error}`
        };
      }

      // Verify project exists
      const projectCheck = await verifyProjectExists(project_id, supabase);
      if (!projectCheck.exists) {
        return { success: false, error: projectCheck.error };
      }

      try {
        // Generate filename from title
        const filename = `${title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")}.md`;

        // Format content as markdown
        const markdownContent = `# ${title}\n\n${content}\n\n---\n_Created: ${new Date().toISOString()}_`;

        // Get Design folder
        let { data: folderRecord } = await supabase
          .from("folders")
          .select("id")
          .eq("project_id", project_id)
          .eq("name", "Design")
          .single();

        if (!folderRecord) {
          const createFolderResult = await supabase
            .from("folders")
            .insert({
              project_id,
              name: "Design",
              is_system_folder: true,
              path: "/Design",
              created_by: userId
            })
            .select()
            .single();

          if (createFolderResult.error) {
            return {
              success: false,
              error: `Failed to create folder: ${createFolderResult.error.message}`
            };
          }

          folderRecord = createFolderResult.data;
        }

        // Upload to storage
        const storagePath = `${project_id}/Design/${filename}`;
        const { error: uploadError } = await supabase.storage
          .from("project-files")
          .upload(storagePath, markdownContent, { upsert: false });

        if (uploadError) {
          if (uploadError.message.includes("already exists")) {
            return {
              success: false,
              error: `File "${filename}" already exists in Design folder`
            };
          }
          return { success: false, error: `Upload failed: ${uploadError.message}` };
        }

        // Record in database
        const size = new Blob([markdownContent]).size;
        const { data: fileRecord, error: dbError } = await supabase
          .from("files")
          .insert({
            project_id,
            folder_id: folderRecord.id,
            filename,
            storage_path: storagePath,
            filesize: size,
            mimetype: "text/markdown",
            uploaded_by: userId,
            version_number: 1
          })
          .select()
          .single();

        if (dbError) {
          // Clean up uploaded file if DB insert fails
          await supabase.storage.from("project-files").remove([storagePath]);
          return { success: false, error: `Database record failed: ${dbError.message}` };
        }

        // Get workspace_id for activity logging
        const { data: project } = await supabase
          .from("projects")
          .select("workspace_id")
          .eq("id", project_id)
          .single();

        if (project) {
          await logActivity(
            supabase,
            project.workspace_id,
            userId,
            'created',
            'note',
            fileRecord.id,
            `Created note: ${title}`,
            project_id,
            null,
            { title, folder: 'Design' }
          );
        }

        return {
          success: true,
          data: {
            fileId: fileRecord.id,
            message: `✅ Created note: "${title}" in Design folder`
          }
        };
      } catch (error: any) {
        return {
          success: false,
          error: `Error creating note: ${error.message}`
        };
      }
    }

    case "update_metadata": {
      const { project_id, content } = args;

      // Validate UUID
      const uuidValidation = validateUUID(project_id);
      if (!uuidValidation.valid) {
        return {
          success: false,
          error: `❌ ${uuidValidation.error}`
        };
      }

      // Verify project exists
      const projectCheck = await verifyProjectExists(project_id, supabase);
      if (!projectCheck.exists) {
        return { success: false, error: projectCheck.error };
      }

      try {
        // Check if project.meta.md exists
        const { data: existing } = await supabase
          .from("files")
          .select("id, storage_path, version_number")
          .eq("project_id", project_id)
          .eq("filename", "project.meta.md")
          .single();

        if (existing) {
          // Update existing file
          const { error: uploadError } = await supabase.storage
            .from("project-files")
            .update(existing.storage_path, content, { upsert: true });

          if (uploadError) {
            return { success: false, error: `Upload failed: ${uploadError.message}` };
          }

          const newVersion = (existing.version_number || 1) + 1;
          const size = new Blob([content]).size;

          const { error: dbError } = await supabase
            .from("files")
            .update({
              version_number: newVersion,
              filesize: size,
              updated_at: new Date().toISOString()
            })
            .eq("id", existing.id);

          if (dbError) {
            return { success: false, error: `Version update failed: ${dbError.message}` };
          }

          // Log activity for metadata update
          const { data: project } = await supabase
            .from("projects")
            .select("workspace_id")
            .eq("id", project_id)
            .single();

          if (project) {
            await logActivity(
              supabase,
              project.workspace_id,
              userId,
              'updated',
              'file',
              existing.id,
              `Updated project.meta.md to version ${newVersion}`,
              project_id,
              { version: existing.version_number },
              { version: newVersion }
            );
          }

          return {
            success: true,
            data: {
              message: `✅ Updated project.meta.md (version ${newVersion})`
            }
          };
        } else {
          // Create new in Pre-Design folder
          let { data: folderRecord } = await supabase
            .from("folders")
            .select("id")
            .eq("project_id", project_id)
            .eq("name", "Pre-Design")
            .single();

          if (!folderRecord) {
            const createFolderResult = await supabase
              .from("folders")
              .insert({
                project_id,
                name: "Pre-Design",
                is_system_folder: true,
                path: "/Pre-Design",
                created_by: userId
              })
              .select()
              .single();

            if (createFolderResult.error) {
              return {
                success: false,
                error: `Failed to create folder: ${createFolderResult.error.message}`
              };
            }

            folderRecord = createFolderResult.data;
          }

          const storagePath = `${project_id}/Pre-Design/project.meta.md`;
          const { error: uploadError } = await supabase.storage
            .from("project-files")
            .upload(storagePath, content, { upsert: false });

          if (uploadError) {
            return { success: false, error: `Upload failed: ${uploadError.message}` };
          }

          const size = new Blob([content]).size;
          const { data: fileRecord, error: dbError } = await supabase
            .from("files")
            .insert({
              project_id,
              folder_id: folderRecord.id,
              filename: "project.meta.md",
              storage_path: storagePath,
              filesize: size,
              mimetype: "text/markdown",
              uploaded_by: userId,
              version_number: 1
            })
            .select()
            .single();

          if (dbError) {
            await supabase.storage.from("project-files").remove([storagePath]);
            return { success: false, error: `Database record failed: ${dbError.message}` };
          }

          // Log activity for metadata creation
          const { data: project } = await supabase
            .from("projects")
            .select("workspace_id")
            .eq("id", project_id)
            .single();

          if (project && fileRecord) {
            await logActivity(
              supabase,
              project.workspace_id,
              userId,
              'created',
              'file',
              fileRecord.id,
              `Created project.meta.md in Pre-Design folder`,
              project_id,
              null,
              { filename: "project.meta.md", folder: "Pre-Design" }
            );
          }

          return {
            success: true,
            data: {
              message: `✅ Created project.meta.md in Pre-Design folder`
            }
          };
        }
      } catch (error: any) {
        return {
          success: false,
          error: `Error updating metadata: ${error.message}`
        };
      }
    }

    case 'get_recent_activity': {
      const { workspace_id, project_id, limit = 20, resource_type } = args;
      
      let query = supabase
        .from('activity_log')
        .select(`
          *,
          user:users!activity_log_user_id_fkey(name, email),
          project:projects(name, short_id)
        `)
        .eq('workspace_id', workspace_id)
        .order('created_at', { ascending: false })
        .limit(Math.min(limit, 100));
      
      if (project_id) {
        query = query.eq('project_id', project_id);
      }
      
      if (resource_type) {
        query = query.eq('resource_type', resource_type);
      }
      
      const { data, error } = await query;
      
      if (error) {
        return { success: false, error: `Error fetching activity: ${error.message}` };
      }
      
      if (!data || data.length === 0) {
        return {
          success: true,
          message: 'No recent activity found',
          data: []
        };
      }

      const activityList = data.map((a: any) => 
        `- ${a.user?.name || 'Unknown'} ${a.action} ${a.resource_type}` +
        `${a.project ? ` in "${a.project.name}"` : ''}` +
        `${a.change_summary ? ': ' + a.change_summary : ''}` +
        ` (${new Date(a.created_at).toLocaleString()})`
      ).join('\n');
      
      return {
        success: true,
        message: `Found ${data.length} recent activities:\n\n${activityList}`,
        data
      };
    }

    case 'summarize_tasks': {
      const { workspace_id, project_id, status_filter } = args;
      
      // Get all projects in workspace
      let projectQuery = supabase
        .from('projects')
        .select('id, name, short_id')
        .eq('workspace_id', workspace_id)
        .is('deleted_at', null);
      
      if (project_id) {
        projectQuery = projectQuery.eq('id', project_id);
      }
      
      const { data: projects, error: projectError } = await projectQuery;
      
      if (projectError) {
        return { success: false, error: `Error fetching projects: ${projectError.message}` };
      }

      if (!projects || projects.length === 0) {
        return {
          success: true,
          message: 'No projects found in workspace',
          data: { total: 0, summary: {} }
        };
      }
      
      // Get tasks for these projects
      const projectIds = projects.map((p: any) => p.id);
      
      let taskQuery = supabase
        .from('tasks')
        .select('*')
        .in('project_id', projectIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (status_filter) {
        taskQuery = taskQuery.eq('status', status_filter);
      }
      
      const { data: tasks, error: taskError } = await taskQuery;
      
      if (taskError) {
        return { success: false, error: `Error fetching tasks: ${taskError.message}` };
      }

      if (!tasks || tasks.length === 0) {
        return {
          success: true,
          message: 'No tasks found',
          data: { total: 0, summary: {} }
        };
      }
      
      // Group by project and status
      const projectMap = new Map(projects.map((p: any) => [p.id, p]));
      const summary: Record<string, number> = {};
      
      tasks.forEach((task: any) => {
        const project = projectMap.get(task.project_id);
        const key = `${(project as any)?.name || 'Unknown'} (${task.status})`;
        summary[key] = (summary[key] || 0) + 1;
      });

      const summaryText = Object.entries(summary)
        .map(([key, count]) => `${key}: ${count} tasks`)
        .join('\n');

      const recentTasks = tasks.slice(0, 10).map((t: any) => 
        `- ${t.title} (${t.status}) in ${(projectMap.get(t.project_id) as any)?.name}`
      ).join('\n');
      
      return {
        success: true,
        message: `Task Summary:\n\nTotal tasks: ${tasks.length}\n\n${summaryText}\n\nRecent tasks:\n${recentTasks}`,
        data: { total: tasks.length, summary, tasks }
      };
    }

    case 'get_project_timeline': {
      const { project_id, days = 30 } = args;
      
      const uuidValidation = validateUUID(project_id);
      if (!uuidValidation.valid) {
        return { success: false, error: uuidValidation.error };
      }
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('activity_log')
        .select(`
          *,
          user:users!activity_log_user_id_fkey(name)
        `)
        .eq('project_id', project_id)
        .gte('created_at', cutoffDate.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) {
        return { success: false, error: `Error fetching timeline: ${error.message}` };
      }

      if (!data || data.length === 0) {
        return {
          success: true,
          message: `No activity in the last ${days} days`,
          data: []
        };
      }

      const timeline = data.map((a: any) => 
        `${new Date(a.created_at).toLocaleDateString()} - ` +
        `${a.user?.name || 'Unknown'} ${a.action} ${a.resource_type}: ` +
        `${a.change_summary}`
      ).join('\n');
      
      return {
        success: true,
        message: `Project Timeline (last ${days} days):\n\n${timeline}`,
        data
      };
    }

    case 'search_knowledge_base': {
      const { query, workspace_id, limit = 5 } = args;
      
      // Generate embedding for the search query
      const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
      if (!OPENAI_API_KEY) {
        return { success: false, error: 'OPENAI_API_KEY not configured' };
      }

      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          dimensions: 768,
          input: query
        })
      });

      if (!embeddingResponse.ok) {
        return { success: false, error: 'Failed to generate search embedding' };
      }

      const embeddingData = await embeddingResponse.json();
      const queryEmbedding = embeddingData.data[0].embedding;

      // Search knowledge base using vector similarity
      const { data, error } = await supabase.rpc('search_knowledge_base', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: limit,
        filter_workspace_id: workspace_id
      });

      if (error) {
        return { success: false, error: `Search failed: ${error.message}` };
      }

      if (!data || data.length === 0) {
        return {
          success: true,
          message: 'No relevant information found in knowledge base. The knowledge base may be empty or the query may not match any uploaded documents.',
          data: []
        };
      }

      const results = data.map((item: any, index: number) => 
        `[${index + 1}] From "${item.file_name}" (similarity: ${(item.similarity * 100).toFixed(1)}%):\n${item.chunk_content.substring(0, 500)}...`
      ).join('\n\n');

      return {
        success: true,
        message: `Found ${data.length} relevant sections in knowledge base:\n\n${results}`,
        data
      };
    }

    case 'search_project_files': {
      const { project_id, query } = args;

      // Validate UUID
      const uuidValidation = validateUUID(project_id);
      if (!uuidValidation.valid) {
        return {
          success: false,
          error: `❌ ${uuidValidation.error}`
        };
      }

      // Verify project exists
      const projectCheck = await verifyProjectExists(project_id, supabase);
      if (!projectCheck.exists) {
        return { success: false, error: projectCheck.error };
      }

      try {
        // Get the MyHome AI Project Assets folder
        const { data: folder } = await supabase
          .from('folders')
          .select('id')
          .eq('project_id', project_id)
          .eq('name', 'MyHome AI Project Assets')
          .single();

        if (!folder) {
          return {
            success: false,
            error: 'MyHome AI Project Assets folder not found for this project'
          };
        }

        // Get all files in the folder
        const { data: files } = await supabase
          .from('files')
          .select('id, filename, storage_path, mimetype, filesize, created_at')
          .eq('folder_id', folder.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (!files || files.length === 0) {
          return {
            success: true,
            message: 'No AI project files found yet. Files will appear here as the project progresses.',
            data: []
          };
        }

        // Read content from text-based and PDF files
        const queryLower = query.toLowerCase();
        const searchResults: any[] = [];

        for (const file of files) {
          try {
            // Download file content
            const { data: fileBlob, error: downloadError } = await supabase.storage
              .from('project-files')
              .download(file.storage_path);

            if (downloadError || !fileBlob) continue;

            let textContent = '';

            // Handle different file types
            if (file.mimetype?.includes('text') || file.mimetype?.includes('markdown') || 
                file.mimetype?.includes('json') || file.filename?.endsWith('.md') || 
                file.filename?.endsWith('.txt')) {
              textContent = await fileBlob.text();
            } else if (file.mimetype?.includes('pdf') || file.filename?.endsWith('.pdf')) {
              // For PDFs, we'll skip for now or add simple text extraction
              // In a production system, you'd use a PDF parser here
              textContent = `[PDF file: ${file.filename}]`;
            }

            // Simple text search (case-insensitive)
            if (textContent.toLowerCase().includes(queryLower)) {
              // Find relevant excerpts
              const lines = textContent.split('\n');
              const relevantLines: string[] = [];
              
              for (let i = 0; i < lines.length; i++) {
                if (lines[i].toLowerCase().includes(queryLower)) {
                  // Get context: 2 lines before and after
                  const start = Math.max(0, i - 2);
                  const end = Math.min(lines.length, i + 3);
                  relevantLines.push(lines.slice(start, end).join('\n'));
                }
              }

              searchResults.push({
                filename: file.filename,
                excerpts: relevantLines.slice(0, 3), // Limit to 3 excerpts per file
                size: file.filesize,
                created: file.created_at
              });
            }
          } catch (fileError) {
            console.error(`Error reading file ${file.filename}:`, fileError);
          }
        }

        if (searchResults.length === 0) {
          return {
            success: true,
            message: `No matches found for "${query}" in project AI files. Try a different search term or check if relevant files have been uploaded.`,
            data: []
          };
        }

        // Format results
        const formattedResults = searchResults.map((result, index) => {
          const excerpts = result.excerpts.map((excerpt: string) => 
            `    ${excerpt.substring(0, 300)}${excerpt.length > 300 ? '...' : ''}`
          ).join('\n\n');
          
          return `[${index + 1}] From "${result.filename}":\n${excerpts}`;
        }).join('\n\n---\n\n');

        return {
          success: true,
          message: `Found ${searchResults.length} project file(s) matching "${query}":\n\n${formattedResults}`,
          data: searchResults
        };

      } catch (error: any) {
        return {
          success: false,
          error: `Error searching project files: ${error.message}`
        };
      }
    }

    default:
      return { success: false, error: "Unknown tool" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, threadId, workspaceId, projectId, projectName, projectContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Get user ID from auth header
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { data: { user } } = await supabase.auth.getUser(token);
    const userId = user?.id;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    // Generate system prompt with clear UUID guidance
    const systemPrompt = generateSystemPrompt(projectId, projectName, projectContext);

    // Initial AI call with tools
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        tools: tools,
        stream: false, // First call non-streaming to check for tool calls
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const choice = data.choices[0];
    const message = choice.message;

    // Check if AI wants to call tools
    if (message.tool_calls && message.tool_calls.length > 0) {
      console.log("AI requested tool calls:", message.tool_calls);

      // Execute all requested tools
      const toolResults = await Promise.all(
        message.tool_calls.map(async (toolCall: any) => {
          const toolName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);
          const result = await executeTool(toolName, args, supabase, userId);
          
          return {
            tool_call_id: toolCall.id,
            role: "tool",
            name: toolName,
            content: JSON.stringify(result)
          };
        })
      );

      // Call AI again with tool results to get final response - THIS TIME STREAMING
      const finalResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
            message, // Include the assistant's tool call message
            ...toolResults // Include tool results
          ],
          stream: true,
        }),
      });

      if (!finalResponse.ok) {
        throw new Error("Failed to get final response after tool execution");
      }

      // Stream the final response back to client
      return new Response(finalResponse.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // No tool calls - stream the response directly
    const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    return new Response(streamResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
