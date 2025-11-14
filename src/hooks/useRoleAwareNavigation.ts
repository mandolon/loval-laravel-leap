import { useNavigate, useParams } from 'react-router-dom';
import { useWorkspaceRole } from './useWorkspaceRole';

export const useRoleAwareNavigation = (providedWorkspaceId?: string) => {
  const navigate = useNavigate();
  const { workspaceId: urlWorkspaceId } = useParams();
  
  // Use provided workspaceId if available, otherwise fall back to URL params
  const workspaceId = providedWorkspaceId || urlWorkspaceId;
  const { role } = useWorkspaceRole(workspaceId);
  
  const navigateToWorkspace = (path: string) => {
    if (!workspaceId || !role) {
      console.warn('Navigation blocked - missing workspaceId or role:', { workspaceId, role });
      return;
    }
    const fullPath = `/${role}/workspace/${workspaceId}${path}`;
    navigate(fullPath);
  };
  
  const navigateToRole = (path: string) => {
    if (!role) return;
    navigate(`/${role}${path}`);
  };
  
  return { 
    navigateToWorkspace, 
    navigateToRole,
    navigate,
    role,
    workspaceId 
  };
};
