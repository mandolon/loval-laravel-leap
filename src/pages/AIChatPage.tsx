import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAIChat } from "@/hooks/useAIChat";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useProjects } from "@/lib/api/hooks/useProjects";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatFooter } from "@/components/chat/ChatFooter";
import { QuickActions } from "@/components/chat/QuickActions";
import { MessageList } from "@/components/chat/MessageList";
import { NewChatInput } from "@/components/chat/NewChatInput";

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
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const bottomRef = useRef<HTMLDivElement>(null);
  
  const { sendMessage, isLoading } = useAIChat(threadId, workspaceId || "", selectedProject === "all" ? "" : selectedProject);
  const { data: projects = [] } = useProjects(workspaceId || "");
  
  const chatOpened = !!threadId && messages.length > 0;

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
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
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
    // Create thread if it doesn't exist
    if (!threadId) {
      await handleNewChat();
      return;
    }
    
    if (!input.trim() || isLoading || !user) return;

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
          
          // If this is a project-specific chat, log to history
          if (selectedProject && selectedProject !== "all") {
            const { data: thread } = await supabase
              .from("ai_chat_threads")
              .select('*')
              .eq('id', threadId)
              .single();
            
            if (thread) {
              // Regenerate chats file
              supabase.functions.invoke('sync-project-chats', {
                body: { 
                  projectId: selectedProject, 
                  action: 'regenerate',
                  userId: user?.id 
                }
              }).catch(err => console.error('Failed to regenerate chats:', err));
              
              // Log to history with simple summary
              supabase.functions.invoke('sync-project-chats', {
                body: {
                  projectId: selectedProject,
                  action: 'log_completion',
                  chatThread: thread,
                  summary: `Discussion about: ${userMessage.substring(0, 100)}`,
                  keyDecisions: [],
                  actionItems: []
                }
              }).catch(err => console.error('Failed to log chat history:', err));
            }
          }
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

  const handleQuickAction = (description: string) => {
    setInput(description);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Center container for all chat content */}
      <div className="relative flex h-full flex-col overflow-hidden">
        
        {/* Message display area */}
        <div className="flex-1 min-h-0">
          <MessageList
            messages={messages}
            isLoading={isLoading}
            bottomRef={bottomRef}
            chatOpened={chatOpened}
          />
        </div>
        
        {/* Floating input area with dynamic positioning */}
        <div className={`absolute left-1/2 bottom-0 z-10 w-full max-w-3xl -translate-x-1/2 transition-transform duration-700 ease-out ${
          chatOpened ? 'translate-y-0' : '-translate-y-[32vh]'
        }`}>
          
          {/* Header and Quick Actions - fade out when chat opens */}
          <div className={`relative z-20 flex flex-col items-center gap-2 transition-all duration-500 ${
            chatOpened ? 'opacity-0 translate-y-2 pointer-events-none' : 'opacity-100 translate-y-0'
          }`}>
            <ChatHeader chatOpened={chatOpened} />
            <QuickActions 
              chatOpened={chatOpened} 
              onActionClick={handleQuickAction}
            />
          </div>
          
          {/* Input component */}
          <NewChatInput
            message={input}
            setMessage={setInput}
            onSubmit={handleSend}
            isLoading={isLoading}
            chatOpened={chatOpened}
            selectedProject={selectedProject}
            setSelectedProject={setSelectedProject}
            projectLocked={!!threadId && messages.length > 0}
            projects={projects}
            wrapperClassName={
              chatOpened
                ? 'relative z-10 px-4 pb-4 pt-3'
                : 'relative z-10 px-0 mt-12'
            }
          />
          
          {/* Footer */}
          <div className="relative z-10">
            <ChatFooter chatOpened={chatOpened} />
          </div>
        </div>
      </div>
    </div>
  );
}
