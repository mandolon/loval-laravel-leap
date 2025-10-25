import { useWorkspaces } from '@/hooks/useWorkspaces';
import DetailLibraryViewer from '@/components/detail-library/DetailLibraryViewer';
import { DESIGN_TOKENS as T } from '@/lib/design-tokens';

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
    <div className="h-full w-full pb-6 pr-1 overflow-hidden text-[12px]">
      <div className="h-full w-full bg-white dark:bg-neutral-900 rounded-lg border border-[#bbbbbb] shadow-sm overflow-hidden">
        <div className="h-full w-full overflow-y-auto">
          <DetailLibraryViewer workspaceId={currentWorkspaceId} />
        </div>
      </div>
    </div>
  );
};

export default DetailLibraryPage;
