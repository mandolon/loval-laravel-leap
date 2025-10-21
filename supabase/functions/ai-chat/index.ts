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

// Execute tool calls
async function executeTool(toolName: string, args: any, supabase: any, userId: string) {
  console.log(`Executing tool: ${toolName}`, args);

  switch (toolName) {
    case "create_task": {
      const { project_id, title, description, priority, assignee_id } = args;
      
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
          error: error.message,
          hint: "Make sure you're using the Project ID (UUID format like 'a1b2c3d4-...'), not the project name. Check the Project Context for the correct ID."
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
        return { success: false, error: error.message };
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
    const { messages, threadId, workspaceId, projectId, projectContext } = await req.json();
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

    // System prompt with tool usage instructions
    let systemPrompt = `You are a helpful AI assistant for a project management workspace. 
You help users manage their projects, tasks, files, and team collaboration.

You have access to tools that allow you to perform actions:
- create_task: Create new tasks in projects
- update_task_status: Update task status (mark as complete, in progress, etc.)
- update_project_status: Update project status or phase

CRITICAL: When using tools, you MUST use the exact Project ID (UUID format) provided in the context, NOT the project name.
The context will show "IMPORTANT - Project ID (use this for all tool calls): <uuid>" - always use this UUID value for project_id parameters.

When a user asks you to perform an action, use the appropriate tool. Always confirm what you've done in a natural, conversational way.

Keep answers clear, concise, and actionable.`;

    if (projectContext) {
      systemPrompt += `\n\n${projectContext}`;
    }

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
