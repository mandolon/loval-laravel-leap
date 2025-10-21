import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Send, Bot, User, FileText, Plus } from "lucide-react";
import ChatSummarizer from "@/components/chat/ChatSummarizer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAIChat } from "@/hooks/useAIChat";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useProjects } from "@/lib/api/hooks/useProjects";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSubhead } from "@/components/layout/PageSubhead";
import { DESIGN_TOKENS as T } from "@/lib/design-tokens";

type Message = { role: "user" | "assistant"; content: string };

export default function AIChatPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlThreadId = searchParams.get("thread");
  const { user } = useUser();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [threadId, setThreadId] = useState<string>("");
  const [selectedProject, setSelectedProject] = useState<string>("select");
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { sendMessage, isLoading } = useAIChat(threadId, workspaceId || "", selectedProject);
  const { data: projects = [] } = useProjects(workspaceId || "");

  // Load or create thread
  useEffect(() => {
    if (!workspaceId || !user) return;

    const loadThread = async () => {
      // If URL has thread ID, load that specific thread
      if (urlThreadId) {
        setThreadId(urlThreadId);
        
        const { data: msgs } = await supabase
          .from("ai_chat_messages")
          .select("*")
          .eq("thread_id", urlThreadId)
          .is("deleted_at", null)
          .order("created_at", { ascending: true });

        if (msgs) {
          setMessages(msgs.map(m => ({ 
            role: m.message_type as "user" | "assistant", 
            content: m.content 
          })));
        }
      } else {
        // No thread specified - clear state and wait for user to create one
        setThreadId("");
        setMessages([]);
      }
    };

    loadThread();
  }, [workspaceId, user, urlThreadId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleNewChat = async () => {
    if (!workspaceId || !user) return;

    // Create a new thread
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
      setMessages([]);
      setSearchParams({ thread: newThread.id });
      toast({
        title: "New chat started",
        description: "You can now begin a fresh conversation.",
      });
    }
  };

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
    <div className="h-screen w-full overflow-hidden bg-slate-50 dark:bg-[#0B0E14] text-slate-700 dark:text-neutral-200 flex gap-1 p-1">
      <div className="relative min-h-0 flex-1 w-full overflow-hidden">
        <div className={`${T.panel} ${T.radius} min-h-0 min-w-0 grid grid-rows-[auto_1fr_auto] overflow-hidden h-full`}>
          {/* Header */}
          <div className="h-9 px-3 border-b border-slate-200 dark:border-[#1d2230] flex items-center justify-between bg-white dark:bg-[#0E1118]">
            <span className="text-[12px] font-medium">AI Assistant</span>
            <div className="flex gap-2">
              <Button
                onClick={handleNewChat}
                variant="outline"
                size="sm"
                className="gap-2 h-7 text-xs"
              >
                <Plus className="h-3 w-3" />
                New Chat
              </Button>
              {messages.length > 0 && threadId && workspaceId && selectedProject !== "select" && (
                <ChatSummarizer
                  threadId={threadId}
                  workspaceId={workspaceId}
                  projectId={selectedProject === "all" ? workspaceId : selectedProject}
                  userId={user?.id || ""}
                  messages={messages}
                />
              )}
            </div>
          </div>

          {/* Content */}
          <ScrollArea ref={scrollRef} className="flex-1 overflow-auto bg-white dark:bg-[#0F1219]">
            <div className="max-w-3xl mx-auto p-4 space-y-4">
              {!threadId ? (
                <div className="text-center py-20">
                  <Bot className="h-16 w-16 mx-auto mb-6 opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">No Chat Selected</h3>
                  <p className="text-muted-foreground mb-6">
                    Start a new conversation or select an existing chat from the sidebar
                  </p>
                  <Button onClick={handleNewChat} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Start New Chat
                  </Button>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Start a conversation with your AI assistant</p>
                </div>
              ) : (
                messages.map((msg, i) => (
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
                ))
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="border-t border-slate-200 dark:border-[#1d2230] p-4 bg-white dark:bg-[#0E1118]">
            <div className="max-w-3xl mx-auto space-y-2">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder={threadId ? "Ask me anything..." : "Create a new chat to start messaging"}
                  disabled={isLoading || !threadId}
                  className="flex-1"
                />
                <Button onClick={handleSend} disabled={isLoading || !input.trim() || !threadId}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              {threadId && (
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="w-48 h-8 text-sm">
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
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
