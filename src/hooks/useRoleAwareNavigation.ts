import { useNavigate, useParams } from 'react-router-dom';
import { useWorkspaceRole } from './useWorkspaceRole';

export const useRoleAwareNavigation = () => {
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const { role } = useWorkspaceRole(workspaceId);
  
  const navigateToWorkspace = (path: string) => {
    console.log('navigateToWorkspace called:', { path, workspaceId, role });
    if (!workspaceId || !role) {
      console.warn('Navigation blocked - missing workspaceId or role:', { workspaceId, role });
      return;
    }
    const fullPath = `/${role}/workspace/${workspaceId}${path}`;
    console.log('Navigating to:', fullPath);
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
