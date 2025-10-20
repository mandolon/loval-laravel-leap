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
import { useProjectMessages, useCreateMessage, useDeleteMessage, ProjectChatMessageWithUser } from "@/lib/api/hooks/useProjectChat";
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
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const ProjectDetails = () => {
  const { id, workspaceId } = useParams<{ id: string; workspaceId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
    <div className="flex h-full">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel defaultSize={chatOpen ? 75 : 100} minSize={50} className="flex flex-col">
          <div className="flex flex-col h-full min-h-0">
        {/* Header */}
        <div className="h-12 text-[12px] grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 bg-white dark:bg-[#0E1118] border-b border-slate-200 dark:border-[#1a2030]/60">
          {/* Left: Back button */}
          <button
            type="button"
            title="Back"
            onClick={() => navigate(workspaceId ? `/workspace/${workspaceId}/projects` : "/projects")}
            className="h-8 w-8 grid place-items-center rounded-[8px] text-slate-500 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-[#141C28] focus:outline-none focus:ring-1 focus:ring-[#9ecafc] dark:focus:ring-[#3b82f6]/40"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          {/* Center: Tabs (centered) */}
          <div className="min-w-0 flex justify-center">
            <div className="px-1 py-0.5 bg-slate-100 dark:bg-[#0E1118] rounded-[8px] flex gap-1">
              <button
                type="button"
                onClick={() => setActiveTab("files")}
                className={`px-2.5 py-1 rounded-[8px] transition-colors focus:outline-none focus:ring-1 focus:ring-[#9ecafc] dark:focus:ring-[#3b82f6]/40 ${
                  activeTab === "files"
                    ? "bg-white dark:bg-[#141C28] text-[#00639b] dark:text-blue-300 font-medium"
                    : "text-slate-500 dark:text-neutral-400 hover:bg-white/60 dark:hover:bg-[#141C28] hover:text-slate-700 dark:hover:text-blue-300"
                }`}
              >
                Files
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("tasks")}
                className={`px-2.5 py-1 rounded-[8px] transition-colors focus:outline-none focus:ring-1 focus:ring-[#9ecafc] dark:focus:ring-[#3b82f6]/40 ${
                  activeTab === "tasks"
                    ? "bg-white dark:bg-[#141C28] text-[#00639b] dark:text-blue-300 font-medium"
                    : "text-slate-500 dark:text-neutral-400 hover:bg-white/60 dark:hover:bg-[#141C28] hover:text-slate-700 dark:hover:text-blue-300"
                }`}
              >
                Tasks
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("invoices")}
                className={`px-2.5 py-1 rounded-[8px] transition-colors focus:outline-none focus:ring-1 focus:ring-[#9ecafc] dark:focus:ring-[#3b82f6]/40 ${
                  activeTab === "invoices"
                    ? "bg-white dark:bg-[#141C28] text-[#00639b] dark:text-blue-300 font-medium"
                    : "text-slate-500 dark:text-neutral-400 hover:bg-white/60 dark:hover:bg-[#141C28] hover:text-slate-700 dark:hover:text-blue-300"
                }`}
              >
                Invoices
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("links")}
                className={`px-2.5 py-1 rounded-[8px] transition-colors focus:outline-none focus:ring-1 focus:ring-[#9ecafc] dark:focus:ring-[#3b82f6]/40 ${
                  activeTab === "links"
                    ? "bg-white dark:bg-[#141C28] text-[#00639b] dark:text-blue-300 font-medium"
                    : "text-slate-500 dark:text-neutral-400 hover:bg-white/60 dark:hover:bg-[#141C28] hover:text-slate-700 dark:hover:text-blue-300"
                }`}
              >
                Links
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("project")}
                className={`px-2.5 py-1 rounded-[8px] transition-colors focus:outline-none focus:ring-1 focus:ring-[#9ecafc] dark:focus:ring-[#3b82f6]/40 ${
                  activeTab === "project"
                    ? "bg-white dark:bg-[#141C28] text-[#00639b] dark:text-blue-300 font-medium"
                    : "text-slate-500 dark:text-neutral-400 hover:bg-white/60 dark:hover:bg-[#141C28] hover:text-slate-700 dark:hover:text-blue-300"
                }`}
              >
                Project
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("client")}
                className={`px-2.5 py-1 rounded-[8px] transition-colors focus:outline-none focus:ring-1 focus:ring-[#9ecafc] dark:focus:ring-[#3b82f6]/40 ${
                  activeTab === "client"
                    ? "bg-white dark:bg-[#141C28] text-[#00639b] dark:text-blue-300 font-medium"
                    : "text-slate-500 dark:text-neutral-400 hover:bg-white/60 dark:hover:bg-[#141C28] hover:text-slate-700 dark:hover:text-blue-300"
                }`}
              >
                Client
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("notes")}
                className={`px-2.5 py-1 rounded-[8px] transition-colors focus:outline-none focus:ring-1 focus:ring-[#9ecafc] dark:focus:ring-[#3b82f6]/40 ${
                  activeTab === "notes"
                    ? "bg-white dark:bg-[#141C28] text-[#00639b] dark:text-blue-300 font-medium"
                    : "text-slate-500 dark:text-neutral-400 hover:bg-white/60 dark:hover:bg-[#141C28] hover:text-slate-700 dark:hover:text-blue-300"
                }`}
              >
                Notes
              </button>
            </div>
          </div>

          {/* Right: Chat toggle button */}
          <button
            type="button"
            title={chatOpen ? "Collapse chat" : "Expand chat"}
            onClick={() => setChatOpen(!chatOpen)}
            className="h-8 w-8 grid place-items-center rounded-[8px] text-slate-500 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-[#141C28] focus:outline-none focus:ring-1 focus:ring-[#9ecafc] dark:focus:ring-[#3b82f6]/40 relative"
          >
            {chatOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6l6 6-6 6" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3h9m-9 3h5.25M21 12c0 4.97-4.03 9-9 9a8.96 8.96 0 01-4.49-1.18L3 21l1.18-4.49A8.96 8.96 0 013 12c0-4.97 4.03-9 9-9s9 4.03 9 9z" />
              </svg>
            )}
            {messages.length > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-[10px] bg-red-500 text-white rounded-full font-medium">
                {messages.length}
              </span>
            )}
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className={activeTab === 'files' ? 'h-full flex flex-col' : 'flex-1 min-h-0 p-4 space-y-4 overflow-auto'}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
              <TabsContent value="files" className="mt-0 flex-1 min-h-0 p-0 flex flex-col">
                <FilesTab projectId={id || ''} />
              </TabsContent>

            <TabsContent value="tasks" className="mt-0 flex-1 min-h-0 overflow-auto">
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Tasks</h2>
                  <CreateTaskDialog projects={[project]} onCreateTask={handleCreateTask} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Task/Redline Column */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Task/Redline</h3>
                    <Badge className="bg-destructive text-destructive-foreground">{taskRedlineTasks.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {taskRedlineTasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No tasks</p>
                    ) : (
                      taskRedlineTasks.map(task => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          assignees={getTaskAssignees(task.assignees)}
                          onStatusChange={handleStatusChange}
                          onDelete={handleDeleteTask}
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* Progress/Update Column */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Progress/Update</h3>
                    <Badge className="bg-primary text-primary-foreground">{progressUpdateTasks.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {progressUpdateTasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No tasks</p>
                    ) : (
                      progressUpdateTasks.map(task => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          assignees={getTaskAssignees(task.assignees)}
                          onStatusChange={handleStatusChange}
                          onDelete={handleDeleteTask}
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* Complete Column */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Complete</h3>
                    <Badge className="bg-secondary text-secondary-foreground">{completeTasks.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {completeTasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No tasks</p>
                    ) : (
                      completeTasks.map(task => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          assignees={getTaskAssignees(task.assignees)}
                          onStatusChange={handleStatusChange}
                          onDelete={handleDeleteTask}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="invoices" className="mt-0 flex-1 min-h-0 overflow-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Invoices</h2>
                    <p className="text-muted-foreground">Manage project invoices and billing</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex border rounded-md">
                      <Button
                        variant={invoiceViewMode === 'card' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setInvoiceViewMode('card')}
                        className="rounded-r-none"
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={invoiceViewMode === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setInvoiceViewMode('list')}
                        className="rounded-l-none"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                    <CreateInvoiceDialog projectId={id || ''} />
                  </div>
                </div>

                {invoicesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-muted-foreground">Loading invoices...</p>
                  </div>
                ) : invoices.length === 0 ? (
                  <Card>
                    <CardContent className="py-12">
                      <p className="text-center text-muted-foreground">No invoices yet. Create your first invoice to get started.</p>
                    </CardContent>
                  </Card>
                ) : invoiceViewMode === 'card' ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {invoices.map((invoice) => (
                      <InvoiceCard
                        key={invoice.id}
                        invoice={invoice}
                        project={{ name: project.name, address: project.address }}
                        onView={(inv) => {
                          setSelectedInvoice(inv);
                          setViewInvoiceOpen(true);
                        }}
                        onEdit={(inv) => {
                          setSelectedInvoice(inv);
                          setEditInvoiceOpen(true);
                        }}
                        onDelete={(invoiceId) => {
                          if (confirm('Are you sure you want to delete this invoice?')) {
                            deleteInvoiceMutation.mutate(invoiceId);
                          }
                        }}
                        onDownloadPDF={handleDownloadPDF}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {invoices.map((invoice) => (
                      <InvoiceListItem
                        key={invoice.id}
                        invoice={invoice}
                        project={{ name: project.name, address: project.address }}
                        onView={(inv) => {
                          setSelectedInvoice(inv);
                          setViewInvoiceOpen(true);
                        }}
                        onEdit={(inv) => {
                          setSelectedInvoice(inv);
                          setEditInvoiceOpen(true);
                        }}
                        onDelete={(invoiceId) => {
                          if (confirm('Are you sure you want to delete this invoice?')) {
                            deleteInvoiceMutation.mutate(invoiceId);
                          }
                        }}
                        onDownloadPDF={handleDownloadPDF}
                      />
                    ))}
                  </div>
                )}
              </div>

              <ViewInvoiceDialog
                invoice={selectedInvoice}
                open={viewInvoiceOpen}
                onOpenChange={setViewInvoiceOpen}
                project={{ name: project.name, address: project.address }}
              />

              <EditInvoiceDialog
                invoice={selectedInvoice}
                open={editInvoiceOpen}
                onOpenChange={setEditInvoiceOpen}
                projectId={id || ''}
                project={{ name: project.name, address: project.address }}
              />
            </TabsContent>

            <TabsContent value="links" className="mt-0 flex-1 min-h-0 overflow-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Links</h2>
                    <p className="text-muted-foreground">Reference links and resources</p>
                  </div>
                  <CreateLinkDialog projectId={id || ''} />
                </div>

                {linksLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-muted-foreground">Loading links...</p>
                  </div>
                ) : links.length === 0 ? (
                  <Card>
                    <CardContent className="py-12">
                      <p className="text-center text-muted-foreground">
                        No links yet. Add your first reference link to get started.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {links.map((link) => (
                      <LinkCard
                        key={link.id}
                        link={link}
                        onEdit={(link) => {
                          setSelectedLink(link);
                          setEditLinkOpen(true);
                        }}
                        onDelete={(linkId) => {
                          if (confirm('Are you sure you want to delete this link?')) {
                            deleteLinkMutation.mutate({ id: linkId, projectId: id || '' });
                          }
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              <EditLinkDialog
                link={selectedLink}
                open={editLinkOpen}
                onOpenChange={setEditLinkOpen}
              />
            </TabsContent>

            <TabsContent value="project" className="mt-0 flex-1 min-h-0 space-y-6 overflow-auto">
              {/* Project Name */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Project Name</CardTitle>
                  </div>
                  <EditProjectNameDialog
                    name={project.name}
                    onUpdate={(name) => handleUpdateProject({ name })}
                  />
                </CardHeader>
                <CardContent>
                  <p className="font-medium text-lg">{project.name}</p>
                </CardContent>
              </Card>

              {/* Project Address */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Project Address</CardTitle>
                  </div>
                  <EditProjectAddressDialog
                    address={project.address}
                    onUpdate={(address) => handleUpdateProject({ address })}
                  />
                </CardHeader>
                <CardContent>
                  <p className="font-medium">
                    {typeof project.address === 'object' && project.address 
                      ? (() => {
                          const { streetNumber, streetName, city, state, zipCode } = project.address;
                          const street = [streetNumber, streetName].filter(Boolean).join(' ');
                          const cityState = [city, state].filter(Boolean).join(', ');
                          const parts = [street, cityState, zipCode].filter(Boolean);
                          return parts.length > 0 ? parts.join(', ') : 'No address provided';
                        })()
                      : 'No address provided'}
                  </p>
                </CardContent>
              </Card>

              {/* Project Narrative */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Project Description</CardTitle>
                  </div>
                  <EditProjectDetailsDialog
                    description={project.description}
                    onUpdate={(description) => handleUpdateProject({ description })}
                  />
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{project.description || "No description provided yet. Click edit to add project details."}</p>
                </CardContent>
              </Card>

              {/* Project Status, Phase, and Design Fee in a row */}
              <div className="grid grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Status</CardTitle>
                    </div>
                    <EditProjectStatusDialog
                      status={project.status}
                      onUpdate={(status) => handleUpdateProject({ status: status as any })}
                    />
                  </CardHeader>
                  <CardContent>
                    <Badge variant={
                      project.status === 'active' ? 'default' : 
                      project.status === 'completed' ? 'secondary' : 
                      project.status === 'archived' ? 'outline' : 
                      'outline'
                    }>
                      {project.status === 'active' ? 'In Progress' : 
                       project.status === 'pending' ? 'Pending' :
                       project.status === 'completed' ? 'Completed' : 
                       'Archived'}
                    </Badge>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Phase</CardTitle>
                    </div>
                    <EditProjectPhaseDialog
                      phase={project.phase}
                      onUpdate={(phase) => handleUpdateProject({ phase: phase as any })}
                    />
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium">{project.phase}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Design Fee</CardTitle>
                    </div>
                    <EditProjectEstimatedAmountDialog
                      estimatedAmount={project.estimatedAmount}
                      onUpdate={(estimatedAmount) => handleUpdateProject({ estimatedAmount })}
                    />
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium text-lg">
                      {project.estimatedAmount 
                        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(project.estimatedAmount)
                        : '—'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Team Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Team</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProjectMembersTable projectId={id || ''} workspaceId={workspaceId || ''} />
                </CardContent>
              </Card>

              {/* Assessor Parcel Information */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Assessor Parcel Information</CardTitle>
                  </div>
                  <EditAssessorParcelDialog
                    data={project.assessorParcelInfo}
                    onUpdate={(data) => handleUpdateProject({ assessorParcelInfo: data })}
                  />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Assessor's Parcel #</p>
                        <p className="font-medium text-primary">{project.assessorParcelInfo?.parcelNumber || '—'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Occupancy Class</p>
                        <p className="font-medium">{project.assessorParcelInfo?.occupancyClass || '—'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Zoning Designation</p>
                        <p className="font-medium text-primary">{project.assessorParcelInfo?.zoningDesignation || '—'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Construction</p>
                        <p className="font-medium">{project.assessorParcelInfo?.construction || '—'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-6 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Stories</p>
                        <p className="font-medium">{project.assessorParcelInfo?.stories || '—'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Plate Height</p>
                        <p className="font-medium">{project.assessorParcelInfo?.plateHeight || '—'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Roof Height</p>
                        <p className="font-medium">{project.assessorParcelInfo?.roofHeight || '—'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Year Built</p>
                        <p className="font-medium">{project.assessorParcelInfo?.yearBuilt || '—'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Approx Lot Area</p>
                        <p className="font-medium">{project.assessorParcelInfo?.lotArea || '—'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Acres</p>
                        <p className="font-medium">{project.assessorParcelInfo?.acres || '—'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="client" className="mt-0 flex-1 min-h-0 overflow-auto">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Client Information</CardTitle>
                  </div>
                  <EditClientDialog
                    project={project}
                    onUpdate={(data) => handleUpdateProject(data)}
                  />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Primary Client</p>
                      <p className="font-medium text-lg">
                        {project.primaryClient.firstName} {project.primaryClient.lastName}
                      </p>
                      {project.primaryClient.email && (
                        <p className="text-sm">{project.primaryClient.email}</p>
                      )}
                      {project.primaryClient.phone && (
                        <p className="text-sm">{project.primaryClient.phone}</p>
                      )}
                    </div>
                    {project.secondaryClient && (
                      <div>
                        <p className="text-sm text-muted-foreground">Secondary Client</p>
                        <p className="font-medium text-lg">
                          {project.secondaryClient.firstName} {project.secondaryClient.lastName}
                        </p>
                        {project.secondaryClient.email && (
                          <p className="text-sm">{project.secondaryClient.email}</p>
                        )}
                        {project.secondaryClient.phone && (
                          <p className="text-sm">{project.secondaryClient.phone}</p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="mt-0 flex-1 min-h-0 overflow-auto">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <div>
                    <CardTitle>Notes</CardTitle>
                    <CardDescription>Project notes and comments</CardDescription>
                  </div>
                  <CreateNoteDialog onCreateNote={(content) => createNoteMutation.mutate({ content })} />
                </CardHeader>
                <CardContent className="space-y-4">
                  {notesLoading ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Loading notes...</p>
                  ) : notes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No notes yet. Create your first note above.</p>
                  ) : (
                    notes.map(note => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        onUpdate={(id, content) => updateNoteMutation.mutate({ id, content })}
                        onDelete={(id) => deleteNoteMutation.mutate(id)}
                      />
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      </div>
        </ResizablePanel>

      {/* Project Chat Sidebar - Resizable */}
      {chatOpen && (
        <>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={25} minSize={20} maxSize={40} className="flex flex-col">
            <div className="bg-white dark:bg-[#0F1219] border-l border-slate-200 dark:border-[#1d2230]/60 rounded-[8px] flex flex-col h-full">
          <div className="h-10 px-3 flex items-center justify-between border-b border-slate-200 dark:border-[#1d2230] bg-white dark:bg-[#0E1118]">
            <span className="text-[12px] text-slate-700 dark:text-neutral-300">Project Chat</span>
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              aria-label="Collapse chat"
              className="h-7 w-7 grid place-items-center border border-slate-200 dark:border-[#283046]/60 rounded-[6px] text-slate-500 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-[#161B26] focus:outline-none focus:ring-1 focus:ring-[#9ecafc] dark:focus:ring-[#3b82f6]/40"
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
                messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    onDelete={handleDeleteMessage}
                    onReply={setReplyingTo}
                  />
                ))
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
