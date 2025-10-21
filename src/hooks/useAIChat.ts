import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { buildAIContext, buildWorkspaceContext } from "@/ai/context-builder";

type Message = { role: "user" | "assistant"; content: string };

export function useAIChat(threadId: string, workspaceId: string, projectId?: string) {
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (
    userMessage: string,
    messages: Message[],
    onDelta: (chunk: string) => void,
    onDone: () => void
  ) => {
    setIsLoading(true);

    try {
      // Get user session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("You must be logged in to use AI chat");
      }

      // Build AI context - always load at least workspace context
      let projectContext = "";
      if (projectId && projectId !== "select" && projectId !== "all") {
        // Specific project selected - load detailed project context
        const context = await buildAIContext(workspaceId, projectId, userMessage);
        projectContext = context.contextString;
      } else {
        // No specific project or "All Projects" - load workspace overview
        const context = await buildWorkspaceContext(workspaceId, userMessage);
        projectContext = context.contextString;
      }

      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
      
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          messages: [...messages, { role: "user", content: userMessage }],
          threadId,
          workspaceId,
          projectId,
          projectContext
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) {
          throw new Error("Rate limit exceeded. Please try again later.");
        }
        if (resp.status === 402) {
          throw new Error("Payment required. Please add funds to continue.");
        }
        throw new Error("Failed to start AI chat stream");
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) onDelta(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Flush remaining buffer
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) onDelta(content);
          } catch {}
        }
      }

      onDone();
    } catch (error) {
      console.error("AI chat error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { sendMessage, isLoading };
}
