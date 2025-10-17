import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Send, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAIChat } from "@/hooks/useAIChat";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useProjects } from "@/lib/api/hooks/useProjects";

type Message = { role: "user" | "assistant"; content: string };

export default function AIChatPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { user } = useUser();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [threadId, setThreadId] = useState<string>("");
  const [selectedProject, setSelectedProject] = useState<string>("select");
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { sendMessage, isLoading } = useAIChat(threadId, workspaceId || "");
  const { data: projects = [] } = useProjects(workspaceId || "");

  // Load or create thread
  useEffect(() => {
    if (!workspaceId || !user) return;

    const loadThread = async () => {
      // Get most recent thread for this workspace
      const { data: threads } = await supabase
        .from("ai_chat_threads")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1);

      if (threads && threads.length > 0) {
        setThreadId(threads[0].id);
        
        // Load messages for this thread
        const { data: msgs } = await supabase
          .from("ai_chat_messages")
          .select("*")
          .eq("thread_id", threads[0].id)
          .order("created_at", { ascending: true });

        if (msgs) {
          setMessages(msgs.map(m => ({ 
            role: m.message_type as "user" | "assistant", 
            content: m.content 
          })));
        }
      } else {
        // Create new thread
        const { data: newThread } = await supabase
          .from("ai_chat_threads")
          .insert({
            workspace_id: workspaceId,
            user_id: user.id,
            title: "New AI Chat",
          })
          .select()
          .single();

        if (newThread) {
          setThreadId(newThread.id);
        }
      }
    };

    loadThread();
  }, [workspaceId, user]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !threadId || !user) return;

    const userMessage = input.trim();
    setInput("");

    // Add user message to UI
    const newUserMsg: Message = { role: "user", content: userMessage };
    setMessages(prev => [...prev, newUserMsg]);

    // Save user message to DB
    await supabase.from("ai_chat_messages").insert({
      thread_id: threadId,
      message_type: "user",
      content: userMessage,
    });

    let assistantContent = "";
    const upsertAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => 
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    };

    try {
      await sendMessage(
        userMessage,
        messages,
        upsertAssistant,
        async () => {
          // Save assistant message to DB
          await supabase.from("ai_chat_messages").insert({
            thread_id: threadId,
            message_type: "assistant",
            content: assistantContent,
            model: "google/gemini-2.5-flash",
          });
        }
      );
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
      // Remove failed messages
      setMessages(prev => prev.slice(0, -1));
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="border-b p-4">
        <h1 className="text-2xl font-bold">AI Assistant</h1>
        <p className="text-sm text-muted-foreground">
          Ask me anything about your workspace, projects, or tasks
        </p>
      </div>

      <div className="border-b p-4">
        <div className="max-w-3xl mx-auto">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="select">Select Project</SelectItem>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Start a conversation with your AI assistant</p>
            </div>
          )}
          
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Bot className="h-5 w-5 text-primary-foreground" />
                </div>
              )}
              
              <div
                className={`rounded-lg px-4 py-2 max-w-[80%] ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>

              {msg.role === "user" && (
                <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5" />
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <div className="max-w-3xl mx-auto flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Ask me anything..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
