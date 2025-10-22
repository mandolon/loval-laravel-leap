import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Task } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, CheckSquare, FileSpreadsheet, Link as LinkIcon, FolderOpen, User, MessageSquare, Edit, ChevronRight, ChevronLeft, LayoutGrid, List, Download } from "lucide-react";
import { PDFDownloadLink } from '@react-pdf/renderer';
import { TaskItem } from "@/components/TaskItem";
import { CreateTaskDialog } from "@/components/CreateTaskDialog";
import { UserAvatar } from "@/components/UserAvatar";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useProject, useUpdateProject } from "@/lib/api/hooks/useProjects";
import type { UpdateProjectInput, Project } from "@/lib/api/types";
import { AssessorParcelInfo } from "@/components/project/EditAssessorParcelDialog";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from "@/lib/api/hooks/useTasks";
import { useNotes, useCreateNote, useUpdateNote, useDeleteNote } from "@/lib/api/hooks/useNotes";
import FileExplorer from "@/components/files/FileExplorer";
import { FilesTab } from "@/components/files/FilesTab";
import { useProjectMessages, useCreateMessage, useUpdateMessage, useDeleteMessage, ProjectChatMessageWithUser } from "@/lib/api/hooks/useProjectChat";
import { useInvoices, useDeleteInvoice } from "@/lib/api/hooks/useInvoices";
import { CreateInvoiceDialog } from "@/components/invoice/CreateInvoiceDialog";
import { InvoiceCard } from "@/components/invoice/InvoiceCard";
import { InvoiceListItem } from "@/components/invoice/InvoiceListItem";
import { ViewInvoiceDialog } from "@/components/invoice/ViewInvoiceDialog";
import { EditInvoiceDialog } from "@/components/invoice/EditInvoiceDialog";
import { InvoicePDF } from "@/components/invoice/InvoicePDF";
import { NoteCard } from "@/components/notes/NoteCard";
import { CreateNoteDialog } from "@/components/notes/CreateNoteDialog";
import { LinkCard } from "@/components/links/LinkCard";
import { CreateLinkDialog } from "@/components/links/CreateLinkDialog";
import { EditLinkDialog } from "@/components/links/EditLinkDialog";
import { useLinks, useDeleteLink } from "@/lib/api/hooks/useLinks";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { EditClientDialog } from "@/components/project/EditClientDialog";
import { EditProjectDetailsDialog } from "@/components/project/EditProjectDetailsDialog";
import { EditProjectAddressDialog } from "@/components/project/EditProjectAddressDialog";
import { EditAssessorParcelDialog } from "@/components/project/EditAssessorParcelDialog";
import { EditProjectStatusDialog } from "@/components/project/EditProjectStatusDialog";
import { EditProjectPhaseDialog } from "@/components/project/EditProjectPhaseDialog";
import { EditProjectEstimatedAmountDialog } from "@/components/project/EditProjectEstimatedAmountDialog";
import { EditProjectNameDialog } from "@/components/project/EditProjectNameDialog";
import { ProjectMembersTable } from "@/components/project/ProjectMembersTable";
import ProjectClientSettingsReal from "@/components/project/ProjectClientSettingsReal";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";
import { DESIGN_TOKENS as T, UTILITY_CLASSES } from "@/lib/design-tokens";

// PanelRightClose icon import
import { PanelRightClose } from "lucide-react";

const ProjectDetails = () => {
  const { id, workspaceId } = useParams<{ id: string; workspaceId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState("project");
  const [chatOpen, setChatOpen] = useState(true);
  const [replyingTo, setReplyingTo] = useState<ProjectChatMessageWithUser | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [viewInvoiceOpen, setViewInvoiceOpen] = useState(false);
  const [editInvoiceOpen, setEditInvoiceOpen] = useState(false);
  const [invoiceViewMode, setInvoiceViewMode] = useState<'card' | 'list'>('card');
  const [selectedLink, setSelectedLink] = useState<any>(null);
  const [editLinkOpen, setEditLinkOpen] = useState(false);
  
  const { data: project, isLoading: projectLoading } = useProject(id || "");
  const { data: tasks = [], isLoading: tasksLoading } = useTasks(id || "");
  const createTaskMutation = useCreateTask(id || "");
  const updateTaskMutation = useUpdateTask(id || "");
  const deleteTaskMutation = useDeleteTask(id || "");
  const updateProjectMutation = useUpdateProject(workspaceId || "");
  
  const { data: notes = [], isLoading: notesLoading } = useNotes(id || "");
  const createNoteMutation = useCreateNote(id || "");
  const updateNoteMutation = useUpdateNote(id || "");
  const deleteNoteMutation = useDeleteNote(id || "");
  
  const { data: messages = [], isLoading: chatLoading } = useProjectMessages(id || "");
  const sendChatMutation = useCreateMessage();
  const updateMessageMutation = useUpdateMessage();
  const deleteMessageMutation = useDeleteMessage();

  const { data: invoices = [], isLoading: invoicesLoading } = useInvoices(id || "");
  const deleteInvoiceMutation = useDeleteInvoice(id || "");

  const { data: links = [], isLoading: linksLoading } = useLinks(id || "");
  const deleteLinkMutation = useDeleteLink();

  // Realtime subscriptions for all project data
  useEffect(() => {
    if (!id) return;

    // Subscribe to project changes
    const projectChannel = supabase
      .channel(`project-${id}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `id=eq.${id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['project', id] });
        }
      )
      .subscribe();

    // Subscribe to tasks changes
    const tasksChannel = supabase
      .channel(`tasks-${id}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tasks', id] });
        }
      )
      .subscribe();

    // Subscribe to notes changes
    const notesChannel = supabase
      .channel(`notes-${id}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes',
          filter: `project_id=eq.${id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notes', id] });
        }
      )
      .subscribe();

    // Subscribe to chat messages
    const messagesChannel = supabase
      .channel(`messages-${id}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_chat_messages',
          filter: `project_id=eq.${id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['project-messages', id] });
        }
      )
      .subscribe();

    // Subscribe to invoices
    const invoicesChannel = supabase
      .channel(`invoices-${id}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices',
          filter: `project_id=eq.${id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['invoices', id] });
        }
      )
      .subscribe();

    // Subscribe to links
    const linksChannel = supabase
      .channel(`links-${id}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'links',
          filter: `project_id=eq.${id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['links', id] });
        }
      )
      .subscribe();

    // Subscribe to files
    const filesChannel = supabase
      .channel(`files-${id}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'files',
          filter: `project_id=eq.${id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['files', id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(projectChannel);
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(notesChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(invoicesChannel);
      supabase.removeChannel(linksChannel);
      supabase.removeChannel(filesChannel);
    };
  }, [id, queryClient]);

  const handleSendMessage = (content: string, replyToId?: string) => {
    if (!id) return;
    sendChatMutation.mutate({
      projectId: id,
      content,
      replyToMessageId: replyToId,
    });
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!id) return;
    deleteMessageMutation.mutate({ id: messageId, projectId: id });
  };

  const handleEditMessage = (messageId: string, content: string) => {
    updateMessageMutation.mutate({ id: messageId, input: { content } });
  };

  const handleUpdateProject = (input: UpdateProjectInput) => {
    if (!id) return;
    updateProjectMutation.mutate({ id, input });
  };

  const handleCreateTask = async (input: { title: string; description?: string; projectId: string }) => {
    createTaskMutation.mutate(input);
  };

  const handleStatusChange = (taskId: string, status: Task['status']) => {
    updateTaskMutation.mutate({ id: taskId, input: { status } });
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTaskMutation.mutate(taskId);
  };

  const handleDownloadPDF = (invoice: any) => {
    // PDF download is handled by PDFDownloadLink component
    // This function is kept for compatibility
    toast({
      title: "Generating PDF",
      description: "Your invoice PDF is being prepared...",
    });
  };

  if (projectLoading || tasksLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!project) {
    return <div className="flex items-center justify-center h-screen">Project not found</div>;
  }

  const taskRedlineTasks = tasks.filter(t => t.status === 'task_redline');
  const progressUpdateTasks = tasks.filter(t => t.status === 'progress_update');
  const completeTasks = tasks.filter(t => t.status === 'done_completed');

  const getTaskAssignees = (assignees: string[]) => {
    // TODO: Fetch actual user data from Supabase
    return [];
  };

  return (
    <div className="h-full w-full text-[12px] overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel defaultSize={chatOpen ? 75 : 100} minSize={50}>
          <div className={`${T.panel} ${T.radius} flex flex-col h-full min-h-0 overflow-hidden`}>
            {/* Main Content - Using new ProjectClientSettingsReal component */}
            <div className="flex-1 min-h-0 overflow-auto">
              <ProjectClientSettingsReal
                project={project}
                onUpdate={handleUpdateProject}
                onBack={() => navigate(workspaceId ? `/workspace/${workspaceId}/projects` : "/projects")}
                onToggleChat={setChatOpen}
                defaultChatOpen={chatOpen}
                filesContent={<FilesTab projectId={id || ''} />}
                tasksContent={
                  <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold text-slate-700 dark:text-neutral-300">Tasks</h2>
                      <CreateTaskDialog projects={[project]} onCreateTask={handleCreateTask} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-lg text-slate-700 dark:text-neutral-300">Task/Redline</h3>
                          <Badge className="bg-red-500 text-white border-0">{taskRedlineTasks.length}</Badge>
                        </div>
                        <div className="space-y-3">
                          {taskRedlineTasks.map(task => (
                            <TaskItem key={task.id} task={task} assignees={getTaskAssignees(task.assignees)} onStatusChange={handleStatusChange} onDelete={handleDeleteTask} />
                          ))}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-lg text-slate-700 dark:text-neutral-300">Progress/Update</h3>
                          <Badge className="bg-[#00639b] text-white border-0">{progressUpdateTasks.length}</Badge>
                        </div>
                        <div className="space-y-3">
                          {progressUpdateTasks.map(task => (
                            <TaskItem key={task.id} task={task} assignees={getTaskAssignees(task.assignees)} onStatusChange={handleStatusChange} onDelete={handleDeleteTask} />
                          ))}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-lg text-slate-700 dark:text-neutral-300">Complete</h3>
                          <Badge className="bg-green-500 text-white border-0">{completeTasks.length}</Badge>
                        </div>
                        <div className="space-y-3">
                          {completeTasks.map(task => (
                            <TaskItem key={task.id} task={task} assignees={getTaskAssignees(task.assignees)} onStatusChange={handleStatusChange} onDelete={handleDeleteTask} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                }
                invoicesContent={
                  <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <div><h2 className="text-2xl font-bold">Invoices</h2></div>
                      <CreateInvoiceDialog projectId={id || ''} />
                    </div>
                    {invoiceViewMode === 'card' ? (
                      <div className="grid gap-6 md:grid-cols-2">
                        {invoices.map(invoice => (
                          <InvoiceCard key={invoice.id} invoice={invoice} project={{ name: project.name, address: project.address }} onView={(inv) => { setSelectedInvoice(inv); setViewInvoiceOpen(true); }} onEdit={(inv) => { setSelectedInvoice(inv); setEditInvoiceOpen(true); }} onDelete={(id) => deleteInvoiceMutation.mutate(id)} onDownloadPDF={handleDownloadPDF} />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">{invoices.map(invoice => <InvoiceListItem key={invoice.id} invoice={invoice} project={{ name: project.name, address: project.address }} onView={(inv) => { setSelectedInvoice(inv); setViewInvoiceOpen(true); }} onEdit={(inv) => { setSelectedInvoice(inv); setEditInvoiceOpen(true); }} onDelete={(id) => deleteInvoiceMutation.mutate(id)} onDownloadPDF={handleDownloadPDF} />)}</div>
                    )}
                  </div>
                }
                linksContent={
                  <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <div><h2 className="text-2xl font-bold">Links</h2></div>
                      <CreateLinkDialog projectId={id || ''} />
                    </div>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {links.map(link => <LinkCard key={link.id} link={link} onEdit={(link) => { setSelectedLink(link); setEditLinkOpen(true); }} onDelete={(id) => deleteLinkMutation.mutate({ id, projectId: id || '' })} />)}
                    </div>
                  </div>
                }
                notesContent={
                  <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <div><h2 className="text-2xl font-bold">Notes</h2></div>
                      <CreateNoteDialog onCreateNote={(content) => createNoteMutation.mutate({ content })} />
                    </div>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {notes.map(note => <NoteCard key={note.id} note={note} onUpdate={(id, content) => updateNoteMutation.mutate({ id, content })} onDelete={(id) => deleteNoteMutation.mutate(id)} />)}
                    </div>
                  </div>
                }
              />
            </div>
          </div>
        </ResizablePanel>

      {/* Project Chat Sidebar - Resizable */}
      {chatOpen && (
        <>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
            <div className={`${T.panel} ${T.radius} flex flex-col h-full overflow-hidden`}>
          <div className="h-10 px-3 flex items-center justify-between border-b border-slate-200 dark:border-[#1d2230] bg-white dark:bg-[#0E1118]">
            <span className="text-[12px] text-slate-700 dark:text-neutral-300">Project Chat</span>
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              aria-label="Collapse chat"
              className="h-7 w-7 grid place-items-center border border-[#283046] dark:border-[#283046] rounded-[6px] text-slate-500 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-[#161B26] focus:outline-none focus:ring-1 focus:ring-[#9ecafc] dark:focus:ring-[#3b82f6]/40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          <ScrollArea className="flex-1 min-h-0 p-3">
            <div className="space-y-3">
              {chatLoading ? (
                <p className="text-[12px] text-slate-500 dark:text-neutral-400 text-center py-8">Loading messages...</p>
              ) : messages.length === 0 ? (
                <p className="text-[12px] text-slate-500 dark:text-neutral-400 text-center py-8">No messages yet. Start a conversation!</p>
              ) : (
                (() => {
                  // Group messages into threads
                  const threadedMessages = messages.reduce((acc, message) => {
                    if (!message.replyToMessageId) {
                      // This is a parent message
                      acc.push({
                        ...message,
                        replies: messages.filter(m => m.replyToMessageId === message.id),
                        replyCount: messages.filter(m => m.replyToMessageId === message.id).length
                      })
                    }
                    return acc
                  }, [] as typeof messages)

                  return threadedMessages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      onDelete={handleDeleteMessage}
                      onEdit={handleEditMessage}
                      onReply={setReplyingTo}
                      currentUserId={user?.id}
                    />
                  ))
                })()
              )}
            </div>
          </ScrollArea>

          <div className="p-3 border-t border-slate-200 dark:border-[#1d2230] bg-white dark:bg-[#0E1118] mt-auto">
            <ChatInput
              onSendMessage={handleSendMessage}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
              disabled={sendChatMutation.isPending}
            />
          </div>
        </div>
          </ResizablePanel>
        </>
      )}
      </ResizablePanelGroup>
    </div>
  );
};

export default ProjectDetails;
