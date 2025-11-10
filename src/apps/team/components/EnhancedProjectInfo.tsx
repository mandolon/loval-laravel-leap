import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Trash2, FileText, Map, User, Receipt, Users, Activity as ActivityIcon } from 'lucide-react';
import { useProject, useUpdateProject, useHardDeleteProject } from '@/lib/api/hooks/useProjects';
import { useProjectMembers } from '@/lib/api/hooks/useProjectMembers';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Constants
const INPUT =
  "w-full h-8 rounded-lg border bg-white text-[13px] text-slate-800 placeholder:text-slate-400 placeholder:text-[13px] px-3 outline-none transition border-slate-200 hover:border-slate-300 focus:border-[#00639b] focus:ring-1 focus:ring-[#9ecafc] disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed";
const SELECT =
  "w-full h-8 rounded-lg border bg-white text-[13px] text-slate-800 px-3 outline-none transition border-slate-200 hover:border-slate-300 focus:border-[#00639b] focus:ring-1 focus:ring-[#9ecafc] disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed";
const TEXTAREA =
  "w-full min-h-[140px] rounded-lg border bg-white text-[13px] text-slate-800 p-3 outline-none transition border-slate-200 hover:border-slate-300 focus:border-[#00639b] focus:ring-1 focus:ring-[#9ecafc] disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed";

const STATUS_OPTS = [
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
] as const;

const PHASE_OPTS = [
  { value: "Pre-Design", label: "Pre-Design" },
  { value: "Design", label: "Design" },
  { value: "Permit", label: "Permit" },
  { value: "Build", label: "Build" },
] as const;

const labelFor = (opts: readonly { value: string; label: string }[], v: string) => 
  opts.find(o => o.value === v)?.label || v;

const initials = (name: string) => 
  name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]!.toUpperCase()).join("");

type RouteId = "project-profile" | "client-profile" | "parcel-information" | "invoices" | "team-members" | "activity";

const menuGroups = [
  {
    id: "project",
    title: "PROJECT INFO",
    items: [
      { id: "project-profile", label: "Project", icon: FileText },
      { id: "parcel-information", label: "Parcel Data", icon: Map },
      { id: "client-profile", label: "Client", icon: User },
      { id: "invoices", label: "Invoices", icon: Receipt },
      { id: "team-members", label: "Team", icon: Users },
      { id: "activity", label: "Activity", icon: ActivityIcon },
    ],
  },
] as const;

// EditBar Component
function EditBar({ 
  editing, 
  onStart, 
  onCancel, 
  onSave 
}: { 
  editing: boolean; 
  onStart: () => void; 
  onCancel: () => void; 
  onSave: () => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-end gap-2">
      {!editing ? (
        <button 
          onClick={onStart} 
          className="h-8 px-3 rounded-lg border border-transparent bg-slate-700 text-white text-[13px] hover:bg-slate-800"
        >
          Edit
        </button>
      ) : (
        <>
          <button 
            onClick={onCancel} 
            className="h-8 px-3 rounded-lg border bg-white text-[13px]"
          >
            Cancel
          </button>
          <button 
            onClick={onSave} 
            className="h-8 px-3 rounded-lg border border-[#4C75D1] bg-[#4C75D1] text-white text-[13px] hover:bg-[#3f64b3]"
          >
            Save
          </button>
        </>
      )}
    </div>
  );
}

// TwoCol Layout
function TwoCol({ 
  title, 
  desc, 
  children 
}: { 
  title: string; 
  desc: string; 
  children: React.ReactNode;
}) {
  return (
    <div className="p-4 md:p-6 text-slate-600">
      <div className="grid gap-6 md:grid-cols-[270px_minmax(0,1fr)] items-start">
        <div>
          <h1 className="text-slate-900 text-xl font-medium mb-1">{title}</h1>
          <p className="text-[13px]">{desc}</p>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

// EditableInput Component
function EditableInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const readOnly = props.readOnly;
  return (
    <input 
      {...props} 
      className={`${INPUT} ${readOnly ? 'bg-slate-50 text-slate-600 hover:border-slate-200 focus:ring-0 focus:border-slate-200' : 'border-slate-400 focus:border-slate-500 focus:ring-slate-300'}`} 
    />
  );
}

// Side Menu Component
function ContentSideMenu({ 
  route, 
  setRoute,
  onDeleteClick
}: { 
  route: RouteId; 
  setRoute: (r: RouteId) => void;
  onDeleteClick: () => void;
}) {
  const onClick = useCallback((id: RouteId) => () => setRoute(id), [setRoute]);
  
  return (
    <aside className="w-[240px] shrink-0 border-r border-slate-200 bg-white/80 backdrop-blur-sm flex flex-col h-full">
      <div className="flex-1 pt-3 pb-2 text-[11px] overflow-auto">
        {menuGroups.map((g, idx) => (
          <div key={g.id} className="mb-3">
            <div className="px-3 py-1 text-slate-900 tracking-wide">{g.title}</div>
            <div className="px-2 flex flex-col gap-1">
              {g.items.map((it) => {
                const active = route === it.id;
                const IconComp = it.icon;
                return (
                  <button 
                    key={it.id} 
                    onClick={onClick(it.id as RouteId)} 
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] ${active ? "bg-[#E7F0FF] text-slate-900" : "hover:bg-slate-100 text-slate-900"}`}
                  >
                    <IconComp className="h-4 w-4 text-slate-600" />
                    <span className="truncate">{it.label}</span>
                  </button>
                );
              })}
            </div>
            {idx < menuGroups.length - 1 && <div className="my-2 h-px bg-slate-200" />}
          </div>
        ))}
      </div>
      <div className="mt-auto p-2 border-t border-slate-200">
        <button 
          onClick={onDeleteClick}
          className="w-full flex items-center justify-start gap-2 px-2 py-1.5 rounded-lg text-[13px] hover:bg-red-50 text-red-600"
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete project</span>
        </button>
      </div>
    </aside>
  );
}

// Project Profile Content
function ProjectProfileContent({ 
  projectId, 
  workspaceId 
}: { 
  projectId: string;
  workspaceId: string;
}) {
  const { data: project } = useProject(projectId);
  const updateProject = useUpdateProject(workspaceId);
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    addressNo: "",
    addressStreet: "",
    addressCity: "",
    addressState: "",
    addressZip: "",
    status: "pending" as "pending" | "active" | "completed" | "archived",
    phase: "Pre-Design" as "Pre-Design" | "Design" | "Permit" | "Build",
    description: "",
  });
  
  const backup = useRef(formData);

  useEffect(() => {
    if (project) {
      const addr = project.address || {};
      setFormData({
        name: project.name || "",
        addressNo: addr.streetNumber || "",
        addressStreet: addr.streetName || "",
        addressCity: addr.city || "",
        addressState: addr.state || "",
        addressZip: addr.zipCode || "",
        status: project.status || "pending",
        phase: project.phase || "Pre-Design",
        description: project.description || "",
      });
    }
  }, [project]);

  const handleSave = async () => {
    try {
      await updateProject.mutateAsync({
        id: projectId,
        input: {
          name: formData.name,
          address: {
            streetNumber: formData.addressNo,
            streetName: formData.addressStreet,
            city: formData.addressCity,
            state: formData.addressState,
            zipCode: formData.addressZip,
          },
          status: formData.status,
          phase: formData.phase,
          description: formData.description,
        }
      });
      setEditing(false);
    } catch (error) {
      console.error('Failed to update project:', error);
    }
  };

  return (
    <TwoCol 
      title="Project information" 
      desc="Core details about this project including address, status, phase, and a short summary."
    >
      <EditBar
        editing={editing}
        onStart={() => { backup.current = formData; setEditing(true); }}
        onCancel={() => { setFormData(backup.current); setEditing(false); }}
        onSave={handleSave}
      />

      <div className="mb-4">
        <label className="block text-sm text-slate-900 mb-1">Project name</label>
        <EditableInput 
          value={formData.name} 
          onChange={(e) => setFormData(p => ({...p, name: e.target.value}))} 
          readOnly={!editing} 
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm text-slate-900 mb-1">Address</label>
        <div className="grid gap-2" style={{ gridTemplateColumns: "140px 1fr 1fr 80px 100px" }}>
          <EditableInput 
            value={formData.addressNo} 
            onChange={e => setFormData(p => ({...p, addressNo: e.target.value}))} 
            readOnly={!editing} 
            placeholder="No."
          />
          <EditableInput 
            value={formData.addressStreet} 
            onChange={e => setFormData(p => ({...p, addressStreet: e.target.value}))} 
            readOnly={!editing} 
            placeholder="Street"
          />
          <EditableInput 
            value={formData.addressCity} 
            onChange={e => setFormData(p => ({...p, addressCity: e.target.value}))} 
            readOnly={!editing} 
            placeholder="City"
          />
          <EditableInput 
            value={formData.addressState} 
            onChange={e => setFormData(p => ({...p, addressState: e.target.value}))} 
            readOnly={!editing} 
            placeholder="State"
          />
          <EditableInput 
            value={formData.addressZip} 
            onChange={e => setFormData(p => ({...p, addressZip: e.target.value}))} 
            readOnly={!editing} 
            placeholder="Zip"
          />
        </div>
      </div>

      <div className="mb-4 grid gap-2 md:grid-cols-2">
        <div>
          <label className="block text-sm text-slate-900 mb-1">Status</label>
          {editing ? (
            <select 
              value={formData.status} 
              onChange={e => setFormData(p => ({...p, status: e.target.value as typeof p.status}))} 
              className={`${SELECT} border-slate-400 focus:border-slate-500 focus:ring-slate-300`}
            >
              {STATUS_OPTS.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
          ) : (
            <div className="w-full h-8 rounded-lg border bg-slate-50 text-[13px] text-slate-600 px-3 leading-8 border-slate-200">
              {labelFor(STATUS_OPTS, formData.status)}
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm text-slate-900 mb-1">Phase</label>
          {editing ? (
            <select 
              value={formData.phase} 
              onChange={e => setFormData(p => ({...p, phase: e.target.value as typeof p.phase}))} 
              className={`${SELECT} border-slate-400 focus:border-slate-500 focus:ring-slate-300`}
            >
              {PHASE_OPTS.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
          ) : (
            <div className="w-full h-8 rounded-lg border bg-slate-50 text-[13px] text-slate-600 px-3 leading-8 border-slate-200">
              {labelFor(PHASE_OPTS, formData.phase)}
            </div>
          )}
        </div>
      </div>

      <div className="mb-2">
        <label className="block text-sm text-slate-900 mb-1">Description</label>
        <textarea 
          value={formData.description} 
          onChange={e => setFormData(p => ({...p, description: e.target.value}))} 
          readOnly={!editing} 
          className={`${TEXTAREA} ${!editing ? 'bg-slate-50 text-slate-600 hover:border-slate-200 focus:ring-0 focus:border-slate-200' : 'border-slate-400 focus:border-slate-500 focus:ring-slate-300'}`} 
        />
      </div>
    </TwoCol>
  );
}

// Client Profile Content
function ClientProfileContent({ 
  projectId, 
  workspaceId 
}: { 
  projectId: string;
  workspaceId: string;
}) {
  const { data: project } = useProject(projectId);
  const updateProject = useUpdateProject(workspaceId);
  const [editing, setEditing] = useState(false);
  
  const [formData, setFormData] = useState({
    primaryFirst: "",
    primaryLast: "",
    primaryEmail: "",
    primaryPhone: "",
    secondaryFirst: "",
    secondaryLast: "",
    secondaryEmail: "",
    secondaryPhone: "",
  });
  
  const backup = useRef(formData);

  useEffect(() => {
    if (project) {
      setFormData({
        primaryFirst: project.primaryClient?.firstName || "",
        primaryLast: project.primaryClient?.lastName || "",
        primaryEmail: project.primaryClient?.email || "",
        primaryPhone: project.primaryClient?.phone || "",
        secondaryFirst: project.secondaryClient?.firstName || "",
        secondaryLast: project.secondaryClient?.lastName || "",
        secondaryEmail: project.secondaryClient?.email || "",
        secondaryPhone: project.secondaryClient?.phone || "",
      });
    }
  }, [project]);

  const handleSave = async () => {
    try {
      await updateProject.mutateAsync({
        id: projectId,
        input: {
          primaryClient: {
            firstName: formData.primaryFirst,
            lastName: formData.primaryLast,
            email: formData.primaryEmail,
            phone: formData.primaryPhone,
          },
          secondaryClient: {
            firstName: formData.secondaryFirst,
            lastName: formData.secondaryLast,
            email: formData.secondaryEmail,
            phone: formData.secondaryPhone,
          },
        }
      });
      setEditing(false);
    } catch (error) {
      console.error('Failed to update client:', error);
    }
  };

  return (
    <TwoCol 
      title="Client information" 
      desc="Details about the primary and secondary clients for this project."
    >
      <EditBar
        editing={editing}
        onStart={() => { backup.current = formData; setEditing(true); }}
        onCancel={() => { setFormData(backup.current); setEditing(false); }}
        onSave={handleSave}
      />

      <div className="mb-6">
        <h3 className="text-sm font-medium text-slate-900 mb-3">Primary Client</h3>
        <div className="space-y-3">
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <label className="block text-sm text-slate-900 mb-1">First name</label>
              <EditableInput 
                value={formData.primaryFirst} 
                onChange={e => setFormData(p => ({...p, primaryFirst: e.target.value}))} 
                readOnly={!editing} 
              />
            </div>
            <div>
              <label className="block text-sm text-slate-900 mb-1">Last name</label>
              <EditableInput 
                value={formData.primaryLast} 
                onChange={e => setFormData(p => ({...p, primaryLast: e.target.value}))} 
                readOnly={!editing} 
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-900 mb-1">Email</label>
            <EditableInput 
              type="email"
              value={formData.primaryEmail} 
              onChange={e => setFormData(p => ({...p, primaryEmail: e.target.value}))} 
              readOnly={!editing} 
            />
          </div>
          <div>
            <label className="block text-sm text-slate-900 mb-1">Phone</label>
            <EditableInput 
              type="tel"
              value={formData.primaryPhone} 
              onChange={e => setFormData(p => ({...p, primaryPhone: e.target.value}))} 
              readOnly={!editing} 
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-slate-900 mb-3">Secondary Client</h3>
        <div className="space-y-3">
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <label className="block text-sm text-slate-900 mb-1">First name</label>
              <EditableInput 
                value={formData.secondaryFirst} 
                onChange={e => setFormData(p => ({...p, secondaryFirst: e.target.value}))} 
                readOnly={!editing} 
              />
            </div>
            <div>
              <label className="block text-sm text-slate-900 mb-1">Last name</label>
              <EditableInput 
                value={formData.secondaryLast} 
                onChange={e => setFormData(p => ({...p, secondaryLast: e.target.value}))} 
                readOnly={!editing} 
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-900 mb-1">Email</label>
            <EditableInput 
              type="email"
              value={formData.secondaryEmail} 
              onChange={e => setFormData(p => ({...p, secondaryEmail: e.target.value}))} 
              readOnly={!editing} 
            />
          </div>
          <div>
            <label className="block text-sm text-slate-900 mb-1">Phone</label>
            <EditableInput 
              type="tel"
              value={formData.secondaryPhone} 
              onChange={e => setFormData(p => ({...p, secondaryPhone: e.target.value}))} 
              readOnly={!editing} 
            />
          </div>
        </div>
      </div>
    </TwoCol>
  );
}

// Team Members Content
function TeamMembersContent({ projectId }: { projectId: string }) {
  const { data: members } = useProjectMembers(projectId);

  return (
    <TwoCol 
      title="Team members" 
      desc="People assigned to work on this project."
    >
      <div className="space-y-2">
        {members && members.length > 0 ? (
          members.map((member) => (
            <div 
              key={member.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
            >
              <div 
                className="h-10 w-10 rounded-full bg-slate-900 text-white grid place-items-center text-sm font-semibold shrink-0"
              >
                {initials(member.userName)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-slate-900">{member.userName}</div>
                <div className="text-xs text-slate-600 truncate">{member.userEmail}</div>
                {member.title && (
                  <div className="text-xs text-slate-500 mt-0.5">{member.title}</div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-sm text-slate-600 text-center py-8">
            No team members assigned yet
          </div>
        )}
      </div>
    </TwoCol>
  );
}

// Parcel Information (Hardcoded)
function ParcelInformationContent() {
  return (
    <TwoCol 
      title="Parcel information" 
      desc="County assessor data and property details."
    >
      <div className="space-y-4">
        <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
          <div className="text-sm text-slate-600 mb-2">Assessor Parcel Number (APN)</div>
          <div className="text-slate-900 font-mono">123-456-789-000</div>
        </div>
        <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
          <div className="text-sm text-slate-600 mb-2">Property Size</div>
          <div className="text-slate-900">5,000 sq ft</div>
        </div>
        <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
          <div className="text-sm text-slate-600 mb-2">Zoning</div>
          <div className="text-slate-900">R-1 (Single Family Residential)</div>
        </div>
        <div className="text-xs text-slate-500 italic">
          Parcel data integration coming soon
        </div>
      </div>
    </TwoCol>
  );
}

// Invoices (Hardcoded)
function InvoicesContent() {
  return (
    <TwoCol 
      title="Invoices" 
      desc="Project billing and payment records."
    >
      <div className="space-y-3">
        <div className="p-4 rounded-lg border border-slate-200 bg-white">
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="font-medium text-slate-900">Invoice #001</div>
              <div className="text-xs text-slate-600">Jan 15, 2025</div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-slate-900">$5,000</div>
              <div className="text-xs text-green-600">Paid</div>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-lg border border-slate-200 bg-white">
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="font-medium text-slate-900">Invoice #002</div>
              <div className="text-xs text-slate-600">Feb 1, 2025</div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-slate-900">$3,500</div>
              <div className="text-xs text-amber-600">Pending</div>
            </div>
          </div>
        </div>
        <div className="text-xs text-slate-500 italic">
          Invoice management coming soon
        </div>
      </div>
    </TwoCol>
  );
}

// Activity (Hardcoded)
function ActivityContent() {
  return (
    <TwoCol 
      title="Activity log" 
      desc="Recent changes and updates to this project."
    >
      <div className="space-y-2">
        <div className="p-3 rounded-lg border border-slate-200 bg-white">
          <div className="flex items-start gap-2">
            <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 grid place-items-center text-xs shrink-0 mt-0.5">
              AK
            </div>
            <div className="flex-1">
              <div className="text-sm text-slate-900">Alex Kim updated project status</div>
              <div className="text-xs text-slate-600 mt-1">2 hours ago</div>
            </div>
          </div>
        </div>
        <div className="p-3 rounded-lg border border-slate-200 bg-white">
          <div className="flex items-start gap-2">
            <div className="h-6 w-6 rounded-full bg-purple-100 text-purple-600 grid place-items-center text-xs shrink-0 mt-0.5">
              JD
            </div>
            <div className="flex-1">
              <div className="text-sm text-slate-900">Jane Doe uploaded 3 files</div>
              <div className="text-xs text-slate-600 mt-1">5 hours ago</div>
            </div>
          </div>
        </div>
        <div className="text-xs text-slate-500 italic mt-4">
          Activity tracking coming soon
        </div>
      </div>
    </TwoCol>
  );
}

// Main Component
interface EnhancedProjectInfoProps {
  projectId: string;
  workspaceId: string;
  onClose?: () => void;
}

export default function EnhancedProjectInfo({ 
  projectId, 
  workspaceId,
  onClose 
}: EnhancedProjectInfoProps) {
  const [route, setRoute] = useState<RouteId>("project-profile");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const deleteProject = useHardDeleteProject(workspaceId);

  const handleDelete = async () => {
    try {
      await deleteProject.mutateAsync(projectId);
      setDeleteConfirmOpen(false);
      if (onClose) onClose();
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  return (
    <>
      <div className="h-full flex bg-white">
        <ContentSideMenu 
          route={route} 
          setRoute={setRoute}
          onDeleteClick={() => setDeleteConfirmOpen(true)}
        />
        
        <div className="flex-1 overflow-auto">
          {route === "project-profile" && (
            <ProjectProfileContent projectId={projectId} workspaceId={workspaceId} />
          )}
          {route === "client-profile" && (
            <ClientProfileContent projectId={projectId} workspaceId={workspaceId} />
          )}
          {route === "team-members" && (
            <TeamMembersContent projectId={projectId} />
          )}
          {route === "parcel-information" && <ParcelInformationContent />}
          {route === "invoices" && <InvoicesContent />}
          {route === "activity" && <ActivityContent />}
        </div>
      </div>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this project and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
