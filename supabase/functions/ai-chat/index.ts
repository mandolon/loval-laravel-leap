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

      return { 
        success: true, 
        task: data,
        message: `Task "${title}" has been created successfully with ${priority} priority.`
      };
    }

    case "update_task_status": {
      const { task_id, status } = args;

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
      
      // Verify project exists
      const projectCheck = await verifyProjectExists(project_id, supabase);
      if (!projectCheck.exists) {
        console.error("Project verification failed:", projectCheck.error);
        return { success: false, error: projectCheck.error };
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

      return { 
        success: true, 
        project: data,
        message: `Project has been updated to ${status}${phase ? ` in ${phase} phase` : ""}.`
      };
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
