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
import ProjectTabContent from "@/components/project/ProjectTabContent";
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
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";
import { useLayout } from "@/contexts/LayoutContext";
import { DESIGN_TOKENS as T, UTILITY_CLASSES } from "@/lib/design-tokens";
import { ExcelTab } from "@/components/excel/ExcelTab";

// PanelRightClose icon import
import { PanelRightClose } from "lucide-react";

const ProjectDetails = () => {
  const { id, workspaceId } = useParams<{ id: string; workspaceId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const { setSidebarCollapsed } = useLayout();
  const [activeTab, setActiveTab] = useState("project");
  const [chatOpen, setChatOpen] = useState(true);
  const [replyingTo, setReplyingTo] = useState<ProjectChatMessageWithUser | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [viewInvoiceOpen, setViewInvoiceOpen] = useState(false);
  const [editInvoiceOpen, setEditInvoiceOpen] = useState(false);
  const [invoiceViewMode, setInvoiceViewMode] = useState<'card' | 'list'>('card');
  const [selectedLink, setSelectedLink] = useState<any>(null);
  const [editLinkOpen, setEditLinkOpen] = useState(false);
  const [isFillPageActive, setIsFillPageActive] = useState(false);

  const handleFillPageChange = (fillPage: boolean) => {
    setIsFillPageActive(fillPage);
    setSidebarCollapsed(fillPage);
  };
  
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
        {/* Header */}
        <div className={`h-12 text-[12px] grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 bg-white dark:bg-[#0E1118] border-b border-slate-200 dark:border-[#1a2030]/60 transition-all duration-200 ${isFillPageActive && activeTab === 'files' ? 'hidden' : ''}`}>
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
                onClick={() => setActiveTab("excel")}
                className={`px-2.5 py-1 rounded-[8px] transition-colors focus:outline-none focus:ring-1 focus:ring-[#9ecafc] dark:focus:ring-[#3b82f6]/40 ${
                  activeTab === "excel"
                    ? "bg-white dark:bg-[#141C28] text-[#00639b] dark:text-blue-300 font-medium"
                    : "text-slate-500 dark:text-neutral-400 hover:bg-white/60 dark:hover:bg-[#141C28] hover:text-slate-700 dark:hover:text-blue-300"
                }`}
              >
                Excel
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
              <TabsContent value="files" className="mt-0 flex-1 min-h-0 flex flex-col">
                <FilesTab 
                  projectId={id || ''} 
                  onFillPageChange={handleFillPageChange}
                />
              </TabsContent>

            <TabsContent value="tasks" className="h-full overflow-auto">
              <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-700 dark:text-neutral-300">Tasks</h2>
                  <CreateTaskDialog projects={[project]} onCreateTask={handleCreateTask} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Task/Redline Column */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg text-slate-700 dark:text-neutral-300">Task/Redline</h3>
                    <Badge className="bg-red-500 dark:bg-red-500/20 text-white dark:text-red-300 border-0">{taskRedlineTasks.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {taskRedlineTasks.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-neutral-400 text-center py-8">No tasks</p>
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
                    <h3 className="font-semibold text-lg text-slate-700 dark:text-neutral-300">Progress/Update</h3>
                    <Badge className="bg-[#00639b] dark:bg-blue-500/20 text-white dark:text-blue-300 border-0">{progressUpdateTasks.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {progressUpdateTasks.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-neutral-400 text-center py-8">No tasks</p>
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
                    <h3 className="font-semibold text-lg text-slate-700 dark:text-neutral-300">Complete</h3>
                    <Badge className="bg-green-500 dark:bg-green-500/20 text-white dark:text-green-300 border-0">{completeTasks.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {completeTasks.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-neutral-400 text-center py-8">No tasks</p>
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
              </div>
            </TabsContent>

            <TabsContent value="invoices" className="h-full overflow-auto">
              <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-700 dark:text-neutral-300">Invoices</h2>
                    <p className="text-slate-500 dark:text-neutral-400">Manage project invoices and billing</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex border rounded-md">
                      <Button
                        variant={invoiceViewMode === 'card' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setInvoiceViewMode('card')}
                        className={`rounded-r-none ${invoiceViewMode === 'card' ? 'bg-[#00639b] dark:bg-[#141C28] text-white dark:text-blue-300' : 'text-slate-500 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-[#141C28]'}`}
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={invoiceViewMode === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setInvoiceViewMode('list')}
                        className={`rounded-l-none ${invoiceViewMode === 'list' ? 'bg-[#00639b] dark:bg-[#141C28] text-white dark:text-blue-300' : 'text-slate-500 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-[#141C28]'}`}
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                    <CreateInvoiceDialog projectId={id || ''} />
                  </div>
                </div>

                {invoicesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-slate-500 dark:text-neutral-400">Loading invoices...</p>
                  </div>
                ) : invoices.length === 0 ? (
                  <Card className={`${T.panel} ${T.radius}`}>
                    <CardContent className="py-12">
                      <p className="text-center text-slate-500 dark:text-neutral-400">No invoices yet. Create your first invoice to get started.</p>
                    </CardContent>
                  </Card>
                ) : invoiceViewMode === 'card' ? (
                  <div className="grid gap-6 md:grid-cols-2">
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

            <TabsContent value="excel" className="h-full overflow-auto">
              <ExcelTab projectId={id || ''} />
            </TabsContent>

            <TabsContent value="links" className="h-full overflow-auto">
              <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-700 dark:text-neutral-300">Links</h2>
                    <p className="text-slate-500 dark:text-neutral-400">Reference links and resources</p>
                  </div>
                  <CreateLinkDialog projectId={id || ''} />
                </div>

                {linksLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-slate-500 dark:text-neutral-400">Loading links...</p>
                  </div>
                ) : links.length === 0 ? (
                  <Card className={`${T.panel} ${T.radius}`}>
                    <CardContent className="py-12">
                      <p className="text-center text-slate-500 dark:text-neutral-400">
                        No links yet. Add your first reference link to get started.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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

            <TabsContent value="project" className="h-full overflow-auto p-0">
              <ProjectTabContent
                project={project}
                onUpdate={(input) => {
                  updateProjectMutation.mutate({ id: id || '', input });
                }}
              />
            </TabsContent>

            <TabsContent value="notes" className="h-full overflow-auto">
              <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
              <Card className={`${T.panel} ${T.radius}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-slate-200 dark:border-[#1d2230]">
                  <div>
                    <CardTitle>Notes</CardTitle>
                    <CardDescription className="text-slate-500 dark:text-neutral-400">Project notes and comments</CardDescription>
                  </div>
                  <CreateNoteDialog onCreateNote={(content) => createNoteMutation.mutate({ content })} />
                </CardHeader>
                <CardContent className="space-y-4">
                  {notesLoading ? (
                    <p className="text-sm text-slate-500 dark:text-neutral-400 text-center py-8">Loading notes...</p>
                  ) : notes.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-neutral-400 text-center py-8">No notes yet. Create your first note above.</p>
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
              </div>
            </TabsContent>
          </Tabs>
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
