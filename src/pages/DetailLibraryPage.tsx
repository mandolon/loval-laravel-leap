import { useWorkspaces } from '@/hooks/useWorkspaces';
import DetailLibraryViewer from '@/components/detail-library/DetailLibraryViewer';
import { Loader2 } from 'lucide-react';

const DetailLibraryPage = () => {
  const { currentWorkspaceId } = useWorkspaces();

  if (!currentWorkspaceId) {
    return (
      <div className="h-full w-full flex items-center justify-center text-muted-foreground">
        No workspace selected
      </div>
    );
  }

  return (
    <div className="h-full w-full p-6 overflow-hidden text-[12px]">
      <DetailLibraryViewer workspaceId={currentWorkspaceId} />
    </div>
  );
};

export default DetailLibraryPage;
