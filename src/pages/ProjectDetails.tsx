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
    <div className="flex h-[calc(100vh-4rem)]">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={chatOpen ? 75 : 100} minSize={50}>
          <div className="flex flex-col h-full min-h-0 bg-blue-500/10">
        {/* Header */}
        <div className="border-b bg-background">
          <div className="flex items-center px-6 py-2">
            {/* Left: Back button */}
            <div className="flex-1 flex items-center">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate(workspaceId ? `/workspace/${workspaceId}/projects` : "/projects")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </div>

            {/* Center: Navigation tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-shrink-0">
              <TabsList className="h-auto p-0 bg-transparent border-0">
                <TabsTrigger 
                  value="files" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2"
                >
                  Files
                </TabsTrigger>
                <TabsTrigger 
                  value="tasks"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2"
                >
                  Tasks
                </TabsTrigger>
                <TabsTrigger 
                  value="invoices"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2"
                >
                  Invoices
                </TabsTrigger>
                <TabsTrigger 
                  value="links"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2"
                >
                  Links
                </TabsTrigger>
                <TabsTrigger 
                  value="project"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2"
                >
                  Project
                </TabsTrigger>
                <TabsTrigger 
                  value="client"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2"
                >
                  Client
                </TabsTrigger>
                <TabsTrigger 
                  value="notes"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2"
                >
                  Notes
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Right: Chat toggle button */}
            <div className="flex-1 flex items-center justify-end">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setChatOpen(!chatOpen)}
                className="relative"
              >
                <MessageSquare className="h-5 w-5" />
                {messages.length > 0 && (
                  <Badge 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    variant="destructive"
                  >
                    {messages.length}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className={`flex-1 min-h-0 ${activeTab === 'files' ? 'overflow-hidden bg-orange-500/10' : 'overflow-auto'}`}>
          <div className={activeTab === 'files' ? 'h-full bg-pink-500/10' : 'p-4 space-y-4'}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full bg-cyan-500/10">
              <TabsContent value="files" className="mt-0 h-full p-0 data-[state=active]:flex data-[state=active]:flex-col bg-amber-500/10">
                <FilesTab projectId={id || ''} />
              </TabsContent>

            <TabsContent value="tasks" className="mt-0">
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

            <TabsContent value="invoices" className="mt-0">
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

            <TabsContent value="links" className="mt-0">
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

            <TabsContent value="project" className="mt-0 space-y-6">
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

            <TabsContent value="client" className="mt-0">
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

            <TabsContent value="notes" className="mt-0">
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
          <ResizablePanel defaultSize={25} minSize={20} maxSize={40} className="flex">
            <div className="h-full border-l bg-background flex flex-col bg-green-500/10">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Project Chat</h3>
          </div>
          
          <ScrollArea className="flex-1 min-h-0 p-4 bg-yellow-500/10">
            <div className="space-y-4">
              {chatLoading ? (
                <p className="text-sm text-muted-foreground text-center py-8">Loading messages...</p>
              ) : messages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No messages yet. Start a conversation!</p>
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

          <div className="p-4 border-t bg-purple-500/10">
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
