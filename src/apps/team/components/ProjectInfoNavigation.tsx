import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Trash2, FileText, Map, User, Receipt, Users, Activity as ActivityIcon, FileEdit } from 'lucide-react';
import { useHardDeleteProject } from '@/lib/api/hooks/useProjects';
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

type RouteId = "project-profile" | "client-profile" | "parcel-information" | "invoices" | "team-members" | "activity" | "notes";

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
      { id: "notes", label: "Notes", icon: FileEdit },
    ],
  },
] as const;

interface ProjectInfoNavigationProps {
  projectId: string;
  workspaceId: string;
  onClose?: () => void;
}

export function ProjectInfoNavigation({ projectId, workspaceId, onClose }: ProjectInfoNavigationProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = searchParams.get('infoSection') || 'project-profile';
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const deleteProject = useHardDeleteProject(workspaceId);

  const handleSectionChange = useCallback((sectionId: string) => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      params.set('infoSection', sectionId);
      return params;
    });
  }, [setSearchParams]);

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
      <aside className="w-full h-full shrink-0 bg-white/80 backdrop-blur-sm flex flex-col">
        <div className="flex-1 pt-3 pb-2 text-[11px] overflow-auto">
          {menuGroups.map((g, idx) => (
            <div key={g.id} className="mb-3">
              <div className="px-3 py-1 text-slate-900 tracking-wide">{g.title}</div>
              <div className="px-2 flex flex-col gap-1">
                {g.items.map((it) => {
                  const active = activeSection === it.id;
                  const IconComp = it.icon;
                  return (
                    <button 
                      key={it.id} 
                      onClick={() => handleSectionChange(it.id)} 
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] ${
                        active ? "bg-[#E7F0FF] text-slate-900" : "hover:bg-slate-100 text-slate-900"
                      }`}
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
            onClick={() => setDeleteConfirmOpen(true)}
            className="w-full flex items-center justify-start gap-2 px-2 py-1.5 rounded-lg text-[13px] hover:bg-red-50 text-red-600"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete project</span>
          </button>
        </div>
      </aside>

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
