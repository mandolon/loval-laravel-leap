import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Trash2, FileText, Map, User, Receipt, Users, Activity as ActivityIcon, FileEdit, ChevronDown } from 'lucide-react';
import { PanelHeaderBar } from './ProjectPanel';
import { colors, componentText } from './ProjectPanelTheme';
import { useHardDeleteProject, useProjects, useProject } from '@/lib/api/hooks/useProjects';
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
  const navigate = useNavigate();
  const activeSection = searchParams.get('infoSection') || 'project-profile';
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);
  const deleteProject = useHardDeleteProject(workspaceId);
  
  // Fetch current project and all projects
  const { data: currentProject } = useProject(projectId);
  const { data: projects = [] } = useProjects(workspaceId);

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

  const handleProjectSelect = (selectedProjectId: string) => {
    setSelectorOpen(false);
    
    // If selecting the same project, just close the dropdown
    if (selectedProjectId === projectId) {
      return;
    }
    
    // Stay on the same info section when switching projects
    const currentSection = searchParams.get('infoSection') || 'project-profile';
    navigate(`/team/${workspaceId}/project/${selectedProjectId}?tab=info&infoSection=${currentSection}`);
  };

  // Close selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setSelectorOpen(false);
      }
    };

    if (selectorOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [selectorOpen]);

  return (
    <>
      <div className="h-full w-full overflow-y-auto no-scrollbar text-[11px] bg-white flex flex-col">
        {/* Project Selector Container - using design tokens */}
        <PanelHeaderBar>
          <div className="relative flex-1" ref={selectorRef}>
            <button
              onClick={() => setSelectorOpen(!selectorOpen)}
              className="w-full h-7 pr-2 rounded-[6px] flex items-center justify-start cursor-pointer focus:outline-none transition-all"
              style={{
                backgroundColor: colors.bg.input,
                border: `1px solid ${colors.border.input}`,
                color: '#9CA3AF',
                fontSize: '10px !important' as any,
                paddingLeft: '32px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = colors.border.input;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = colors.border.input;
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#F59E0B';
                e.currentTarget.style.boxShadow = '0 0 0 3px #F59E0B15';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = colors.border.input;
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <span className="truncate" style={{ fontSize: '11px' }}>{currentProject?.name || 'Select Project'}</span>
            </button>
            <ChevronDown 
              className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none transition-transform" 
              style={{ 
                color: '#9CA3AF',
                transform: selectorOpen ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)'
              }}
            />
            
            {/* Project Selector Popover */}
            {selectorOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto" style={{ border: '1px solid #E5E7EB' }}>
                {projects.length === 0 ? (
                  <div className="px-3 py-2 text-[11px] text-slate-500 text-center">
                    No projects available
                  </div>
                ) : (
                  projects.map((project: any) => (
                    <button
                      key={project.id}
                      onClick={() => handleProjectSelect(project.id)}
                      className="w-full px-3 py-2 text-left text-[11px] transition-colors"
                      style={{
                        backgroundColor: 'transparent',
                        color: '#0F172A',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F5F5F5';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div className="truncate">{project.name}</div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </PanelHeaderBar>
        
        <div className="flex-1 pt-1.5 pb-2 text-[11px] overflow-auto">
          {menuGroups.map((g, idx) => (
            <div key={g.id} className="px-2.5">
              {/* Section Header - using design tokens */}
              <div className={`flex items-center gap-1 py-[2px] px-1 select-none bg-${colors.bg.section} rounded-lg mb-1`}>
                <span className={componentText.sectionHeader.className}>{g.title}</span>
              </div>
              <div className="mt-1 flex flex-col gap-1">
                {g.items.map((it) => {
                  const active = activeSection === it.id;
                  const IconComp = it.icon;
                  return (
                    <button 
                      key={it.id} 
                      onClick={() => handleSectionChange(it.id)} 
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] ${
                        active ? "bg-[#F5F5F5] text-slate-900" : "hover:bg-[#F9FAFB] text-slate-900"
                      }`}
                    >
                      <IconComp className="h-4 w-4 text-slate-600" />
                      <span className="truncate">{it.label}</span>
                    </button>
                  );
                })}
              </div>
              {idx < menuGroups.length - 1 && <div className="mt-2 mb-1 mx-2.5 h-px bg-slate-200" />}
            </div>
          ))}
        </div>
        
        <div className="mt-auto p-2.5 border-t border-slate-200">
          <button 
            onClick={() => setDeleteConfirmOpen(true)}
            className="w-full flex items-center justify-start gap-2 px-2 py-1.5 rounded-lg text-[13px] hover:bg-red-50 text-red-600"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete project</span>
          </button>
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
