import { useState } from "react";
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
import { useProject, useUpdateProject } from "@/lib/api/hooks/useProjects";
import type { UpdateProjectInput, Project } from "@/lib/api/types";
import { AssessorParcelInfo } from "@/components/project/EditAssessorParcelDialog";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from "@/lib/api/hooks/useTasks";
import { useNotes, useCreateNote, useUpdateNote, useDeleteNote } from "@/lib/api/hooks/useNotes";
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
import { ProjectMembersTable } from "@/components/project/ProjectMembersTable";
import { supabase } from "@/integrations/supabase/client";

const ProjectDetails = () => {
  const { id, workspaceId } = useParams<{ id: string; workspaceId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
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
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
            <Button 
            variant="ghost" 
            onClick={() => navigate(workspaceId ? `/workspace/${workspaceId}/projects` : "/projects")}
            size="sm"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
              <TabsTrigger value="files" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <FileText className="h-4 w-4 mr-2" />
                Files
              </TabsTrigger>
              <TabsTrigger value="tasks" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <CheckSquare className="h-4 w-4 mr-2" />
                Tasks
              </TabsTrigger>
              <TabsTrigger value="invoices" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Invoices
              </TabsTrigger>
              <TabsTrigger value="links" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <LinkIcon className="h-4 w-4 mr-2" />
                Links
              </TabsTrigger>
              <TabsTrigger value="project" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <FolderOpen className="h-4 w-4 mr-2" />
                Project
              </TabsTrigger>
              <TabsTrigger value="client" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <User className="h-4 w-4 mr-2" />
                Client
              </TabsTrigger>
              <TabsTrigger value="notes" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <MessageSquare className="h-4 w-4 mr-2" />
                Notes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="files" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Files</CardTitle>
                  <CardDescription>Project files and documents</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">No files uploaded yet</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tasks" className="mt-6">
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

            <TabsContent value="invoices" className="mt-6">
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

            <TabsContent value="links" className="mt-6">
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

            <TabsContent value="project" className="mt-6 space-y-6">
              {/* Project Narrative */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Project Narrative</CardTitle>
                  </div>
                  <EditProjectDetailsDialog
                    description={project.description}
                    onUpdate={(description) => handleUpdateProject({ description })}
                  />
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{project.description || "Select a project to view its details. Once project data is available, this tab will display key information, status updates, permits, and team members for the selected project."}</p>
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
                      ? `${project.address.streetNumber || ''} ${project.address.streetName || ''}, ${project.address.city || ''}, ${project.address.state || ''} ${project.address.zipCode || ''}`.trim() 
                      : '—'}
                  </p>
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

            <TabsContent value="client" className="mt-6">
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

            <TabsContent value="notes" className="mt-6">
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

      {/* Project Chat Sidebar */}
      <Collapsible open={chatOpen} onOpenChange={setChatOpen}>
        <div className="relative">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute -left-10 top-4 z-10 h-8 w-8"
            >
              {chatOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="w-80 border-l bg-background overflow-hidden data-[state=closed]:w-0 transition-all flex flex-col h-full">
            <div className="p-6 border-b">
              <h3 className="font-semibold text-lg">Project Chat</h3>
            </div>
            
            <ScrollArea className="flex-1 p-6">
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

            <div className="p-6 border-t">
              <ChatInput
                onSendMessage={handleSendMessage}
                replyingTo={replyingTo}
                onCancelReply={() => setReplyingTo(null)}
                disabled={sendChatMutation.isPending}
              />
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
};

export default ProjectDetails;
