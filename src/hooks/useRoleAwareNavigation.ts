import { useNavigate, useParams } from 'react-router-dom';
import { useWorkspaceRole } from './useWorkspaceRole';

export const useRoleAwareNavigation = () => {
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const { role } = useWorkspaceRole(workspaceId);
  
  const navigateToWorkspace = (path: string) => {
    if (!workspaceId || !role) return;
    navigate(`/${role}/workspace/${workspaceId}${path}`);
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
